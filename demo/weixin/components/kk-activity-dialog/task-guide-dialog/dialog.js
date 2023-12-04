const taskSence = require("./sences.js");
let imgList = [];
Object.keys(taskSence).map((item) => {
    imgList = imgList.concat(taskSence[item].step);
});

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },
    properties: {
        show: {
            // 是否显示弹窗
            type: Boolean,
            value: false,
        },
        sence: {
            // 类型是team:邀请组队， award:开奖
            type: String,
            value: "",
        },
        currentSwiper: {
            type: Number,
            value: 0,
        },
    },
    data: {
        imgList,
    },
    observers: {
        show(val) {
            if (val) {
                const { sence } = this.data;
                this.setData({
                    infos: taskSence[sence],
                });
            }
        },
    },
    methods: {
        close() {
            this.setData({ show: false });
            this.triggerEvent("dialogTap", { eventName: "CLOSE" });
        },
        eventBtn(e) {
            const { ind } = e.currentTarget.dataset;
            if (ind == 2) {
                this.setData({
                    show: false,
                });
                this.triggerEvent("dialogTap", { eventName: "CLOSE" });
                return;
            }
            this.setData({
                currentSwiper: ind + 1,
            });
        },
        swiperChange(e) {
            this.setData({
                currentSwiper: e.detail.current,
            });
        },
        copyAddress() {
            wx.setClipboardData({
                data: "快看APP",
                success(res) {
                    console.log("success", res);
                },
            });
        },
    },
});
