const computedBehavior = require("miniprogram-computed");
const app = getApp();
const global = getApp().globalData;
const api = require("./api");
const { setState } = require("../../store.js");
const { loginImgs } = require("../../cdn.js");

import { util_action, util_showToast, util_hideToast, util_updateUserInfo, util_logout, util_getLogManager, util_logManager, util_getRealtimeLogManager } from "../../util.js";

/**
 * 定义三种登录方式
 * 1: 手机密码登录 2: 手机验证码登录
 */
Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },
    behaviors: [computedBehavior],
    properties: {
        show: {
            type: Boolean,
            value: false,
        },
        mask: {
            type: Boolean,
            value: false,
        },
        istab: {
            // 是否tab页
            type: Boolean,
            value: false,
        },
        refresh: {
            // 登录成功后是否刷新
            type: Boolean,
            value: false,
        },
        fullScreen: {
            // 是否全屏
            type: Boolean,
            value: false,
        },
        title: {
            // 标题文案
            type: String,
            value: "登录后查看更多精彩",
        },
    },
    data: {
        isSway: 0, // 协议晃动
        loginWay: 2, // 登录方式
        showTrans: false,
        showPass: false, // 是否显示密码
        countDown: 60, // 倒计时
        showCount: false, // 是否显示倒计时
        isGetCode: false, // 获取验证码是否可点击
        isOneKey: false, // 是否存在手机号一键登录,微信、qq默认没有一键手机登录
        tripAuth: true, // 是否三方授权登录过,微信、qq默认true
        appIsLogin: true, // app是否登录,微信、qq默认true
        switchCode: false, // 验证码登录方式是否开启
        switchSlide: false, // 滑动验证码的开关
        loginImgs,
        radioItem: {
            name: "agree",
            checked: false,
        },
        dialog: {
            show: false,
        },
        canIUseGetUserProfile: false,
        captchaResolve: null,
        captchaReject: null,
    },
    async attached() {
        const { iPhoneX, channel } = global;
        const translate = {
            wechat: "微信",
            qq: "QQ",
            baidu: "百度",
            alipay: "支付宝",
            kuaishou: "快手",
        };
        const { data } = (await api.getConfigs()) || {};
        let canIUseGetUserProfile = wx.getUserProfile ? true : false;
        setTimeout(() => {
            this.setData(
                {
                    canIUseGetUserProfile,
                    iPhoneX,
                    channel,
                    showTrans: true,
                    name: translate[channel],
                    switchSlide: !!(data && data.mini_verify),
                    switchCode: !!(data && (data.mini_phone_register || !data.mini_pwd_login)),
                    loginWay: data && (data.mini_phone_register || !data.mini_pwd_login) ? 2 : 1,
                    hiddenSwitch: data && !data.mini_pwd_login,
                    isOneKey: channel != "wechat" && channel != "qq",
                },
                () => {
                    console.log(this.data.loginWay);
                }
            );
            this.showLoginPageTrack();
        }, 10);
    },
    methods: {
        // 密码是否显示
        showPassword() {
            this.setData({
                showPass: !this.data.showPass,
            });
        },

        // 切换登录方式
        changeLoginWay() {
            this.setData({
                isFocus: false,
                loginWay: this.data.loginWay == 1 ? 2 : 1,
            });
        },

        // 获取验证码
        getAuthCode() {
            if (!this.data.isGetCode) {
                return;
            }
            this.checkVertify()
                .then(({ vertify, ticket }) => {
                    this.setData(
                        {
                            showCount: true,
                        },
                        () => {
                            let data = {
                                phone: this.data.phone,
                            };
                            if (vertify) {
                                Object.assign(data, { ticket });
                            }
                            this.timer();
                            api.getCode(data).then(() => {});
                        }
                    );
                })
                .catch(() => {});
        },
        timer() {
            let promise = new Promise((resolve) => {
                this.data.setTimer = setInterval(() => {
                    this.setData({
                        countDown: this.data.countDown - 1,
                    });
                    if (this.data.countDown <= 0) {
                        this.setData({
                            countDown: 60,
                            showCount: false,
                            // send: true,
                            // alreadySend: false,
                        });
                        resolve(this.data.setTimer);
                    }
                }, 1000);
            });
            promise.then((setTimer) => {
                clearInterval(setTimer);
            });
        },

        // 监听手机号输入框 获取光标
        onbindfocus(e) {
            const { id } = e.target;
            if (id == "phone") {
                this.setData({
                    isAddPhone: true,
                    inputError: false,
                });
            }
            this.setData({ isFocus: true });
        },

        // 监听手机号输入框 失去光标
        onbindblur(e) {
            const { id } = e.target;
            this.setData({ isFocus: false });
            if (!this.data.phone && id == "phone") {
                // 手机号不存在
                this.setData({ isAddPhone: false });
            }
        },

        // 监听输入
        handleInput(e) {
            const { value } = e.detail,
                { id } = e.target;
            this.data[id] = value;

            let { phone, password, authCode } = this.data,
                validate = false;
            if (this.data.loginWay == 1) {
                validate = !!phone && phone.length == 11 && !!password && password.length > 7;
            } else if (this.data.loginWay == 2) {
                validate = !!phone && !!authCode && phone.length == 11 && authCode.length == 6;
            }
            this.setData({
                validate,
                isGetCode: !!phone && phone.length == 11,
                inputError: false, // 是否把输入框文字改为红色
            });
        },

        // 关闭登录半屏
        closeLogin(e) {
            const { type } = e.currentTarget.dataset;
            if (type != "close") {
                return;
            }
            if (this.data.setTimer) {
                clearInterval(this.data.setTimer);
            }
            const pages = getCurrentPages();
            const length = pages.length;
            if (length) {
                const currentPage = pages[length - 1];
                currentPage.setData({
                    showLogin: false,
                });
            }
        },

        // 未同意协议前拦截
        noAgreeIntercept() {
            const { checked } = this.data.radioItem;
            if (!checked) {
                util_showToast({
                    title: "请先同意快看隐私协议",
                    duration: 2000,
                });
                // 是否晃动用户协议并且改为红色
                if (this.data.isSway == 2) {
                    return false;
                }
                // 在晃动的情况
                this.setData({ isSway: 2 }, () => {
                    let time = setTimeout(() => {
                        clearTimeout(time);
                        if (this.data.isSway != 2) {
                            return false;
                        }
                        this.setData({ isSway: 1 });
                    }, 2000);
                });
            }
        },

        // 登录成功
        loginSuccess(uid) {
            global.userId = uid;
            // 通过openId+uid，获取更新gender
            util_updateUserInfo({
                gender: global.gender || 0,
                medium_age: "",
                request_type: 2,
                tags: "",
            });

            // 重新登录后distinct_id都会覆盖掉旧的uid
            if (app.kksa) {
                app.kksa.login(String(uid));
            }
            app.initUserInfo().then((userInfo) => {
                setState({ userInfo: userInfo });
                util_hideToast();
                this.closeLogin({ currentTarget: { dataset: { type: "close" } } });
                this.triggerEvent("close");
                if (this.data.refresh) {
                    const pages = getCurrentPages();
                    const length = pages.length;
                    if (length) {
                        const currentPage = pages[length - 1];
                        currentPage.onLoad();
                        currentPage.onShow();
                    }
                }
            });
        },

        // 登录失败
        loginFail() {
            // util_logout(true);
            util_hideToast();
        },

        // 普通登录注册
        phoneLogin(e) {
            const { phone, password, authCode } = e.detail.value;

            const data = { phone };
            // 验证码
            if (this.data.loginWay == 2) {
                data.code = authCode;
                this.commonLoginFun({ data });
                return;
            }
            // 密码登录

            this.checkVertify()
                .then(({ vertify, ticket }) => {
                    Object.assign(data, { password });
                    if (vertify) {
                        this.commonLoginFun({ data, ticket });
                    } else {
                        this.commonLoginFun({ data });
                    }
                })
                .catch(() => {});
        },
        commonLoginFun({ data = {}, ticket = "" } = {}) {
            if (this.data.isPhoneLogin) {
                return false;
            }
            this.setData({ isPhoneLogin: true });

            this.loginBefore();
            if (this.data.loginWay == 1 && ticket) {
                // 密码登录需要携带ticket
                data.ticket = ticket;
                data.verify_provider = "tencent";
            }
            api.phoneSignin(data)
                .then((res) => {
                    const { new_user } = res.data;
                    if (new_user) {
                        this.trackSignIn("phone", true, "");
                    } else {
                        this.trackLogIn("phone", true, ""); // 上报 登陆埋点
                    }

                    this.loginSuccessBefore(res.data || {});
                    this.loginSuccess(res.data.user.id);
                    this.setData({ isPhoneLogin: false });
                })
                .catch((e) => {
                    this.loginFail();
                    this.setData({
                        isPhoneLogin: false, // 是否可以点击手机号登录
                        inputError: true, // 是否把输入框文字改为红色
                    });
                    this.trackLogIn("phone", false, e.message); // 上报 登陆埋点
                    util_showToast({
                        title: e.message,
                        duration: 3000,
                    });
                });
        },

        // 登录前行为
        loginBefore() {
            util_showToast({ type: "loading", title: "加载中..." });
            // util_logout(true);
        },

        // 一键手机号授权登录
        authPhoneLogin(e) {
            console.log(e, 66666);
        },

        // 三方授权登录
        originLogin() {
            this.loginBefore();
            this.originUserInfo().then((resInfo) => {
                wx.login({
                    success: (res) => {
                        const code = res.code;
                        // 页面级存储数据
                        this.setData({
                            loginInfo: {
                                detail: resInfo,
                                code: code,
                            },
                        });
                        api.isRegist({ code })
                            .then((res) => {
                                // 判断是否注册过快看
                                const { exist_user } = res.data;
                                this.data.isOldUser = exist_user;

                                if (exist_user) {
                                    this.checkVertify()
                                        .then(({ vertify, ticket }) => {
                                            let data = {
                                                detail: resInfo,
                                                code,
                                            };
                                            if (vertify) {
                                                Object.assign(data, { ticket });
                                            }
                                            this.signup(data);
                                        })
                                        .catch(() => {
                                            util_hideToast();
                                        });
                                    // 注册过
                                } else {
                                    // 没注册过/是否还显示弹窗绑定手机号
                                    util_hideToast();
                                    this.showDialog();
                                }
                            })
                            .catch((e) => {
                                // 接口失败时
                                util_showToast({
                                    title: e.message,
                                    duration: 3000,
                                });
                            });
                    },
                });
            });
        },
        // 微信端获取用户信息
        originUserInfo() {
            return new Promise((resolve) => {
                if (wx.getUserProfile) {
                    wx.getUserProfile({
                        desc: "用于完善用户信息资料",
                        success: (resInfo) => {
                            resolve(resInfo);
                        },
                        fail: (error) => {
                            util_hideToast();
                            util_getLogManager("login", {
                                msg: "三方登录getUserProfile接口",
                                error,
                            });
                        },
                    });
                } else {
                    wx.getUserInfo({
                        success: (resInfo) => {
                            resolve(resInfo);
                        },
                        fail: (error) => {
                            wx.showModal({
                                content: "请升级APP版本或重新尝试",
                                showCancel: false,
                                confirmColor: "#FF751A",
                                confirmText: "我知道了",
                            });
                            util_hideToast();
                            util_getLogManager("login", {
                                msg: "三方登录getUserInfo接口",
                                error,
                            });
                        },
                    });
                }
            });
        },
        // dialog 对话框显示
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

        // 拒绝时，注册/登录快看
        onDialogButtontapEvent(e) {
            const loginInfo = this.data.loginInfo;
            if (e.detail.index == 0) {
                this.checkVertify()
                    .then(({ vertify, ticket }) => {
                        let data = { detail: loginInfo.detail, code: loginInfo.code };
                        if (vertify) {
                            Object.assign(data, { ticket });
                        }
                        this.signup(data);
                    })
                    .catch(() => {});
            }
        },

        // 同意授权时
        onDiallogGetPhoneNumberEvent(e) {
            const { phone_data, phone_iv } = e.detail;
            const loginInfo = this.data.loginInfo;
            this.checkVertify()
                .then(({ vertify, ticket }) => {
                    let data = { detail: loginInfo.detail, code: loginInfo.code, phone_data, phone_iv };
                    if (vertify) {
                        Object.assign(data, { ticket });
                    }
                    this.signup(data);
                })
                .catch(() => {});
        },

        // signup 注册通用方法
        signup(options) {
            const { detail, code, phone_data, phone_iv, ticket } = options;
            const { channel, gdtVid } = global;
            const params = {
                code: code,
                data: JSON.stringify(detail),
                phone_data: phone_data || "", // 必填项，值可为空
                phone_iv: phone_iv || "", // 必填项，值可为空
                web_source: true,
            };

            if (ticket) {
                Object.assign(params, {
                    ticket,
                    verify_provider: "tencent",
                });
            }
            // 微信接入api上报click_id
            if (channel == "wechat" && !!gdtVid) {
                Object.assign(params, {
                    click_id: gdtVid,
                });
            }

            api.loginSignup(params)
                .then((res) => {
                    // 注册过则上报登陆埋点  否则上报注册埋点
                    if (this.data.isOldUser) {
                        this.trackLogIn(res.data.reg_type, true, ""); // 上报 登陆埋点
                    } else {
                        this.trackSignIn(res.data.reg_type, true, ""); // 上报 注册埋点
                    }

                    this.loginSuccessBefore(res.data || {});
                    this.loginSuccess(res.data.id);
                })
                .catch((e) => {
                    // 注册过则上报登陆埋点  否则上报注册埋点
                    const regType = global.channel; // wechat qq baidu
                    if (this.data.isOldUser) {
                        this.trackLogIn(regType, false, e.message); // 上报 登陆埋点
                    } else {
                        this.trackSignIn(regType, false, e.message); // 上报 注册埋点
                    }

                    this.loginFail(e);
                    util_showToast({
                        title: e.message,
                        duration: 3000,
                    });
                });
        },

        // 登录成功前的操作/清空登录态后置，重置head
        loginSuccessBefore(data) {
            const { session } = data || {},
                { id } = data.user || {};
            util_logout(true, true);
            wx.setStorageSync("header", { session, uid: id });
        },

        // 协议选项勾选
        radioChangeHandle(e) {
            this.setData({
                "radioItem.checked": true,
                isSway: 0, // 不晃动,文字不变化
            });
        },

        // 隐私协议
        privacyProtocolHandle() {
            const url = "https://h5.kuaikanmanhua.com/web/mini_privacy_policy";
            util_action({
                type: 19,
                url: url,
            });
        },

        // 服务协议
        serviceProtocolHandle() {
            const url = "https://h5.kuaikanmanhua.com/web/mini_protocol";
            util_action({
                type: 19,
                url: url,
            });
        },

        // 当前页
        curTrigger() {
            const ary = {
                topic: "TopicPage",
                find: "FindPage",
                feed: "RecommendPage",
                class: "FindCat",
                rank: "RankPage",
                "topic-list": "CurrencyVisitPage",
                my: "BookshelfPage",
                comic: "ComicPage",
            };

            const pages = getCurrentPages();
            const length = pages.length;
            if (length) {
                const len = this.data.fullScreen && length > 1 ? length - 1 : length;
                const currentPage = pages[len - 1];
                const route = currentPage.route;
                const name = route.substring(route.lastIndexOf("/") + 1);
                return ary[name] || "Kuaikan";
            }
        },

        // 滑动验证码内容
        // 验证码验证结果回调
        handlerVerify(ev) {
            // 如果使用了 mpvue，ev.detail 需要换成 ev.mp.detail
            if (ev.detail.ret === 0) {
                // 验证成功
                const ticket = ev.detail.ticket;
                this.data.captchaResolve && this.data.captchaResolve({ vertify: true, ticket });
            } else {
                // 验证失败
                // 请不要在验证失败中调用refresh，验证码内部会进行相应处理
                this.data.captchaReject && this.data.captchaReject();
            }
            this.data.captchaResolve = null;
            this.data.captchaReject = null;
        },

        // 验证码准备就绪
        handlerReady() {
            console.log("验证码准备就绪");
        },

        // 验证码弹框准备关闭
        handlerClose() {
            this.data.captchaReject && this.data.captchaReject();
            this.data.captchaResolve = null;
            this.data.captchaReject = null;
            console.log("验证码弹框准备关闭");
        },

        // 验证码出错
        handlerError(ev) {
            console.log(ev.detail.errMsg);
        },

        // 登录页被触发上报/显示
        showLoginPageTrack() {
            app.kksaTrack("TriggerLog", {
                CurPage: `${this.data.fullScreen ? "全" : "半"}屏三方+手机登录页`,
                TriggerPage: this.curTrigger(),
            });
        },

        // 上报登陆埋点
        trackLogIn(regType, loginState, errMsg) {
            const LOGIN_LIST = { wechat: "微信", qq: "qq", phone: "手机号" }; // 登陆类型
            const data = {
                CurPage: `${this.data.fullScreen ? "全" : "半"}屏三方+手机登录页`,
                SourcePlatform: global.channel, // 来源平台
                LoginType: LOGIN_LIST[regType], // 登录方式 QQ、微信、手机号
                TriggerPage: this.curTrigger(), // 触发页面 我的主页
                IsLogSuccess: loginState, // 是否登录成功 true/false
                LogFailError: loginState ? "" : errMsg, // 登录失败原因
            };
            app.kksaTrack("LoginProgram", data);
            if (!loginState) {
                const log = {
                    LogType: "login",
                    LogInfo: {
                        CurPage: data.CurPage,
                        LoginType: data.LoginType,
                    },
                    ErrorMsg: errMsg,
                };
                util_getLogManager("login", log);
                util_getRealtimeLogManager("login", log);
                util_logManager(log);
            }
        },

        // 上报注册埋点
        trackSignIn(regType, loginState, errMsg) {
            const channel = global.channel; // 平台
            const LOGIN_LIST = { wechat: "微信", qq: "qq", phone: "手机号" }; // 登陆类型
            const data = {
                CurPage: `${this.data.fullScreen ? "全" : "半"}屏三方+手机登录页`,
                SourcePlatform: channel, // 来源平台
                SignupType: LOGIN_LIST[regType], // 注册方式 QQ、微信、手机号
                TriggerPage: this.curTrigger(), // 触发页面 我的主页
                IsSignSuccess: loginState, // 是否注册成功 true/false
                SignFailError: loginState ? "" : errMsg, // 注册失败原因
            };
            app.kksaTrack("SignProgram", data);
        },
        checkVertify() {
            return new Promise((resolve, reject) => {
                if (!this.data.switchSlide) {
                    resolve({ vertify: false });
                } else {
                    this.selectComponent("#captcha").show();
                    this.data.captchaResolve = resolve;
                    this.data.captchaReject = reject;
                }
            });
        },
    },
});
