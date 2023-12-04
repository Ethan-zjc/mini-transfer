import { util_action } from "../../../../util.js";

const app = getApp();

Component({
    properties: {
        params: {
            type: Object,
            value: {},
        },
        origin: {
            type: String,
            value: "",
        },
    },
    data: {
        title: "",
        list: [],
    },
    attached() {
        this.initData();
    },
    methods: {
        initData() {
            const { params = {} } = this.properties;
            const { banner_list: bannerList = [], title } = params;
            const list = bannerList.map((item) => {
                return {
                    id: item.id || 0,
                    title: item.title || "",
                    iconUrl: item.image || "",
                    action: item.action_type || {},
                };
            });
            this.setData({
                title,
                list,
            });
        },
        handleTap(e) {
            const { index } = e.currentTarget.dataset;
            const { origin } = this.properties;
            const { title: moduleName, list } = this.data;
            const { action = {}, title } = list[index] || {};
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
            app.kksaTrack("ClickButton", {
                CurPage: origin,
                ModuleName: moduleName,
                ButtonName: title,
            });
            util_action({ type, id, url, parentid });
        },
    },
});
