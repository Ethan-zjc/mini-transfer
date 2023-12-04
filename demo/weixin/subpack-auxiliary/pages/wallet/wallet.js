const app = getApp();
const { connect } = app.Store;
const global = app.globalData;
const { cdnIconsImgs } = require("../../../cdn.js");

import { util_action, util_request, util_checkWallet, util_getPointCharge } from "../../../util.js";

const page = {
    data: {
        contactOpt: "",
        reportedId: "",
        recharge: "",
        buttonTxt: "立即充值",
        couponKkb: 0,
        couponNew: false,
        // 使用的远程图片地址  小程序迭代7添加
        images: {
            wallet: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/background/wallet_696df41.png", // 钱包头部背景
        },
        cdnIconsImgs,
        readCoupon: {
            totalActivityCoupon: 0,
            hasUnread: false,
        },
    },
    onLoad() {
        const isiOS = global.isiOS;
        this.setData({
            isiOS,
            contactOpt: `env=${global.environment}`,
            recharge: global.recharge.customer || "",
        });
        if (isiOS) {
            this.setData({
                buttonTxt: "iOS功能暂不可用",
            });
        }
    },

    onShow() {
        util_checkWallet(this).then((data) => {
            // 付费埋点上报 S
            let time = setTimeout(() => {
                clearTimeout(time);
                // 活动文案
                const word = global.isiOS ? "" : data.activity.activity_word;
                this.getPointCharge(word); // 付费埋点上报
            }, 300);
            // 付费埋点上报 E

            const activity = data.activity;
            // 按钮配置文案
            if (!this.data.isiOS) {
                this.setData({
                    buttonTxt: activity.button_title,
                });
            }
            // 数据上报（一个user仅上报一次）
            const uid = this.data.reportedId;
            if (uid && uid === global.userId) {
                return;
            }
            this.data.reportedId = global.userId;
        });
        // 代金券配置文案和小红点
        util_request({
            host: "pay",
            url: "/v2/kb/rp/tips",
        }).then((res) => {
            const data = res.data;
            this.setData({
                couponKkb: data.usable_kkb,
                couponNew: data.has_new,
            });
        });
        // 阅读劵文案和小红点
        this.getReadCoupon();
    },

    routeWebview() {
        if (!this.data.isiOS) {
            util_action({ type: 22, subpack: true });
        }
    },

    handleContact(e) {
        const { path } = e.detail;
        const { type } = e.detail.query;
        const params = type ? `?type=${type}` : "";
        if (path) {
            wx.navigateTo({ url: `${path}${params}` });
        }
    },

    routeBought(event) {
        const { type } = event.currentTarget.dataset;
        wx.navigateTo({
            url: `/subpack-auxiliary/pages/bought/bought?type=${type}`,
        });
    },

    routeCouponList() {
        wx.navigateTo({
            url: "/subpack-auxiliary/pages/coupon-list/coupon-list",
        });
    },

    routeReadCouponList() {
        wx.navigateTo({
            url: "/subpack-auxiliary/pages/read-coupon/read-coupon",
        });
    },

    routeChargePage() {
        let url = global.onRelease ? "https://m.kuaikanmanhua.com/mob/exchange" : "https://mini.kkmh.com/mob/exchange";
        wx.navigateTo({
            url: `/pages/webview/webview?url=${encodeURIComponent(url)}&type=protocol`,
        });
    },

    routeOrderPage() {
        wx.navigateTo({
            url: "/subpack-auxiliary/pages/order/order",
        });
    },

    getReadCoupon() {
        util_request({
            host: "pay",
            url: "/v1/coupon/activity_coupon/timeline",
        }).then((res) => {
            res = res || {};
            const { code, data } = res;
            if (code !== 200) {
                return false;
            }
            const { total_activity_coupon, has_unread } = data;
            const readCoupon = {
                totalActivityCoupon: total_activity_coupon,
                hasUnread: has_unread,
            };
            this.setData({ readCoupon });
        });
    },

    // getPointCharge 用户充值相关埋点(获取用户累计充值次数和最后充值时间)  word: 活动文案
    getPointCharge(word) {
        util_getPointCharge().then((res) => {
            let {
                last_recharge_time, // 最后充值时间
                LastRechargeTime, // 最后充值时间
                recharge_type, // 累计充值次数
                RechargeType, // 累计充值次数
            } = res;
            const kksaTrackData = {
                LatestBalance: this.data.wallet ? this.data.wallet : 0, // 我的余额
                LastRecharge_time: LastRechargeTime, // 最后充值时间
                RechargeType, // 累计充值次数
                RechargeDiscountName: word ? word : "无", // 充值折扣活动名称
                SourcePlatform: global.channel, // ',//来源平台 wechat、qq、zijietiaodong、baidu、Alipay、M站      M站 小程序
            };
            app.kksaTrack("VisitmMyWallet", kksaTrackData); // 埋点
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, wallet }) => {
        return {
            userInfo,
            wallet,
        };
    },
    (setState, _state) => ({
        setWallet(newVal) {
            setState({
                wallet: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
