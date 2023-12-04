/*
 * 福利页，单图模块
 */

import { util_action } from "../../../../util.js";

const app = getApp();

Component({
    properties: {
        params: {
            type: Object,
            value: {},
        },
    },
    data: {
        moduleImg: "",
        moduleAction: {},
    },
    attached() {
        const items = this.data.params.items || [];
        const child = items[0] || {};
        const image = child.image || {};
        this.data.moduleAction = child.action_protocol || {};
        this.setData({
            moduleImg: image.url || "",
        });
    },
    methods: {
        tapAction(e) {
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = this.data.moduleAction;
            util_action({ type, id, url, parentid });
            this.commonTrack("clk");
        },
        commonTrack(name = "", value = {}) {
            const { params = {} } = this.properties;
            const typeMap = {
                imp: "CommonItemImp",
                clk: "CommonItemClk",
            };
            const event = typeMap[name] || "";
            if (event) {
                app.kksaTrack(event, {
                    CurPage: "小程序福利页",
                    TabModuleType: "单图模块",
                    ContentName: params.title,
                });
            }
        },
    },
});
