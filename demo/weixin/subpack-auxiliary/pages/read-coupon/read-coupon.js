import { util_request, util_action } from "../../../util.js";

const app = getApp();
const { connect } = app.Store;
const global = app.globalData;

const page = {
    data: {
        type: 0, // 查询类型 0:未使用，1:已失效
        limit: 20, // 每页数据的数量
        coupon_since: -1, //
        order_since: -1, //
        list: [],
    },

    onLoad() {
        this.getCouponList();
    },

    getCouponList({ coupon_since, order_since, limit, type } = this.data) {
        const data = { limit, type };
        if (coupon_since !== -1) data.coupon_since = coupon_since;
        if (order_since !== -1) data.order_since = order_since;

        util_request({
            url: "/v1/coupon/my_coupon",
            method: "get",
            host: "pay",
            data,
        }).then((res) => {
            res = res || {};
            const { code, data } = res;
            if (code !== 200) return false;
            let { coupon_since = -1, order_since = -1, list = [] } = data;

            list = list.map((item) => {
                let textArr = item.expired_text.split("#");
                textArr = textArr.map((citem, cindex) => (cindex % 2 ? `<span style="color: #6F93BD; padding-right: 8px">${citem}</span>` : citem));
                return {
                    ...item,
                    expired_text: textArr.join(""),
                };
            });

            this.setData({
                coupon_since,
                order_since,
                list,
            });
        });
    },

    handleTabChange(e) {
        const { type } = e.currentTarget.dataset;
        const { type: nowType } = this.data;
        if (type === nowType) return false;
        this.setData({ type, coupon_since: -1, order_since: -1 });
        this.getCouponList();
    },

    handleRead(e) {
        const { id } = e.currentTarget.dataset;
        util_action({
            type: 68,
            parentid: id,
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, wallet }) => {
        return {
            userInfo,
            wallet,
        };
    },
    (setState, _state) => ({
        setWallet(newVal) {
            setState({
                wallet: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
