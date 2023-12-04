// components/kk-guide/kk-guide.js
/**
 * 实验 & 平台过滤（过滤微信ios，过滤支付宝没有场景值）
 * 一：根据场景判断是下发奖励还是 每天提示，下发奖励直接toast, 如果非下发奖励 执行每天展示的逻辑
 * 二：进入的页面，三个页面记录 (findPage: 20210526, topicPage: 20210527, comicPage: 20210527), 每天如果展示过种当前日期和对应页面缓存，如果当前页面hidden（没有关闭相关操作），那就清除缓存
 * 三：
 */
const app = getApp();
const global = getApp().globalData;
const api = require("./api");
const { taskImgs } = require("../../cdn.js");

import { util_prevPage, util_showToast, util_formatTime } from "../../util.js";

Component({
    properties: {
        customNav: {
            type: Boolean,
            default: false,
        },
        userInfo: {
            // 传入距离顶部的高度
            type: Object,
            default: {},
        },
        curPage: {
            type: String,
            default: "FindPage",
        },
    },
    pageLifetimes: {
        show() {
            // 每次show的时后验证引导条是否关闭
            if (wx.getStorageSync("closeTaskSign") == util_formatTime(null, "yyyy-MM-dd") || global.guideTaskAwardShow) {
                this.setData({
                    showGuide: false,
                });
            }
            // 验证奖励弹窗是否关闭
            if (wx.getStorageSync("closeAwardSign")) {
                this.setData({
                    showGuide: false,
                    showAward: false,
                });
            }
            // 退出登录不再请求奖励弹窗
            if (!!this.data.tsUser && !this.data.userInfo) {
                wx.removeStorage({ key: "closeAwardSign" });
                return;
            }
            this.initShow();
            this.data.tsUser = this.data.userInfo;
        },
        hide() {
            const { stylesObj } = this.data;
            if (this.data.guideStatus == 2 && this.data.showGuide) {
                this.setData({
                    guideStatus: 1,
                    styleStr: stylesObj[1],
                });
            }
        },
    },
    data: {
        awardId: "",
        awardText: "",
        showGuideText: "",
        showGuide: false,
        guideStatus: 1,
        stylesObj: {
            1: "height: auto;background: transparent;",
            2: "bottom: 0;background: rgba(0, 0, 0, 0.7);",
        },
        bubble: null,
        time: null,
        rectTop: 0,
        arrowRight: 28,
        taskImgs,
        dialog: {
            show: false,
        },
    },
    attached() {
        this.initLocation();
    },
    methods: {
        async initShow() {
            const { stylesObj } = this.data;
            const { channel, systemInfo, scene } = global;
            if (channel == "wechat") {
                if (!Object.keys(systemInfo || {}).length) {
                    await app.getSystemInfo();
                }
                if (global.isiOS) {
                    return;
                }
            }

            // 快手存在接口较早拉取没有openId，同步五端
            if (!name && !global.openId) {
                await app.getOpenId();
            }

            // 领取奖励的弹窗是否在实验之后scene
            // 微信android: 1023
            // qqandroid: 1023
            // 百度: 12300000
            // 快手: 011021
            const { name } = util_prevPage();
            const scenes = ["1023", "011021", "12300000"];
            if (scene && !global.guideTaskAwardShow) {
                if (scenes.includes(scene.toString())) {
                    const res = await api.awardDialogApi();
                    const datas = res.data || {};

                    if (datas.award && datas.award.text) {
                        global.guideTaskAwardShow = true;
                        this.setData(
                            {
                                awardId: datas.task_id,
                                awardText: datas.award.text,
                            },
                            () => {
                                wx.removeStorage({ key: "closeAwardSign" });
                                // this.closeAward({type: "show"});
                                setTimeout(() => {
                                    this.setData({
                                        showAward: true,
                                        showGuide: false,
                                    });
                                }, 100);
                            }
                        );
                        return;
                    }
                }
            }

            // 书架页拦截引导条展示/ BookshelfPage
            if (this.data.curPage == "BookshelfPage" || scenes.includes(scene.toString())) {
                return;
            }
            api.isShowTaskApi().then((res) => {
                if (res.code == 200 && res.data.status == 1) {
                    // 当天用户手动关闭过，不再展示
                    if (wx.getStorageSync("closeTaskSign") == util_formatTime(null, "yyyy-MM-dd")) {
                        return;
                    } else {
                        // 展示的同时触发回调
                        this.triggerEvent("guideStatusFun", { status: true });

                        // 这里显示,设置为true
                        this.setData({
                            showGuide: !!res.data.text,
                            showAward: false, //!res.data.text,
                            guideStatus: 1,
                            showGuideText: res.data.text,
                        });
                    }
                }
            });
        },
        initLocation() {
            this.setData({
                channel: global.channel,
            });
            if (!this.data.top) {
                const rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
                if (this.data.customNav) {
                    if (rect && rect.bottom) {
                        this.setData({
                            rectTop: rect.bottom + 6,
                            arrowRight: Math.floor(rect.width * 0.65) - 16,
                        });
                    } else {
                        this.setData({ rectTop: 58 });
                    }
                } else {
                    if (rect && rect.width) {
                        this.setData({
                            arrowRight: Math.floor(rect.width * 0.65) - 16,
                        });
                    }
                }
            }
            // 判断是否需要自动关闭
            if (this.data.autoClose) {
                this.data.time = setTimeout(() => {
                    this.close();
                }, 5000);
            }
        },
        openDetail() {
            const { stylesObj, curPage } = this.data;
            this.setData({
                guideStatus: 2,
                styleStr: stylesObj[2],
            });

            // 点击引导条展示详情
            this.guideClickTrack(curPage, "引导条");
        },
        closeToast() {
            this.setData({
                showGuide: false,
            });

            // 点击引导条关闭
            const { curPage } = this.data;
            if (this.data.guideStatus == 1) {
                this.closeSign();
                this.guideClickTrack(curPage, "关闭");
            }
        },
        closeGuide() {
            if (this.data.guideStatus == 2) {
                this.setData({
                    showGuide: false,
                });
                this.closeSign();
            }
        },
        closeSign() {
            const curDate = util_formatTime(null, "yyyy-MM-dd");
            wx.setStorage({
                key: "closeTaskSign",
                data: curDate,
            });
        },
        closeAward() {
            const { curPage } = this.data;
            const pages = {
                FindPage: "find",
                TopicPage: "topic",
                ComicPage: "comic",
                BookshelfPage: "my",
            };
            this.setData({
                showAward: false,
            });
            wx.setStorage({
                key: "closeAwardSign",
                data: pages[curPage],
            });
        },
        getAward() {
            if (!this.data.awardId) {
                util_showToast({
                    title: "缺少奖励id",
                    duration: 2000,
                });
                return;
            }
            api.getAwardApi({ task_id: this.data.awardId })
                .then((res) => {
                    this.closeAward();
                    util_showToast({
                        title: "领取成功，书架页面可查看奖励",
                        duration: 2000,
                    });

                    // 领取奖励
                    app.kksaTrack("CompleteMission", {});
                })
                .catch((res) => {
                    this.closeAward();
                    util_showToast({
                        title: res.message,
                        duration: 2000,
                    });
                });
        },

        // 静默登录相关
        originLogin(e) {
            // app.originLogin(e.detail).then(res => {});
            wx.navigateTo({ url: "/pages/login/login" });
        },
        showDialog() {
            this.setData({
                dialog: {
                    show: true,
                    title: "登录成功",
                    content: "授权手机号登录，可以同步其他平台的漫画阅读历史",
                    button: [{ text: "拒绝" }],
                },
            });
        },
        hideDialog() {
            this.setData({
                dialog: {
                    show: false,
                },
            });
        },
        onDialogButtontapEvent(e) {
            app.onDialogButtontapEvent(e);
        },
        onDiallogGetPhoneNumberEvent(e) {
            app.onDiallogGetPhoneNumberEvent(e);
        },
        guideClickTrack(page, btnname) {
            const data = {
                TriggerPage: page,
                GuideBarType: "desktop",
                ButtonName: btnname,
            };
            app.kksaTrack("GuideBarClk", data);
        },
    },
});
