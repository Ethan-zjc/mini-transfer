const { lotteryImgs, valentImgs } = require("../../../../../cdn.js");

Component({
    properties: {
        errorType: {
            type: Number,
            value: 1,
        },
    },
    data: {
        valentImgs,
        lotteryImgs,
    },
    methods: {
        dialogRecordClose() {
            this.triggerEvent("onClose");
        },
    },
});
