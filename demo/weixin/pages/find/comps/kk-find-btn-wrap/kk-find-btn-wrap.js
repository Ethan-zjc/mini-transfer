/*
 发现页模块底部按钮
 */

Component({
    properties: {
        //专题模块底部按钮数据
        datas: {
            type: Object,
            optionalTypes: [Array],
            value: {},
        },
        index: {
            //所在的数组二维的索引
            // 这个属性可以是 Number 、 String 、 Boolean 三种类型中的一种
            type: Number,
            optionalTypes: [String, Boolean],
            value: "",
        },
        moduletype: {
            // 这个属性可以是 Number 、 String 、 Boolean 三种类型中的一种
            type: String,
            optionalTypes: [Number, Boolean],
            value: "",
        },
        moduleid: {
            // 这个属性可以是 Number 、 String 、 Boolean 三种类型中的一种
            type: String,
            optionalTypes: [Number, Boolean],
            value: "",
        },
        modulemame: {
            // 这个属性可以是 Number 、 String 、 Boolean 三种类型中的一种
            type: String,
            optionalTypes: [Number, Boolean],
            value: "",
        },

        listWrapIndex: {
            //所在的数组一维的索引
            // 这个属性可以是 Number 、 String 、 Boolean 三种类型中的一种
            type: Number,
            optionalTypes: [String],
            value: "",
        },
        cssName: {
            type: String,
            optionalTypes: [Number],
            value: "",
        },
    },
    methods: {
        //点击 产看更多 事件
        topicBottomMoreTap(event) {
            let eventName = "topicBottomMoreTap"; // 返回给父级的事件名称
            let dataset = event.currentTarget.dataset;
            this.triggerEvent(eventName, dataset, { bubbles: true });
        },

        //点击 换一换 事件
        topicBottomexchangeTap(event) {
            let eventName = "topicBottomexchangeTap"; // 返回给父级的事件名称
            let dataset = event.currentTarget.dataset;
            this.triggerEvent(eventName, dataset, { bubbles: true });
        },
    },
});
