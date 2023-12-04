/**
 * 发现页&推荐页新手每日登录领取福利
 * @param show {Boolean} 是否显示
 * @param userInfo {Object} 用户信息
 * @param TriggerPage {String} 所在的页面
 * */
import { util_action, util_requestSubscribeMessage } from "../../util.js";
import { getNewBenefitCountdown, getSignInfo } from "./api.js";
const app = getApp();
const global = app.globalData;

Component({
    properties: {
        show: {
            type: Boolean,
            value: false,
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
    },

    data: {
        previousUserId: null,
        isInitComp: false, // 是否初始化过组件
        time: null, // 定时器对象
        isShowRulePopup: false, // 是否显示规则弹窗
        currentDays: 0, // 当前领取的天数(领取代金券次数)
        timeStr: "", // 格式后的时间字符串
        timeData: "", // 格式化后的时间对象
        ruleList: [], // 规则数据
        webH5Url: "", // 点击按钮跳转的链接
        rpAmount: 0, // 代金券价值
        firstReport: false, // 是否上报过显示模块的上报
        imagesData: {
            // **** 新用户
            iconArrowRight: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-arrow-right_97cdce5.png", // 箭头
            iconFinish: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-finish_a99a408.png", // 领取了
            iconHelp: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-help_0e7a4dc.png", // 规则
            iconNoFinish: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-no-finish_838dea0.png", // 未领取
            // **** 老用户
            arrowTop: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/arrow-top_4a59ba6.png",
            // 20210602 新增图片地址
            miniSee: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-see_403ee19.png", // 查看按钮
            miniKkb: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-kkb_3f21789.png", // 未领取的kkb背景
            miniComplete: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-complete_39f7217.png", // 已签到/已领取/已过期的
            miniReceive: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-receive_12e1c3b.png", // 待领取背景
            miniSign: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-sign_2470f02.png", // 代签的的背景
            miniGift: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-gift_fb0d678.png", // 礼包
        },
        imagesDataNew: {
            // **** 新用户
            iconArrowRight: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-arrow-right_97cdce5.png", // 箭头
            iconFinish: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-finish_a99a408.png", // 领取了
            iconHelp: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-help_0e7a4dc.png", // 规则
            iconNoFinish: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/icon-no-finish_838dea0.png", // 未领取
            // **** 老用户
            arrowTop: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/arrow-top_4a59ba6.png",
            // 20210602 新增图片地址
            miniSee: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-see_403ee19.png", // 查看按钮
            miniKkb: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/check/kkb-1_f1f9323.png", // 未领取的kkb背景
            miniComplete: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/check/success_9b8a175.png", // 已签到/已领取/已过期的
            miniReceive: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/check/kkb-2_ceb7745.png", // 待领取背景
            miniSign: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/check/kkb-2_ceb7745.png", // 代签的的背景
            miniGift: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/check/gift_03eaa36.png", // 礼包
        },
        // 老用户阶梯领取阅读币
        isRulepopup: false, // 是否显示老用户阶梯签到规则弹窗
        isFold: null, // 是否折叠示老用户阶梯签到模块
        foldTiem: null, // 展开收起动画
        sign_in_days: 0, // 连续签到天数
        today_kkb: 0, // 今日可领取kkb阅读劵
        tomorrow_kkb: 0, // 明日可领取kkb 阅读券
        kkb_number: [], // 连续签到天数对应的kkb阅读券奖励数
        sign_in_status: 0, // 当天是否已签到  1:当天签到过，0：当天没有签到
        target_url: "", // 跳转的webapp的url地址
        mySwitch: false, // 是否选中签到提醒 false
        isClickClockinGetkkb: true, // 防止重复点击签到去领取
        isNewCard: false,
    },

    attached() {
        if (this.properties.show) {
            // this.getData();
            this.getBaseInfo();
            let time = setTimeout(() => {
                clearTimeout(time);
                this.data.isInitComp = true;
            }, 200);
            // 签到提醒状态: 1->默认开启订阅 2->默认关闭订阅
            const signinSubscriptionSwitch = wx.getStorageSync("signinSubscriptionSwitch") || 1;
            this.setData({
                mySwitch: signinSubscriptionSwitch == 1, // 是否选中签到提醒 false
            });
        }
    },

    // 组件所在页面的生命周期函数
    pageLifetimes: {
        show() {
            if (this.properties.show && this.data.isInitComp) {
                // 显示的页面刷新数据
                // this.getData();
                this.getBaseInfo();
            }
            const signinSubscriptionSwitch = wx.getStorageSync("signinSubscriptionSwitch") || 1; // 1->默认开启订阅 0->默认关闭订阅
            this.setData({
                mySwitch: signinSubscriptionSwitch == 1, // 是否选中签到提醒 false
            });
            console.log("openid:::", global.openId);
        },
    },

    methods: {
        // 先获取实验标识，是否显示新版样式
        async getBaseInfo() {
            const list = await app.getAbTest();
            const isFind = this.data.TriggerPage == "FindPage";
            const isNewCard = isFind && list.includes("s_wxcheckin_a");
            this.setData({
                isNewCard,
            });
            this.getData();
        },
        // 获取数据 & 更新数据
        getData() {
            let isLogin = !!this.properties.userInfo;
            if (!isLogin) {
                if (this.data.time) {
                    clearInterval(this.data.time);
                    this.data.time = null;
                }
                this.setData({ timeStr: "", timeData: {} }); // 情空数据

                return false;
            }

            let userInfo = this.properties.userInfo && this.properties.userInfo.user ? this.properties.userInfo.user : {};
            if (userInfo.id != this.data.previousUserId) {
                let dataTrack = {
                    TriggerPage: this.properties.TriggerPage, // 触发页面
                    SourcePlatform: global.channel, // 来源平台
                    isLoginType: !!this.properties.userInfo, // 登陆状态
                    isSuccessReceived: false, // 是否领取成功
                    ActivityName: "新手期阅读币领取",
                };
                app.kksaTrack("ShowNewUserGift", dataTrack);
            }
            this.data.previousUserId = userInfo.id || null;

            getNewBenefitCountdown()
                .then((res) => {
                    if (this.data.time) {
                        clearInterval(this.data.time);
                        this.data.time = null;
                    }
                    let { code, data, message } = res;
                    // console.log(res)
                    if (code != 200) {
                        return false;
                    }
                    let {
                        time_remaining, // 剩余时间（单位：毫秒）
                        assign_rp_times, // 领取代金券次数
                        rp_activity_rule, // 领取代金券规则
                        rp_activity_url, // 领取代金券活动链接
                        rp_amount, // 代金券价值
                    } = data;
                    // 格式化数据
                    time_remaining = isNaN(time_remaining) ? 0 : Number(time_remaining);
                    time_remaining = time_remaining <= 0 ? 0 : time_remaining;
                    assign_rp_times = isNaN(assign_rp_times) ? 0 : Number(assign_rp_times);
                    assign_rp_times = assign_rp_times <= 0 ? 0 : assign_rp_times >= 3 ? 3 : assign_rp_times;
                    rp_activity_rule = rp_activity_rule || "";
                    rp_activity_url = rp_activity_url || "";
                    rp_amount = rp_amount || 0;
                    let ruleList = rp_activity_rule.split(";"); // 拆分字符串
                    this.setData({
                        currentDays: assign_rp_times,
                        ruleList,
                        webH5Url: rp_activity_url, // 点击按钮跳转的链接
                        rpAmount: rp_amount, // 代金券价值
                    });

                    this.countDown(time_remaining); // 格式化时间后进行倒计时
                })
                .catch(() => {
                    if (this.data.time) {
                        clearInterval(this.data.time);
                        this.data.time = null;
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

                    ntimeRemaining = ntimeRemaining - s * 60; // 剩余的毫秒
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
                        timeStr = `${H}小时`;
                    }
                    if (D <= 0 && H <= 0) {
                        timeStr = `${M}分`;
                    }
                    if (D <= 0 && H <= 0 && M <= 0) {
                        timeStr = "";
                        if (this.data.time) {
                            clearInterval(this.data.time);
                            this.data.time = null;
                        }
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
                    if (this.data.time) {
                        clearInterval(this.data.time);
                        this.data.time = null;
                    }
                    this.setData({
                        timeStr: "",
                        timeData: { D: "00", H: "00", M: "00", S: "00" },
                    });
                    this.getClockinData();
                }
            };
            fn(true); // 初始化数据

            if (ntimeRemaining <= 0) {
                return false;
            }

            // 开始倒计时 1分钟执行一次
            this.data.time = setInterval(fn, 1000 * 60);
        },

        // 点击打开规则弹窗
        clickHelp() {
            this.setData({ isShowRulePopup: true });
        },

        // 点击关闭规则弹窗
        clickCloseBtn() {
            this.setData({ isShowRulePopup: false });
        },

        // 点击领取按钮
        clickDrawBtn() {
            let dataTrack = {
                TriggerPage: this.properties.TriggerPage, // 触发页面
                ButtonName: "领取", // 当点击领取按钮时上报
                SourcePlatform: global.channel, // 来源平台
                isLoginType: !!this.properties.userInfo, // 登陆状态
                isSuccessReceived: false, // 是否领取成功 跳转是不知道是否领取成功
                // 待添加领取次数
                ActivityName: "新手期阅读币领取",
                acquirenumber: this.data.currentDays, // 领取次数
            };
            app.kksaTrack("ClickNewUserGift", dataTrack);

            util_action({ type: 2003, url: this.data.webH5Url });
        },

        // 静默登录
        originLogin(e) {
            const data = e.currentTarget.dataset;
            const pages = getCurrentPages(); // 页面栈
            app.originLogin(e.detail).then((res) => {
                if (pages.length == 1) {
                    wx.reLaunch({
                        url: "/" + pages[0].route,
                    });
                } else {
                    wx.reLaunch({
                        url: "/pages/find/find",
                    });
                }
            });
        },

        /**
         * 老用户阶梯签到领取阅读币 模块函数
         * **/
        clickMySwitch() {
            let mySwitch = !this.data.mySwitch;
            wx.setStorageSync("signinSubscriptionSwitch", mySwitch ? 1 : 2);
            this.setData({ mySwitch: mySwitch });
        },

        // 点击显示老用户阶梯签到领取阅读币规则弹窗
        clickClockinHelp() {
            this.setData({ isRulepopup: true });
        },

        // 点击关闭老用户阶梯签到领取阅读币规则弹窗
        clickClockinCloseBtn() {
            this.setData({ isRulepopup: false });
        },

        // 点击折叠展开按钮
        clickArrowAtn() {
            // 动画没有结束
            if (this.data.foldTiem) {
                return;
            }
            let dataTrack = {
                NoticeType: this.data.mySwitch ? "打开" : "关闭",
                TriggerPage: this.properties.TriggerPage, // 触发页面
                ButtonName: this.data.isFold == false ? "展开" : "折叠",
            };
            app.kksaTrack("CheckInCardClick", dataTrack);
            this.data.foldTiem = setTimeout(() => {
                clearTimeout(this.data.foldTiem);
                this.data.foldTiem = null;
            }, 500);
            let isFold = this.data.isFold == null ? true : this.data.isFold;
            this.setData({ isFold: !isFold });
        },

        // 打开老用户签到H5活动
        openOldUsersSigninH5() {
            const { TriggerPage, sign_in_status, target_url } = this.data;
            this.data.isClickClockinGetkkb = true; // 下次可以点击
            let dataTrack = {
                NoticeType: this.data.mySwitch ? "打开" : "关闭",
                TriggerPage: TriggerPage, // 触发页面
                ButtonName: sign_in_status == 0 ? "签到" : "领取",
                // sign_in_status, // 当天是否已签到 2:当天签到过，并且领取了阅读币 1:当天签到过,没有领取阅读币0：当天没有签到,没有领取阅读币
            };
            app.kksaTrack("CheckInCardClick", dataTrack);
            let url = target_url || "";
            url = url.indexOf("?") > -1 ? `${url}&origin=${TriggerPage}` : `${url}?origin=${TriggerPage}`;
            util_action({ type: 2003, url: url });
        },

        // 点击领取
        clickClockinGetkkb(e) {
            const { sign_in_status, mySwitch, isClickClockinGetkkb } = this.data;
            const dataset = e.currentTarget.dataset || {};
            if (!isClickClockinGetkkb) {
                // 防止重复点击去H5按钮
                return false;
            }
            if (!dataset.isclick) {
                return false;
            }
            this.data.isClickClockinGetkkb = false;
            if (sign_in_status == 0 && mySwitch) {
                let tmplIds = ["EyO4S0ZJOdYf23eVRaugrlSfjMhZqv-C5fdHSx9hQhM"];
                util_requestSubscribeMessage({ tmplIds })
                    .then((res) => {
                        // console.error("util_requestSubscribeMessage-res", res)
                        res = res || {};
                        let data = res[tmplIds[0]] || "";
                        // if (data != "accept") {
                        //     util_showToast({
                        //         title: "订阅失败",
                        //         duration: 3000
                        //     });
                        // }
                        app.kksaTrack("TriggerAuthorization", {
                            AuthorizationResult: data == "accept" ? 1 : 0,
                            TriggerTiming: "签到",
                        });
                        this.openOldUsersSigninH5();
                    })
                    .catch((err) => {
                        // util_showToast({
                        //     title: "订阅失败",
                        //     duration: 3000
                        // });
                        this.openOldUsersSigninH5();
                    });
                return false;
            }
            this.openOldUsersSigninH5();
        },

        // 获取当前签到数据
        getClockinData() {
            const { isNewCard, imagesDataNew, imagesData } = this.data;
            const imagesUrl = isNewCard ? imagesDataNew : imagesData;
            getSignInfo()
                .then((res) => {
                    let { code, data } = res;
                    if (code != 200) {
                        return false;
                    }
                    data = data || {};
                    let {
                        sign_in_days, // 连续签到天数
                        today_kkb, // 今日可领取kkb阅读劵
                        tomorrow_kkb, // 明日可领取kkb 阅读券
                        kkb_number, // 连续签到天数对应的kkb阅读券奖励数
                        sign_in_status, // 当天是否已签到 2:当天签到过，并且领取了阅读币 1:当天签到过,没有领取阅读币0：当天没有签到,没有领取阅读币
                        target_url, // 保底跳转的webapp的url地址
                        new_target_url, // 跳转的webapp的url地址
                    } = data;
                    target_url = new_target_url || target_url || "";
                    sign_in_days = isNaN(sign_in_days) ? 0 : Number(sign_in_days);
                    today_kkb = isNaN(today_kkb) ? 0 : Number(today_kkb);
                    tomorrow_kkb = isNaN(tomorrow_kkb) ? 0 : Number(tomorrow_kkb);
                    // kkb_number 转换为数组并保证有7天的数据
                    kkb_number = Object.values(kkb_number ? kkb_number : {}).slice(0, 7); // 转换为数组,并且
                    let len = 7 - kkb_number.length;
                    if (len > 0) {
                        for (let i = 0; i < len; i++) {
                            let kkbNmb = kkb_number.length > 0 ? kkb_number[kkb_number.length - 1] : 0;
                            kkb_number.push(kkbNmb);
                        }
                    }
                    kkb_number = kkb_number.slice(0, 7);

                    // 格式化已有的kkb_number数据
                    let get_max_kkb = kkb_number[kkb_number.length - 1];
                    kkb_number.forEach((item, index) => {
                        let i = index + 1; // 计算前的数字天数
                        let sign_in_days_copy = sign_in_days > 3 ? sign_in_days - (sign_in_status ? 2 : 1) : 0; // 备份的连续签到天数,计算展示的标题使用
                        let active = false; // 是否签到
                        if (sign_in_days >= sign_in_days_copy + i) {
                            active = true;
                        } else if (sign_in_days == sign_in_days_copy + i) {
                            active = !!sign_in_status; // 1:当天签到过，0：当天没有签到
                        }

                        let days_num = sign_in_days_copy + i; // 默认展示的天数

                        let class_name = "item-bg-kkb";
                        let icon_url = imagesUrl.miniKkb;
                        // signInDays 更加签到状态设置当前天数,用于判断是否为今天
                        let today = sign_in_status == 0 ? sign_in_days + 1 : sign_in_days;
                        if (days_num < today) {
                            class_name = "item-bg-complete";
                            icon_url = imagesUrl.miniComplete;
                        } else if (days_num > today) {
                            class_name = "item-bg-kkb";
                            // 第七天显示礼包
                            if (days_num == 7) {
                                icon_url = imagesUrl.miniGift;
                            } else {
                                icon_url = imagesUrl.miniKkb;
                            }
                        } else if (days_num == today) {
                            if (sign_in_status == 0) {
                                class_name = "item-bg-sign";
                                icon_url = imagesUrl.miniSign;
                            } else if (sign_in_status == 1) {
                                class_name = "item-bg-receive";
                                icon_url = imagesUrl.miniReceive;
                            } else if (sign_in_status == 2) {
                                class_name = "item-bg-complete";
                                icon_url = imagesUrl.miniComplete;
                            }
                        }

                        kkb_number[index] = {
                            today, // 判断是否为今天
                            kkb_pos_num: item || 0, // 气泡展示的可领取的阅读币
                            days_num, // 默认展示的天数
                            active, // 当前的天数是否领取过
                            get_max_kkb: days_num >= 7 ? get_max_kkb : 0, // 连续签到天大于等于7天,气泡展示最大可领取的kkb
                            class_name, // 不同状态展示的样式
                            icon_url, // 不同状态下展示icon
                        };
                    });
                    if ((sign_in_status == 2) & isNewCard) {
                        this.setData({
                            kkb_number: [],
                        });
                        return false;
                    }
                    if (sign_in_status == 2 && this.data.isFold == null) {
                        this.setData({
                            isFold: false,
                            sign_in_days,
                            today_kkb,
                            tomorrow_kkb,
                            kkb_number,
                            sign_in_status,
                            target_url,
                        });
                    } else {
                        this.setData({
                            sign_in_days,
                            today_kkb,
                            tomorrow_kkb,
                            kkb_number,
                            sign_in_status,
                            target_url,
                        });
                    }
                })
                .catch((err) => {
                    return false;
                });
        },
    },
});
