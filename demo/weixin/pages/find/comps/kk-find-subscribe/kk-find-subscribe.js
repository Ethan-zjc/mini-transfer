/*
 发现页订阅弹窗
 */
const app = getApp();
const global = app.globalData;
const api = require("../../api");

import { util_requestSubscribeMessage, util_sendNotifyApi, util_logManager } from "../../../../util.js";

Component({
    properties: {
        datas: {
            type: Object,
            optionalTypes: [String, Array],
            value: {},
        },
        height: {
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        width: {
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        cssName: {
            type: String,
            optionalTypes: [Number],
            value: "",
        },
        i: {
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
    },
    data: {
        coldBoot: true,
        dialogMsg: {
            show: false,
        },
    },
    pageLifetimes: {
        show() {
            if (!this.data.coldBoot) {
                this.popupSubscribe();
            }
        },
    },
    ready() {
        let timer = setTimeout(() => {
            clearTimeout(timer);
            this.data.coldBoot = false;
        }, 500);
    },
    methods: {
        // 订阅弹窗
        popupSubscribe() {
            const { channel, backSource } = global;
            if (backSource != "ComicPage") {
                return false;
            }
            global.backSource = "";
            api.getMessagePop({ channel }).then((res) => {
                const { code, data = {} } = res;
                if (code == 200 && data.pop) {
                    this.popupSubTrigger(true);
                }
            });
        },
        // 订阅弹窗显示&隐藏
        popupSubTrigger(status) {
            const options = {
                show: !!status,
            };
            if (status) {
                Object.assign(options, {
                    title: "打开消息订阅通知",
                    content: "再不错过你喜欢的漫画更新内容~",
                    button: [
                        {
                            text: "取消",
                            type: "cancel",
                        },
                        {
                            text: "允许",
                            type: "confirm",
                        },
                    ],
                });
                this.popupSubTrack("PopupShow");
            }
            this.setData({
                dialogMsg: options,
            });
        },
        popupSubTrack(event, params = {}) {
            const options = {
                CurPage: "FindPage",
                popupName: "订阅弹窗",
            };
            app.kksaTrack(event, {
                ...options,
                ...params,
            });
        },
        // 订阅弹窗发送订阅消息
        popupSubMsg() {
            const REMIND_ID = "n9l67QQksMWX4ysU6gUoZV01lMgIlPfcp7-AT1ubqgU";
            const NEW_TOPIC = "xHEFeN8aQ0hCpoxYTCQterRthzwQ3PuyquFyw-7Gn48";
            const HOT_TOPIC = "F4p9S7Sl2DvrUUdZgE94rVpryf5E-HdeteOePtoLSj0";
            const tmplIds = [REMIND_ID, NEW_TOPIC, HOT_TOPIC];
            util_requestSubscribeMessage({
                tmplIds,
            })
                .then((res) => {
                    let AuthorizationResult = 0;
                    const ids = tmplIds.filter((id) => {
                        return res[id] && res[id] === "accept";
                    });
                    if (ids.length) {
                        AuthorizationResult = 1;
                        util_sendNotifyApi({ ids });
                    }
                    app.kksaTrack("MiniNotification", {
                        MiniNotificationStatus: AuthorizationResult,
                    });
                })
                .catch((error) => {
                    const { errMsg: ErrorMsg, errCode: ErrorCode } = error;
                    util_logManager({
                        LogType: "message",
                        ErrorCode,
                        ErrorMsg,
                    });
                });
        },
        // 订阅弹窗按钮点击回调
        tapButtonMsg(e) {
            const { type, text } = e.detail;
            const track = {
                ElementType: "订阅按钮",
                ElementShowTxt: `订阅${text}`,
            };
            if (type == "confirm") {
                this.popupSubMsg();
            }
            this.popupSubTrack("PopupClk", track);
            this.popupSubTrigger();
        },
    },
});
