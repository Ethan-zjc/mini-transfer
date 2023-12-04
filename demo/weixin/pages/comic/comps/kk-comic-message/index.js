/**
 * 公众号订阅弹窗
 * **/

const app = getApp();
const global = app.globalData;

import { util_action, util_request, util_showToast } from "../../../../util.js";

Component({
    properties: {
        userInfo: {
            type: Object,
            value: null,
        },
        topicId: {
            type: [Number, String],
            value: 0,
        },
        topicTitle: {
            type: String,
            value: "",
        },
        comicId: {
            type: [Number, String],
            value: 0,
        },
        comicTitle: {
            type: String,
            value: "",
        },
        pageShow: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        isShowTips: false,
        isShowSub: false,
        subUrl: "",
        timer: null,
    },
    observers: {
        pageShow: function (pageShow) {
            if (pageShow) {
                this.checkInfo();
            }
        },
    },
    attached() {
        this.checkInfo();
    },
    methods: {
        initData() {
            this.setData({
                isShowTips: !this.properties.userInfo,
            });
            if (this.data.isShowTips) {
                this.commonTrack("CommonPopup", {
                    popupName: "登录弹窗",
                });
            }
            if (!this.data.isShowTips && !global.mpSubscribeFlag) {
                global.mpSubscribeFlag = true;
                this.checkMsg().then((res) => {
                    const { code, data = {}, message = "服务异常" } = res;
                    let popupName = "";
                    if (code == 100200) {
                        this.data.subUrl = data.url || "";
                        this.setData({
                            isShowSub: true,
                        });
                        popupName = "关注公众号弹窗";
                    } else {
                        util_showToast({
                            title: code == 200 ? `已发放${data.kkb || 0}kk币到账户` : message,
                        });
                        popupName = `${code == 200 ? "领取成功" : "发放失败"}提示`;
                    }
                    this.commonTrack("CommonPopup", { popupName });
                });
            }
        },
        checkInfo() {
            if (this.data.timer) {
                clearTimeout(this.data.timer);
            }
            this.data.timer = setTimeout(() => {
                clearTimeout(this.data.timer);
                this.initData();
            }, 500);
        },
        checkMsg() {
            return new Promise(async (resolve) => {
                const code = await this.checkCode().catch(() => {});
                if (!code) {
                    resolve({});
                    return;
                }
                util_request({
                    method: "post",
                    url: `/v1/partner_message/official/account/award`,
                    data: {
                        uid: global.userId,
                        code,
                    },
                })
                    .then((res) => {
                        resolve(res);
                    })
                    .catch((error) => {
                        resolve(error || {});
                    });
            });
        },
        checkCode() {
            return new Promise((resolve, reject) => {
                wx.login({
                    complete: (res) => {
                        if (res.code) {
                            resolve(res.code);
                        } else {
                            reject();
                        }
                    },
                });
            });
        },
        tapLogin() {
            wx.navigateTo({ url: "/pages/login/login" });
            this.commonTrack("CommonBtnClk", {
                ButtonName: "立即登录",
            });
        },
        tapAction() {
            if (this.data.subUrl) {
                util_action({
                    url: this.data.subUrl,
                    type: 2003,
                });
            } else {
                util_showToast({
                    title: "跳转链接异常",
                });
            }
            this.commonTrack("CommonBtnClk", {
                ButtonName: "关注公众号按钮",
            });
            this.setData({
                isShowSub: false,
            });
        },
        tapLoginClose() {
            this.setData({
                isShowTips: false,
            });
            this.commonTrack("CommonBtnClk", {
                ButtonName: "登录关闭弹窗",
            });
        },
        tapSendClose() {
            this.setData({
                isShowSub: false,
            });
            this.commonTrack("CommonBtnClk", {
                ButtonName: "关注关闭弹窗",
            });
        },
        commonTrack(event, value = {}) {
            const { comicTitle: ComicName, comicId: ComicID, topicId: TopicID, topicTitle: TopicName } = this.data;
            const options = {
                ComicID,
                ComicName,
                TopicID,
                TopicName,
                CurPage: "漫画页订阅弹窗",
                ...value,
            };
            app.kksaTrack(event, options);
        },
    },
});
