/**
 * 底部浮层工具栏
 * **/
const { comicImgs } = require('../../../../cdn.js');

Component({
    properties: {
        lastId: {
            type: Number,
        },
        nextId: {
            type: Number,
        },
        follows: {
            type: Object,
            value: {},
        },
        topicId: {
            type: Number,
        },
        userInfo: {
            type: Object,
            value: null,
        },
    },
    data: {
        comicImgs,
    },
    attached() {
        // this.setData({
        //     openContinuRead: wx.getStorageSync('openContinuRead') || false, // 是否开启连续阅读
        // });
    },
    methods: {
        stopPop() {
            return;
        },
        clickEvent(e) {
            this.triggerEvent('toolsCallback', e);
        },
    },
});
