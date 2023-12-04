import { util_showToast } from "../../util";
import { videoImgs } from "../../cdn.js";
const api = require("./api");

Component({
    properties: {
        width: {
            type: Number,
            value: 224,
        },
        coverHeight: {
            type: Number,
            value: 300,
        },
        videoInfo: {
            type: Object,
            value: {},
        },
        showFollowBtn: {
            type: Boolean,
            value: false,
        },
    },

    data: {
        videoImgs,
    },

    methods: {
        clickFollowButton(e) {
            const { videoInfo } = this.data;
            const { id, favourite } = videoInfo;
            const type = favourite ? 1 : 0;

            api.followHandler(type, id).then((res) => {
                const { code } = res;
                if (code === 200) {
                    videoInfo.favourite = !favourite;
                    util_showToast({
                        title: favourite ? "取关成功" : "关注成功",
                    });
                    this.setData({ videoInfo });
                }
            });
        },
    },
});
