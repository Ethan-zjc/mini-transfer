/**
 * 支付成功弹窗
 * **/
const app = getApp();
const global = app.globalData;

import { util_action } from "../../../../../util.js";
Component({
    properties: {
        rechargeKkb: {
            type: Object,
            value: {},
        },
        userAccount: {
            type: Number,
            value: 0,
        },
    },
    methods: {
        tapClose() {
            this.triggerEvent("onClose");
        },
        tapAccounts() {
            const url =
                "https://mp.weixin.qq.com/s?__biz=MzIyODI5NTM0OQ==&mid=2247545789&idx=1&sn=916aba6611164efe834f9b9bbc25be5f&chksm=e8566467df21ed716cb7db3b796e97caca469a6caaa9d0393ee7859f0bdc18572f946487c2df&token=1638569467&lang=zh_CN#rd";
            this.triggerEvent("onSuccClk", { type: 2 });
            util_action({ type: 2003, url });
        },
    },
});
