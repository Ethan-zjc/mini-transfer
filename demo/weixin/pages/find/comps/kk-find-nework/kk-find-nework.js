const app = getApp();
import { util_showToast } from "../../../../util.js";

Component({
    properties: {
        list: {
            type: Array,
            value: [],
        },
        title: {
            type: String,
            value: "",
        },
        showmore: {
            type: Boolean,
            value: false,
        },
        listWrapIndex: {
            type: Number,
            optionalTypes: [String],
            value: "",
        },
        i: {
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        listIndex: {
            // 所在的数组二维的索引
            type: Number,
            optionalTypes: [String],
            value: 0,
        },
        moduleId: {
            type: Number,
            value: 0,
        },
        cardType: {
            type: String,
            default: "",
        },
        moduleType: {
            type: Number,
            default: 0,
        },
    },

    data: {
        type: 1,
        dialogMsg: {
            show: false,
            title: "确定取消关注吗？",
            content: "~~(>_<)~~",
            buttons: [
                {
                    text: "取消",
                    type: "cancel",
                },
                {
                    text: "确定",
                    type: "confirm",
                },
            ],
        },
        clickEvent: {},
    },

    attached() {
        const { list } = this.data;
        const length = list.length;
        let type = 1;
        switch (length) {
            case 1:
                type = 3;
                break;
            case 2:
                type = 2;
                break;
            default:
                type = 1;
                break;
        }
        this.setData({ type });
    },

    methods: {
        // 点击查看更多
        clickMore(event) {
            let eventName = "onClickMore"; // 返回给父级的事件名称
            let dataset = event.currentTarget.dataset;
            this.triggerEvent(eventName, dataset, { bubbles: true });
        },
        clickFollowed(event) {
            let dataset = event.currentTarget.dataset;
            const { childindex } = dataset;
            const { list } = this.data;
            if (!list[childindex].favourite) {
                this.handleFollowed(event);
            } else {
                let { dialogMsg } = this.data;
                dialogMsg.show = true;
                this.setData({ clickEvent: event, dialogMsg });
            }
        },
        // 点击关注按钮
        handleFollowed(event) {
            let eventName = "onHandleFollowed"; // 返回给父级的事件名称
            let dataset = event.currentTarget.dataset;

            dataset.cb = () => {
                const { childindex } = dataset;
                const { list } = this.data;
                const favourite = list[childindex].favourite;
                list[childindex].favourite = !favourite;
                this.setData({ list });
            };
            this.triggerEvent(eventName, dataset, { bubbles: true });

            // this.triggerEvent("onHandleFollowed", e);
        },
        // 弹窗点击事件
        handleDialogClick(e) {
            const { type } = e.detail;
            const { dialogMsg, clickEvent } = this.data;
            console.log("type: ", type);
            if (type === "confirm") {
                this.handleFollowed(clickEvent);
            }
            Object.assign(dialogMsg, { show: false });
            this.setData({ dialogMsg, clickEvent: {} });
        },
        //点击事件
        subnavTap(event) {
            let eventName = "onSubnavTap"; // 返回给父级的事件名称
            let dataset = event.currentTarget.dataset;
            this.triggerEvent(eventName, dataset, { bubbles: true });
        },
    },
});
