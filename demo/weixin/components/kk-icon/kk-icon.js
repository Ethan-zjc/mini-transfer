/*
 * 一般用于远程图标显示，所以命名kk-icon
 * 自适应宽/高，宽高都传则按照传递值设置
 * 在加载前透明，防止用户看到变形的图片
 * 判断webp，自动设置image组件的webp属性
 */
const computedBehavior = require("miniprogram-computed");

Component({
    behaviors: [computedBehavior],
    properties: {
        src: {
            type: String,
            value: "",
        },
        width: {
            type: Number,
            value: 0,
        },
        height: {
            type: Number,
            value: 0,
        },
    },
    data: {
        webp: false,
        widthComputed: 0,
        heightComputed: 0,
    },
    computed: {
        style(data) {
            const { widthComputed, heightComputed } = data;
            return `width: ${widthComputed}rpx; height: ${heightComputed}rpx; opacity: ${widthComputed && heightComputed ? 1 : 0};`;
        },
    },
    attached() {
        const { src } = this.data;
        this.setData({
            webp: src.substring(src.lastIndexOf(".") + 1).toUpperCase() === "WEBP",
        });
    },
    methods: {
        loaded(e) {
            const { width, height } = this.data;
            let computed = {
                widthComputed: width,
                heightComputed: height,
            };
            if (width && !height) {
                // 高度自适应
                computed.heightComputed = width * (e.detail.height / e.detail.width);
            } else if (height && !width) {
                // 宽度自适应
                computed.widthComputed = height * (e.detail.width / e.detail.height);
            }
            this.setData(computed);
        },
    },
});
