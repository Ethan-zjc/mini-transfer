import { util_request } from "../../../util.js";

const api = require("../buykkb/api.js");

/**
 * ** getVipGoodList 会员套餐列表接口_端外      Get:/v1/pay/member_good/h5_list
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/341/interface/api/14232
 * 对接后端: 袁鑫 (付费)
 * @param(参数):             是否必填     备注:
 * @third_activity             非必填参数   例如:comicbuy_rebate_201903  半屏弹窗活动参数
 * @code                       非必填参数   微信登录校验code
 * @origin_url                 非必填参数      来源url
 * **/
function getVipGoodList({ third_activity = "", code = "", origin_url = "" } = {}) {
    let url = "/v1/pay/member_good/h5_list";
    let method = "get";
    let host = "pay";
    let data = {};
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
}

/**
 * ** getVipGoodList 会员订单查询接口      Get:/v1/pay/pay_order/query/detail_order_id_member
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/382/interface/api/4040
 * 对接后端: 喻诗祥/袁鑫 (付费)
 * @param(参数):             是否必填     备注:
 * @order_id                否          kkb订单号
 *
 * return Promise
 * **/
function getVipOrderId({ order_id = "" } = {}) {
    let url = "/v1/pay/pay_order/query/detail_order_id_member";
    let method = "get";
    let host = "pay";
    let data = { order_id };

    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * * getPayContract 签约商品回调 Get:/v1/pay/pay_contract/notify/common
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/382/interface/api/4040
 * 对接后端: 喻诗祥/袁鑫 (付费)
 * @param(参数):             是否必填     备注:
 * @contract_code           否          签约协议ID
 *
 * return Promise
 * **/
function getPayContract({ contract_code = "" } = {}) {
    let url = "/v1/pay/pay_contract/notify/common";
    let method = "get";
    let host = "pay";
    let data = { contract_code };

    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * * getFreeAssign 领取专题定向限免H5 post:/v2/comicbuy/free/assign_h5
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/317/interface/api/8832
 * 对接后端: 杨忠宇 (付费)
 * @param(参数):             是否必填     备注:
 * @free_encrypt_str           是          限免加密串
 * @topic_id                   否          专题id
 * @comic_id                   否          章节id
 *
 * return Promise
 * **/
function getFreeAssign({ free_encrypt_str = "", topic_id = "", comic_id = "" } = {}) {
    let url = "/v2/comicbuy/free/assign_h5";
    let method = "post";
    let host = "pay";
    let data = {
        free_encrypt_str,
        topic_id,
        comic_id,
    };

    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * * getFreeCalculate 半屏弹窗定向限免展示 post:/v2/comicbuy/free/calculate
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/317/interface/api/14928
 * 对接后端: 汤冬冬 (付费)
 * @param(参数):             是否必填     备注:
 * @free_encrypt_str           是          限免加密串
 * @topic_id                   否          专题id
 * @comic_id                   否          章节id
 *
 * return Promise
 * **/
function getFreeCalculate({ activity_name = "", combo_list = "", topic_id = "", comic_id = "", get_right_now = false } = {}) {
    let url = "/v2/comicbuy/free/calculate";
    let method = "post";
    let host = "pay";
    let data = {
        activity_name,
        combo_list,
        topic_id,
        comic_id,
        get_right_now,
    };

    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * getChargeSuccessBanner 充值成功弹窗运营位_V2       get: /v1/vip/banner/charge_success_banner_v2
 * @author:xubowei
 * yapi: https://yapi.quickcan.com/project/329/interface/api/38686
 * 对接后端: 张鑫 (付费)
 * @param(参数):                是否必填     备注
 * @order_id                 	是      订单ID
 *
 * return Promise
 * **/
function getChargeSuccessBanner({ order_id = "" } = {}) {
    let url = "/v1/vip/banner/charge_success_banner_v2";
    let method = "get";
    let host = "pay";
    let data = {
        order_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

module.exports = {
    getVipGoodList, // 会员套餐列表接口_端外
    postPayOrder: api.postPayOrder, // KKB、会员共用 充值下单接口  参数请查看pages/buykkb/api.js
    getVipOrderId, // 会员订单查询接口
    getPayContract, // 签约商品回调
    unloadReportPayInfo: api.unloadReportPayInfo, // 离开vip购买页上报，调整定价策略
    getFreeAssign, // 领取专题定向限免H5
    getFreeCalculate, // 定向限免跳转到会员开通页展示
    getChargeSuccessBanner, // 充值成功弹窗运营位_V2
};
