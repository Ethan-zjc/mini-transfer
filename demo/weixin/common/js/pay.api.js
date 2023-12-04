import { util_request } from "../../util.js";

// 下单获取订单信息
const postPayOrderApi = ({
    pay_source = "1", // 下单来源  1:我的钱包  2:活动页
    good_type = "1", // 充值类型 1:充值业务 2:会员充值业务
    good_id = "", // 商品id
    pay_info = {}, // 活动或者其他携带支付参数
} = {}) => {
    let host = "pay",
        method = "post";
    let url = "/v1/pay/pay_order/add_h5";
    const { cps = "", isiOS = "", appId = "", scene = "", payfrom = 8, openId = "" } = getApp().globalData;

    if (typeof pay_info == "object") {
        pay_info = JSON.stringify(pay_info);
    }
    let data = {
        pay_type: "10",
        pay_source,
        good_type,
        good_id,
        pay_info,
        from: payfrom,
        platform: isiOS ? "2" : "1",
        open_id: openId,
        app_id: appId,
        cps,
        scene,
    };

    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 查询订单充值结果,订单结果是异步
const getOrderIdResultApi = ({ order_id = "", type = 1 } = {}) => {
    let url = `/v1/pay/pay_order/query/detail_order_id_${type == 2 ? "member" : "recharge"}`;
    let method = "get";
    let host = "pay";
    let data = {
        order_id, // 订单id
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 获取kkb商品列表
const getKkbMealListApi = ({ third_activity = "", code = "", origin_url = "" } = {}) => {
    let url = "/v2/kb/recharge_good/list_h5";
    let method = "get";
    let host = "pay";
    let data = {
        from: getApp().globalData.payfrom,
    };
    if (third_activity) {
        data.third_activity = third_activity;
    }
    if (code) {
        data.code = code;
    }
    if (origin_url) {
        data.origin_url = origin_url;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// kkb购买漫画接口
const paidCartoonApi = ({
    encrypt = "",
    auto_pay = false, // 是否为自动购买
    target_id = 0, // 为章节时时章节id，其他为0
}) => {
    const { cps, appId, scene, payfrom } = getApp().globalData;
    const data = {
        comicbuy_encrypt_str: encrypt,
        auto_pay,
        source: payfrom,
        from: payfrom,
        target_id,
        cps,
        scene, // 来源场景
        app_id: appId, // 来源appId
    };
    return util_request({
        method: "post",
        host: "pay",
        url: "/v2/comicbuy/encrypt_buy_h5",
        data,
    });
};

export { getKkbMealListApi, postPayOrderApi, getOrderIdResultApi, paidCartoonApi };
