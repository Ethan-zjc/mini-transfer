import { util_adTrack, util_showToast } from "../../../../util.js";

const api = require("../../api");
const app = getApp();
const global = app.globalData;
let videoAdNew = null;

Component({
    properties: {
        isVip: {
            type: Boolean,
            value: false,
        },
        wallet: {
            type: [Number, String],
            value: 0,
        },
        price: {
            type: [Number, String],
            value: 0,
        },
        topicId: {
            type: [Number, String],
            value: 0,
        },
        comicId: {
            type: [Number, String],
            value: 0,
        },
        advData: {
            type: [Object, Array],
            value: {},
        },
        payTrackData: {
            type: Object,
            value: {},
        },
        isCanPay: {
            type: Boolean,
            value: false,
        },
    },

    data: {
        isLogin: false,
        isiOS: false,
        payFrom: global.payfrom,
        advReady: false, // 预先准备广告(组件是否先管部分的信息)
        advLoading: false, // 预加载广告
        advParams: {}, // 服务端接口获取的广告其他信息数据
        advText: ["看广告免费读", "剩余的次数"], // 激励视频广告
        advId: "", // 广告unit-id
        ad_pos_id: "", // 广告位id
        adCode: 200, // 广告加载的状态code  可用adCode=200 null
    },
    attached() {
        const { channel, isiOS } = app.globalData;
        const adGroup = {
            wechat: {
                unitId: "adunit-d0b61b5dd8e17979", // 正确的，修改unit
                posId: "3.1.f.1",
            },
            qq: {
                unitId: "f4d8772ceab5a481b463cdc45abc6570",
                posId: "3.1.f.2",
            },
        };
        this.setData(
            {
                isiOS,
                isLogin: !!global.userId,
                ad_pos_id: adGroup[channel].posId,
                advId: adGroup[channel].unitId,
            },
            () => {
                this.initData();
            }
        );
    },
    methods: {
        initData() {
            let adsInfo = this.data.advData || {};
            let advText = [adsInfo.btn_text ? adsInfo.btn_text : "看广告免费读", adsInfo.icon_text ? adsInfo.icon_text : ""];
            let advParams = {
                business_id: adsInfo.business_id, // 业务id
                order_id: adsInfo.order_id, // 订单号
                pos_id: adsInfo.pos_id, // 位置id
                attach: adsInfo.attach, // 贴上
                sign: adsInfo.sign, // 签名
            };
            this.setData({
                advReady: true, // 是否可以预加载
                advText, // adsInfo.btn_text->看广告免费读   adsInfo.icon_text->今日剩余6次
                advParams, // 服务端接口获取的广告其他信息数据
            });
            this.advInit();
        },
        // 点击看广告(激励视频)免费看按钮
        onSysYesAdTap(event) {
            if (!videoAdNew) {
                util_showToast({
                    title: "广告初始化失败，请稍后重试",
                    type: "error",
                    mask: true,
                    duration: 3000,
                });
                return false;
            }

            if (this.data.advLoading) {
                return false;
            }

            const dataset = event.currentTarget.dataset;
            const btnname = dataset.btnname;
            const btntype = dataset.btntype;

            // 广告点击埋点
            this.triggerEvent("onTrackClick", {
                ButtonName: btnname,
                ButtonType: btntype,
            });

            this.setData({ advLoading: true });

            videoAdNew
                .show()
                .then(() => {
                    this.onAdTrack("VIEW"); // 显示广告打点
                    this.setData({ adCode: 200 });
                    this.advOnClose(btnname); // 检测关闭广告回调函数
                })
                .catch(() => {
                    videoAdNew
                        .load()
                        .then(() => {
                            // console.warn('加载广告后videoAd.show().then: 成功');
                            videoAdNew.show().then(() => {
                                this.onAdTrack("VIEW"); // 显示广告打点
                                this.setData({ adCode: 200 });
                                this.advOnClose(btnname); // 检测关闭广告回调函数
                            });
                        })
                        .catch((err) => {
                            this.setData(
                                {
                                    advLoading: false, // 广告加载的状态
                                    adCode: err.errCode, // 记录广告加载的错误code码
                                },
                                () => {
                                    // 设置广告code存储的时间(存储不可用的时间)
                                    this.setStorageAdCodeTime(() => {
                                        // 检测广告code 是否为200,可用状态,设置时间超过两分钟重置
                                        this.checkAdCodeAvailable();
                                    });
                                    this.advError(); // 加载失败的时候,只用用户触发点击 触发广告失败提示
                                }
                            );
                        });
                });
        },
        // 设置广告code存储的时间(存储不可用的时间)
        setStorageAdCodeTime(callback) {
            wx.setStorage({
                key: "comicAdCodeTime",
                data: new Date().getTime(),
                complete(data) {
                    if (callback && typeof callback == "function") {
                        callback();
                    }
                },
            });
        },
        // 检测广告code 是否为200,可用状态,设置时间超过两分钟重置
        checkAdCodeAvailable() {
            let adCode = this.data.adCode;
            if (adCode == 200) {
                // 重新进来后的展示
                return false;
            }
            let dichotomy = 1000 * 60 * 2; // 两分钟的毫秒
            let timestamp = new Date().getTime(); // 当前的时间
            let comicAdCodeTime;
            try {
                comicAdCodeTime = wx.getStorageSync("comicAdCodeTime");
            } catch (e) {
                comicAdCodeTime = 0;
            }
            comicAdCodeTime = comicAdCodeTime ? comicAdCodeTime : 0;
            if (!comicAdCodeTime || comicAdCodeTime == 0) {
                this.setData({ adCode: 200 });
                wx.setStorage({ key: "comicAdCodeTime", data: 0 });
                return true;
            }
            comicAdCodeTime = Number(comicAdCodeTime);

            // 当前的时间戳-存储的时间戳 >= 两分钟的毫秒 说明可以用 adCode = 200
            if (timestamp - comicAdCodeTime >= dichotomy) {
                this.setData({ adCode: 200 });
                wx.setStorage({ key: "comicAdCodeTime", data: 0 });
                return true;
            }

            // 这种情况说明是广告不可用 1004
            if (!adCode) {
                this.setData({ adCode: 1004 });
            }

            let time = setTimeout(() => {
                clearTimeout(time);
                this.checkAdCodeAvailable();
            }, 1000);
        },
        // 检测广告初始化按钮是否展示
        advCheckLoad() {
            if (!wx.createRewardedVideoAd || !videoAdNew) {
                this.setData({
                    advLoading: false,
                    adCode: 404,
                });
                return;
            }
            this.advCheckTimer()
                .then(() => {
                    this.setData({
                        advLoading: false,
                    });
                })
                .catch(() => {
                    // 固定为404错误码
                    this.setData(
                        {
                            advLoading: false,
                            adCode: 404,
                        },
                        () => {
                            this.advError();
                        }
                    );
                });
        },
        // 检测广告能否播放，最长等待时长5秒
        advCheckTimer() {
            let timer = null;
            const startTime = new Date().getTime();
            return new Promise((resolve, reject) => {
                const callback = () => {
                    timer = setTimeout(() => {
                        clearTimeout(timer);
                        videoAdNew
                            .load()
                            .then(() => {
                                resolve();
                            })
                            .catch(() => {
                                const endTimer = new Date().getTime();
                                if (endTimer - startTime < 5000) {
                                    callback();
                                } else {
                                    reject();
                                }
                            });
                    }, 1650);
                };
                videoAdNew
                    .load()
                    .then(() => {
                        resolve();
                    })
                    .catch(() => {
                        callback();
                    });
            });
        },
        // 广告关闭检测事件
        advOnClose(name) {
            if (!videoAdNew) {
                return false;
            }
            videoAdNew.onClose((res) => {
                if (!videoAdNew) {
                    return false;
                }
                videoAdNew.offClose();
                this.onAdTrack("VIDEO_CLOSE"); // 打点-关闭
                let AdPaid = 0;
                if ((res && res.isEnded) || res === undefined) {
                    AdPaid = 1;
                    // 正常播放结束，可以下发奖励
                    this.advSuccess();
                } else {
                    this.setData({ advLoading: false }); // 广告播放失败
                }

                let payTrackData = this.data.payTrackData;
                // 用户手动购买
                app.kksaTrack("Consume", {
                    TopicName: payTrackData.TopicName, // 专题名称
                    ComicName: payTrackData.ComicName, // 漫画名称
                    AutoPaid: 0, // this.data.autoPay ? 1 : 0, //是否自动购买  1自动购买，0非自动购买
                    CurrentPrice: 0, // 实际支付价格
                    SpendGiveCurrency: 0, // 消费赠币数量
                    SpendRecharge: 0, // 消费充值币数量
                    LastRechargeTime: payTrackData.LastRechargeTime, // 最后充值时间
                    TechargeType: payTrackData.RechargeType, // 累计充值次数
                    MembershipClassify: payTrackData.MembershipClassify, // 是否为会员
                    VoucherPaid: payTrackData.VoucherPaid, // 是否有代金券优惠  1有，0没有
                    VoucherCount: payTrackData.VoucherCount, // 代金券优惠金额
                    AdPaid, // 使用广告解锁成功	0为默认值  1为广告解锁成功   2为广告解锁失败
                    TriggerPage: "ComicPage", // 触发的页面
                    TriggerButton: name || "", // 点击的按钮
                    VoucherActivityId: -1, // 代金劵活动id
                    BatchPaid: false, // 是否是批量购买
                    BatchDiscount: 0, // 批量购买优惠金额
                });
            });
        },
        // 广告实例初始化
        advInit() {
            if (wx.createRewardedVideoAd) {
                let isPreLoading = true;
                videoAdNew = wx.createRewardedVideoAd({
                    adUnitId: this.data.advId,
                });
                videoAdNew.onLoad(() => {
                    this.setData({ adCode: 200 });
                    if (isPreLoading) {
                        isPreLoading = false;
                        this.triggerEvent("onPreLoad", {
                            isAdLoading: true,
                        });
                    }
                });
                videoAdNew.onError((err) => {
                    // this.setData({
                    //     // advLoading: false, // 广告加载的状态
                    //     isAdLoading: false // 是否加载过广告了
                    //     // adCode: err.errCode // 记录广告加载的错误code码
                    // });
                    this.triggerEvent("onPreLoad", {
                        isAdLoading: false,
                    });
                    this.onAdTrack("AD_ERROR", {
                        debug_info: {
                            mini_program: {
                                error_code: err.errCode,
                                error_msg: err.errMsg,
                            },
                        },
                    });
                });

                this.setData(
                    {
                        advLoading: true,
                    },
                    () => {
                        this.advCheckLoad();
                    }
                );

                this.onAdTrack("REQUEST");
            } else {
                this.setData({
                    adCode: 404,
                });
            }
        },
        // 广告播放成功
        advSuccess() {
            let { topicId, comicId, payFrom, advParams = {} } = this.data;

            let postData = {
                topic_id: topicId, // 章节id
                comic_id: comicId, // 章节id
                from: payFrom, // 区分支付平台，小程序固定传3
                ...advParams, // 接口需要的其他信息
            };
            // 防止重复请求
            if (!advParams.business_id || !advParams.sign) {
                return false;
            }

            this.onAdTrack("VIDEO_FINISH");

            api.requestAdOk(postData)
                .then((res) => {
                    const { data } = res;
                    const message = data.unlock_success_text || "已成功解锁本话";
                    this.setData({
                        advLoading: false,
                    });
                    this.onAdEvent({
                        type: "adv",
                        state: true,
                        message: "解锁成功",
                        toast: { show: true, message },
                    });
                })
                .catch((err) => {
                    util_showToast({
                        title: err.message,
                        type: "error",
                        mask: true,
                        duration: 3000,
                    });
                    this.onAdEvent({
                        type: "adv",
                        state: false,
                        message: "解锁失败",
                        toast: { show: false, message: err.message },
                    });
                });
        },
        // 广告加载失败
        advError() {
            let adCode = this.data.adCode;
            let title = "广告播放发生错误，无法观看";
            if (adCode == 1004) {
                title = "当前无可用广告，请2分钟后重试";
            } else if (adCode == 404) {
                title = "当前无可用广告";
            }
            util_showToast({
                title,
                type: "error",
                mask: true,
                duration: 3000,
            });
            this.setData({ advLoading: false });
        },
        onAdTrack(event, obj) {
            util_adTrack({
                event,
                unit_id: this.data.advId,
                ad_pos_id: this.data.ad_pos_id,
                creative_type: 2,
                ...obj,
            });
        },
        onAdEvent({ type = "kkb", state = false, message = "解锁成功", toast = { show: false, message: "" } } = {}) {
            this.setData({
                advLoading: false,
            });
            let sendData = {
                type, // 解锁方式  kkb(支付)  / adv(广告)
                state, // 解锁状态
                message,
                toast,
            };
            this.triggerEvent("onUnlocking", sendData, {
                bubbles: true,
                composed: true,
            });
        },
        onPayClick(event) {
            let detail = event.detail || {};
            this.triggerEvent("onPayClick", detail);
        },
    },
});
