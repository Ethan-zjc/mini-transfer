import { getOrderList } from "./api";
import { util_formatTime } from "../../../util.js";
const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const { cdnIconsImgs } = require("../../../cdn.js");
const page = {
    data: {
        loading: false,
        navTitle: "我的订单",
        curIdx: 0,
        rechargeSince: 0,
        rechargeList: [],
        vipSince: 0,
        vipList: [],
        orderStatus: {
            1: "已取消",
            2: "已完成",
        },
        cdnIconsImgs,
    },
    onLoad() {
        this.getOrderData();
    },
    loadNextPage() {
        this.getOrderData();
    },
    navChange(e) {
        if (e.detail.source === "touch") {
            this.setData({
                curIdx: e.detail.current,
            });
            this.getOrderData();
        }
    },
    switchTab(e) {
        this.setData({
            curIdx: Number(e.currentTarget.dataset.idx),
        });
        this.getOrderData();
    },
    getOrderData() {
        const params = {
            order_type: this.data.curIdx === 0 ? 1 : 2,
            since: this.data.curIdx === 0 ? this.data.rechargeSince : this.data.vipSince,
            platform: global.isiOS ? 2 : 1,
        };
        if (params.since < 0) {
            return;
        } else {
            this.setData({
                loading: true,
            });
        }
        const lastOrderData = this.data.curIdx === 0 ? this.data.rechargeList : this.data.vipList;
        getOrderList(params)
            .then((res) => {
                const { code, data } = res;
                if (code == 200) {
                    const handleOrderData = data.orders.map((item) => {
                        item.pay_at_text = util_formatTime(item.pay_at, "yyyy-MM-dd hh:mm");
                        return item;
                    });
                    const newOrderData = lastOrderData.concat(handleOrderData);
                    if (this.data.curIdx === 0) {
                        this.setData({
                            loading: false,
                            rechargeList: newOrderData,
                            rechargeSince: data.next_since,
                        });
                    }
                    if (this.data.curIdx === 1) {
                        this.setData({
                            loading: false,
                            vipList: newOrderData,
                            vipSince: data.next_since,
                        });
                    }
                }
            })
            .catch(() => {
                this.setData({
                    loading: false,
                });
            });
    },
};
const ConnectPage = connect()(page);
Page(ConnectPage);
