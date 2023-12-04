const app = getApp();

const { lotteryImgs, valentImgs } = require("../../../../../cdn.js");

import { util_showToast } from "../../../../../util.js";

import { postLotteryStart, postReduceBalance } from "../../api.js";

Component({
    properties: {
        activityName: {
            type: String,
            value: "",
        },
        pageTitle: {
            type: String,
            value: "",
        },
        moduleTitle: {
            type: String,
            value: "",
        },
        origin: {
            type: String,
            value: "",
        },
        isLogin: {
            type: Boolean,
            value: false,
        },
        balance: {
            type: Number,
            value: 0,
        },
        tokeCount: {
            type: Number,
            value: 0,
        },
        tokeTime: {
            type: Number,
            value: 0,
        },
        list: {
            type: Array,
            value: [],
        },
    },
    data: {
        valentImgs,
        lotteryImgs,
        loading: false,
        buttonStatus: 1, // 3s倒计时； 2：30s倒计时； 3：结束
        popTipsShow: false, // 提示倒计时弹窗
        popTipsNum: 3, // 提示倒计时
        popTipsLoading: false,
        popTipsTimer: null, //提示倒计时计数器
        setupTimer: null, // 30s倒计时计数器
        setupNum: 30, // 30s倒计时
        isShowSetup: false, //是否显示30s倒计时
        currentNum: 0, // 当前点击次数
        currentIndex: 0, //百分比
        currentTimer: null, // 当前点击延时器
        isTouch: false, // 当前点击
        touchTimer: null,
        errorType: 1, // 失败弹窗类型
        dialogError: false, // 失败弹窗
        dialogSuccInfo: { show: false }, //成功弹窗
    },
    methods: {
        tapButton() {
            const { buttonStatus } = this.data;
            const { balance } = this.properties;

            if (buttonStatus == 3) {
                console.log("无动作");
                return false;
            }
            if (!balance) {
                this.triggerTrack(0);
                this.triggerEvent("onTask");
                util_showToast({ title: "完成任务赢取抽奖机会" });
                return false;
            }
            if (buttonStatus == 1) {
                this.tipStart();
                this.triggerTrack(1);
            } else if (buttonStatus == 2) {
                this.touchStart();
            }
        },
        // 任务初始化
        taskInit(speed = 1000) {
            const timer = setTimeout(() => {
                clearTimeout(timer);
                this.setData({
                    isShowSetup: false,
                    setupNum: 0,
                    currentNum: 0,
                    currentIndex: 0,
                });
                this.data.buttonStatus = 1;
                this.triggerEvent("onMove", {
                    currentIndex: 0,
                });
            }, speed);
        },
        // 倒计时开始
        tipStart() {
            const { tokeCount, tokeTime, activityName } = this.properties;
            if (this.data.popTipsLoading) {
                return false;
            }
            this.data.popTipsLoading = true;
            this.countDown({
                time: 3,
                working: "popTipsTimer",
                current: "popTipsNum",
                more: {
                    popTipsShow: true,
                },
            }).then(() => {
                this.data.popTipsLoading = false;
                this.data.buttonStatus = 2;
                this.countDown({
                    time: tokeTime,
                    working: "setupTimer",
                    current: "setupNum",
                    more: {
                        popTipsShow: false,
                        isShowSetup: true,
                    },
                }).then(() => {
                    if (this.data.currentNum < tokeCount) {
                        this.data.buttonStatus = 3;
                        this.dialogShowError();
                        this.taskInit();
                        postReduceBalance({
                            activity_name: activityName,
                        }).then(() => {
                            this.triggerEvent("onFinish", { checked: false });
                        });
                    }
                });
            });
        },
        // 点击任务开始
        touchStart() {
            this.countTouch();
            this.countTime()
                .then(() => {
                    this.data.currentNum++;
                    const currentIndex = Math.floor((this.data.currentNum / this.properties.tokeCount) * 100);
                    this.setData({
                        currentIndex,
                    });
                    this.triggerEvent("onMove", { currentIndex });
                    this.triggerTrack(2);
                    if (currentIndex >= 100) {
                        clearInterval(this.data.setupTimer);
                        this.data.buttonStatus = 3;
                        this.lotteryStart();
                    }
                })
                .catch(() => {
                    // console.log("未完成")
                });
        },
        // 完成任务去抽奖
        lotteryStart() {
            const { activityName } = this.properties;
            postLotteryStart({
                activity_name: activityName,
            })
                .then((res) => {
                    const { code, data = {}, message } = res;
                    if (code == 200) {
                        let checked = data.award_type != 10000 ? true : false;
                        if (checked) {
                            let timer = setTimeout(() => {
                                clearTimeout(timer);
                                this.dialogShowSucc(data);
                                this.taskInit();
                            }, 1000);
                        } else {
                            this.dialogShowError(2);
                            this.taskInit();
                        }
                        this.triggerEvent("onFinish", { checked });
                    } else {
                        this.taskInit();
                        util_showToast({ title: message });
                    }
                })
                .catch(() => {
                    this.taskInit(3000);
                    util_showToast({ title: "活动火爆，请稍后再试" });
                });
        },
        // 奖励失败弹窗
        dialogShowError(type = 1) {
            this.setData({
                errorType: type,
                dialogError: true,
            });
            this.triggerTrack(type == 1 ? 6 : 8);
        },
        // 关闭奖励失败
        dialogCloseError() {
            this.setData({
                dialogError: false,
            });
            this.triggerTrack(3);
        },
        // 奖励成功弹窗
        dialogShowSucc(value = {}) {
            this.setData({
                dialogSuccInfo: {
                    show: true,
                    title: value.award_title || "",
                    icon: value.award_assigned_icon,
                    name: value.award_name || "",
                },
            });
            this.triggerTrack(7, value.award_title || "");
        },
        // 关闭奖励成功弹窗
        dialogCloseSucc(e) {
            const { type = "1" } = e.detail || {};
            this.setData({
                dialogSuccInfo: {
                    show: false,
                },
            });
            this.triggerTrack(type == "2" ? 4 : 5);
        },
        // 登录回调
        originLogin(e) {
            this.triggerEvent("onLogin", e.detail);
        },
        // 点击&曝光埋点集合
        triggerTrack(index, value = "") {
            const { title = "雪糕活动", origin = "" } = this.properties;
            let options = {
                CurPage: title,
                TabModuleType: origin,
            };
            let type = "";
            let txt = "";
            let name = "";
            let contentName = "";
            let event = "CommonItemClk";
            switch (index) {
                case 0:
                    type = "游戏点击按钮";
                    txt = "做任务赢活动机会";
                    break;
                case 1:
                    type = "游戏点击按钮";
                    txt = "30秒快速点击";
                    break;
                case 2:
                    type = "游戏点击按钮";
                    txt = "开始点击";
                    break;
                case 3:
                    type = "弹窗按钮";
                    txt = this.data.errorType == 1 ? "游戏失败赢机会" : "相会成功未中奖";
                    break;
                case 4:
                    type = "弹窗按钮";
                    txt = "游戏成功继续参与";
                    break;
                case 5:
                    type = "弹窗按钮";
                    txt = "游戏成功开心收下";
                    break;
                case 6:
                    name = "相会失败";
                    event = "CommonPopup";
                    break;
                case 7:
                    name = "相会成功";
                    event = "CommonPopup";
                    contentName = value;
                    break;
                case 8:
                    name = "相会成功";
                    event = "CommonPopup";
                    contentName = "未中奖";
                    break;
            }
            if ([6, 7, 8].includes(index)) {
                Object.assign(options, {
                    popupName: name,
                    ContentName: contentName,
                });
            } else {
                Object.assign(options, {
                    ElementType: type,
                    ElementShowTxt: txt,
                });
            }
            app.kksaTrack(event, options);
        },
        // 点击效果
        countTouch() {
            if (this.data.touchTimer) {
                return;
            }
            this.setData(
                {
                    isTouch: true,
                },
                () => {
                    this.data.touchTimer = setTimeout(() => {
                        clearTimeout(this.data.touchTimer);
                        this.data.touchTimer = null;
                        this.setData({
                            isTouch: false,
                        });
                    }, 100);
                }
            );
        },
        // 节流
        countTime(speed = 100) {
            return new Promise((resolve, reject) => {
                if (this.data.currentTimer) {
                    reject();
                } else {
                    this.data.currentTimer = setTimeout(() => {
                        this.data.currentTimer = null;
                        clearTimeout(this.data.currentTimer);
                        resolve();
                    }, speed);
                }
            });
        },
        // 倒计时
        countDown(value = {}) {
            const { time = 3, working = "tipsTimer", current = "tipsNum", more = {} } = value;
            return new Promise((resolve) => {
                const obj = Object.assign({}, more);
                obj[current] = time;
                this.setData(obj, () => {
                    this.data[working] = setInterval(() => {
                        let index = this.data[current] - 1;
                        let child = {};
                        child[current] = index;
                        this.setData(child);
                        if (index <= 0) {
                            clearInterval(this.data[working]);
                            resolve();
                        }
                    }, 1000);
                });
            });
        },
    },
});
