/*
 发现页分类模块
 */

Component({
    properties: {
        list: {
            type: Object,
            value: {},
        },
        listIndex: {
            type: Number,
            value: 0,
        },
        newIndex: {
            type: Number,
            value: 0,
        },
    },
    methods: {
        // 点击封面
        subnavTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onSubnavTap", dataset);
        },
    },
});
