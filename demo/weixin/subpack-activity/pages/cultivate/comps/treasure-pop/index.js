const global = getApp().globalData;
const { cultivateImgs } = require("../../../../../cdn.js");

Component({
    properties: {
        awardList: {
            type: Array,
            value: [],
        },
        awardTextData: {
            type: Object,
            value: {},
        },
    },

    data: {
        cultivateImgs,
    },

    methods: {
        onClose() {
            this.triggerEvent("close");
        },
    },
});
