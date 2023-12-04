const app = getApp();
const global = app.globalData;

const { lotteryImgs } = require("../../../../../cdn.js");

import { util_showToast } from "../../../../../util.js";

import { postLotteryStart } from "../../api.js";

Component({
    properties: {
        activityName: {
            type: String,
            value: "",
        },
        balance: {
            type: Number,
            value: 0,
        },
        list: {
            type: Array,
            value: [],
        },
    },
    data: {
        lotteryImgs,
        loading: false,
        start: false, // 多个蛋是否开始播放
        startBtn: false, // 按钮是否开始播放
        down: false, // 中奖蛋是否开始播放
        downUrl: "",
    },
    methods: {
        tapButton() {
            const { activityName, balance } = this.properties;
            if (!balance) {
                util_showToast({ title: "完成任务赢取抽奖机会" });
                return false;
            }
            if (this.data.loading) {
                return false;
            }
            this.data.loading = true;
            postLotteryStart({
                activity_name: activityName,
            })
                .then((res) => {
                    const { code, data = {}, message } = res;
                    if (code == 200) {
                        let checked = data.award_type != 10000 ? true : false;
                        this.lotteryComplate(checked, data);
                    } else {
                        this.data.loading = false;
                        util_showToast({ title: message });
                    }
                })
                .catch(() => {
                    this.data.loading = false;
                    util_showToast({ title: "服务异常" });
                });
            this.triggerEvent("onStart");
        },
        lotteryComplate(checked = false, options = {}) {
            if (checked) {
                this.setData({
                    downUrl: options.award_icon,
                });
            }
            this.play(checked).then(() => {
                this.data.loading = false;
                this.triggerEvent("onFinish", {
                    checked,
                    options,
                });
            });
        },
        // 播放动画
        play(checked = false) {
            return new Promise(async (resolve) => {
                await this.setBtnAnimation();
                await this.setBoxAnimation(1500 * 2);
                await this.setBoxEnd();
                await this.setDownAnimation(checked);
                resolve();
            });
        },
        // 设置动画播放结束
        setBoxEnd() {
            return new Promise((resolve) => {
                this.setData(
                    {
                        start: false,
                        startBtn: false,
                    },
                    () => {
                        resolve();
                    }
                );
            });
        },
        /*
         * des: 设置多个蛋播放动画
         * timeout: 时长，应设置1500的倍数
         */
        setBoxAnimation(timeout = 1500) {
            return new Promise((resolve) => {
                this.setData(
                    {
                        start: true,
                    },
                    () => {
                        let timer = setTimeout(() => {
                            clearTimeout(timer);
                            resolve();
                        }, timeout);
                    }
                );
            });
        },
        // 设置播放按钮动画
        setBtnAnimation() {
            return new Promise((resolve) => {
                this.setData(
                    {
                        startBtn: true,
                        down: false,
                    },
                    () => {
                        let timer = setTimeout(() => {
                            clearTimeout(timer);
                            resolve();
                        }, 300);
                    }
                );
            });
        },
        /*
         * des: 设置中奖蛋播放动画
         * checked：是否中奖
         */
        setDownAnimation(checked) {
            return new Promise((resolve) => {
                if (checked) {
                    this.setData(
                        {
                            down: true,
                        },
                        () => {
                            let timer = setTimeout(() => {
                                clearTimeout(timer);
                                let downTimer = setTimeout(() => {
                                    clearTimeout(downTimer);
                                    this.setData({
                                        down: false,
                                    });
                                }, 1000);
                                resolve();
                            }, 1200);
                        }
                    );
                } else {
                    resolve();
                }
            });
        },
    },
});
