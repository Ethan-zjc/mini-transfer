/**
 * 新版新手福利-主入口
 * @param userInfo    {Object}  用户信息
 * @param TriggerPage {String}  触发的页面
 * @param topicId     {number}  专题id
 * @param comicId     {number}  章节id
 * **/

import { util_showToast, util_requestSubscribeMessage, util_sendNotifyApi, util_logManager, util_prevPage } from "../../util.js";

import { getDisplay, postAssign, getCheckTopic, getAssignTopics } from "./api";

const app = getApp();
const global = app.globalData;
const { customImgs } = require("../../cdn.js");

Component({
    properties: {
        userInfo: {
            type: Object,
            value: null,
        },
        TriggerPage: {
            type: String,
            value: "",
        },
        topicId: {
            type: [Number, String],
            value: 0,
        },
        comicId: {
            type: [Number, String],
            value: 0,
        },
        isAutoAssign: {
            type: Boolean,
            value: false,
        },
        customAssign: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        customImgs,
        dialogShow: false,
        enterShow: false,
        dialogInfo: {},
    },
    pageLifetimes: {
        show() {
            this.checkEnter();
        },
        hide() {
            this.dialogClose("hide");
        },
    },
    attached() {
        let time = setTimeout(() => {
            clearTimeout(time);
            this.checkEnter();
        }, 200);
    },
    methods: {
        checkEnter() {
            const { userInfo, isAutoAssign } = this.data;
            if (!global.isLoadNewUser) {
                this.welfareFinish(500000);
                return false;
            }
            getDisplay()
                .then((res) => {
                    const { code, data, message } = res;
                    if (code == 200) {
                        const id = data.benefit_id;
                        const day = data.active_day || 1;
                        if (userInfo && (day != 1 || isAutoAssign)) {
                            this.getCheckTopic(id).then((newCode) => {
                                this.benefitAssign(id, newCode);
                            });
                        } else {
                            this.welfareFinish(code, data, message);
                        }
                    } else {
                        this.welfareFinish(code, data, message);
                    }
                })
                .catch((error) => {
                    const { code = 500100, data, message = "" } = error || {};
                    this.welfareFinish(code, data, message);
                });
        },
        // 检查专题是否在新手福利池中
        getCheckTopic(id) {
            const { topicId } = this.data;
            return new Promise((resolve) => {
                if (topicId) {
                    getCheckTopic({
                        benefit_id: id,
                        topic_id: topicId,
                    })
                        .then((res) => {
                            const { code } = res;
                            resolve(code);
                        })
                        .catch(() => {
                            resolve(600001);
                        });
                } else {
                    resolve(200);
                }
            });
        },
        // 领取福利
        benefitAssign(id, resCode) {
            postAssign({
                benefit_id: id,
            })
                .then((res) => {
                    const { code, data = {} } = res;
                    if (code == 200 && resCode == 200) {
                        if (this.data.customAssign) {
                            this.benefitTopics()
                                .then((newData) => {
                                    this.triggerEvent("welfareMainAssign", {
                                        topics: newData,
                                    });
                                })
                                .catch(() => {
                                    this.dialogShow(data);
                                });
                        } else {
                            this.dialogShow(data);
                        }
                    } else {
                        this.welfareFinish(resCode);
                    }
                })
                .catch((err) => {
                    let message = err.message || "error";
                    if (err.code === 500105) {
                        message = "福利发放失败，请退出重新进入小程序领取";
                    }
                    util_showToast({
                        title: message,
                        duration: 5000,
                    });
                    this.welfareFinish(500200);
                });
        },
        // 奖励弹窗推荐漫画数据
        benefitTopics() {
            return new Promise((resolve, reject) => {
                getAssignTopics()
                    .then((res) => {
                        const { data = {} } = res;
                        const topics = data.recommend_topics || [];
                        if (topics.length >= 3) {
                            resolve(topics);
                        } else {
                            reject();
                        }
                    })
                    .catch(() => {
                        reject();
                    });
            });
        },
        dialogShow(value) {
            const day = value.active_day;
            const dialogInfo = {
                icon: this.data.customImgs["ctm-tip"],
                show: true,
                title: value.title,
                content: value.subtitle,
                weakenText: "",
                openSubscribe: day && day == 2,
                activeDay: String(day || ""),
                button: [
                    {
                        text: value.button_text,
                        type: "confirm",
                    },
                ],
            };
            this.setData({
                dialogInfo,
            });
            this.triggerEvent("welfareMainShow");
            this.triggerTrack("PopupShow", {
                PUWID: String(day || ""),
            });
        },
        dialogClose(type = "") {
            this.setData({
                dialogInfo: {
                    show: false,
                },
            });
            this.triggerEvent("welfareMainClose", { type });
            this.welfareFinish();
        },
        tapDialogButton(e) {
            const { type, text, subscribe, day } = e.detail;
            if (type == "confirm" && subscribe) {
                this.subscribeMessage();
            } else {
                this.dialogClose("tap");
            }
            this.triggerTrack("PopupClk", {
                PUWID: day,
                ElementShowTxt: text,
            });
        },
        // 触发时机：接口请求结束后 || 福利弹窗关闭后
        welfareFinish(code = 200, data, message) {
            this.triggerEvent("welfareMainEnd", {
                code,
                data,
                message,
            });
        },
        checkLogin() {
            return new Promise((resolve) => {
                if (!this.data.userInfo) {
                    // this.routeLogin();
                } else {
                    resolve();
                }
            });
        },
        // 订阅消息
        subscribeMessage() {
            const TEMP1 = "7PmniHCi32IWqigbao6H1A2AnSWAftQ4o1xDLyQFfYk";
            const TEMP2 = "XkVzV11V0TMsYPEoXDAoT1xcjfF_Q32jwSlARoDNviY";
            const tmplIds = [TEMP1, TEMP2];
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
                    this.dialogClose("subscribe");
                })
                .catch((error) => {
                    const { errMsg: ErrorMsg, errCode: ErrorCode } = error;
                    util_logManager({
                        LogType: "message",
                        ErrorCode,
                        ErrorMsg,
                    });
                    this.dialogClose("subscribe");
                });
        },
        triggerTrack(event, value) {
            const { trigger = "" } = util_prevPage();
            const options = {
                popupName: "领取福利弹窗",
                CurPage: this.data.TriggerPage,
                PrePage: trigger,
            };
            if (value) {
                Object.assign(options, value);
            }
            app.kksaTrack(event, options);
        },
    },
});
