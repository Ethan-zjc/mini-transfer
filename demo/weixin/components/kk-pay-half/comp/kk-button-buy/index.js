const app = getApp();
const global = app.globalData;

// https://static3w.kuaikanmanhua.com/assets/img/remote_images/icons/topic-crown_a4789e8.png

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
        comicId: {
            type: [Number, String],
            value: 0,
        },
        payBtnText: {
            type: String,
            value: '',
        },
        payIconUrl: {
            type: String,
            value: '',
        },
        // 按钮样式，solid:实心; border:边框
        payBtnType: {
            type: String,
            value: 'solid',
        },
    },
    data: {
        isLogin: false,
    },
    attached() {
        this.setData({
            isLogin: !!global.userId,
        });
    },
    methods: {
        tapBuy(event) {
            const detail = event.detail || {};
            const { text: btnname } = detail;
            const { wallet, price } = this.data;
            const btntype = wallet >= price ? '购买按钮' : '充值按钮';
            this.triggerEvent('onPayClick', {
                btntype,
                btnname,
            });
        },
    },
});
