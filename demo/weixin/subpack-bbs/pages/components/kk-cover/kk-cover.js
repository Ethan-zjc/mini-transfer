/*
 专题&章节封面图
 占位图placeholder
 根据屏幕宽度自适应拼接前端别名后缀
 待拓展：图片加载失败的情况
 */

import { global } from "../../common/subapp";

Component({
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
        isBg: {
            type: Boolean,
            value: false,
        },
        mode: {
            type: String,
            value: "aspectFill",
        },
        post: {
            type: Boolean,
            value: false,
        },
        rules: {
            type: Boolean,
            value: true,
        },
        imgLoad: {
            // 瀑布流渲染时知道图片加载成功还是失败 1:成功 0:失败
            type: Boolean,
            value: 0,
        },
    },
    data: {
        loaded: false,
        style: "display: none;",
    },

    observers: {
        "width, height": function () {
            const { width, height } = this.data;
            let style;
            if (width > height) {
                // 宽图
                style = `width: ${height}rpx; height: ${height / 2}rpx;`;
            } else {
                //  长图
                style = `width: ${width / 2}rpx; height: ${width / 4}rpx;`;
            }

            this.setData({ style });
        },

        src: function () {
            this.init();
        },
    },

    methods: {
        init() {
            const { src, width, post, rules } = this.data;
            if (!src) {
                console.log("检查是否传递了src");
                return;
            }
            this.setData({
                computedSrc: rules ? this.feSuffix({ src, width, post }) : src,
            });
        },

        loaded() {
            this.setData({ loaded: true });
        },

        feSuffix({ src, width, post = false } = {}) {
            const { systemInfo, isiOS } = global;
            const { pixelRatio, screenWidth } = systemInfo;
            const rpxToPx = Math.ceil(width / 2);
            const cssWidth = Math.floor((rpxToPx / 375) * screenWidth);
            const realWidth = cssWidth * pixelRatio;
            let target, format, q, newsrc;

            // 兼容老方法
            if (src.indexOf("imageMogr2") !== -1) {
                return src;
            }
            // 兼容脏数据
            newsrc = src;
            let reg_1 = /-c.w(\w+)\s*/gi; // /(-c\.w\.(jpg|png|webp))|(-c\.w\d+\.(jpg|png|webp)))|(-h\d+\.w)|(-c.w)/ig
            let reg_2 = /(-w\d+\.w\.(jpg|png|webp))(\w+)\s*|((-w\d+)([\.(jpg|webp|png)]*))(\w+)\s*|(-w\d+\.w)(\w+)\s*|(-w\d+)(\w+)\s*/gi; // 匹配-w
            let reg_3 = /(-h\d+\.w\.(jpg|png|webp))(\w+)\s*|((-h\d+)([\.(jpg|webp|png)]*))(\w+)\s*|(-h\d+\.w)(\w+)\s*|(-h\d+)(\w+)\s*/gi; // 简写正则
            if (reg_1.test(src)) {
                newsrc = src.replace(reg_1, "");
            } else if (reg_2.test(src)) {
                newsrc = src.replace(reg_2, "");
            } else if (reg_3.test(src)) {
                newsrc = src.replace(reg_3, "");
            } else if (/\.webp\.w\.jpg/.test(src)) {
                newsrc = src.replace(/\.webp\.w\.jpg/, ".webp");
            }
            // 过滤 gif
            if (/.gif$/.test(newsrc)) {
                return newsrc;
            }

            // 确定ios动图拼接规则
            format = isiOS ? "jpg" : "webp";
            q = "h"; // h or l 两种质量
            // console.log(`newsrc after ::: ${newsrc}-t.w${target}.${format}.${q}`)

            if (post) {
                if (realWidth <= 480) {
                    target = 414;
                } else if (realWidth <= 540) {
                    target = 540;
                } else if (realWidth <= 640) {
                    target = 640;
                } else if (realWidth <= 720) {
                    target = 720;
                } else if (realWidth <= 900) {
                    target = 750;
                } else if (realWidth <= 1080) {
                    target = 1080;
                } else {
                    target = 1280;
                }

                return `${newsrc}-t.w${target}.${format}.${q}`;
            }

            if (realWidth <= 50) {
                target = 50;
            } else if (realWidth <= 70) {
                target = 70;
            } else if (realWidth <= 90) {
                target = 90;
            } else if (realWidth <= 120) {
                target = 120;
            } else if (realWidth <= 180) {
                target = 180;
            } else if (realWidth <= 207) {
                target = 207;
            } else if (realWidth <= 320) {
                target = 320;
            } else if (realWidth <= 360) {
                target = 360;
            } else if (realWidth <= 414) {
                target = 414;
            } else if (realWidth <= 540) {
                target = 540;
            } else if (realWidth <= 563) {
                target = 563;
            } else if (realWidth <= 640) {
                target = 640;
            } else if (realWidth <= 720) {
                target = 720;
            } else if (realWidth <= 750) {
                target = 750;
            } else if (realWidth <= 828) {
                target = 828;
            } else if (realWidth <= 960) {
                target = 960;
            } else if (realWidth <= 1080) {
                target = 1080;
            } else if (realWidth <= 1125) {
                target = 1125;
            } else if (realWidth <= 1280) {
                target = 1280;
            } else if (realWidth <= 1440) {
                target = 1440;
            } else if (realWidth <= 1600) {
                target = 1600;
            } else if (realWidth <= 2160) {
                target = 2160;
            }

            return `${newsrc}-t.w${target}.${format}.${q}`;
        },
    },
});
