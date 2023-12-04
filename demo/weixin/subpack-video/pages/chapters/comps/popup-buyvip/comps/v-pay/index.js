/**
 * 会员中心header
 * **/
const app = getApp();
const api = require('../../api');
import { util_action } from '../../../../../../../util.js';

Component({
    properties: {
        userInfo: {
            type: Object,
            value: {},
        },
    },
    data: {
        imgClass: {},
        membersList: [],
        activeItem: {},
    },
    attached() {
        this.getVipGoodList();
    },
    methods: {
        async getVipGoodList() {
            try {
                const { code, data = {} } = await api.getVipGoodList({ third_activity: 'video_pre_unlock' });
                if (code != 200) {
                    return false;
                }
                let { members = [], charge_activity: chargeActivity = {} } = data;
                members = members[0] ? members[0] : {};

                let { member_goods = [], renew_goods = [], vip_user = {} } = members;

                const { userInfo } = this.properties;
                if ((userInfo && vip_user.auto_keep) || app.globalData.channel == 'qq') {
                    renew_goods = []; // 不展示续约商品
                }

                // 合并格式商品列表
                let membersList = [...renew_goods, ...member_goods];

                membersList.forEach((item) => {
                    // item.description = item.description || "";
                    // item.discount_tips = item.discount_tips || "";
                    item.coupon = item.coupon ? item.coupon : { usable_list: [], unreachable_list: [] };

                    // 优惠券
                    item.usableCouponFirst = item.coupon.usable_list[0] ? item.coupon.usable_list[0] : null;

                    // item.id = item.id || 0;
                    // item.icon = item.icon || "";
                    // item.banner = item.banner || ""; // 赠送kkb的图标
                    item.markPruice = item.price.mark_price / 100; // 以元为单位
                    // item.real_price = item.real_price || 0; // 实际价格
                    item.realPrice = item.price.real_price / 100;
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
                });

                this.triggerEvent('onChoiceItem', { activeItem, chargeActivity });
            } catch (err) {
                console.warn(err);
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
            });

            this.triggerEvent('onChoiceItem', { activeItem });
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
                url = `https://www.kuaikanmanhua.com/anim/autoRenew.html`;
            } else {
                // 会员服务协议
                url = `https://www.kuaikanmanhua.com/anim/vipAgreement.html`;
            }
            util_action({ type: 19, id: '', url: url, params: { source: 'mini-app', page: 'vipcenter' } });
        },
    },
});
