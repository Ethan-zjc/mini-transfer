/**
 * 漫底点赞、广告、上下篇、跳转免费小程序
 * @param appletAction 是否展示打开免费小程序
 * **/
const { comicImgs } = require('../../../../cdn.js');

Component({
    properties: {
        hasImgList: {
            type: Boolean,
            value: false,
        },
        updateRemind: {
            type: String,
            value: '',
        },
        lastId: {
            type: Number,
        },
        nextId: {
            type: Number,
        },
    },
    data: {
        comicImgs,
    },
    attached() {
        // this.cartonObserver();
    },
    methods: {
        stopPop() {
            return;
        },
        clickEvent(e) {
            this.triggerEvent('bottomCallback', e);
        },

        // 同步下此部分曝光监听时机
        cartonObserver() {
            if (this.carton) {
                this.carton.disconnect();
            }
            this.carton = wx.createIntersectionObserver(this);
            this.carton.relativeToViewport().observe('.observe-carton', (res) => {
                const ratio = res.intersectionRatio || 0;
                if (ratio > 0) {
                    // 进行相关回调
                    this.triggerEvent('bottomCallback', {
                        currentTarget: {
                            dataset: { type: 'carton' },
                        },
                    });
                    this.carton.disconnect();
                }
            });
        },
    },
});
