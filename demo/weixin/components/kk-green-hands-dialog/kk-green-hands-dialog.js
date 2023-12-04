/**
 * 新手福利领取弹窗
 * @param show        {Boolean}  是否显示弹窗
 * @param userInfo    {Object}   用户信息
 * @param dialogInfo  {Object}   弹窗数据
 * @param topicId     {number}  专题id
 * @param comicId     {number}  章节id
 * **/
const api = require("../kk-green-hands-enter/api");

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },

    // 组件的对外属性，是属性名到属性设置的映射表
    properties: {
        show: {
            type: Boolean,
            default: false,
        },
        dialogInfo: {
            type: Object,
            default: null,
        },
        userInfo: {
            type: Object,
            default: null,
        },
        topicId: {
            // 专题id
            type: [Number, String],
            value: 0,
        },
        comicId: {
            // 章节id
            type: [Number, String],
            value: 0,
        },
    },

    // 组件内部数据
    data: {
        timer: null,
        isShow: false, // 是否显示弹窗
    },

    attached() {
        let time = setTimeout(() => {
            clearTimeout(time);
            const { show, userInfo } = this.properties;
            if (show && !!userInfo) {
                // console.log('attached::::::222', show, userInfo)
                this.tackBenefit();
            }
        }, 10);
    },

    // 组件的方法，包括事件响应函数和任意的自定义方法，关于事件响应函数的使用
    methods: {
        // 关闭弹窗
        handleClose() {
            this.triggerEvent("dialogclose");
            this.setData({ isShow: false }); // 显示弹窗
        },

        // 领取
        tackBenefit() {
            // 先判断登陆
            this.checkLogin().then((res) => {
                const id = (this.data.dialogInfo || {}).benefit_id;
                const title = (this.data.dialogInfo || {}).award_title;
                api.queryEnter({ benefit_id: id, topic_id: this.properties.topicId })
                    .then((res) => {
                        // 领取
                        if (res.code === 200) {
                            // this.triggerEvent("close");
                            this.setData({ isShow: true }); // 显示弹窗
                            this.triggerEvent("success", {
                                toast: `领取成功，开始享用${title}免费读福利哦~`,
                                bubble: "查看剩余福利天数",
                            });
                        }
                        // console.log('api enter', res)
                    })
                    .catch((err) => {
                        this.triggerEvent("close");
                        if (err.code === 500105) {
                            // 领取失败
                            this.triggerEvent("fail", { toast: "福利发放失败，请退出重新进入小程序领取", code: err.code || 0 });
                        } else {
                            this.triggerEvent("fail", { toast: `${err.message || "error"}`, code: err.code || 0 });
                        }
                    });
            });
        },

        // 检查登录，通过后resolve，否则前往登录页
        checkLogin() {
            return new Promise((resolve) => {
                if (!this.data.userInfo) {
                    this.routeLogin();
                } else {
                    resolve();
                }
            });
        },

        // 跳转登录页
        routeLogin() {
            wx.navigateTo({ url: "/pages/login/login" });
        },
    },
});
