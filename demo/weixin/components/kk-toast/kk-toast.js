/**
 * 封装toast组件，配合util方法使用：util_showToast()
 * @use 页面json引入："kk-toast": "/components/kk-toast/kk-toast"
 * @use wxml根级固定写入组件结构：<kk-toast toast="{{ toast }}"></kk-toast>
 * @warning 每个页面必须单独引入
 * @warning 页面data不能使用'toast'变量
 * @warning 页面根级dom层级（z-index）不能高于1000
 * @warning 同时只能出现一个toast（当前已存在的toast会先被销毁）
 * @warning loading不会被自动销毁，必须手动调用util_hideLoading()
 * @warning mask只能阻止点击事件，无法阻止页面级别的滚动
 * @warning 可能存在少量页面栈获取失败的场景，（比如在页面ready前触发toast()），此时调用toast会失败
 * @warning 暂时没有成功/失败/完成回调
 */

const global = getApp().globalData;
const computedBehavior = require("miniprogram-computed");

Component({
    behaviors: [computedBehavior],
    data: {
        lines: false,
        opacity: 0,
    },
    properties: {
        toast: {
            type: Object,
            value: {},
        },
    },
    computed: {
        isloading(data) {
            const toast = data.toast;
            return (toast && toast.type && toast.type == "loading") || false;
        },
        show(data) {
            const toast = data.toast;
            return !!(toast && toast.show) || false;
        },
        title(data) {
            const toast = data.toast;
            return (toast && toast.title) || "";
        },
        image(data) {
            const toast = data.toast;
            const type = toast && toast.type;
            if (type && !data.isloading) {
                return `/images/toast-${type}.png`;
            } else {
                return "";
            }
        },
        icon(data) {
            const toast = data.toast;
            return (toast && toast.icon) || "";
        },
        mask(data) {
            if (data.isloading) {
                return true;
            }
            const toast = data.toast;
            return (toast && toast.mask) || false;
        },
    },
    watch: {
        show: function (val) {
            if (val) {
                if (this.data.isloading || this.data.image) {
                    this.setData({ opacity: 1 });
                } else {
                    const toastDom = wx.createSelectorQuery().in(this).select("#toast");
                    if (!toastDom) {
                        this.setData({ opacity: 1, lines: false });
                    }
                    const _this = this;
                    // 只有文字时，有2种border-radius，根据内容高度分别设置
                    toastDom
                        .boundingClientRect(function (rect) {
                            if (rect) {
                                // 认为是多行文字
                                _this.setData({
                                    opacity: 1,
                                    lines: rect.height * global.screenRpxRate > 76,
                                });
                            } else {
                                _this.setData({ opacity: 1, lines: false });
                            }
                        })
                        .exec();
                }
            } else {
                this.setData({ opacity: 0 });
            }
        },
    },
});
