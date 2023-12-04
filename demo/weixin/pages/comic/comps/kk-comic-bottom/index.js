/**
 * 漫底点赞、广告、上下篇、跳转免费小程序
 * @param showUnfoldAll  是否展示折叠态
 * @param appletAction 是否展示打开免费小程序
 * **/
const { comicImgs } = require("../../../../cdn.js");

Component({
    properties: {
        showUnfoldAll: {
            type: Boolean,
            value: false,
        },
        imgList: {
            type: Array,
            value: [],
        },
        updateRemind: {
            type: String,
            value: "",
        },
        adVisible: {
            type: Boolean,
            value: false,
        },
        userInfo: {
            type: Object,
            value: null,
        },
        praised: {
            type: Boolean,
            value: false,
        },
        praiseNum: {
            type: String,
            value: "",
        },
        follows: {
            type: Object,
            value: {},
        },
        topicId: {
            type: Number,
        },
        lastId: {
            type: Number,
        },
        nextId: {
            type: Number,
        },
        appletAction: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        comicImgs,
    },
    attached() {
        this.cartonObserver();
        if (this.appletAction) {
            this.freeEntryObserver();
        }
    },
    methods: {
        stopPop() {
            return;
        },
        clickEvent(e) {
            this.triggerEvent("bottomCallback", e);
        },

        // 同步下此部分曝光监听时机
        cartonObserver() {
            if (this.carton) {
                this.carton.disconnect();
            }
            this.carton = wx.createIntersectionObserver(this);
            this.carton.relativeToViewport().observe(".observe-carton", (res) => {
                const ratio = res.intersectionRatio || 0;
                if (ratio > 0) {
                    // 进行相关回调
                    this.triggerEvent("bottomCallback", {
                        currentTarget: {
                            dataset: { type: "carton" },
                        },
                    });
                    this.carton.disconnect();
                }
            });
        },

        // 免费看漫画导流卡片曝光
        freeEntryObserver() {
            if (this.entryObserver) {
                this.entryObserver.disconnect();
            }
            this.entryObserver = wx.createIntersectionObserver(this);
            this.entryObserver.relativeToViewport().observe(".free-program-entry", (res) => {
                const ratio = res.intersectionRatio || 0;
                if (ratio > 0) {
                    // 进行相关回调
                    this.triggerEvent("bottomCallback", {
                        currentTarget: {
                            dataset: { type: "freeReport" },
                        },
                    });
                    this.entryObserver.disconnect();
                }
            });
        },
    },
});
