/**
 * 会员中心header
 * **/
const app = getApp();
const api = require('../../../buyvip/api');
import { util_action } from '../../../../../util.js';

Component({
    properties: {
        vipInfo: {
            type: Object,
            value: {},
        },
        userInfo: {
            type: Object,
            value: {},
        },
        couponId: {
            type: [String, Number],
            value: 0,
        },
    },
    pageLifetimes: {
        show() {
            // 全局默认优惠券
            const { defaultCouponItem = '' } = app.globalData;
            const { activeItem = {}, membersList = [] } = this.data;
            if (defaultCouponItem && defaultCouponItem.id != this.data.couponItem) {
                const index = membersList.findIndex((item) => item.id == activeItem.id);
                const item = membersList[index];
                item.usableCouponFirst = defaultCouponItem;
                this.setData({
                    couponItem: defaultCouponItem,
                    [`membersList[${index}]`]: item,
                    activeItem: item,
                });
                this.triggerEvent('onChoiceItem', item);
            }
        },
    },
    data: {
        imgClass: {},
        membersList: [],
        activeItem: {},
        couponItem: {}, // 选中优惠券信息
    },
    attached() {
        this.getVipGoodList(true);
    },
    methods: {
        curCoupon(item) {
            item.coupon.usable_list.forEach((item) => {
                item.amountStr = (item.amount / 100).toFixed(2);
            });
            return item.coupon.usable_list.length ? item.coupon.usable_list[0] : {};
        },
        async getVipGoodList(type) {
            try {
                const { code, data = {} } = await api.getVipGoodList();
                if (code != 200) {
                    return false;
                }
                if (type) {
                    this.triggerEvent('onCarryCoupon');
                }
                let { members = [] } = data;
                members = members[0] ? members[0] : {};

                let { recharge_goods = [], renew_goods = [] } = members;

                const { vipInfo, userInfo } = this.properties;
                if ((userInfo && vipInfo.auto_keep) || app.globalData.channel == 'qq') {
                    renew_goods = []; // 不展示续约商品
                }

                // 合并格式商品列表
                let membersList = [...renew_goods, ...recharge_goods];
                membersList.forEach((item) => {
                    // item.description = item.description || "";
                    // item.discount_tips = item.discount_tips || "";
                    item.coupon = item.coupon ? item.coupon : { usable_list: [], unreachable_list: [] };

                    // 优惠券
                    if (this.properties.couponId) {
                        // 如果是优惠券页打开的
                        if (item.coupon.usable_list.length) {
                            const coupon = item.coupon.usable_list.filter((value) => {
                                return value.id == this.properties.couponId;
                            });
                            item.usableCouponFirst = coupon[0] ? coupon[0] : item.coupon.usable_list[0];
                        } else {
                            item.usableCouponFirst = null;
                        }
                    } else {
                        item.usableCouponFirst = item.coupon.usable_list[0] ? item.coupon.usable_list[0] : null;
                    }

                    // item.id = item.id || 0;
                    // item.icon = item.icon || "";
                    // item.banner = item.banner || ""; // 赠送kkb的图标
                    item.markPruice = item.mark_price / 100; // 以元为单位
                    // item.real_price = item.real_price || 0; // 实际价格
                    item.realPrice = item.real_price / 100;
                    // item.sequence = item.sequence || 0; // 排序值
                });
                membersList = membersList.sort((a, b) => {
                    return a.sequence - b.sequence;
                });

                let activeIndex = 0;
                let activeItem = membersList[activeIndex] ? membersList[activeIndex] : {};

                this.setData({
                    membersList,
                    activeItem,
                    couponItem: this.curCoupon(activeItem),
                });

                this.triggerEvent('onChoiceItem', activeItem);
                // console.log(2222, this.data.membersList);
            } catch (err) {
                // console.log(err);
            }
        },

        // 选择商品的点击事件(改为选中状态)
        choiceGoodTap(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            let { index, id } = dataset;
            let data = this.data.activeItem ? this.data.activeItem : { id: 0 };
            if (data.id == id) {
                return false;
            }
            let activeItem = this.data.membersList[index];

            this.setData({
                activeItem,
                couponItem: this.curCoupon(activeItem),
            });

            this.triggerEvent('onChoiceItem', activeItem);
        },

        // 赠送的图片宽高设置
        imgbindload(e) {
            // console.log(e)
            let { index } = e.currentTarget.dataset;
            let { height } = e.detail;
            let imgClass = this.data.imgClass;
            imgClass[index] = height > 110 ? 1 : 2; // 1:大高度图 2:小高度
            this.setData({ imgClass });
        },

        questionAllTap(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            let { id } = dataset;
            let url;
            if (id == 2) {
                // 自动续费协议
                this.clickTrack('自动续费协议');
                url = `https://www.kuaikanmanhua.com/anim/autoRenew.html`;
            } else {
                // 会员服务协议
                this.clickTrack('会员服务协议');
                url = `https://www.kuaikanmanhua.com/anim/vipAgreement.html`;
            }
            util_action({ type: 18, id: '', url: url, params: { source: 'mini-app', page: 'vipcenter' } });
        },

        // 点击埋点
        clickTrack(name) {
            const data = {
                CurPage: '小程序新会员中心页面',
                name,
            };
            app.kksaTrack('ClickButton', data);
        },

        // 跳转优惠券详情页
        actionDetail() {
            const { couponItem = {}, activeItem = {} } = this.data;
            if (couponItem.id) {
                const { coupon = {} } = activeItem;
                app.kksaTrack('ClickButton', {
                    ButtonName: '使用优惠券',
                    CurPage: '会员中心页',
                });
                wx.navigateTo({
                    url: `/subpack-auxiliary/pages/vip-coupon/vip-coupon?couponStr=${JSON.stringify(coupon)}&checked=${couponItem.id}`,
                });
            }
        },
    },
});
