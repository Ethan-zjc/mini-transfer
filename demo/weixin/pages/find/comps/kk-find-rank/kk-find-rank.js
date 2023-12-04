/*
 发现页排行榜模块
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
        rankingNav: {
            type: Object,
            value: {},
        },
    },
    methods: {
        // 点击封面
        subnavTap(event) {
            let dataset = event.detail || {};
            this.triggerEvent("onSubnavTap", dataset);
        },
        // 排行导航查看更多按钮事件
        rankingMoreTap(event) {
            let dataset = event.currentTarget.dataset;
            this.triggerEvent("onRankingMoreTap", dataset);
        },
        rankingNavtap(event) {
            let dataset = event.currentTarget.dataset;
            this.triggerEvent("onRankingNavTap", dataset);
        },
    },
});
