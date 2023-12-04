/**
 * 会员中心会员优惠券
 * **/
const app = getApp();

Component({
    properties: {
        vipCouponList: {
            type: Array,
            value: [],
        },
    },
    attached() {
        app.kksaTrack('CommonPopup', {
            popupName: '小程序新会员中心发券弹窗',
            CurPage: '会员中心页',
        });
    },
    methods: {
        atOnceUse() {
            this.clickTrack(true);
            this.triggerEvent('onCouponCallback', { behavior: 1 });
        },
        tapClose() {
            this.clickTrack();
            this.triggerEvent('onCouponClose');
        },
        // 点击埋点
        clickTrack(type) {
            const names = this.properties.vipCouponList.map((item) => item.coupon_name).join('/');
            app.kksaTrack('PopupClk', {
                popupName: '小程序新会员中心发券弹窗',
                CurPage: '会员中心页',
                ContentName: names,
                ButtonName: type ? '立即使用' : '关闭',
            });
        },
    },
});
