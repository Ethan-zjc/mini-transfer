/*
 发现页二级导航
 */
const app = getApp();
Component({
    properties: {
        subnavList: {
            // 二级导航列表数据
            type: Array,
            value: [],
        },
        isTaskRedPoints: {
            // 是都显示有任务 小红点
            type: Boolean,
            value: false,
        },
        userInfo: {
            // 用户信息
            type: Object,
            value: null,
        },
        images: {
            type: Object,
            value: null,
        },
        subnavData: {
            type: Object,
            value: {},
        },
    },
    ready() {
        const timer = setTimeout(() => {
            clearTimeout(timer);
            this.triggerEvent("onSubnavImp");
        }, 1000);
    },
    methods: {
        // 点击事件
        subnavTap(event) {
            let eventName = "onSubnavTap"; // 返回给父级的事件名称
            let dataset = event.currentTarget.dataset;
            if (dataset.login) {
                return false;
            }
            this.triggerEvent(eventName, dataset, { bubbles: true });
        },

        // 静默登录函数
        originLogin(e) {
            const data = e.currentTarget.dataset;
            app.originLogin(e.detail).then((res) => {
                if (data.type === 2002) {
                    this.subnavTap(e);
                } else {
                    wx.reLaunch({
                        url: "/pages/find/find",
                    });
                }
            });
        },
    },
});
