/**
 * 会员中心header
 * **/
const app = getApp();
const global = app.globalData;

import { util_debounce } from "../../../../../util.js";

Component({
    properties: {
        title: {
            type: String,
            value: "",
        },
        lists: {
            type: Array,
            value: [],
        },
        type: {
            type: String,
            value: "1", // 1: 漫画 2: 漫剧
        },
    },
    data: {
        percent: 20,
        debounceScroll: () => {},
    },
    attached() {
        // 计算总的滚动高度, 当前屏幕宽度，初始化占比
        const { screenRpxRate } = global;
        const { lists = [] } = this.properties;
        const totalHeight = (lists.length * 216 + 14) / screenRpxRate;
        this.data.totalHeight = totalHeight;
        this.setPercent(0);

        // 防抖函数
        this.debounceScroll = util_debounce((scrollLeft) => {
            this.setPercent(scrollLeft);
        }, 200);
    },
    methods: {
        setPercent(scrollLeft) {
            const windowWidth = this.getScreenWidth();
            const { totalHeight } = this.data;
            let percent = Math.ceil(((scrollLeft + windowWidth) / totalHeight) * 100);
            percent = percent >= 100 ? 100 : percent;
            this.setData({
                percent,
            });
        },
        getScreenWidth() {
            const { windowWidth = 0, screenWidth = 0 } = global.systemInfo;
            return windowWidth && screenWidth ? Math.min(windowWidth, screenWidth) : windowWidth || screenWidth || 0;
        },
        onScroll(e) {
            const { scrollLeft = 0 } = e.detail || {};
            this.debounceScroll(scrollLeft);
        },
        actionTap(e) {
            const { items = {} } = e.currentTarget.dataset;
            this.triggerEvent("onActionTap", items);
        },
    },
});
