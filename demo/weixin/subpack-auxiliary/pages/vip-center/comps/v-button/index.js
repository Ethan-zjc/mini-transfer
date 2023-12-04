/**
 * 会员中心header
 * **/
const app = getApp();
const payBehavior = require('../../../../../behaviors/pay');

Component({
    behaviors: [payBehavior],
    properties: {
        isVip: {
            type: Boolean,
            value: false,
        },
        activeItem: {
            type: Object,
            value: {},
        },
    },
    methods: {
        async surePay() {
            if (this.interceptLogin()) return;
            const { activeItem } = this.data;
            const {
                id,
                real_price = 0,
                recharge_value = 0,
                present_value = 0,
                title = '', // 会员下单必传，埋点使用
                mark_price = 0, // 会员下单必传，埋点使用
                coupon = {}, // 会员下单必传，埋点使用
            } = activeItem;
            const data = {
                good_type: 2,
                good_item: {
                    id,
                    title,
                    coupon,
                    real_price,
                    mark_price,
                    recharge_value,
                    present_value,
                },
                sa_infos: {},
                pay_info: {},
            };
            if (activeItem.usableCouponFirst) {
                data.pay_info.coupon_id = activeItem.usableCouponFirst.id;
            }
            if (this.data.paying) {
                return;
            }
            this.data.paying = true;
            try {
                this.clickTrack('一键开通按钮');
                await this.surePayFun(data);
                this.data.paying = false;
                this.triggerEvent('onPaySuccess', {
                    orderId: this.data._order_id,
                    vipResult: this.data._vipChargeResult || null,
                });
            } finally {
                this.data.paying = false;
            }
        },
        interceptLogin() {
            if (!app.globalData.userId) {
                wx.navigateTo({ url: '/pages/login/login' });
                return true;
            }
        },
        // 点击埋点
        clickTrack(name) {
            const data = {
                CurPage: '小程序新会员中心页面',
                name,
            };
            app.kksaTrack('ClickButton', data);
        },
    },
});
