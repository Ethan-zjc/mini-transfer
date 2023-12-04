/**
 * 会员限免组件
 */
const { globalImgs } = require("../../../../cdn.js");

Component({
    properties: {
        orientLimitData: {
            type: Object,
            value: {},
        },
    },
    data: {
        globalImgs,
    },
    attached() {
        this.setData({
            ...this.data.orientLimitData,
        });
    },
    methods: {
        // 定向限免跳转会员开通页
        jumpVip(event) {
            this.triggerEvent("limitFreeVipFun", { btntype: 1 });
        },
    },
});
