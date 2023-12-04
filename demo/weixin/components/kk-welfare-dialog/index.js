/*
 * 新手福利专用对话弹窗
 * @param {title} 标题
 * @param {content} 内容
 * @param {show} 是否展示弹窗
 * @param {weakenText} 弱化按钮文案，为空不展示
 * @param {buttons} 按钮列表，传入对象数组
 *   —— 列如: [{ text: "取消", type: "cancel" },{ text: "确定", type: "confirm" }]
 */

Component({
    properties: {
        title: {
            type: String,
            value: "",
        },
        icon: {
            type: String,
            value: "",
        },
        content: {
            type: String,
            value: "",
        },
        show: {
            type: Boolean,
            value: false,
        },
        weakenText: {
            type: String,
            value: "",
        },
        openSubscribe: {
            type: Boolean,
            value: false,
        },
        activeDay: {
            type: String,
            value: "",
        },
        buttons: {
            type: Array,
            value: [],
        },
    },
    methods: {
        tapButton(e) {
            const { type, text, subscribe, day } = e.currentTarget.dataset;
            this.triggerEvent("buttontap", {
                type,
                text,
                subscribe,
                day,
            });
        },
    },
});
