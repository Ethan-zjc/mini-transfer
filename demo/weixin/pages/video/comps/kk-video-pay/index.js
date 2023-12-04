import { util_action, util_throttle } from "../../../../util.js";

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
        moreText: "",
        moreAction: {},
        boxWidth: 648,
        boxPrecent: 20,
        list: [],
    },
    attached() {
        this.initData();
    },
    methods: {
        initData() {
            const { params = {} } = this.properties;
            const { banner_list: bannerList = [], title = "", more_text: moreText = "", more_action: moreAction = {} } = params;
            const list = bannerList.map((item) => {
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
            });
            const maxLen = list.length;
            const count = Math.ceil(maxLen / 2);
            const boxWidth = 216 * count + 8;
            const newlist = list.map((item, index) => {
                const num = parseInt(index / 2);
                return {
                    ...item,
                    sort: index % 2 == 1 ? count + num : num,
                };
            });
            newlist.sort((a, b) => {
                return a.sort - b.sort;
            });
            this.setData({
                title,
                list: newlist,
                boxWidth,
                moreText,
                moreAction,
            });
            this.initScroll(boxWidth);
        },
        initScroll(width) {
            const { screenRpxRate } = global;
            const maxWidth = parseInt((width + 24) / screenRpxRate);
            this.handleScroll({
                detail: {
                    scrollLeft: 0,
                    scrollWidth: maxWidth,
                },
            });
        },
        handleScroll(e) {
            const { scrollLeft, scrollWidth } = e.detail || {};
            const { screenWidth } = global;
            const count = screenWidth + scrollLeft;
            const size = count / scrollWidth;
            const percent = size.toFixed(2) * 100;
            util_throttle(() => {
                this.setData({
                    boxPrecent: percent,
                });
            }, 50)();
        },
        handleMore() {
            this.handleClkTrack(1);
            this.handleAction(this.data.moreAction);
        },
        handleTap(e) {
            const { index } = e.currentTarget.dataset;
            const { action = {} } = this.data.list[index] || {};
            this.handleClkTrack(3);
            this.handleAction(action);
        },
        handleAction(value) {
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = value || {};
            util_action({ type, id, url, parentid });
        },
        handleClkTrack(type = 1) {
            const { title, moreText } = this.data;
            const { origin } = this.properties;
            const typeMap = {
                1: moreText,
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
