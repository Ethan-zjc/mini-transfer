const global = getApp().globalData;
const { cultivateImgs } = require("../../../../../cdn.js");

Component({
    properties: {
        awardList: {
            // 是否显示弹窗
            type: Array,
            value: [],
        },
        awardTitle: {
            // 是否显示弹窗
            type: String,
            value: "",
        },
    },

    data: {
        cultivateImgs,
        index: 0,
    },

    methods: {
        onClose() {
            this.triggerEvent("close");
        },

        clickPrev() {
            let { index } = this.data;
            if (!index) return false;
            this.setData({ index: index - 1 });
        },

        clickNext() {
            let { index, awardList } = this.data;
            if (index === awardList.length - 1) return false;
            this.setData({ index: index + 1 });
        },
    },
});
