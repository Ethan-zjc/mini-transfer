// components/kk-pay-half/head/head.js
const app = getApp();
const global = app.globalData;
const { util_action } = require("../../../../util.js");

Component({
    properties: {
        images: {
            type: Object,
            value: {},
        },
        popType: {
            type: [Number, String],
            vlaue: "",
        },
        isHidden: {
            type: Boolean,
            value: false,
        },
        isPayGift: {
            type: Boolean,
            value: false,
        },
        isLimitFree: {
            type: Boolean,
            value: false,
        },
        isReadCoupon: {
            type: Boolean,
            value: false,
        },
        headData: {
            type: Object,
            value: {},
        },
        isCanPay: {
            type: Boolean,
            value: false,
        },
    },
    attached() {
        // 初始化数据信息
        this.setData({
            isLogin: !!global.userId,
        });
    },
    methods: {
        // 点击充值礼包头图跳转
        openUrl() {
            let { action_target = {} } = this.data;
            let { action_type: type, target_id: id, target_web_url: url } = action_target;
            util_action({ type: type, id: id, url: url, subpack: true });
        },
        jumpVip() {
            this.triggerEvent("limitFreeVipFun", { btntype: 1 });
        },
        openVip() {
            if (this.data.popType == 2) {
                this.triggerEvent("openVipPageFun", { type: 0 });
            }
        },
    },
});
