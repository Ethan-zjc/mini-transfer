const payBehavior = require('../../../../../behaviors/pay');
const app = getApp();
Component({
    behaviors: [payBehavior],
    /**
     * 组件的属性列表
     */
    properties: {
        userInfo: {
            type: Object,
            value: {},
        },
        trackInfo: {
            type: Object,
            value: {},
        },
    },

    /**
     * 组件的初始数据
     */
    data: {
        activeItem: null,
        chargeActivity: null,
        show: false,
    },

    attached() {
        const { trackInfo = {} } = this.properties;
        app.kksaTrack('PayPopup', {
            popupName: '小程序漫剧VIP解锁弹窗',
            IsLoginStatus: !!app.globalData.userId,
            TriggerPage: '小程序漫剧详情',
            compilationsID: trackInfo.videoInfo.id,
            compilationsname: trackInfo.videoInfo.title,
            PostID: trackInfo.chapterId,
            VideoPostName: trackInfo.chapterTitle,
        });
    },

    /**
     * 组件的方法列表
     */
    methods: {
        onChoiceItem(e) {
            const { activeItem, chargeActivity } = e.detail;
            const data = {
                activeItem,
            };
            chargeActivity && (data.chargeActivity = chargeActivity);
            !chargeActivity && this.clickTrack('VIP档位选择');
            this.setData(data);
        },

        hanleClose() {
            this.clickTrack('关闭VIP弹窗');
            this.triggerEvent('hanleClose');
        },

        async handlePay() {
            if (this.interceptLogin()) return;
            const { activeItem } = this.data;
            const { trackInfo = {} } = this.properties;
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
                sa_infos: {
                    compilationsID: trackInfo.videoInfo.id,
                    compilationsname: trackInfo.videoInfo.title,
                    PostID: trackInfo.chapterId,
                    VideoPostName: trackInfo.chapterTitle,
                    popupName: '小程序漫剧VIP解锁弹窗',
                    IsLoginStatus: !!app.globalData.userId,
                },
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
                this.clickTrack('VIP立即支付');
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

        clickTrack(buttonName) {
            const { trackInfo = {} } = this.properties;
            app.kksaTrack('ClickButton', {
                popupName: '小程序漫剧VIP解锁弹窗',
                IsLoginStatus: !!app.globalData.userId,
                CurPage: '小程序漫剧详情',
                ButtonName: buttonName,
                compilationsID: trackInfo.videoInfo.id,
                compilationsname: trackInfo.videoInfo.title,
                PostID: trackInfo.chapterId,
                VideoPostName: trackInfo.chapterTitle,
            });
        },

        interceptLogin() {
            if (!app.globalData.userId) {
                wx.navigateTo({ url: '/pages/login/login' });
                return true;
            }
        },
    },
});
