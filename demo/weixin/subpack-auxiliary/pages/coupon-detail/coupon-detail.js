import { util_action } from "../../../util.js";

const couponDetailPage = {
    data: {
        // 使用的远程图片地址 小程序迭代7修改
        images: {
            coupon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/background/coupon_bd14c22.png", // 代金券头图
            splitCoupon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/background/split-coupon_99fab81.png",
        },
    },

    onLoad: function onLoad(opts) {
        const index = opts.index * 1;
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2];
        const _prevPage$data$list$i = prevPage.data.list[index];
        const type = _prevPage$data$list$i.type;
        const topic_id = _prevPage$data$list$i.topic_id;
        const total = _prevPage$data$list$i.total;
        const time = _prevPage$data$list$i.time;
        const consumed = _prevPage$data$list$i.consumed;
        const common_discount_rules = _prevPage$data$list$i.common_discount_rules;
        const lasted_discount_rule = _prevPage$data$list$i.lasted_discount_rule;

        const buttonTxt = {
            1: "立即使用",
            2: "已用光",
            3: "已过期",
        };
        this.setData({
            iPhoneX: prevPage.data.iPhoneX,
            useless: type == 1 ? "" : "useless",
            button: buttonTxt[type],
            topicId: topic_id,
            total: total,
            time: time,
            spend: consumed,
            list: common_discount_rules,
            word: "\u6700\u65B0" + lasted_discount_rule.latest_count + "\u8BDD\u53EF\u62B5\u6263" + lasted_discount_rule.discount + "%KK\u5E01\u5466(\u0E51\u2022\u1D17\u2022)",
        });
    },
    toTopic: function toTopic(e) {
        if (this.data.useless) {
            return;
        }
        const { id, type = 2, tab = 0 } = e.currentTarget.dataset;
        util_action({
            params: { tab },
            id,
            type,
        });
    },
};

Page(couponDetailPage);
