import { util_request, util_getPointCharge } from "../../util.js";

const app = getApp();

/**
 * ** getVipGood 会员套餐详情接口      Get:/v1/vip/member_good/detail
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/341/interface/api/5726
 * 对接后端: 袁鑫 (付费)
 * @param(参数):             是否必填     备注:
 * @third_activity             非必填参数   例如:comicbuy_rebate_201903  半屏弹窗活动参数
 * @code                       非必填参数   微信登录校验code
 * @origin_url                 非必填参数      来源url
 *
 * return Promise
 * **/
function getGoodsApi({ good_id = "", third_activity = "", good_type = 2 } = {}) {
    let url = good_type == 2 ? "/v1/vip/member_good/detail" : "/v1/pay/recharge_good/detail";
    let method = "get";
    let host = "pay";
    let data = {};
    if (good_id) {
        data.good_id = good_id;
    }
    if (third_activity && good_type == 2) {
        data.third_activity = third_activity;
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
function getOrderIdApi({ order_id = "", good_type = 2 } = {}) {
    let url = good_type == 2 ? "/v1/pay/pay_order/query/detail_order_id_member" : "/v1/pay/pay_order/query/detail_order_id_recharge";
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

function postPayOrder({
    pay_type = "2",
    pay_source = "1",
    good_type = "1",
    good_id = "",
    pay_info = {},
    cps = app.globalData.cps,
    from = "3",
    open_id = "", // 开放id 待确认 (open_id/platform)  借口调不通
    platform = app.globalData.isiOS ? 2 : 1,
    app_id = app.globalData.appId, // 来源appId
    scene = app.globalData.scene, // 来源场景
    gdtVid = app.globalData.gdtVid, // 微信上报click_id
    channel = app.globalData.channel, // 平台来源
} = {}) {
    let url = "/v1/pay/pay_order/add_h5";
    let method = "post";
    let host = "pay";
    if (typeof pay_info == "object") {
        // 转换为json
        pay_info = JSON.stringify(pay_info);
    }
    let data = {
        pay_type,
        pay_source,
        good_type,
        good_id,
        pay_info,
        from,
        platform: platform,
        open_id, // 开放id
        app_id,
        cps,
        scene,
    };

    // 微信接入api上报click_id
    if (channel == "wechat" && !!gdtVid) {
        data.click_id = gdtVid;
    }

    return util_request({
        url,
        method,
        host,
        data,
    });
}

function unloadReportPayInfo({ type = "kkb" } = {}) {
    let url = "/v1/fox/behavior/add";
    let method = "post";
    let host = "pay";
    let data = {};
    if (type == "kkb") {
        data.exit_open_kkb = 1;
    } else if (type == "vip") {
        data.exit_open_vip = 1;
    }

    return util_request({
        url,
        method,
        host,
        data,
    });
}

module.exports = {
    getGoodsApi, // 根据商品id，获取商品信息
    getOrderIdApi, // 订单查询接口
    getPayContract, // 签约商品回调
    postPayOrder, // KKB、会员共用 充值下单接口  参数请查看pages/buykkb/api.js
    unloadReportPayInfo, // 离开vip购买页上报，调整定价策略
    getPointCharge: util_getPointCharge, // 充值相关埋点
};
