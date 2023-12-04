const { comicImgs } = require("../../../../cdn.js");
Component({
    properties: {
        fullScreen: {
            type: Boolean,
            value: false,
        },
        ipxBottom: {
            type: Number,
            value: 0,
        },
        isShowBackTop: {
            type: Boolean,
            value: false,
        },
    },

    data: {
        comicImgs,
    },

    methods: {
        goBackTop() {
            this.triggerEvent("goBackTop");
        },
        shareClick() {
            this.triggerEvent("shareClick");
        },
        goHomeFun() {
            this.triggerEvent("goHomeFun");
        },
    },
});
