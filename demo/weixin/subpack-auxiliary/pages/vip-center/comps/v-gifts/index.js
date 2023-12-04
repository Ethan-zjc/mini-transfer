/**
 * 会员中心header
 * **/
const app = getApp();
const global = app.globalData;

// 确定ios展示
Component({
    properties: {
        gifts: {
            type: Array,
            value: [],
        },
    },
    methods: {
        giftWrapClick(e) {
            const { item = {}, index = 0 } = e.currentTarget.dataset;
            if (item.assign_status == 2) {
                return;
            }
            this.triggerEvent("onGiftWrapClick", { item, index });
        },
    },
});
