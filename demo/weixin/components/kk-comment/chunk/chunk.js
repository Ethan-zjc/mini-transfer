import { util_action } from "../../../util.js";

const { commentImgs } = require("../../../cdn.js");

Component({
    properties: {
        chunkItem: {
            type: Object,
            value: {},
        },
        isDetail: {
            // 是否详情页引入
            type: Boolean,
            value: false,
        },
    },
    data: {
        commentImgs,
    },
    attached() {
        // console.log(111, this.data.chunkItem)
    },
    methods: {
        actionComment(e) {
            // 一些拦截，不可跳转情况
            if (this.data.isDetail) {
                return;
            }

            const { id } = e.currentTarget.dataset;
            util_action({ type: 77, id });
        },
    },
});
