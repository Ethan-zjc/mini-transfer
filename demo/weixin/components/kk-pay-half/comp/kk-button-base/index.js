/**
 * 基本按钮，宽高固定
 * 未登录时点击，调起静默登录，登录后点击回调事件：onClick
 * @param type   {String} 按钮样式，非必传，solid:实心; border:边框; disabled: 禁用
 * @param text   {String} 按钮文案，必传，传什么显示什么
 * @param comicId  {Number} 当前漫画id，必传
 * @param isVip  {Boolean} 是否vip，非必传
 * **/

import { util_notiOS, util_action } from "../../../../util.js";

const app = getApp();
const global = app.globalData;

Component({
    properties: {
        isVip: {
            type: Boolean,
            value: false,
        },
        comicId: {
            type: [Number, String],
            value: 0,
        },
        text: {
            type: String,
            value: "",
        },
        type: {
            type: String,
            value: "solid",
        },
    },
    data: {
        isLogin: false,
        isDisabled: false,
    },
    attached() {
        const { type } = this.data;
        this.setData({
            isLogin: !!global.userId,
            isDisabled: type == "disabled",
        });
    },
    methods: {
        tapButton() {
            const { text, type, isDisabled } = this.data;
            if (isDisabled) {
                util_notiOS().catch(() => {
                    return false;
                });
            } else {
                this.triggerEvent("onClick", {
                    text,
                    type,
                });
            }
        },
        onLoginTap(event) {
            app.originLogin(event.detail).then(() => {
                let comicId = this.data.comicId;
                util_action({ type: 3, id: comicId, redirect: true });
            });
        },
    },
});
