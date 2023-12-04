/**
 * 气泡组件,用于tabbar页面: feed、find
 */

const app = getApp();

Component({
    properties: {
        bubbleText: {
            type: String,
            default: "",
        },
    },

    data: {
        bubble: null,
        time: null,
    },
    ready() {
        this.data.time = setTimeout(() => {
            // 新手福利的bubble不需要自动关闭
            this.close();
        }, 5000);
    },
    pageLifetimes: {
        // 组件所在页面的生命周期函数
        show() {
            if (app.globalData.bubble) {
                this.setData({ bubble: app.globalData.bubble });
            }
            app.globalData.bubbleCallback = (bubble) => {
                this.setData({ bubble });
            };
        },

        hide() {
            this.close(true);
            this.setData({ bubble: null });
        },
    },
    methods: {
        // 3种隐藏/关闭机制：1、页面切换；2、倒计时结束；3、点击跳转
        close(pagehide) {
            if (!this.data.bubble) {
                this.setData({ bubbleText: null });
                return;
            }
            if (this.data.time) {
                clearTimeout(this.data.time);
            }
            let bubble = this.data.bubble;
            bubble = bubble ? bubble : {};
            bubble.topic = bubble.topic ? bubble.topic : "";
            bubble.title = bubble.title ? bubble.title : "";
            if (bubble.title) {
                this.setData({ [`bubble.title`]: "" });
                app.globalData.bubble.title = "";
                // 非页面切换导致的隐藏，则停止原本的倒计时，开启第二段倒计时
                if (!pagehide) {
                    this.data.time = setTimeout(() => {
                        this.close();
                    }, 5000);
                }
            } else if (bubble.topic) {
                this.setData({ [`bubble.topic`]: "" });
                app.globalData.bubble.topic = "";
            }
            if (!bubble.title && !bubble.topic) {
                this.setData({ bubble: null });
                app.globalData.bubble = null;
            }
        },

        routeMy() {
            wx.switchTab({ url: "/pages/my/my" });
        },
    },
});
