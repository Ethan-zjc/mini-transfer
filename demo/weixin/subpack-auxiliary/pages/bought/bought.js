import { util_request, util_action, util_showToast } from "../../../util.js";

const app = getApp();

Page({
    data: {
        offset: 0,
        limit: 20,
        manage: false,
        canceled: false,
        cancelDetail: {},
        dialogShow: false,
        mock: {},

        // 绑定渲染列表
        list: [],
        // 是否出错
        error: false,
        // 是否为空
        empty: false,
        // 加载中
        loading: true,
        // 加载完是否显示底部文案
        finished: false,
        // 是否加载完成
        complete: false,
        // 请求接口中，防重复
        running: true,
        isRefresh: false,
    },
    onLoad: function onLoad(opts) {
        const type = opts.type;
        if (type == "bought") {
            // 已购列表
            if (app.globalData.isiOS) {
                wx.setNavigationBarTitle({ title: "我的漫画" });
            } else {
                wx.setNavigationBarTitle({ title: "已购漫画" });
            }
            this.data.url = "/v2/comicbuy/get_purchased_topics";
        } else if (type == "manage") {
            // 自动购买管理
            wx.setNavigationBarTitle({ title: "自动购买管理" });
            this.data.url = "/v2/comicbuy/auto_pay/list";
            this.setData({
                manage: true,
            });
        }
        this.init();
    },
    init() {
        this.setData({
            list: [],
            offset: 0,
            complete: false,
            empty: false,
            loading: false,
            finished: false,
            running: true,
        });
        this.getList();
    },
    getList() {
        util_request({
            host: "pay",
            url: this.data.url,
            data: {
                since: this.data.offset,
                limit: this.data.limit,
            },
        })
            .then((res) => {
                const { data } = res;
                const isManage = this.data.manage;
                const since = data.offset || data.since || 0;
                const list = data.topics.map(function (item) {
                    return {
                        id: item.id,
                        cover: item.cover_image_url,
                        title: item.title,
                        text1: isManage ? item.user.nickname : "\u5DF2\u8D2D" + item.purchased_comic_count + "\u8BDD",
                        text2: isManage ? item.purchased_comic_info : "\u66F4\u65B0\u81F3\uFF1A" + item.latest_comic_title,
                    };
                });

                this.setData({
                    list: this.data.list.concat(list),
                });

                if (this.data.isRefresh) {
                    wx.stopPullDownRefresh();
                }

                const length = this.data.list.length;
                const empty = length == 0;
                const offset = empty ? -1 : list.length < this.data.limit ? -1 : since;
                const complete = offset === -1;

                this.setData({
                    offset,
                    loading: !complete,
                    running: false,
                    error: false,
                    complete,
                    empty,
                    isRefresh: false,
                    finished: complete && !empty && length > 5,
                });
            })
            .catch((error) => {
                this.setData({
                    running: false,
                    error: true,
                    isRefresh: false,
                    loading: false,
                });
            });
    },
    onPullDownRefresh() {
        if (this.data.running) {
            return false;
        }
        this.data.list = [];
        this.setData({
            offset: 0,
            complete: false,
            empty: false,
            loading: false,
            finished: false,
            running: true,
            isRefresh: true,
        });
        this.getList();
    },
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
    toTopic(e) {
        const { id, type = 2 } = e.currentTarget.dataset;
        util_action({
            params: { tab: 1 },
            type,
            id,
        });
    },
    cancelRequest(e) {
        const { id, index } = e.currentTarget.dataset;
        this.data.loading = true;
        util_request({
            method: "DELETE",
            host: "pay",
            url: "/v2/comicbuy/auto_pay",
            data: {
                topic_id: id,
            },
        })
            .then((res) => {
                this.data.loading = false;

                const list = this.data.list.filter(function (item) {
                    return item.id !== id;
                });
                const length = list.length;
                this.data.offset--;
                this.setData({
                    list: list,
                    empty: length === 0,
                    finished: length != 0 && length > 5,
                });

                util_showToast({
                    title: "取消成功",
                    type: "success",
                });
            })
            .catch((error) => {
                util_showToast({
                    title: "取消失败",
                });
            });
    },
    cancelAuto(e) {
        if (this.data.canceled) {
            this.cancelRequest(e);
        } else {
            this.setData({
                dialogShow: true,
                cancelDetail: e,
            });
        }
    },
    tapDialogButton(e) {
        const { index } = e.detail;
        this.setData({
            dialogShow: false,
        });
        if (index == 1) {
            this.data.canceled = true;
            this.cancelRequest(this.data.cancelDetail);
        }
    },
});
