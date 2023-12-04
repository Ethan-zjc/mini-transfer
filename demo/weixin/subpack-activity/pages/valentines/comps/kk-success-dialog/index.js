const { lotteryImgs, valentImgs } = require("../../../../../cdn.js");

Component({
    properties: {
        infoData: {
            type: Object,
            value: {},
        },
    },
    data: {
        valentImgs,
        lotteryImgs,
    },
    methods: {
        dialogRecordClose(event) {
            const { type = "" } = event.currentTarget.dataset || {};
            this.triggerEvent("onClose", {
                type,
            });
        },
    },
});
