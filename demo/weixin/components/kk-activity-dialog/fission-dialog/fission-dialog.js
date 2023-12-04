/**
 * 1、接受安利去抽奖; 2、去安利好友
 */

import { util_request } from "../../../util.js";
const app = getApp();
const global = getApp().globalData;

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },
    properties: {
        show: {
            // 是否显示弹窗
            type: Boolean,
            value: false,
        },
        mode: {
            // 类型是team:邀请组队， award:开奖
            type: String,
            value: "award",
        },
        contain: {
            // 弹窗内容
            type: Object,
            value: {}, // {title: '', desc: '', button: '', url: '', type: ''}
        },
        userInfo: {
            type: Object,
            value: {},
        },
        trackCode: {
            type: String,
            value: "",
        },
        shareTarget: {
            type: Number,
            value: -1,
        },
        terminal: {
            type: String,
            value: "",
        },
    },
    data: {
        unlogin: false,
    },
    observers: {
        contain(val) {
            const { userInfo, unlogin } = this.data;
            if (userInfo && unlogin && val && val.type == 12) {
                this.setData({ show: false });
                this.acceptReport();
                // 自动跳转到活动页, 拼接originType=1，代表登录后自动进入活动页
                wx.navigateTo({
                    url: `${val.url}${val.url.includes("?") ? "&originType=1" : "?originType=1"}`,
                });
            } else {
                this.setData({ unlogin: false });
            }
        },
    },
    methods: {
        close() {
            this.setData({
                show: false,
            });
            getApp().globalData.activityTrackId = "";
            this.triggerEvent("dialogTap", { eventName: "CLOSE" });
        },

        /**
         * accept: 接受安利, award: 奖励弹窗立即收下
         */
        eventBtn() {
            const { mode, userInfo, contain } = this.data;
            if (mode == "award") {
                this.setData({
                    show: false,
                });
                this.triggerEvent("dialogTap", { eventName: "CLOSE" });
            } else {
                // 详情页弹窗点击相关埋点
                if (global.openId) {
                    this.trackClickPop();
                } else {
                    global.openIdCallback = () => {
                        this.trackClickPop();
                    };
                }
                if (!userInfo) {
                    this.setData({ unlogin: true });
                    wx.navigateTo({ url: "/pages/login/login" });
                    return false;
                }
                if (contain.type && contain.type == 12) {
                    this.acceptReport();
                }
                this.setData({
                    show: false,
                });
                // 跳转活动页, 根据按钮类型在url后面拼接参数
                wx.navigateTo({
                    url: `${contain.url}${contain.url.includes("?") ? "&originType=" : "?originType="}${contain.type}`,
                });
            }
        },

        /**
         * 接受安利上报
         */
        acceptReport() {
            const { channel } = global,
                { trackCode } = this.data;
            util_request({
                url: "/v1/share/content/sincere/accept/report",
                method: "post",
                data: {
                    track_code: trackCode,
                    share_from: channel == "qq" ? 2 : 3,
                },
            }).then(() => {
                console.log("上报成功了");
            });
        },
        trackClickPop() {
            const { terminal } = this.data;
            const data = {
                SourcePlatform: global.channel, // 来源平台
                ShareTerminal: global.scene == 1036 || !terminal ? "APP" : terminal, // 分享终端
                Comicbuttontype: this.data.contain.type == 12 ? 4 : 5, // 漫画详情页按钮类型 4-接受安利去抽奖 5-去安利好友
                SourceActivity: 2, // 来源活动 2-安利漫画领奖励活动
                Source: this.data.shareTarget, // 分享渠道
                IsLogin: !!this.data.userInfo, // 是否登录
            };
            console.log("活动引导弹窗点击上报", data);
            app.kksaTrack("Clickcomicpage", data);
        },
    },
});
