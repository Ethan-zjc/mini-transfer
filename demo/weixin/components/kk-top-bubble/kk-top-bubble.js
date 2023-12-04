/*
 * 气泡组件
 * 用于tabbar页面: feed、find
 */

const app = getApp();

Component({
    properties: {
        showTopBubble: {
            type: Boolean,
            default: false,
        },
        autoClose: {
            type: Boolean,
            default: false,
        },
        showClose: {
            type: Boolean,
            default: false,
        },
        title: {
            type: String,
            default: "",
        },
        tip: {
            type: String,
            default: "",
        },
        top: {
            type: Number,
            default: 0,
        },
        customNav: {
            type: Boolean,
            default: false,
        },
    },
    data: {
        bubble: null,
        time: null,
        rectTop: 0,
        arrowRight: 55,
    },
    ready() {
        if (!this.data.top) {
            const rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
            if (this.data.customNav) {
                if (rect && rect.bottom) {
                    this.setData({
                        rectTop: rect.bottom + 2,
                        arrowRight: Math.floor(rect.width * 0.65),
                    });
                } else {
                    this.setData({ rectTop: 58 });
                }
            } else {
                if (rect && rect.width) {
                    this.setData({
                        arrowRight: Math.floor(rect.width * 0.65),
                    });
                }
            }
        }
        // 判断是否需要自动关闭
        if (this.data.autoClose) {
            this.data.time = setTimeout(() => {
                this.close();
            }, 5000);
        }
    },
    methods: {
        // 3种隐藏/关闭机制：1、页面切换；2、倒计时结束；3、点击跳转
        close(pagehide) {
            if (this.data.time) {
                clearTimeout(this.data.time);
            }

            // 触发回调关闭
            this.triggerEvent("closeBubble", {});
        },
    },
});
