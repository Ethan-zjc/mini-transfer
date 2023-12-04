/*
 * 顶部通用提示条
 * @param {type} 默认side，可选值layout
 */

import { util_hideNotify } from "../../util.js";

Component({
    properties: {
        options: {
            type: Object,
            value: {
                visible: false,
            },
        },
        customNav: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        rectTop: 0,
        arrowRight: 55,
        visible: false,
        showClose: false,
        type: "side",
        title: "",
        icon: "",
        style: "",
        subtitle: "",
    },
    observers: {
        options(val) {
            if (val) {
                this.getNotify(val);
            }
        },
    },
    ready() {
        this.getRect()
            .then((rect) => {
                const options = {};
                if (rect.width) {
                    options.arrowRight = Math.floor(rect.width * 0.65);
                }
                if (this.data.customNav) {
                    options.rectTop = rect.bottom ? rect.bottom + 2 : 58;
                }
                this.setData(options);
            })
            .catch(() => {
                if (this.data.customNav) {
                    this.setData({
                        rectTop: 58,
                    });
                }
            });
    },
    methods: {
        getNotify(val) {
            if (val.visible) {
                const { type, icon, title, visible, background, color, showClose, subtitle } = val;
                const options = {
                    type,
                    icon,
                    visible,
                    title,
                    subtitle,
                    showClose,
                };
                if (type == "layout") {
                    options.style = `background-color:${background};color:${color}`;
                }
                this.setData(options);
            } else {
                this.setData({
                    visible: false,
                });
            }
        },
        getRect() {
            return new Promise((resolve, reject) => {
                if (wx.getMenuButtonBoundingClientRect) {
                    const rect = wx.getMenuButtonBoundingClientRect();
                    if (rect) {
                        resolve(rect);
                    } else {
                        reject();
                    }
                } else {
                    reject();
                }
            });
        },
        tapInfo() {
            const pages = getCurrentPages();
            const length = pages.length;
            if (length) {
                const currentPage = pages[length - 1];
                const nowNotify = currentPage.data.notifyOptions;
                if (nowNotify && nowNotify.onClick) {
                    nowNotify.onClick();
                }
            }
        },
        close() {
            util_hideNotify();
        },
    },
});
