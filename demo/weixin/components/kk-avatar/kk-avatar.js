/**
 * 头像组件，无src传入，显示通用默认头像，右下角v图标动态显示，控制border样式，加载完成渐变显示效果
 */

import { util_feSuffix } from "../../util.js";
const computedBehavior = require("miniprogram-computed");

Component({
    behaviors: [computedBehavior],
    properties: {
        src: {
            type: String,
            value: "",
        },
        size: {
            type: Number,
            value: 0,
        },
        border: {
            type: String,
            value: "none",
        },
        vip: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        loaded: false,
    },
    computed: {
        style(data) {
            return `width: 100%; height: 100%; opacity: ${data.loaded ? 1 : 0};`;
        },
    },
    watch: {
        src: function () {
            this.init();
        },
    },
    methods: {
        init() {
            const { src, size } = this.data;
            if (src) {
                this.setData({
                    loaded: true,
                    computedSrc: util_feSuffix({ src, width: size }),
                });
            }
        },

        loaded() {
            this.setData({ loaded: true });
        },
    },
});
