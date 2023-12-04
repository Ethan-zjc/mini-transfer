/**
 * 阅读币/代金劵自动领取弹窗 20211111
 * isNovice: false(阅读币)  true(新手福利返回60001时领取阅读币)
 * **/
const app = getApp();
const global = app.globalData;
const { comicImgs } = require("../../../../cdn.js");
let couponTime = null; // 代金劵领取倒计时

import { util_request, util_showToast, util_getUrlQuery } from "../../../../util.js";

Component({
    properties: {
        topicId: {
            type: Number,
            value: 0,
        },
        userInfo: {
            type: Object,
            value: null,
        },
        isNovice: {
            // 是否与新手福利关联
            type: Boolean,
            value: false,
        },
        pageShow: {
            type: Boolean,
            value: false,
        },
        redirectUrl: {
            type: String,
            value: "",
        },
        vipStatus: {
            type: [String, Number],
            value: 0,
        },
    },
    data: {
        comicImgs,
        activity_name: "", // 活动名称
        activity_id: "0", // 活动id
        pool_name: "", // 活动专题池
        showCouponPop: false, // false, // 代金劵领取弹窗
        getCouponTime: 6, // 代金劵倒数默认数值
        diffTime: 5, // 代金劵下次可领时间
        couponPopData: {}, // 代金券数据
    },
    observers: {
        isNovice: function (isNovice) {
            if (isNovice) {
                // 此时调用展示阅读币内容
                this.couponPop();
            }
        },
        pageShow: function (pageShow) {
            if (pageShow) {
                this.initShow();
            }
        },
    },
    detached() {
        if (couponTime) {
            clearInterval(couponTime);
        }
    },
    methods: {
        initShow() {
            const { redirectUrl } = this.data;
            if (redirectUrl && redirectUrl.includes("coupon_welfare_mini")) {
                const activitys = {
                    activity_name: util_getUrlQuery(redirectUrl, "activity_name") || "",
                    pool_name: util_getUrlQuery(redirectUrl, "pool_name") || "",
                    coupon_topic_id: util_getUrlQuery(redirectUrl, "topic_id") || "",
                    coupon_origin: util_getUrlQuery(redirectUrl, "origin") || "",
                };
                Object.assign(this.data, {
                    ...activitys,
                });

                // 代金劵配置存在、调取接口
                if (activitys.activity_name && activitys.pool_name && activitys.coupon_topic_id) {
                    this.couponPop();
                }
            }
        },
        couponPop() {
            let { activity_name, pool_name, coupon_topic_id, isNovice, topicId } = this.data;
            let sendData = {},
                url = "";
            if (!isNovice) {
                // 小程序发代金券主页与弹窗 yapi: https://yapi.quickcan.com/project/347/interface/api/40178  付费组:杨忠宇
                // 参数: activity_name:活动名称 pool_name:活动池  topic_id:专题id
                url = "/v1/payactivity/rp_mini/home_page";
                sendData = {
                    activity_name,
                    pool_name,
                    topic_id: coupon_topic_id,
                };
            } else {
                // 小程序发代金券主页与弹窗(单个专题) yapi: https://yapi.quickcan.com/project/347/interface/api/44292 付费组:苏素飞
                // 参数: order_from:小程序渠道标识数字  topic_id:当前专题id
                url = "/v1/payactivity/rp_mini/topic_home_page";
                sendData = {
                    order_from: global.payfrom,
                    topic_id: topicId,
                };
            }

            // 调用小程序发代金券弹窗接口
            util_request({
                url: url,
                host: "pay",
                data: sendData,
            }).then((res) => {
                let { data } = res;
                let allClassType =
                    data.category && data.category.filter((item) => item.category_name == "全部") ? data.category.filter((item) => item.category_name == "全部") : [];
                let couponPopData = allClassType.length ? allClassType[0].rp_topic[0] : {};

                // 倒计时时间差
                let diffTime = data.next_activity_time - data.current_server_time;
                // 底部描述
                couponPopData.wordinfo = data.words_info.pop_info || "";
                // 关闭倒计时
                // let getCouponTime = this.data.getCouponTime;
                if (couponTime) {
                    clearInterval(couponTime);
                }
                // assign_status 1是可领取状态，只有可领取才展示
                if ((coupon_topic_id == couponPopData.topic_id || couponPopData.topic_id == topicId) && couponPopData.assign_status == 1) {
                    // 弹窗曝光埋点
                    let trackData = {
                        PayActivityName: "小程序赠币代金券活动",
                        TriggerPage: this.data.coupon_origin,
                        PayActivitySubName: "漫画页弹窗",
                    };
                    app.kksaTrack("PayActivityPV", trackData);
                    // 新手福利使用
                    if (isNovice) {
                        activity_name = data.activity_name || "";
                        pool_name = data.pool_name || "";
                        coupon_topic_id = topicId || "";
                    }
                    // activity_name, pool_name
                    this.setData(
                        {
                            showCouponPop: true,
                            couponPopData,
                            diffTime,
                            // getCouponTime,
                            activity_name,
                            pool_name,
                            coupon_topic_id,
                        },
                        () => {
                            // 登录状态 3秒倒计时候自动领取
                            if (this.data.userInfo) {
                                // 付费弹窗重叠存在可能线程占用，不实时问题
                                couponTime = setInterval(() => {
                                    let { getCouponTime } = this.data;
                                    if (getCouponTime > 0) {
                                        getCouponTime--;
                                        this.setData({
                                            getCouponTime,
                                        });
                                    } else {
                                        clearInterval(couponTime);
                                        // 自动领取
                                        this.getCouponGift();
                                        this.closeCouponPop();
                                    }
                                }, 1000);
                            }
                        }
                    );
                }
            });
        },

        // 自动领取 代金劵
        getCouponGift() {
            // 支付宝区分coupon_topic_id在props
            let { activity_name, coupon_topic_id, pool_name, topicId } = this.data;
            // 领取小程序发代金券 yapi: https://yapi.quickcan.com/project/347/interface/api/40270 付费组:杨忠宇
            // 参数: activity_name:活动名称 pool_name:活动池  topic_id:专题id
            util_request({
                url: `/v1/payactivity/rp_mini/assign`,
                host: "pay",
                method: "post",
                data: {
                    activity_name,
                    pool_name,
                    topic_id: coupon_topic_id || topicId, // 活动专题不存在就使用当前章节id
                },
            }).then((res) => {
                let { code, data } = res;
                if (code == 200 && data.success) {
                    util_showToast({
                        title: "领取成功",
                    });

                    // 领取埋点上报
                    let trackData = {
                        PayActivityName: "小程序赠币代金券活动",
                        TriggerPage: this.data.coupon_origin,
                        TopicName: this.data.topicTit,
                        ButtonName: "领取增币",
                        IsTakeSuccess: 1,
                        PayActivitySubName: "漫画页弹窗",
                    };
                    app.kksaTrack("PayActivityBtnClk", trackData);

                    // 付费类型，需要刷新弹窗接口
                    if (this.data.vipStatus == 1) {
                        // 替换成回调
                        this.triggerEvent("pageRefreshBack", { type: 1 });
                    }
                } else {
                    // 领取埋点上报
                    let trackData = {
                        PayActivityName: "小程序赠币代金券活动",
                        TriggerPage: this.data.coupon_origin,
                        TopicName: this.data.topicTit,
                        ButtonName: "领取增币",
                        IsTakeSuccess: 0,
                        PayActivitySubName: "漫画页弹窗",
                    };
                    app.kksaTrack("PayActivityBtnClk", trackData);
                    util_showToast({
                        title: data.responseCodeMsg.message || "领取失败",
                    });
                }
            });
        },

        // 领取阅读币-关闭代金劵弹窗
        closeCouponPop() {
            this.setData({
                showCouponPop: false,
            });
        },

        // 领取阅读币-去登陆
        toLogin() {
            this.setData({
                showCouponPop: false,
            });
            wx.navigateTo({
                url: "/pages/login/login",
            });
        },
    },
});
