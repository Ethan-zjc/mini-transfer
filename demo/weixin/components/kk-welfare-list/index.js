import { util_request, util_action } from "../../util.js";

const app = getApp();
const global = app.globalData;

const store = require("../../store.js");
const { customImgs } = require("../../cdn.js");

Component({
    properties: {
        show: {
            type: Boolean,
            default: false,
        },
        userInfo: {
            type: Object,
            default: null,
        },
        TriggerPage: {
            type: String,
            value: "",
        },
    },
    data: {
        customImgs,
        cacheUserId: "",
        visible: false,
        title: "",
        isLogin: false,
        isScroll: false,
        timeUser: null,
        time: null, // 定时器对象
        timeStr: "", // 格式后的时间字符串
        timeData: "", // 格式化后的时间对象
        scrollLeft: 0,
        list: [],
    },
    attached() {
        let start = setTimeout(() => {
            clearTimeout(start);
            const info = this.data.userInfo;
            this.data.cacheUserId = info ? info.user.id : "";
            this.getList();
        }, 100);
    },
    detached() {
        this.clearDown();
        clearTimeout(this.data.timeUser);
    },
    pageLifetimes: {
        show() {
            this.userChanged((userId) => {
                console.log("welfare-list:uid变化", userId);
                this.data.timeUser = setTimeout(() => {
                    clearTimeout(this.data.timeUser);
                    this.getList();
                }, 500);
            });
        },
    },
    methods: {
        userChanged(callback) {
            const userInfo = this.data.userInfo;
            let ifChange = false;
            if (userInfo) {
                const userId = userInfo.user.id;
                ifChange = userId !== this.data.cacheUserId;
                this.data.cacheUserId = userId;
            } else {
                ifChange = this.data.cacheUserId;
                this.data.cacheUserId = "";
            }
            if (ifChange) {
                callback(this.data.cacheUserId);
            }
        },
        getApi() {
            return new Promise((resolve, reject) => {
                if (!global.isLoadNewUser) {
                    reject();
                    return false;
                }
                util_request({
                    url: `/v2/checkin/api/mini/${global.channel}/benefit/discovery_module`,
                })
                    .then((res) => {
                        const { code, data = {} } = res;
                        if (code == 200) {
                            resolve(data);
                        } else {
                            this.welfareFinish(code);
                            reject();
                        }
                    })
                    .catch(() => {
                        this.welfareFinish();
                        reject();
                    });
            });
        },
        getList() {
            this.clearDown();
            this.getApi()
                .then((data) => {
                    const { title = "", topic_list = [], free_deadline = 0 } = data;
                    const list = topic_list.map((item) => {
                        item.action = item.action_protocol || {};
                        item.src = item.vertical_image_url || "";
                        item.bottom = item.recommend_reason || "";
                        item.width = 168;
                        item.height = 222;
                        return item;
                    });

                    const isLogin = !!this.data.userInfo;
                    const visible = list.length > 0;
                    const countTime = free_deadline - new Date();

                    this.setData({
                        title,
                        timeStr: "",
                        timeData: "",
                        visible,
                        isLogin,
                        scrollLeft: 0,
                        list,
                    });

                    this.welfareFinish(list.length > 0 ? 200 : 400);

                    if (visible && countTime > 0) {
                        this.countDown(countTime);
                    }
                    if (visible) {
                        this.impTrack();
                    }

                    this.getWelfare().then((welfareRes) => {
                        const { code: welfareCode, data: welfareData = {} } = welfareRes;
                        let isFirstDay = false;
                        if (welfareCode == 200) {
                            isFirstDay = welfareData.active_day == 1;
                        }
                        this.setData({
                            btnText: !isLogin || isFirstDay ? "立即解锁新人福利" : "查看全部热门漫画",
                        });
                    });
                })
                .catch(() => {
                    this.setData({
                        timeStr: "",
                        timeData: "",
                        visible: false,
                    });
                });
        },
        async tapAction(event) {
            const { dataset = {} } = event.currentTarget;
            const { action, title = "" } = dataset;
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;

            await this.checkDisplay();
            await this.checkLogin();

            const _state = store.getState();
            const pageTrigger = _state.pageTrigger;
            pageTrigger["find"] = {
                title: "全场畅读福利",
                module_type: 301,
                module_id: 0,
            };
            store.setState({ pageTrigger });

            util_action({ type, id, url, parentid });

            this.clkTrack({
                ElementType: "专题",
                ElementShowTxt: title,
            });
        },
        async tapMore() {
            await this.checkDisplay();
            await this.checkLogin();

            wx.navigateTo({
                url: "/subpack-auxiliary/pages/welfare-list-new/welfare-list-new?request_version=v2",
            });

            this.clkTrack({
                ElementType: "按钮",
                ElementShowTxt: this.data.btnText,
            });
        },
        // 检查登录，通过后resolve，否则前往登录页
        checkLogin() {
            return new Promise((resolve) => {
                if (!this.data.userInfo) {
                    this.originLogin();
                } else {
                    resolve();
                }
            });
        },
        // 检查是否已领取福利，没领取时跳福利页
        checkDisplay() {
            return new Promise((resolve) => {
                this.getWelfare().then((res) => {
                    const { code, data = {} } = res;
                    if (code == 200 && data.active_day == 1) {
                        wx.navigateTo({
                            url: `/pages/custom/custom`,
                        });
                    } else {
                        resolve();
                    }
                });
            });
        },
        getWelfare({ topicId = "" } = {}) {
            return new Promise((resolve) => {
                util_request({
                    url: `/v2/checkin/api/mini/${global.channel}/benefit/display`,
                })
                    .then((res) => {
                        const { code, data, message } = res;
                        if (code == 200) {
                            resolve(res);
                        } else {
                            resolve({ code, message });
                        }
                    })
                    .catch((error) => {
                        resolve({ code: error.code || 500300, message: error.message || "fail" });
                    });
            });
        },
        // 静默登录
        originLogin(e) {
            const pages = getCurrentPages(); // 页面栈
            app.originLogin({}, false)
                .then(() => {
                    this.loginTrack({
                        code: 200,
                    });
                    wx.reLaunch({
                        url: `/${pages[0].route}`,
                    });
                })
                .catch(() => {
                    this.loginTrack({
                        code: 400,
                        message: "未知",
                    });
                });
        },
        // 将0-9的数字前面加上0，例1变为01
        checkTime(i) {
            if (i < 10) {
                i = "0" + i;
            }
            return i;
        },
        // 畅读卡倒计时计算
        countDown(ntimeRemaining) {
            this.clearDown();
            let count = 1;
            let fn = (type) => {
                if (!type && !this.data.time) {
                    return false;
                }
                if (ntimeRemaining > 0) {
                    let d = 1000 * 60 * 60 * 24;
                    let D = Math.floor(ntimeRemaining / d);

                    let h = 1000 * 60 * 60;
                    let H = Math.floor((ntimeRemaining - D * d) / h); // Math.floor(ntimeRemaining / h);// Math.floor(ntimeRemaining / 1000 / 60 / 60);

                    let m = 1000 * 60;
                    let M = Math.floor((ntimeRemaining - D * d - H * h) / m); // Math.floor((ntimeRemaining - H * h) / m)

                    let s = 1000;
                    let S = Math.floor((ntimeRemaining - D * d - H * h - M * m) / s); // Math.floor((ntimeRemaining - H * h - M * m) / s)

                    ntimeRemaining = ntimeRemaining - s * count; // 剩余的毫秒
                    let timeStr = "";
                    if (D >= 1) {
                        // if (H > 0) {
                        //     timeStr = `${D}天${H}小时`;
                        // } else {
                        //     timeStr = `${D}天`;
                        // }
                        timeStr = `${D}天${H}小时`;
                        H = H + D * 24;
                        D = 0;
                    }
                    if (D <= 0 && H < 24) {
                        timeStr = `${H}小时${M}分`;
                    }
                    if (D <= 0 && H <= 0) {
                        timeStr = `${M}分`;
                    }
                    if (D <= 0 && H <= 0 && M <= 0) {
                        timeStr = `${S}秒`;
                    }
                    // if (D <= 0 && H <= 0 && M <= 0) {
                    //     timeStr = "";
                    //     this.clearDown();
                    // };
                    // D = this.checkTime(D); // 补零后的天数
                    // H = this.checkTime(H); // 补零后的小时
                    // M = this.checkTime(M); // 补零后的分钟
                    // S = this.checkTime(S); // 补零后的秒
                    this.setData({
                        timeStr: timeStr, // ${D}天${H}小时${M}分${S}秒
                        timeData: { D: this.checkTime(D), H: this.checkTime(H), M: this.checkTime(M), S: this.checkTime(S) },
                    });
                } else {
                    this.clearDown();
                    this.setData({
                        timeStr: "",
                        timeData: { D: "00", H: "00", M: "00", S: "00" },
                    });
                    this.countEnd();
                }
            };
            fn(true); // 初始化数据

            if (ntimeRemaining <= 0) {
                return false;
            }

            // 开始倒计时 1分钟执行一次
            this.data.time = setInterval(fn, 1000 * count);
        },
        clearDown() {
            if (this.data.time) {
                clearInterval(this.data.time);
            }
        },
        countEnd() {
            console.log("time:end");
        },
        // 触发时机：接口请求结束后 || 福利弹窗关闭后
        welfareFinish(code = 500100) {
            this.triggerEvent("welfareListEnd", { code });
        },
        // 曝光埋点
        impTrack() {
            app.kksaTrack("CommonItemImp", {
                CurPage: "FindPage",
                TabModuleType: "新手三天福利",
                TabModuleTitle: "全场畅读福利",
                ContentName: "",
                ContentID: "",
            });
        },
        clkTrack(value) {
            const options = {
                ElementType: "",
                ElementShowTxt: "",
                TabModuleType: "新手三天福利",
                TabModuleTitle: "",
                ContentName: "",
                ContentID: "",
                ClkItemType: "",
                CurPage: "FindPage",
                PrePage: "",
            };
            if (value) {
                Object.assign(options, value);
            }
            if (this.data.userInfo) {
                const user = this.data.userInfo.user || {};
                const uid = user.id || "";
                options.uid = String(uid);
            }
            app.kksaTrack("CommonItemClk", options);
        },
        // 登录埋点
        loginTrack(value) {
            const { code, message = "" } = value;
            const options = {
                IsLogSuccess: code === 200,
                LoginType: "静默登录",
                LogFailError: message,
                AuthorizedLoginType: "发现页福利模块授权登录",
                TriggerPage: "FindPage",
            };
            app.kksaTrack("LoginProgram", options);
        },
    },
});
