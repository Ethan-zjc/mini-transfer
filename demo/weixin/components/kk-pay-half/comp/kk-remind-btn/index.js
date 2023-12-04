// components/kk-pay-dialog-basic/comp/kk-remind-btn/index.js
const app = getApp();
const global = app.globalData;
const { util_logout, util_request, util_showToast, util_showNotify } = require("../../../../util.js");

Component({
    properties: {
        bottomVipBanner: {
            type: Object,
            value: {},
        },
        bottomVipBannerText: {
            type: Object,
            value: {},
        },
        isVip: {
            type: Boolean,
            value: false,
        },
        topicId: {
            type: Number,
            value: 0,
        },
        comicId: {
            type: Number,
            value: 0,
        },
        activityId: {
            type: [Number, String],
        },
    },
    data: {},
    attached() {
        this.setData({
            isLogin: global.userId,
        });
    },
    methods: {
        // 行为解锁 3:分享漫画 4:关注公众号 5:添加到我的小程序 6:添加到手机桌面
        behaviorUnlock(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            let { btntype, jumptype, btnname, sign } = dataset;
            app.kksaTrack("ClickPayPopup", {
                ButtonName: btnname || "底部强提示按钮",
                ActivityName: btnname,
                NoticeType: btnname || "底部强提示按钮",
                PUWID: this.data.activityId, // 弹窗id
            });
            if (jumptype == 3) {
                // 分享解锁签名sign
                console.log("分享解锁sign", sign);
                if (!sign) {
                    return;
                }
            } else if (jumptype == 4) {
                // 关注公众号,给出中间toast提示
                console.log("其他方式解锁");
                this.behaviorReport({ type: jumptype });
                util_showToast({
                    title: "搜索“快看club”关注公众号成功后，从公众号中阅读漫画进入KK币自动到账",
                    duration: 5000,
                    position: { bottom: "50%" },
                });
            } else if (jumptype == 5 || jumptype == 6) {
                // 5:添加到我的小程序 6:添加到手机桌面
                // 此时显示气泡引导、上报服务端点击
                this.behaviorReport({ type: jumptype });
                util_showNotify({
                    title: `点击...添加到${jumptype == 6 ? "桌面" : "我的小程序"}`,
                    subtitle: `添加成功后从${jumptype == 6 ? "桌面" : "我的小程序"}进入KK币自动到账`,
                });
            }
        },
        // 登录情况下行为点击上报
        behaviorReport({ type = 4 } = {}) {
            const { topicId, comicId, isLogin } = this.data;
            if (!isLogin) {
                util_logout();
            } else {
                util_request({
                    method: "get",
                    host: "pay",
                    url: "/v1/payactivity/behavoir_task/complete",
                    data: {
                        topic_id: topicId,
                        comic_id: comicId,
                        source: 1,
                        event: type,
                    },
                })
                    .then((res) => {
                        console.log("行为上报成功", res);
                    })
                    .catch((error) => {
                        console.log("行为上报失败", error);
                    });
            }
        },
        // 定向限免跳转会员开通页
        jumpVip(event) {
            const { type, id, url, actname = "", jumptype, btnname } = event.currentTarget.dataset; // 数据集合
            console.log(event, 77777);
            this.triggerEvent("limitFreeVipFun", {
                type,
                id,
                url,
                actname,
                jumptype,
                btnname,
                btntype: 0,
            });
        },
        onLoginTap(event) {
            app.originLogin(event.detail).then((res) => {
                let comicId = this.data.comicId;
                wx.redirectTo({
                    url: `/pages/${getApp().globalData.abContinuRead ? "comicnew/comicnew" : "comic/comic"}?id=${comicId}&comicId=${comicId}`,
                });
            });
        },
    },
});
