const app = getApp();
const global = app.globalData;

const { lotteryImgs, valentImgs } = require("../../../../../cdn.js");

import { util_action } from "../../../../../util.js";

Component({
    properties: {
        list: {
            type: Array,
            value: [],
        },
    },
    data: {
        valentImgs,
        lotteryImgs,
        loading: false,
        isiOS: global.isiOS,
    },
    methods: {
        tapRecordBtn(e) {
            const { action = {} } = e.currentTarget.dataset || {};
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action || {};
            util_action({ type, url, id, parentid });
        },
        dialogRecordClose() {
            this.triggerEvent("onClose");
        },
    },
});
