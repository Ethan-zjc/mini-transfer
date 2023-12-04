const app = getApp();

const { lotteryImgs, valentImgs } = require("../../../../../cdn.js");

import { util_showToast, util_action } from "../../../../../util.js";

import { postAddBalance } from "../../api.js";

Component({
    properties: {
        activityName: {
            type: String,
            value: "",
        },
        isLogin: {
            type: Boolean,
            value: false,
        },
        tasksList: {
            type: Array,
            value: [],
        },
    },
    data: {
        valentImgs,
        lotteryImgs,
        loading: false,
    },
    methods: {
        originLogin(e) {
            this.triggerEvent("onLogin", e.detail);
        },
        // 点击分享按钮
        tapTaskShare(event) {
            const { track } = event.currentTarget.dataset || {};
            if (this.data.isLogin) {
                postAddBalance({
                    activity_name: this.data.activityName,
                });
                this.clkTrack(track);
            }
        },
        tapTaskButton(event) {
            const { type, status, action, track } = event.currentTarget.dataset || {};
            if (action && status != 1) {
                const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action || {};
                if ((type == 2003) & !url) {
                    util_showToast({ title: "服务异常，稍后重试" });
                    return false;
                }
                util_action({ type, url, id, parentid });
                this.clkTrack(track);
            }
        },
        clkTrack(txt) {
            const { title = "雪糕活动", origin = "" } = this.properties;
            let options = {
                CurPage: title,
                TabModuleType: origin,
                ElementType: "做任务按钮",
                ElementShowTxt: txt,
            };
            app.kksaTrack("CommonItemClk", options);
        },
    },
});
