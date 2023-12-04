const global = getApp().globalData;
const { cultivateImgs } = require("../../../../../cdn.js");

Component({
    data: {
        cultivateImgs,
    },

    methods: {
        onClose() {
            this.triggerEvent("close");
        },
    },
});
