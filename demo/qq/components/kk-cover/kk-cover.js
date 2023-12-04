/**
 * 专题&章节封面图,占位图placeholder,根据屏幕宽度自适应拼接前端别名后缀
 */
import { util_feSuffix } from '../../util.js';
const computedBehavior = require('miniprogram-computed');
Component({
    behaviors: [computedBehavior],
    properties: {
        src: {
            type: String,
            value: '',
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
            value: 'aspectFill',
        },
        quality: {
            type: Boolean,
            value: false,
        },
        isSuffix: {
            type: Boolean,
            value: true,
        },
        index: {
            type: [String, Number],
            value: 0,
        },
    },
    data: {
        loaded: false,
    },
    computed: {
        style(data) {
            const { width, height } = data;
            if (width > height) {
                // 宽图
                return `width: ${height}rpx; height: ${height / 2}rpx;`;
            } else {
                //  长图
                return `width: ${width / 2}rpx; height: ${width / 4}rpx;`;
            }
        },
    },
    watch: {
        src: function () {
            setTimeout(() => {
                this.init();
            }, 200);
        },
    },
    methods: {
        init() {
            const { src, width, quality, isSuffix } = this.data;
            if (!src) {
                console.log('检查是否传递了src');
                return;
            }
            this.setData({
                computedSrc: isSuffix
                    ? util_feSuffix({
                          src,
                          width,
                          quality,
                      })
                    : src,
            });
        },
        loaded() {
            this.setData({
                loaded: true,
            });
            this.setEvent();
        },
        setEvent() {
            let event = 'onImageLoad';
            let index = this.data.index;
            this.triggerEvent(event, {
                index,
            });
        },
    },
});
