import IntersectionObserver from "../../common/js/intersection.js";

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const userInfoBehavior = require("../../behaviors/userInfo");
const followBehavior = require("../../behaviors/follow");
const { globalImgs } = require("../../cdn.js");

import { util_request, util_action, util_showToast, util_transNum, util_multPage } from "../../util.js";

const page = {
    behaviors: [followBehavior, userInfoBehavior],
    data: {
        listTitle: "",
        query: {},
        offset: 0,
        limit: 20,
        list: [],
        error: false,
        empty: false,
        loading: true,
        finished: false,
        complete: false,
        running: true,
        isRefresh: false,
        isLogin: false,

        // 曝光相关
        observerList: [],
        hashList: [],
        hashTimer: null,
        observerTimer: null,
        globalImgs,
    },
    watchUser(uid) {
        if (uid && this.data.list.length > 0) {
            const topicList = this.data.list.map((item) => item.id);
            this.checkFollow(topicList);
            this.setData({
                isLogin: !!uid,
            });
        } else {
            this.clearFollow();
        }
    },
    // 默认分享
    onShareAppMessage() {},
    onLoad(options) {
        // this.data.query = {
        // 	type: 'find',
        // 	module_id: 666,
        // 	card_type: 'bookList',
        // 	title: '试试'
        // };
        // this.data.query = {
        // 	type: 'feed',
        // 	recommend_type: 1028,
        // 	recommend_by: null,
        // 	title: '测试'
        // }
        // this.data.query = {
        // 	type: 'search',
        // 	q: '一',
        // 	title: '哈哈哈'
        // }
        this.data.query = options;
        if (options.title == "会员整本限免") {
            this.getFindFreeData();
            return;
        }

        this.getList();
        this.setTrigger();
    },
    onShow() {
        // qq存在返回详情页title丢失问题
        const { listTitle } = this.data;
        if (listTitle && global.channel == "qq") {
            wx.setNavigationBarTitle({
                title: listTitle,
            });
        }
        this.visitPage();
        this.setData({
            isLogin: !!global.userId,
        });
    },
    // 访问列表页神策上报
    visitPage() {
        const { type, title, recommend_title = "" } = this.data.query;
        const options = {
            TriggerPage: "",
            TabName: title,
        };
        let itemType = "标签";

        if (type == "find") {
            options.TriggerPage = "FindPage";
            itemType = "发现_查看更多";
        }

        if (type == "comic") {
            options.TriggerPage = "ComicPage";
            itemType = "漫画推荐_查看更多";
        }

        if (type == "feed") {
            const newTitle = recommend_title.toLowerCase();
            itemType = "普通推荐语";
            if (newTitle.indexOf("top") > -1) {
                itemType = "热度推荐语";
            }
            Object.assign(options, {
                ClkItemName: recommend_title,
                TriggerPage: "RecommendPage",
            });
        }

        Object.assign(options, {
            ClkItemType: itemType,
        });

        app.kksaTrack("SecondVisitPage", options);
    },
    // 下拉刷新
    onPullDownRefresh() {
        if (this.data.running) {
            return false;
        }
        this.setData({
            offset: 0,
            complete: false,
            empty: false,
            loading: false,
            isRefresh: true,
            isTriggerRefresh: true,
        });
        this.data.observerList = [];
        this.data.list = [];
        this.getList();
    },

    // 触底回调
    onReachBottom() {
        const { complete, running } = this.data;
        if (!complete && !running) {
            this.setData({
                running: true,
                loading: true,
            });
            this.getList();
        }
    },
    onReady() {
        const title = this.data.query.title || "";
        this.data.listTitle = title;
        wx.setNavigationBarTitle({ title });
    },
    // 加载数据
    getList() {
        const params = this.getApiData();
        util_request(params)
            .then((res) => {
                const isSearch = !!res.data.hit;

                // 搜索模式添加适配数据
                if (isSearch) {
                    const pageNum = this.data.offset + 1;
                    const pageTotal = Math.ceil(res.data.total / this.data.limit);
                    Object.assign(res, {
                        data: {
                            topics: res.data.hit,
                            offset: pageNum >= pageTotal ? -1 : pageNum,
                        },
                    });
                }

                const { data } = res;
                const offset1 = data.offset || data.since || 0;
                const isEnough = data.topics.length < this.data.limit;
                const since = isSearch ? offset1 : isEnough ? -1 : offset1;
                const followMap = {};
                const list = data.topics.map((item) => {
                    const des = item.recommend_text || item.subtitle || item.description || "";
                    const fav_count = item.favourite_count || 0;
                    const like_count = item.like_count || item.likes_count || 0;
                    const comment_count = item.comment_count || item.comments_count || 0;
                    const recMap = item.rec_data_report_map || {};
                    followMap[item.id] = item.is_favourite;
                    return {
                        des,
                        recMap,
                        id: item.id,
                        title: item.title,
                        img: item.vertical_image_url,
                        category: item.category,
                        fav: item.is_favourite,
                        publishTime: item.publish_time || "",
                        favCount: util_transNum(fav_count),
                        praise: util_transNum(like_count),
                        comment: util_transNum(comment_count),
                        uuid: `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`,
                    };
                });
                this.setData(
                    {
                        list: this.data.list.concat(list),
                    },
                    () => {
                        this.setBatchFollows(followMap);
                        clearTimeout(this.data.observerTimer);
                        this.data.observerTimer = setTimeout(() => {
                            this.handlerObserver();
                        }, 500);
                    }
                );

                if (this.data.isRefresh) {
                    wx.stopPullDownRefresh();
                }

                const length = this.data.list.length;
                const empty = length == 0;
                const offset = empty ? -1 : since;
                const complete = offset === -1;

                this.setData({
                    offset,
                    loading: !complete,
                    running: false,
                    error: false,
                    complete,
                    empty,
                    isRefresh: false,
                    finished: complete && !empty && length > 8,
                });
            })
            .catch((error) => {
                this.setData({
                    error: true,
                    isRefresh: false,
                    loading: false,
                });
            });
    },
    getApiData() {
        const { offset, limit } = this.data;
        let { q, id, type, subtitle, module_id, card_type, recommend_by, recommend_type } = this.data.query;
        subtitle = subtitle ? decodeURIComponent(subtitle) : "";
        q = q ? decodeURIComponent(q) : "";
        if (type == "feed") {
            return {
                url: `/v1/freestyle/mini/home_recommend/${global.channel}/more`,
                data: {
                    gender: global.gender == null ? 0 : global.gender,
                    since: offset,
                    recommend_by,
                    recommend_type,
                    limit,
                },
            };
        } else if (type == "find") {
            return {
                url: `mini/v1/comic/${global.channel}/discovery/module_more`,
                data: {
                    gender: global.gender == null ? 0 : global.gender,
                    module_id,
                    since: offset,
                    card_type,
                    subtitle,
                    limit,
                },
            };
        } else if (type == "search") {
            return {
                host: "search",
                url: `/v1/search/tag_label`,
                data: {
                    q,
                    sort: 0,
                    size: limit,
                    page: offset + 1,
                },
            };
        } else if (type == "comic") {
            // 漫底推荐-精品模块
            return {
                url: `/mini/v1/comic/${global.channel}/comic/recommend/more`,
                data: {
                    album_id: id,
                    since: offset,
                    limit,
                },
            };
        } else {
            return {};
        }
    },
    // 监听曝光
    handlerObserver() {
        if (this.topicObserver) {
            this.topicObserver.disconnect();
        }
        this.topicObserver = new IntersectionObserver({
            selector: ".topic-observer",
            observeAll: true,
            context: this,
            threshold: 0.1,
            onEach: (res) => {
                const { index } = res.dataset || {};
                return index;
            },
            onFinal: (args) => {
                if (!args) {
                    return;
                }
                args.forEach((item) => {
                    if (!this.data.observerList.includes(item)) {
                        this.data.observerList.push(item);
                        this.handleViewList(item);
                    }
                });
            },
        });
        this.topicObserver.connect();
    },
    // 曝光上报防抖
    handleViewList(index) {
        if (this.data.hashTimer) {
            clearTimeout(this.data.hashTimer);
        }
        this.data.hashList.push(index);
        this.data.hashTimer = setTimeout(() => {
            const data = JSON.stringify(this.data.hashList);
            this.handlerFeedTrack("ItemImp", JSON.parse(data));
            this.data.hashList = [];
        }, 500);
    },
    // 推荐数据曝光上报
    handlerFeedTrack(event, options) {
        let tracking = [];
        options.forEach((item) => {
            tracking.push(this.handlerFeedData(item));
        });
        app.kksaTrack(event, tracking);
    },
    handlerFeedData(index) {
        const multPage = util_multPage();
        const { TriggerPage: PrePage } = multPage;
        const { list, listTitle } = this.data;
        const idx = parseInt(index);
        const options = {
            ...multPage,
            ItemPos: 1,
            ItemName: listTitle,
            PrePage,
        };
        if (idx >= 0) {
            const row = list[index] || {};
            const recMap = row.recMap || {};
            return {
                ...options,
                ...recMap,
                MembershipClassify: "",
                ItemType: "专题",
                TopicID: row.id || 0,
                TopicName: row.title || "",
                InItemPos: index + 1,
            };
        } else {
            return options;
        }
    },
    // 跳转专题
    action(e) {
        const { id, index, rec: recMap = {} } = e.currentTarget.dataset;
        this.setRecMap(recMap);
        util_action({ type: 68, id: "", parentid: id });

        // 推荐数据点击上报
        app.kksaTrack("ItemClk", this.handlerFeedData(index));
    },
    // 关注
    handleFav(e) {
        const { id, index } = e.currentTarget.dataset;
        const multPage = util_multPage(this.data.pageTrigger);
        const { CurPage } = multPage;
        const { recMap } = this.data;
        this.handleFollow(id, false, (res) => {
            const row = this.data.list[index];
            const itemRecMap = row.recMap;
            const trackData = {
                ...multPage,
                TopicID: row.id,
                TopicName: row.title,
                NickName: "",
                AuthorID: "",
                Category: "",
                TriggerPage: CurPage,
            };
            if (res) {
                // 关注专题
                // 上报数据组
                app.kksaTrack(
                    "FavTopic",
                    Object.assign({}, trackData, {
                        ...recMap,
                        ...itemRecMap,
                    })
                ); // 上报神策
            } else {
                // 取消关注专题
                app.kksaTrack("RemoveFavTopic", trackData); // 上报神策
            }
        });
    },
    // 设置全局active变量
    setTrigger() {
        this.setPageTrigger("topic-list", {
            ...this.data.query,
        });
    },
    // 静默登录
    originLogin(e) {
        app.originLogin(e.detail).then((res) => {
            this.setData({
                isLogin: true,
            });
            const topicList = this.data.list.map((item) => item.id);
            this.checkFollow(topicList);
        });
    },
    stopPop() {
        console.log("stop");
    },
    // dialog 对话框显示
    showDialog() {
        this.setData({
            dialog: {
                show: true,
                title: "登录成功",
                content: "授权手机号登录，可以同步其他平台的漫画阅读历史",
                // contentTwo: '我们不会泄露您的任何隐私',
                // contentThree: '《隐私协议》',
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
    // vip限免模块
    getFindFreeData() {
        util_request({
            url: `/v1/payactivity/topic_free_mini/discover_page_topic`,
            host: "pay",
            method: "get",
            data: {
                activity_name: "totalfree",
                pool_name: "totalfreelist",
            },
        }).then((res) => {
            let { code, data, message } = res;
            let list = [];
            data.topic_infos.forEach((item, index) => {
                if (!list[index]) {
                    list[index] = {};
                }
                list[index].des = item.description;
                list[index].category = item.labels;
                list[index].img = item.vertical_image_url;
                list[index].id = item.topic_id;
                list[index].title = item.topic_title;
                list[index].assign_status = item.assign_status;
                list[index].assign_encrypt_str = item.assign_encrypt_str;
                list[index].isLimitFree = true;
            });
            let diffTime = data.activity_period_time - new Date().getTime();
            let dayTime = parseInt(diffTime / (1000 * 3600 * 24)) == 0 ? 1 : parseInt(diffTime / (1000 * 3600 * 24));
            this.setData({
                list,
                dayTime,
                error: true,
                isRefresh: false,
                loading: false,
            });
        });
    },
    // 限免领取
    assignAward(e) {
        const { index, assign, title } = e.currentTarget.dataset;
        util_request({
            url: `/v1/payactivity/topic_free_mini/assign_topic`,
            host: "pay",
            method: "post",
            data: {
                assign_encrypt_str: assign,
                order_from: 3,
            },
        })
            .then((res) => {
                let { code, data, message } = res;
                // 本地刷新其他数据
                let showFreeList = this.data.list;
                showFreeList.map((item, curIndex) => {
                    if (index == curIndex) {
                        item.assign_status = 1;
                    } else {
                        item.assign_status = 2;
                    }
                });
                this.setData({
                    list: showFreeList,
                });
                // 领取成功埋点
                app.kksaTrack("UserDefinedTabFindPageClk", {
                    ButtonName: "查看更多领取限免",
                    ModuleName: "会员整本限免",
                    isSuccessReceived: 1,
                    TopicName: title,
                });
            })
            .catch((error) => {
                util_showToast({
                    title: "领取失败",
                });
                // 领取失败埋点
                app.kksaTrack("UserDefinedTabFindPageClk", {
                    ButtonName: "查看更多领取限免",
                    ModuleName: "会员整本限免",
                    isSuccessReceived: 0,
                    TopicName: title,
                });
            });
    },
    // 跳转连续阅读详情页
    getContinueId(e) {
        const { id, title } = e.currentTarget.dataset;
        // 免费阅读埋点
        app.kksaTrack("UserDefinedTabFindPageClk", {
            ButtonName: "查看更多免费阅读",
            ModuleName: "会员整本限免",
            TopicName: title,
        });
        // 获取专题续读id跳转
        util_request({
            url: `/v2/comicbuy/read/get_comic_ids`,
            host: "pay",
            method: "get",
            data: {
                topic_ids: id * 1,
            },
        }).then((res) => {
            const { comic_read } = res.data;
            const comicId = comic_read[0].last_read_comic_id;
            util_action({ type: 3, id: comicId });
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, pageTrigger, recMap }) => {
        return { userInfo, follows, pageTrigger, recMap };
    },
    (setState, _state) => ({
        setFollows(id, newVal) {
            const follows = _state.follows;
            follows[id] = newVal;
            setState({ follows });
        },
        setBatchFollows(newVal) {
            const follows = _state.follows;
            setState({
                follows: Object.assign(follows, newVal),
            });
        },
        clearFollow() {
            setState({ follows: {} });
        },
        setPageTrigger(page, newVal) {
            const pageTrigger = _state.pageTrigger;
            pageTrigger[page] = newVal;
            setState({ pageTrigger });
        },
        setRecMap(newVal) {
            setState({
                recMap: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
