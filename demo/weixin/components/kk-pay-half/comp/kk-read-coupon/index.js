import { util_request } from "../../../../util.js";

const app = getApp();
const global = app.globalData;

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
        count: {
            type: [Number, String],
            value: 0,
        },
        isCanPay: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        isLogin: false,
        payLoading: false,
        payFrom: global.payfrom,
    },
    attached() {
        this.setData({
            isLogin: !!global.userId,
        });
    },
    methods: {
        // 点击阅读卷解锁按钮
        tapReadCoupon() {
            const { comicId, topicId, payFrom, payLoading } = this.data;
            if (payLoading) {
                return false;
            }
            this.setData({
                payLoading: true,
            });
            util_request({
                url: "/v2/comicbuy/coupon/buy_h5",
                host: "pay",
                method: "post",
                data: {
                    target_id: comicId * 1,
                    topic_id: topicId * 1,
                    from: payFrom * 1,
                    source: 3,
                },
            })
                .then((res) => {
                    const { code, data, message } = res;
                    let toast = code == 200 ? data.toast || "解锁成功" : "阅读券已抢光";
                    this.onUnlocking({
                        state: true,
                        toast: { show: true, message: toast },
                    });
                })
                .catch((err) => {
                    this.onUnlocking({
                        state: true,
                        toast: { show: true, message: "阅读券已抢光" },
                    });
                });
            app.kksaTrack("ClickPayPopup", {
                ButtonName: "免费解锁",
                ButtonType: "阅读券解锁",
                NoticeType: "使用阅读券",
            });
        },
        onUnlocking({ type = "kkb", state = false, message = "解锁成功", toast = { show: false, message: "" } } = {}) {
            this.setData({
                payLoading: false,
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
