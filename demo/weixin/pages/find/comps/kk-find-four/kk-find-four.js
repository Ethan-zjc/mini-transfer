/*
 发现页四图模块
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
        // 点击查看更多
        topicBottomMoreTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onBottomMoreTap", dataset);
        },
        // 点击换一换
        topicBottomexchangeTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onBottomexchangeTap", dataset);
        },
        // 点击封面
        subnavTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onSubnavTap", dataset);
        },
    },
});