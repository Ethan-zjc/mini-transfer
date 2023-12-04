/*
 发现页分类模块
 */

Component({
    properties: {
        classifyNav: {
            type: Object,
            value: {},
        },
        classifyFirst: {
            type: Array,
            value: [],
        },
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
        // 点击查看更多
        topicBottomMoreTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onBottomMoreTap", dataset);
        },
        // 点击分类换一换
        topicBottomClassifyTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onClassifyChangeTap", dataset);
        },
        // 点击分类导航
        classifyNavtap(event) {
            let dataset = event.currentTarget.dataset;
            this.triggerEvent("onClassifyNavTap", dataset);
        },
        // 点击封面
        subnavTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onSubnavTap", dataset);
        },
    },
});
