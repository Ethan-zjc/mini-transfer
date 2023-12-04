/**
 * 付费集合弹窗底部展示部分
 * @param images   {Object}     CDN图片地址集合
 * @param isLogin  {Boolean}    是否登录
 * @param type     {Number}     显示样式的类型   type=1 普通付费弹窗使用    type=2 vip提前看&充值礼包使用    type=3 会员限免ios不用场景
 * @param newClass {String}     外部传入的class样式
 * @param wallet   {Number}     传入kkb余额
 * @param isvip    {Boolean}    传入判断当前用户时候为vip用户
 * @param topicId  {Number}     当前漫画的专题id
 * @param iPhoneX  {Boolean}    是否为iPhoneX及其以上的设备
 * @param price    {Number}     当前章节的需要支付的kkb
 * @param autoPay  {Boolean}    是否需要自动购买
 * @param popType  {Number}    会员状态
 * **/

import { util_action } from "../../../../util.js";

Component({
    properties: {
        images: {
            type: Object,
            value: {},
        },
        isLogin: {
            type: Boolean,
            value: false,
        },
        type: {
            type: Number,
            value: 1,
        },
        wallet: {
            type: Number | String,
            value: 0,
        },
        isvip: {
            type: Boolean,
            value: false,
        },
        topicId: {
            type: Number | String,
            value: 0,
        },
        iPhoneX: {
            type: Boolean,
            value: false,
        },
        price: {
            type: Number | String,
            value: 0,
        },
        autoPay: {
            type: Boolean,
            value: false,
        },
        popType: {
            type: Number | String,
            value: 0,
        },
        isLimitFree: {
            type: Boolean,
            value: false,
        },
        isReadCoupon: {
            type: Boolean,
            value: false,
        },
        isCanPay: {
            type: Boolean,
            value: false,
        },
    },
    methods: {
        // 点击跳转专题详情
        topicBtnTap() {
            if (!this.properties.topicId) {
                return false;
            }
            util_action({ type: 2, id: this.properties.topicId, redirect: true });
        },

        // 点击底部去充值按钮
        goInvest() {
            let time = setTimeout(() => {
                clearTimeout(time);
                if (!this.data.isCanPay) {
                    return false;
                }
                this.triggerEvent("openVipPageFun", { type: 1 });
            }, 350);
        },

        // 点击自动购买设置
        switchAuto() {
            this.setData({
                autoPay: !this.data.autoPay,
            });
            this.triggerEvent("switchAuto", {}, { bubbles: true, composed: true });
        },

        // 支付kkb
        onPayClick(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            this.triggerEvent("onPayClick", dataset, { bubbles: true, composed: true });
        },
    },
});
