import { util_request, util_action } from "../../../util.js";

const app = getApp();
const global = app.globalData;

Page({
    data: {
        offset: 0,
        limit: 20,
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
        addShowType2: true, // '用完'的代金券  true:可以设置
        addShowType3: true, // '过期' 的代金券  true:可以设置
    },
    onLoad() {
        this.setData({
            iPhoneX: global.iPhoneX,
        });
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
        const _this = this;
        util_request({
            host: "pay",
            url: "/v2/kb/rp_assigned",
            data: {
                since: this.data.offset,
                limit: this.data.limit,
            },
        })
            .then((res) => {
                const { data } = res;
                const since = data.offset || data.since || 0;
                const list = data.red_packets.map(function (item, index) {
                    item.cover = item.cover_image_url;
                    const type = item.type;
                    let showType = [2, 3].includes(type);
                    let showType2 = [2].includes(type);
                    let showType3 = [3].includes(type);
                    const last = data.red_packets[index - 1];
                    if (showType && last && last.type == type) {
                        showType = false;
                    }
                    if (_this.data.addShowType2 && showType2) {
                        _this.data.addShowType2 = false;
                        item.showType = showType;
                        item.recycleSize = [750, 488];
                    }
                    if (_this.data.addShowType3 && showType3) {
                        _this.data.addShowType3 = false;
                        item.showType = showType;
                        item.recycleSize = [750, 488];
                    }
                    const time = new Date(item.expire_at);
                    item.time = time.getFullYear() + "\u5E74" + (time.getMonth() + 1) + "\u6708" + time.getDate() + "\u65E5";
                    return item;
                });

                this.setData({
                    list: this.data.list.concat(list),
                });

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
                    finished: complete && !empty && length > 2,
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
        this.data.addShowType2 = true; // '用完'的代金券  true:可以设置
        this.data.addShowType3 = true; // '过期' 的代金券  true:可以设置
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
        const { id, type = 2, tab = 0 } = e.currentTarget.dataset;
        util_action({
            params: { tab: 1 },
            id,
            type,
        });
    },
    toRules: function toRules() {
        wx.navigateTo({
            url: "/subpack-auxiliary/pages/intro/intro?type=coupon",
        });
    },
    toDetail: function toDetail(event) {
        const params = event.currentTarget.dataset;
        wx.navigateTo({
            url: "/subpack-auxiliary/pages/coupon-detail/coupon-detail?index=" + params.index,
        });
    },
});
