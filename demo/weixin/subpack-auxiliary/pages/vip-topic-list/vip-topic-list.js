const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const api = require("./api.js");
const userInfoBehavior = require("../../../behaviors/userInfo");
const followBehavior = require("../../../behaviors/follow");
const { cdnIconsImgs } = require("../../../cdn.js");

import { util_action, util_request, util_transNum, util_checkVipInfo } from "../../../util.js";

const page = {
    behaviors: [followBehavior, userInfoBehavior],

    data: {
        pageTitle: "", // 页面标题
        pageId: 0, // 页面id
        pageType: 0, // 点击过来的专题类表类型 type=5 说明是会员限免
        offset: 0,
        limit: 20,
        isColdStart: 0, // 是否冷启动
        list: [], // 数据列表
        isVip: null, // 是否为vip
        isiOS: app.globalData.isiOS, // 是否为ios设备
        isLoad: true,
        cdnIconsImgs,
    },

    watchUser(uid) {
        if (uid && this.data.list.length > 0) {
            const topicList = this.data.list.map((item) => item.id);
            this.checkFollow(topicList);
        } else {
            this.clearFollow();
        }
    },

    // 默认分享
    onShareAppMessage() {},

    onLoad(options) {
        let { title = "会员限免", id = 0, type = 0 } = options;
        this.setData({
            pageTitle: title,
            pageId: id,
            pageType: type, // 点击过来的专题类表类型  type=5 说明是会员限免
        });
        wx.setNavigationBarTitle({ title });
        this.setTrigger(options);
        this.getBannerInfo();
    },

    onShow() {
        // qq存在返回详情页title丢失问题
        const { pageTitle } = this.data;
        if (pageTitle && global.channel == "qq") {
            wx.setNavigationBarTitle({
                title: pageTitle,
            });
        }
        this.checkVipInfo();
    },

    // 触发下拉刷新时执行
    onPullDownRefresh() {
        // 加载数据
        this.getBannerInfo(() => {
            // 关闭下拉刷新
            wx.stopPullDownRefresh();
        });
    },

    onReady() {},

    // 获取数据类表 S
    getBannerInfo(callback) {
        if (!callback || typeof callback != "function") {
            callback = callback;
        } else {
            callback = () => {};
        }

        let sendData = {
            id: this.data.pageId,
            is_cold_start: this.data.isColdStart,
        };
        api.getBannerInfo(sendData)
            .then((res) => {
                let { code, data } = res;
                let serverTime = data.server_time ? data.server_time : new Date().getTime(); // 服务器当前时间
                const followMap = {};
                const list = data.topics.map((item) => {
                    const like_count = item.like_count || item.likes_count || 0;
                    const comment_count = item.comment_count || item.comments_count || 0;
                    followMap[item.id] = item.is_favourite;
                    // this.setFollows(item.id, item.is_favourite);
                    // let updatedAt = item.updated_at ? item.updated_at : 0;
                    // let time=null;
                    // if(updatedAt){ //获取剩余时间
                    // 		time =  Math.floor(updatedAt / 1000 / 60 / 60 / 24);
                    // 		time = time <= 0 ? '': time;//最小只能是1天
                    // }
                    let endTime = item.end_time ? item.end_time : 0; // 活动结束时间
                    let startTime = item.start_time ? item.start_time : 0; // 活动开始时间
                    let time = null;
                    if (endTime - startTime > 0) {
                        time = Math.floor((endTime - serverTime) / 1000 / 60 / 60 / 24);
                        time = time <= 0 ? "" : time; // 最小只能是1天
                    }

                    return {
                        id: item.id, // id
                        title: item.title, // 标题x
                        time, //
                        img: item.cover_image_url, // 封面图
                        category: item.category, // 标签
                        fav: item.is_favourite, // 是否关注
                        iconData: item.special_offer, // 封面角标
                        praise: util_transNum(like_count), // 点赞数
                        comment: util_transNum(comment_count), // 评论数
                        uuid: `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`,
                        data: item, // 原生数据
                    };
                });
                this.setData(
                    {
                        list, // 存储数据
                        isLoad: false, // 隐藏加载窗
                    },
                    () => {
                        this.setBatchFollows(followMap);
                        callback();
                    }
                );
            })
            .catch((err) => {
                this.setData({ isLoad: false }); // 隐藏加载窗
                callback();
            });
    },

    handleFav(e) {
        const { id, index } = e.currentTarget.dataset;
        // const multPage = util_multPage(this.data.pageTrigger);
        // const { CurPage } = multPage;
        if (!this.handleFollow) {
            console.log("版本过低,请升级微信");
            return false;
        }
        this.handleFollow(id, false, (res) => {
            // 埋点
            // const row = this.data.list[index];
            // app.kksaTrack('FavTopic',{
            // 		...multPage,
            // 		TopicID: row.id,
            // 		TopicName: row.title,
            // 		IsPaidComic: '',
            // 		NickName: '',
            // 		AuthorID: '',
            // 		Category: '',
            // 		TriggerPage:CurPage,
            // })
        });
    },

    // 图片懒加载
    onImageLoad(event) {
        // console.log(event)
    },

    setTrigger(data) {
        this.setPageTrigger("vip-topic-list", {
            ...data,
        });
    },

    // 会员信息查询 (是否展示会员)
    checkVipInfo() {
        let isVip = false;
        if (!this.data.userInfo) {
            this.setData({ isVip });
            this.setVipinfo({});
            return;
        }
        util_checkVipInfo(this, (res) => {
            isVip = res.vip_type > 0;
            this.setData({ isVip });
        });
    },

    // 点击专题->跳转到专题详情页
    topicItemTap(event) {
        const { id } = event.currentTarget.dataset;
        let type = 2;
        util_action({ type, id, params: { source: "vip-topic-list" } });
    },

    // 点击会员开通(会员续费)按钮
    goVipTap() {
        util_action({ type: 43, subpack: true, params: { source: "vip-topic-list" } });
    },

    // 检测封面小角标加载
    imgbindload(e) {
        let { index } = e.currentTarget.dataset;
        let data = this.data.list[index]; // 当前图片所在的模块
        let { width, height } = e.detail;
        data.width = width / app.globalData.screenRpxRate; // 实际宽度
        data.height = height / app.globalData.screenRpxRate; // 实际高度
        if (data.height > 28) {
            data.width = data.width / 2;
            data.height = data.height / 2;
        }
        this.setData({
            [`list[${index}].width`]: data.width, // 实际宽度
            [`list[${index}].height`]: data.height, // 实际宽度
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, pageTrigger }) => {
        return { userInfo, follows, pageTrigger };
    },
    (setState, _state) => ({
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
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
    })
)(page);

Page(ConnectPage);
