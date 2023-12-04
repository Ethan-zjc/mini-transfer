/**
 * 会员中心优惠券挽留
 * **/
const app = getApp();

Component({
    properties: {
        detainCoupon: {
            type: Object,
            value: {},
        },
    },
    attached() {
        app.kksaTrack('CommonPopup', {
            popupName: '小程序新会员中心挽留弹窗',
            CurPage: '会员中心页',
            ContentName: this.properties.detainCoupon.title,
        });
    },
    methods: {
        btnClick(e) {
            const { index = 0 } = e.currentTarget.dataset;
            app.kksaTrack('PopupClk', {
                popupName: '小程序新会员中心挽留弹窗',
                CurPage: '会员中心页',
                ContentName: this.properties.detainCoupon.title,
                ButtonName: index ? '立即使用' : '忍痛离开',
            });
            this.triggerEvent('onCouponCallback', { behavior: index });
        },
    },
});
