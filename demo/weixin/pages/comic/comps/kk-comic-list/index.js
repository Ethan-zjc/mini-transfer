/**
 * 漫画页图片list
 * @param showUnfoldAll 是否展示折叠态
 * @param unfoldHeight 折叠高度
 * **/

Component({
    properties: {
        showUnfoldAll: {
            type: Boolean,
            value: false,
        },
        imgList: {
            type: Array,
            value: [],
        },
        miMode: {
            type: String,
            value: "",
        },
        unfoldHeight: {
            type: [String, Number],
        },
    },
    methods: {
        loadSuccess(e) {
            e.currentTarget.dataset.type = "success";
            this.triggerEvent("loadCallback", e);
        },
        loadError(e) {
            e.currentTarget.dataset.type = "error";
            this.triggerEvent("loadCallback", e);
        },
    },
});
