import { util_request, util_transNum, util_multPage, util_updateUserInfo, util_adTrack, util_showToast, util_performanceTrack, util_handleBubble } from "../../util.js";

import IntersectionObserver from "../../common/js/intersection.js";

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const reddotBehavior = require("../../behaviors/reddot");
const userInfoBehavior = require("../../behaviors/userInfo");
const followBehavior = require("../../behaviors/follow");
const praiseBehavior = require("../../behaviors/praise");
const { globalImgs } = require("../../cdn.js");

const page = {
    behaviors: [followBehavior, praiseBehavior, reddotBehavior, userInfoBehavior],
    data: {
        isLogin: false,
        likes: {},

        // 顶部提示
        tipHei: 60,
        tipVisible: false,
        tipNum: 1,

        // 列表相关
        offset: 0,
        list: [],
        error: false,
        empty: false,
        loading: true,
        // 加载完是否显示底部文案
        finished: false,
        // 是否加载完成
        complete: false,
        // 请求接口中，防重复
        running: true,
        isRefresh: false,
        isTriggerRefresh: false,

        // 曝光相关
        observerList: [], // 已曝光模块索引
        hashList: [], // 当前曝光模块缓存
        hashTimer: null, // 当前曝光模块定时器
        pageShow: false,

        maxIndex: 1, // 最大加载索引
        prestrainList: [], // 提前曝光索引
        isPending: true, // 是否预加载中

        // 新手福利bubble展示内容
        bubbleText: "",
        firstLoad: true, // 是否第一次进入
        enterType: 3, // 新手福利的入口类型 0:不显示,完全不执行  1:banner  2:挂件展示  3:隐藏显示(请求接口)
        isShowLadderWelfare: false, // 是否显示阶梯领取福利模块 (1.新手每日登录领取福利模块  2.老用户领取阶梯领取阅读币模块)
        globalImgs,
        isLoadComplete: false, // 是否load加载完成 util_performanceTrack
        isLoadImgFirst: true, // 是否首次首屏图片加载完成
        suspendAnimation: true, // 挂角动画
    },
    // 监听用户登录
    watchUser(uid) {
        // 第一次登录后进入，不需要进入watchUser
        if (!this.data.firstLoad) {
            this.getLogin(uid);
            this.init();
        }
    },
    // 默认分享
    onShareAppMessage() {},
    // 页面出现在前台时执行
    onShow() {
        this.data.pageShow = true;
        this.setRecMap({});
        app.kksaTrack("VisitIndividualHome");

        // 当书架页切换性别时，再次回到推荐页刷新
        if (global.refreshPage && global.refreshPage.feedPage) {
            global.refreshPage.feedPage = false;
            this.init();
        }
    },

    // 页面隐藏时执行
    onHide() {
        this.data.pageShow = false;
        this.setData({
            bubbleText: "",
        });
        // 离开页面，清空广告链接参数
        app.clearAdParam();
    },
    // 页面销毁时执行
    onUnload() {
        this.setData({
            bubbleText: "",
        });
    },
    onLoad() {
        // 性能数据采集部分
        const OnLoadStartTimestamp = new Date().getTime();
        this.data.OnLoadStartTimestamp = OnLoadStartTimestamp;

        this.data.firstLoad = false;
        app.getOpenId().then(() => {
            app.getGender().then(() => {
                this.onHome();
            });
        });
    },
    onHome() {
        this.getLogin(global.userId);
        this.init();
        this.setTip();
    },
    onReady() {
        this.setData({ readyTime: true });

        // 性能采集
        let OnReadStartTimestamp = new Date().getTime();
        this.data.OnReadStartTimestamp = OnReadStartTimestamp;
        const { OnLoadStartTimestamp } = this.data;
        util_performanceTrack("PerformanceReadyBase", {
            OnLoadToPageReadyTime: OnReadStartTimestamp - OnLoadStartTimestamp,
            CurrentPageBase: "feed",
        });
    },
    onImageLoad(e) {
        const { index, idx } = e.detail;
        const { isLoadImgFirst, OnLoadStartTimestamp, OnReadStartTimestamp } = this.data;
        if (isLoadImgFirst && idx == 0 && index == 1) {
            const ImageLoadTime = new Date().getTime();
            const OnLoadToImageLoadTime = ImageLoadTime - OnLoadStartTimestamp;
            const OnReadyToImageLoadTime = ImageLoadTime - OnReadStartTimestamp;
            // console.log("load-img:",OnLoadToImageLoadTime);
            this.data.isLoadImgFirst = false;
            util_performanceTrack("PerformanceImageBase", {
                OnLoadToImageLoadTime,
                OnReadyToImageLoadTime,
                CurrentPageBase: "feed",
            });
        }
    },
    init() {
        this.setData({
            empty: false,
            loading: true,
            finished: false,
        });
        this.data.offset = 0;
        this.initList();
    },
    initList() {
        this.data.complete = false;
        this.data.running = true;
        this.data.list = [];
        this.data.observerList = [];
        this.data.prestrainList = [];
        // 判断是否是从广告进入，如果是需要调用刷新性别，年龄接口
        if (global.adGender || global.adAge) {
            util_updateUserInfo({
                gender: global.adGender,
                medium_age: global.adAge,
                request_type: 3,
            })
                .then(() => {
                    this.getList();
                })
                .catch(() => {
                    this.getList();
                });
        } else {
            this.getList();
        }
    },
    getList(callback) {
        const pageSize = this.data.offset;
        const pageNum = pageSize < 0 ? 1 : pageSize + 1;

        if (this.data.isObtainData) {
            return false;
        }
        this.data.isObtainData = true; // 防止重复请求
        util_request({
            url: `/v1/freestyle/mini/home_recommend/${global.channel}/cards`,
            data: {
                page_num: pageNum,
                gender: global.gender == null ? 0 : global.gender,
                open_count: 0,
                ad_topic_id: global.adTopicId,
            },
        })
            .then((res) => {
                util_performanceTrack("MainInterface", {
                    CurrentPageBase: "feed",
                    MainInterfaceTime: new Date().getTime() - global.mainInterfaceStartTimestamp || 0,
                    MainInterfaceUrl: `/v1/freestyle/mini/home_recommend/${global.channel}/cards`,
                });
                this.data.isObtainData = false; // 防止重复请求

                const { code, data, message } = res;
                const cards = data.cards;

                let isAdCount = true;
                const list = [];
                cards.map((item, childIndex) => {
                    const imageInfo = item.cover_image_info || {};
                    const imageAry = imageInfo.images;
                    const imageType = imageInfo.image_type;
                    const imageTip = imageInfo.image_text || {};
                    const imageTipBg = imageTip.background_mask || "";
                    const imageTipText = imageTip.content || "";
                    const rgb = this.hexToRgba(imageTipBg);
                    const bgColor = `linear-gradient(rgba(${rgb},0),rgba(${rgb},0.8))`;
                    const isRec = !!(item.rec_topic_type && item.rec_topic_type == 1);

                    // 添加广告模块
                    if (childIndex % 4 == 3) {
                        const adIndex = isAdCount ? 4 : 8;
                        const moduleAd = {
                            cardType: "ad",
                            adData: {
                                ad_type: `feed_${adIndex}`,
                            },
                            prestrain: true,
                            visible: true,
                        };
                        list.push(moduleAd);
                        isAdCount = !isAdCount;
                    }

                    // 添加大图模块
                    const moduleComic = {
                        ...item,
                        cardType: "comic",
                        uuid: this.getUuid("comic"),
                        prestrain: false,
                        isRec,
                        images: {
                            list: imageAry,
                            width: 702 / imageAry.length,
                            tip: {
                                show: imageType != 3 && imageTipText != "",
                                bg: imageTipBg ? bgColor : "none",
                                mask: imageTip.text_mask || "",
                                text: imageTipText,
                            },
                        },
                    };
                    list.push(moduleComic);
                });

                const refer = 10;
                const cardsLength = cards.length;
                const surplus = cardsLength % refer;
                const floor = Math.floor(cardsLength / refer);
                const combLength = floor <= 0 ? 1 : surplus < 5 ? floor : floor + 1;
                const listLength = this.data.list.length;

                // 创建二维数组
                for (let i = 0; i < combLength; i++) {
                    const index = i + listLength;
                    const onset = i * refer;
                    const finish = i == combLength - 1 ? onset + refer * 2 : onset + refer;
                    let splitList = list.slice(onset, finish);
                    this.setData(
                        {
                            ["list[" + index + "]"]: splitList,
                        },
                        () => {
                            if (i + 1 >= combLength) {
                                if (callback) {
                                    callback();
                                } else {
                                    this.handlerObserver();
                                }
                            }
                        }
                    );
                }

                // 下拉刷新提醒
                this.stopPullDownRefresh(cardsLength);

                const since = cardsLength < 1 ? -1 : this.data.offset + 1;
                const length = this.data.list.length;
                const empty = length < 1 || (length == 1 && !this.data.list[0].length);
                const offset = empty ? -1 : since;
                const complete = offset === -1;

                this.data.isRefresh = false;
                this.data.running = false;
                this.data.complete = complete;
                this.data.offset = offset;

                this.setData(
                    {
                        loading: !complete,
                        error: false,
                        empty,
                        finished: complete && !empty && length > 2,
                    },
                    () => {
                        // 延迟加载签到模块
                        if (!this.data.isLoadComplete) {
                            const timer = setTimeout(() => {
                                clearTimeout(timer);
                                this.setData({
                                    isLoadComplete: true,
                                });
                            }, 1000);
                        }
                    }
                );
            })
            .catch(() => {
                this.data.isRefresh = false;
                this.data.running = false;
                this.data.isObtainData = false;
                this.setData({
                    error: true,
                    loading: false,
                });
            });
    },
    // 下拉刷新提醒
    stopPullDownRefresh(num) {
        if (!this.data.isRefresh) {
            return false;
        }
        wx.stopPullDownRefresh({
            success: () => {
                if (num) {
                    util_showToast({
                        title: `快看为您推荐了${num}部作品`,
                        position: {
                            bottom: "40%",
                        },
                    });
                    this.setData({
                        enterType: 3,
                    });
                }
            },
        });
    },
    // 下拉刷新
    onPullDownRefresh() {
        if (this.data.running) {
            return false;
        }

        this.setData({
            empty: false,
            loading: false,
            finished: false,
            isTriggerRefresh: true,
            tipVisible: false,
            tipNum: 0,
            maxIndex: 1,
            enterType: 0,
        });

        this.data.isRefresh = true;

        this.initList();
    },
    // 页面触底时执行
    onReachBottom() {
        if (this.data.running) {
            return false;
        }

        const { maxIndex, list } = this.data;
        const len = list.length;
        const newMaxIndex = maxIndex - len > 0 ? len : maxIndex;
        const maxAdd = newMaxIndex + 1;
        const callback = () => {
            this.setData(
                {
                    maxIndex: maxAdd,
                },
                () => {
                    this.data.running = false;
                    this.handlerObserver();
                }
            );
        };

        this.data.running = true;

        if (maxAdd > list.length) {
            this.getList(callback);
        } else {
            callback();
        }
    },
    // 设置文字渐变背景
    hexToRgba(value) {
        let sColor = value && value.toLowerCase();
        const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
        if (sColor && reg.test(sColor)) {
            if (sColor.length === 4) {
                let sColorNew = "#";
                for (let i = 1; i < 4; i += 1) {
                    sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
                }
                sColor = sColorNew;
            }
            const sColorChange = [];
            for (let i = 1; i < 7; i += 2) {
                sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
            }
            return sColorChange.join(",");
        } else {
            return sColor;
        }
    },
    // 是否登录
    getLogin(uid) {
        this.setData({
            isLogin: !!uid,
        });
    },
    // 检查登录，通过后resolve，否则前往登录页
    checkLogin() {
        return new Promise((resolve) => {
            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
            } else {
                resolve();
            }
        });
    },

    // 跳登录页
    loginClick() {
        this.checkLogin().then(() => {
            console.log("已登录");
        });
    },
    followClick(e) {
        const { id, index, item } = e.detail;
        const multPage = util_multPage();
        const { SrcPageLevel1, SrcPageLevel2, SrcPageLevel3, CurPage } = multPage;
        this.handleFollow(id, false, (res) => {
            const trackData = {
                TopicID: item.topic_id,
                TopicName: item.title.text,
                NickName: "",
                AuthorID: "",
                Category: "",
                SrcPageLevel1,
                SrcPageLevel2,
                SrcPageLevel3,
                TriggerPage: CurPage,
            };
            const recMap = item.rec_data_report_map || {};
            app.kksaTrack(
                "FavTopic",
                Object.assign({}, trackData, {
                    ...recMap,
                })
            ); // 上报神策
        });
        this.kksaCardClick(item, index, "follow");
    },
    praiseClick(e) {
        const { id, index, item } = e.detail;
        this.handlePraise(
            {
                id,
                state: this.data.likes[id].liked,
            },
            ({ count, state }) => {
                this.setPraise(id, {
                    liked: state,
                    like_count: count,
                });
            }
        );
        this.kksaCardClick(item, index, "praise");
        // 神策点赞上报
        app.kksaTrack("Like", {
            TriggerPage: "RecommendPage", // 触发页面
            LikeObject: "漫画" || "", // 点赞对象
            Action: this.data.likes[id].liked ? "取消点赞" : "点赞", // 点赞/取消点赞
            ComicID: item.comic_id || "", // 漫画ID
            ComicName: item.sub_title || "", // 漫画名称
            TopicID: item.topic_id || "", // 专题id
            TopicName: item.title.text || "", // 专题名称
        });
    },
    // 设置全局点赞
    setPraise(id, value) {
        const likes = this.data.likes;
        value.praise = util_transNum(value.like_count);
        likes[id] = value;
        this.setData({ likes });
    },
    // 获取曝光单条数据
    getOnceData(value) {
        const ary = value.split("-");
        const [idx = 0, key = 0] = ary;
        const item = this.data.list[idx] || [];
        return {
            row: item[key],
            idx: parseInt(idx),
            key: parseInt(key),
        };
    },
    // 获取卡片索引
    getOncePos(idx, key) {
        let sum = 0;
        this.data.list.forEach((item, index) => {
            if (index < idx) {
                sum += item.length;
            }
        });
        return sum + key + 1;
    },
    // 获取uuid
    getUuid(type = "comic") {
        return `${Date.now().toString(36)}_${type}_${Math.random().toString(36)}`;
    },
    // 卡片点击回调
    feedClick(e) {
        const { index, type, idx, item, comicType } = e.detail;
        const recMap = item.rec_data_report_map || {};
        this.handlerFeedTrack("ItemClk", `${idx}-${index}`);
        this.kksaCardClick(item, index, type, comicType);
        this.setRecMap(recMap);
    },
    handlerFeedData(index) {
        const { row = {}, idx = 0, key = 0 } = this.getOnceData(index);
        const multPage = util_multPage();
        const { TriggerPage: PrePage } = multPage;
        const pos = this.getOncePos(idx, key);
        const recMap = row.rec_data_report_map || {};
        return {
            ...multPage,
            CurPage: "RecommendPage",
            MembershipClassify: "",
            ItemType: "漫画",
            ComicID: row.comic_id,
            ComicName: row.sub_title,
            ItemName: row.title ? row.title.text || "" : "",
            ItemPos: pos,
            InItemPos: 1,
            PrePage,
            TopicID: row.topic_id,
            TopicName: row.title ? row.title.text || "" : "",
            ...recMap,
        };
    },
    // 推荐数据上报
    handlerFeedTrack(event, value) {
        let options = null;
        if (typeof value == "string") {
            options = this.handlerFeedData(value);
        } else {
            options = value.map((item) => {
                return this.handlerFeedData(item);
            });
        }
        app.kksaTrack(event, options);
    },
    // 神策曝光上报
    handlerViewTrack(item) {
        const { offset, maxIndex } = this.data;
        const { row, idx, key } = this.getOnceData(item);
        const imageInfo = row.cover_image_info || {};
        const imageText = imageInfo.image_text || {};
        // 过滤推荐语
        let recommendTitle = "";
        let recommendTag = row.recommend_tag;
        recommendTag.map((listItem) => {
            if (listItem.type != 1035) {
                recommendTitle = listItem.title;
                return;
            }
        });
        app.kksaTrack("CardTypeExposureHome", {
            CardType: "漫画大图卡片",
            CardTitle: row.title ? row.title.text : "",
            SubCardTitle: row.sub_title || "",
            CopywriterID: imageText.id || "",
            CardInBrushes: key + 1 || 1,
            PictureID: imageInfo.id || "",
            MaterialType: String(imageInfo.image_type),
            CardBelongBrushes: maxIndex,
            IsManualRecTopic: row.isRec || false,
            RecommendInfo: recommendTitle, // 推荐语
        });
    },
    // 推荐数据组曝光上报
    handleViewList(index, flag) {
        if (this.data.prestrainList.includes(index)) {
            return false;
        }

        if (this.data.hashTimer) {
            clearTimeout(this.data.hashTimer);
        }

        if (flag) {
            this.data.prestrainList.push(index);
        }

        this.data.hashList.push(index);
        this.data.hashTimer = setTimeout(() => {
            const data = JSON.stringify(this.data.hashList);
            this.handlerFeedTrack("ItemImp", JSON.parse(data));
            this.data.hashList = [];
        }, 500);
    },
    // 监听曝光
    handlerObserver() {
        // return false;
        if (this.ob) {
            this.ob.disconnect();
        }

        this.ob = new IntersectionObserver({
            selector: ".find-observer",
            observeAll: true,
            context: this,
            threshold: 0.1,
            onEach: ({ dataset }) => {
                const { idx, key } = dataset || {};
                return `${idx}-${key}`;
            },
            onFinal: (args) => {
                if (!args) {
                    return;
                }
                args.forEach((item) => {
                    if (!this.data.observerList.includes(item)) {
                        this.data.observerList.push(item);
                        this.onTriggerObserver(item);
                    }
                });
            },
        });
        this.ob.connect();
    },
    // 过滤已曝光过的
    onTriggerObserver(value) {
        const { row, idx, key } = this.getOnceData(value);
        if (!row || !row.cardType) {
            return false;
        }
        if (row.cardType == "comic") {
            // 推荐数据组曝光
            this.handleViewList(value);

            // 神策曝光
            this.handlerViewTrack(value);

            // 图片懒加载
            this.handlerLazy(value);
        }
    },
    // 懒加载图片
    handlerLazy(options) {
        const { row, idx, key } = this.getOnceData(options);
        if (this.data.list[idx]) {
            if (this.data.list[idx][key]) {
                this.setData({
                    ["list[" + idx + "][" + key + "].prestrain"]: true,
                });
                this.setFollows(row.topic_id, row.favourite);
                this.setPraise(row.comic_id, {
                    liked: row.liked,
                    like_count: row.like_count,
                });
            }
        }
    },
    setTip() {
        const rect = wx.getMenuButtonBoundingClientRect();
        const topNavHei = rect.height + rect.top;
        this.setData({
            tipHei: topNavHei,
        });
    },
    // 卡片点击上报神策
    kksaCardClick(row, index, type, comicType) {
        const { offset, maxIndex } = this.data;
        const imageInfo = row.cover_image_info || {};
        const countType = type == "comic" ? `${type}-${comicType}` : type;
        const itemType = {
            topic: "专题",
            tag: "标签",
            feed: "推荐语",
            follow: "关注按钮",
            praise: "点赞按钮",
            "comic-img": "漫画封面",
            "comic-title": "漫画话名",
        };
        // 过滤推荐语
        let recommendTitle = "";
        let recommendTag = row.recommend_tag;
        recommendTag.map((listItem) => {
            if (listItem.type != 1035) {
                recommendTitle = listItem.title;
                return;
            }
        });
        app.kksaTrack("IndividualHomeClk", {
            CardType: "漫画大图卡片",
            CardTitle: row.title ? row.title.text : "",
            SubCardTitle: row.sub_title || "",
            MaterialType: String(imageInfo.image_type),
            CardBelongBrushes: maxIndex,
            CardInBrushes: index + 1 || 1,
            ClkItemType: itemType[countType] || "",
            IsManualRecTopic: row.isRec || false,
            RecommendInfo: recommendTitle, // 推荐语
        });
    },

    // 静默登录
    originLogin(e) {
        wx.setStorageSync("loginPageShow", 1); // 控制点击完静默登录后提示新手福利是否提示信息
        app.originLogin(e.detail).then((res) => {
            this.onHome();
        });
    },

    // 静默登录 dialog 对话框显示
    showDialog() {
        this.setData({
            dialog: {
                show: true,
                title: "登录成功",
                content: "授权手机号登录，可以同步其他平台的漫画阅读历史",
                button: [{ text: "拒绝" }],
            },
        });
    },
    hideDialog() {
        this.setData({
            dialog: {
                show: false,
            },
        });
    },

    onDialogButtontapEvent(e) {
        app.onDialogButtontapEvent(e);
    },

    onDiallogGetPhoneNumberEvent(e) {
        app.onDiallogGetPhoneNumberEvent(e);
    },

    // 更新新手福利领取成功需要展示的bubble内容
    getHandsBubble(e) {
        const detail = e.detail;
        if (detail.bubble) {
            this.setData({
                bubbleText: detail.bubble,
                isShowLadderWelfare: false,
            });
        } else {
            this.setData({
                isShowLadderWelfare: false,
            });
        }
    },

    // 新手福利隐藏回调
    greenIsHiddenFn(value) {
        const { code } = value.detail;
        if (code !== 500218) {
            util_handleBubble();
        }
        this.setData({
            isShowLadderWelfare: true, // 是否显示阶梯领取福利模块 (1.新手每日登录领取福利模块  2.老用户领取阶梯领取阅读币模块)
        });
    },
    // 新手福利模块结束，新版实验
    welfareMainEnd() {
        this.setData({
            isShowLadderWelfare: true,
        });
    },

    // 页面滚动监听
    onPageScroll() {
        const { suspendAnimation } = this.data;
        if (suspendAnimation) {
            this.setData(
                {
                    suspendAnimation: false,
                },
                () => {
                    let timer = setTimeout(() => {
                        clearTimeout(timer);
                        timer = null;
                        this.setData({
                            suspendAnimation: true,
                        });
                    }, 1000);
                }
            );
        }
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, recMap }) => {
        return { userInfo, follows, recMap };
    },
    (setState, _state) => ({
        setWallet(newVal) {
            setState({
                wallet: newVal,
            });
        },
        setFollows(id, newVal) {
            const follows = _state.follows;
            follows[id] = newVal;
            setState({ follows });
        },
        clearFollow() {
            setState({ follows: {} });
        },
        setRecMap(newVal) {
            setState({
                recMap: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
