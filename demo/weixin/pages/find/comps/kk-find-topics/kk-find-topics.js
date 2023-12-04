/*
 通用专题展示模板样式
 */
const { findImgs } = require("../../../../cdn.js");

Component({
    properties: {
        datas: {
            type: Object,
            optionalTypes: [String, Array],
            value: {},
        },
        height: {
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        width: {
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        cssName: {
            type: String,
            optionalTypes: [Number],
            value: "",
        },
        i: {
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        item: {
            type: Object,
            optionalTypes: [String, Array],
            value: {},
        },
        listIndex: {
            // 所在的数组二维的索引
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        moduletype: {
            type: String,
            optionalTypes: [Number],
            value: "",
        },
        moduleid: {
            type: String,
            optionalTypes: [Number],
            value: "",
        },
        modulemame: {
            type: String,
            optionalTypes: [Number],
            value: "",
        },

        listWrapIndex: {
            type: Number,
            optionalTypes: [String],
            value: "",
        },
    },
    data: {
        findImgs,
    },
    methods: {
        //点击事件
        subnavTap(event) {
            let eventName = "onSubnavTap"; // 返回给父级的事件名称
            let dataset = event.currentTarget.dataset;
            this.triggerEvent(eventName, dataset, { bubbles: true });
        },
        onImageLoad(e) {},
    },
});
