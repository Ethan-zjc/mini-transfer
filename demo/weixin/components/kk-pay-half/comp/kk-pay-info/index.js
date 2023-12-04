import { util_action } from "../../../../util.js";

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
        priceInfo: {
            type: Object,
            value: {},
        },
        discountInfo: {
            type: Object,
            value: {},
        },
    },
    data: {
        showTips: false,
    },
    methods: {
        tapButtonVip() {
            util_action({
                type: 44,
            });
        },
        tapButtonMore() {
            if (this.data.showTips) {
                return false;
            }
            this.setData(
                {
                    showTips: true,
                },
                () => {
                    let timer = setTimeout(() => {
                        clearTimeout(timer);
                        timer = null;
                        this.setData({
                            showTips: false,
                        });
                    }, 3000);
                }
            );
        },
    },
});
