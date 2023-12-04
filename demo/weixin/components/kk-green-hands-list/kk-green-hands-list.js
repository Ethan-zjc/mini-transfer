const app = getApp();
const global = app.globalData;

import { util_request, util_action } from "../../util.js";

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
        cacheUserId: "",
        visible: false,
        isLogin: false,
        isScroll: false,
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
    },
    pageLifetimes: {
        show() {
            this.userChanged((userId) => {
                console.log("uid变化", userId);
                this.getList();
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
                util_request({
                    url: `/v1/checkin/api/mini/${global.channel}/benefit/discovery`,
                })
                    .then((res) => {
                        const { code, data = {} } = res;
                        if (code == 200) {
                            resolve(data);
                        } else {
                            reject();
                        }
                    })
                    .catch(() => {
                        reject();
                    });
            });
        },
        getList() {
            this.clearDown();
            this.getApi()
                .then((data) => {
                    const { topic_list = [], free_deadline = 0 } = data;
                    const list = topic_list.map((item) => {
                        item.action = item.action_protocol || {};
                        item.src = item.vertical_image_url || "";
                        item.bottom = item.popularity_text || "";
                        item.width = 168;
                        item.height = 222;
                        return item;
                    });

                    const isLogin = !!this.data.userInfo;
                    const visible = list.length > 0;
                    const countTime = free_deadline - new Date();

                    this.setData({
                        timeStr: "",
                        timeData: "",
                        visible,
                        isLogin,
                        scrollLeft: 0,
                        list,
                    });

                    if (visible && countTime > 0 && isLogin) {
                        this.countDown(countTime);
                    }
                    if (visible) {
                        app.kksaTrack("ShowNewUserGift", {
                            TriggerPage: this.data.TriggerPage,
                            ShowType: "Entrance",
                            isLoginType: isLogin,
                        });
                    }
                })
                .catch(() => {
                    this.setData({
                        timeStr: "",
                        timeData: "",
                        visible: false,
                    });
                });
        },
        tapAction(event) {
            const { dataset = {} } = event.currentTarget;
            const { action } = dataset;
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
            util_action({ type, id, url, parentid });
            this.tapTrack();
        },
        tapMore() {
            wx.navigateTo({
                url: "/subpack-auxiliary/pages/welfare-list/welfare-list",
            });
            this.tapTrack();
        },
        // 跳转登录页
        routeLogin() {
            // 跳转登陆时记录一下(点击新手福利卡片)
            if (!wx.getStorageSync("loginPageShow")) {
                wx.setStorageSync("loginPageShow", 1);
            }
            wx.navigateTo({ url: "/pages/login/login" });
            this.tapTrack();
        },
        tapTrack() {
            const { TriggerPage, isLogin } = this.data;
            app.kksaTrack("ClickNewUserGift", {
                TriggerPage: TriggerPage,
                ShowType: "Entrance",
                ButtonName: 5,
                isLoginType: isLogin,
            });
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
            let count = 60;
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
                    }
                    if (D <= 0 && H < 24) {
                        timeStr = `${H}小时${M}分`;
                    }
                    if (D <= 0 && H <= 0) {
                        timeStr = `${M}分`;
                    }
                    // if (D <= 0 && H <= 0 && M <= 0) {
                    //     timeStr = `${S}秒`;
                    // };
                    if (D <= 0 && H <= 0 && M <= 0) {
                        timeStr = "";
                        this.clearDown();
                    }
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
            this.setData({
                visible: false,
            });
        },
    },
});
