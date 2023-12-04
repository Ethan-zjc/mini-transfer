import { util_action } from "../../../../util.js";
import { getModuleChange } from "../../api.js";

const app = getApp();
const global = app.globalData;

const { videoImgs } = require("../../../../cdn.js");

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
        videoImgs,
        title: "",
        list: [],
        cardType: "",
        moduleImg: "",
        moduleId: 0,
        moduleType: 0,
        filterIds: "[]",
        changeLoading: false,
    },
    attached() {
        this.initData();
    },
    methods: {
        initData() {
            const { params = {} } = this.properties;
            const {
                title = "",
                background_image = {},
                banner_list: bannerList = [],
                card_type: cardType = "",
                module_id: moduleId = 0,
                module_type: moduleType = 0,
                filter_ids: filterIds = "[]",
            } = params;
            const list = this.formatData(bannerList);
            const moduleImg = background_image.url || videoImgs["module-bg"];
            this.setData({
                title,
                list,
                cardType,
                moduleImg,
                moduleId,
                moduleType,
                filterIds,
            });
        },
        formatData(list = []) {
            return list
                .map((item) => {
                    const labels = item.labels || [];
                    const label = labels[0] || {};
                    return {
                        id: item.id || 0,
                        title: item.title || "",
                        subtitle: item.sub_title || "",
                        picUrl: item.image || "",
                        action: item.action_type || {},
                        label,
                    };
                })
                .slice(0, 6);
        },
        handleTap(e) {
            const { index } = e.currentTarget.dataset;
            const { action = {} } = this.data.list[index] || {};
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
            this.handleClkTrack(3);
            util_action({ type, id, url, parentid });
        },
        handleMore() {
            const { moduleId } = this.data;
            wx.navigateTo({ url: `/subpack-video/pages/video-list/video-list?module_id=${moduleId}` });
            this.handleClkTrack(1);
        },
        handleChange() {
            const { gender } = global;
            const { moduleId, cardType, filterIds, changeLoading } = this.data;
            if (changeLoading) {
                return false;
            }
            this.data.changeLoading = true;
            getModuleChange({
                module_id: moduleId,
                filter_ids: filterIds,
                card_type: cardType,
                gender: gender,
            })
                .then((res) => {
                    const { code, data = {} } = res;
                    const { module_info: item = {} } = data;
                    if (code != 200) {
                        this.data.changeLoading = false;
                        return false;
                    }
                    const { banner_list: childList = [], filter_ids: childIds = "[]" } = item;
                    const list = this.formatData(childList);
                    this.setData(
                        {
                            list,
                            filterIds: childIds,
                        },
                        () => {
                            this.data.changeLoading = false;
                        }
                    );
                    this.handleClkTrack(2);
                })
                .catch(() => {
                    this.data.changeLoading = false;
                });
        },
        handleClkTrack(type = 1) {
            const { title, origin } = this.data;
            const typeMap = {
                1: "查看更多",
                2: "换一换",
                3: "漫剧作品",
            };
            app.kksaTrack("ClickButton", {
                CurPage: origin,
                ModuleName: title,
                ButtonName: typeMap[type] || "",
            });
        },
    },
});
