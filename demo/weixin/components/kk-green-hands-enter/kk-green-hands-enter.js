/**
 * 新手福利入口组件
 * @param enterType   {number}  显示入口类型  banner型---1， 挂件型---2
 * @param userInfo    {Object}  用户信息
 * @param TriggerPage {String}  触发的页面
 * @param className   {String}  传递进来的类名
 * @param topicId     {number}  专题id
 * @param comicId     {number}  章节id
 * @param custom      {Boolean}  是否需要定位显示
 * @param automaticReceive {Boolean}  是否需要自动领取
 * **/

import { util_showToast } from "../../util.js";
const app = getApp();
const global = app.globalData;
const api = require("./api");

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },
    properties: {
        enterType: {
            // 入口类型 -1:完全不执行 0:隐藏不显示入口(但是请求接口) banner型---1， 挂件型---2
            type: Number,
            default: -1,
        },
        userInfo: {
            // 用户信息
            type: Object,
            value: null,
        },
        TriggerPage: {
            // 触发页面
            type: String,
            value: "",
        },
        // 外部传入的样式类名
        className: {
            type: String,
            value: "",
        },
        topicId: {
            // 专题id
            type: [Number, String],
            value: 0,
        },
        comicId: {
            // 章节id
            type: [Number, String],
            value: 0,
        },
        custom: {
            type: Boolean,
            value: false,
        },
        automaticReceive: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        dialogShow: false,
        enterShow: false,
        dialogInfo: {},
    },
    attached() {
        let time = setTimeout(() => {
            clearTimeout(time);
            if (this.properties.enterType > 0) {
                this.checkEnter();
            }
        }, 10);
    },
    pageLifetimes: {
        // 检测隐藏显示页面
        show() {
            if (this.properties.enterType > 0) {
                this.checkEnter();
            }
        },
        hide() {
            // 切换页面时弹窗消失
            this.setData({
                dialogShow: false,
            });
        },
    },
    methods: {
        showTack() {
            const data = this.data;
            let dataTrack = {
                TriggerPage: data.TriggerPage, // 触发页面
                ShowType: "Entrance", // 类型--入口
                SourcePlatform: global.channel, // 来源平台
                isLoginType: !!data.userInfo, // 登陆状态
                ActivityName: "新手福利",
            };
            app.kksaTrack("ShowNewUserGift", dataTrack);
        },

        // 检查是否需要展示领取入口
        checkEnter() {
            this.queyDialogInfo();
        },

        // 获取弹窗内容
        queyDialogInfo() {
            const getFlag = wx.getStorageSync("loginPageShow");
            const isbenifitClose = wx.getStorageSync("isbenifitClose");
            const { automaticReceive, userInfo, enterType, TriggerPage } = this.properties;
            api.queryDialogInfo()
                .then((res) => {
                    // 状态值200 正常获取弹窗内容并且展示领取入口
                    wx.removeStorageSync("ClickNewUserGift"); // 删除点击新手福利卡片记录
                    if (res.code === 200) {
                        const data = res.data || {};
                        data.welfare_type_text = data.welfare_type === 2 ? "免费看" : "";
                        // 本次小程序内 如果点击过关闭，则不展示挂件
                        if (isbenifitClose && enterType === 2) {
                            this.setData({
                                enterShow: false,
                            });
                            this.triggerEvent("isHidden");
                            return;
                        }
                        this.setData({
                            enterShow: true,
                            dialogInfo: data,
                        });
                        this.showTack();
                        // 有跳转过登陆的标记，返回有数据直接展示弹窗
                        if ((getFlag == 1 && userInfo) || (automaticReceive && userInfo)) {
                            this.handleTack(); // 调用领取
                            if (getFlag) {
                                wx.removeStorageSync("loginPageShow");
                            }
                        }
                    }
                })
                .catch((err) => {
                    this.setData({
                        enterShow: false,
                    });
                    if (getFlag == 1) {
                        wx.removeStorageSync("loginPageShow");
                        if (TriggerPage == "DetailPage" && err.code && err.code != "500219") {
                            // console.log(TriggerPage)
                        } else {
                            // 有标记则表示从登陆页跳转过来的，需要重新更新下入口状态
                            if (global.userId) {
                                util_showToast({
                                    title: err.message || "error",
                                    duration: 5000,
                                });
                            }
                        }
                    }
                    // this.triggerEvent("isHidden", {code:600001, toast:'XXXXX'}); // 调试某个作品没有在新手福利中, 领取阅读币
                    this.triggerEvent("isHidden", { code: err.code });
                });
        },

        // 点击入口关闭按钮
        handleClose() {
            wx.setStorageSync("isbenifitClose", 1);
            // 上报
            const data = this.data;
            let dataTrack = {
                TriggerPage: data.TriggerPage, // 触发页面
                ShowType: "Entrance", // 类型 --- 入口
                ButtonName: 2, // 按钮名称 --- 2挂件关闭
                SourcePlatform: global.channel, // 来源平台
                isLoginType: !!data.userInfo, // 登陆状态
                isSuccessReceived: false, // 是否领取成功
                ActivityName: "新手福利",
            };
            app.kksaTrack("ClickNewUserGift", dataTrack);

            this.setData({
                enterShow: false,
            });
            this.triggerEvent("isHidden");
        },

        // 弹窗关闭
        handleDialogClose() {
            // 弹窗关闭时上报
            const data = this.data;
            let dataTrack = {
                TriggerPage: data.TriggerPage, // 触发页面
                ShowType: "Popup", // 类型 --- 弹框1
                ButtonName: 4, // 按钮名称 --- 4关闭福利弹框
                SourcePlatform: global.channel, // 来源平台
                isLoginType: !!data.userInfo, // 登陆状态
                isSuccessReceived: true, // 是否领取成功
                ActivityName: "新手福利",
            };
            app.kksaTrack("ClickNewUserGift", dataTrack);

            this.changeDialogStatus("changeDialogStatus");
        },

        // 点击领取
        handleTack() {
            const data = this.data;
            // 入口点击时上报
            let dataTrack = {
                TriggerPage: data.TriggerPage, // 触发页面
                ShowType: "Entrance", // 类型 --- 入口0
                ButtonName: data.enterType === 1 ? 0 : 1, // 按钮名称 --- 0banner点击、1挂件点击
                SourcePlatform: global.channel, // 来源平台
                isLoginType: !!data.userInfo, // 登陆状态
                isSuccessReceived: false, // 是否领取成功
                ActivityName: "新手福利",
            };
            app.kksaTrack("ClickNewUserGift", dataTrack);

            this.checkLogin().then((res) => {
                this.setData({
                    dialogShow: true,
                });
                // 弹窗展示时上报
                const data = this.data;
                let dataTrackPop = {
                    TriggerPage: data.TriggerPage, // 触发页面
                    ShowType: "Popup", // 类型--弹窗1
                    SourcePlatform: global.channel, // 来源平台
                    isLoginType: !!data.userInfo, // 登陆状态
                    ActivityName: "新手福利",
                };
                app.kksaTrack("ShowNewUserGift", dataTrackPop);
            });
        },

        // 修改弹窗展示状态(关闭弹窗)
        changeDialogStatus(type) {
            this.setData(
                {
                    dialogShow: !this.data.dialogShow,
                },
                () => {
                    // 关闭弹窗后刷新新手状态接口
                    if (type == "changeDialogStatus") {
                        // 手动关闭弹窗
                        this.checkEnter(); // 关闭弹窗后刷新新手状态接口
                        this.triggerEvent("dialogclose"); // 领取成功点击关闭弹窗
                    }
                }
            );
        },

        // 领取成功
        handleSuccess(e) {
            const detail = e.detail;
            // 2021-02-07 新手福利修改
            // this.setData({
            //     enterShow: false,
            //     dialogInfo: {}
            // });
            util_showToast({
                title: detail.toast,
                duration: 5000,
            });
            // this.triggerEvent("isHidden");
            this.triggerEvent("addbubble", { bubble: detail.bubble });
            this.triggerEvent("getBenefitText");

            // 领取时上报-成功
            const data = this.data;
            let dataTrack = {
                TriggerPage: data.TriggerPage, // 触发页面
                ShowType: "Popup", // 类型 --- 弹框1
                ButtonName: 3, // 按钮名称 --- 3领取福利
                SourcePlatform: global.channel, // 来源平台
                isLoginType: !!data.userInfo, // 登陆状态
                isSuccessReceived: true, // 是否领取成功
                ActivityName: "新手福利",
            };
            app.kksaTrack("ClickNewUserGift", dataTrack);
        },

        // 领取失败
        handleError(e) {
            const detail = e.detail;
            let code = detail && detail.code ? detail.code : "";
            let toast = detail && detail.toast ? detail.toast : "";
            if (code != 600001) {
                util_showToast({
                    title: toast,
                    duration: 5000,
                });
            }
            this.triggerEvent("isHidden", { code, toast });

            // 领取时上报-失败
            const data = this.data;
            let dataTrack = {
                TriggerPage: data.TriggerPage, // 触发页面
                ShowType: "Popup", // 类型 --- 弹框1
                ButtonName: 3, // 按钮名称 --- 3领取福利
                SourcePlatform: global.channel, // 来源平台
                isLoginType: !!data.userInfo, // 登陆状态
                isSuccessReceived: false, // 是否领取成功
                ActivityName: "新手福利",
            };
            app.kksaTrack("ClickNewUserGift", dataTrack);
        },

        // 检查登录，通过后resolve，否则前往登录页
        checkLogin() {
            return new Promise((resolve) => {
                if (!this.data.userInfo) {
                    this.routeLogin();
                } else {
                    resolve();
                }
            });
        },

        // 跳转登录页
        routeLogin() {
            // 跳转登陆时记录一下(点击新手福利卡片)
            if (!wx.getStorageSync("loginPageShow")) {
                wx.setStorageSync("loginPageShow", 1);
            }
            wx.navigateTo({ url: "/pages/login/login" });
        },

        // 静默登录
        originLogin(e) {
            if (!wx.getStorageSync("loginPageShow")) {
                wx.setStorageSync("loginPageShow", 1);
            }

            const pages = getCurrentPages(); // 页面栈
            app.originLogin(e.detail).then((res) => {
                if (pages.length == 1) {
                    // 没其它页面栈,跳转到首页
                    if (pages[0].route == "pages/login/login") {
                        wx.switchTab({
                            url: "/pages/my/my",
                        });
                    } else {
                        wx.reLaunch({
                            url: `/${pages[0].route}${pages[0].route.includes("/comic") ? "?id=" + this.data.comicId : ""}`,
                        });
                    }
                } else {
                    let comicId = this.data.comicId;
                    // 运营位，目前只漫画详情页comic不在bar上
                    wx.redirectTo({
                        url: `/pages/${global.abContinuRead ? "comicnew/comicnew" : "comic/comic"}?id=${comicId}&comicId=${comicId}`,
                    });
                }
            });
        },
    },
});
