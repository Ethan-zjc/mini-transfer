import { util_request, util_getPointCharge } from "../../util.js";
const app = getApp();
const global = app.globalData;

/**   查询付费信息 接口回调
 * ** requestPayInfo method:  POST   /v2/comicbuy/comic_price_info_h5,
 * @author:zhilichao
 * wiki: https://wiki.quickcan.com/pages/viewpage.action?pageId=131009278
 * 对接后端: 付费组
 * @param(参数):   备注
 * @from          区分支付平台，小程序固定传3   页面传递
 * @topic_id      专题id    页面传递
 * @comic_id      章节id    页面传递
 * @iap_hidden    是否隐藏iap充值，true表示支持越狱   默认 false   非必填
 * @sms_hidden    是否隐藏短信支付，true表示不支持    默认 false   非必填
 * return Promise
 * **/
function requestPayInfo({ from = 3, topic_id = 10, comic_id = 0 } = {}) {
    let url = "/v2/comicbuy/comic_price_info_h5";
    let method = "post";
    let host = "pay";
    let data = {
        from,
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

/**   支付kkb 接口回调
 * ** postEncryptBuy method:  POST  /v2/comicbuy/encrypt_buy_h5
 * @author:zhilichao
 * wiki: https://wiki.quickcan.com/pages/viewpage.action?pageId=131009278
 * 对接后端: 付费组
 * @param(参数):   备注
 * @comicbuy_encrypt_str    T文本    是    111212121 漫画购买加密串
 * @auto_pay    T文本    否     true 自动购买
 * @source    T文本    是    1 来源
 * @target_id    T文本    是    1 当前漫画comic_id
 *
 *
 * cps    T文本    否
 from    T文本    否    2 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
 scene    T文本    否    1035 来源场景
 app_id    来源appId
 * return Promise
 * **/
function requestPaid({ spend_coupon_id = 0, spend_coupon_record_id = 0, comicbuy_encrypt_str = 0, auto_pay = "", source = 1, target_id = 1 } = {}) {
    let url = "/v2/comicbuy/encrypt_buy_h5";
    let method = "post";
    let host = "pay";
    let data = {
        target_id,
        comicbuy_encrypt_str,
        auto_pay,
        source,
        from: app.globalData.payfrom,
        cps: app.globalData.cps,
        app_id: app.globalData.appId, // 来源appId
        scene: app.globalData.scene, // 来源场景
    };
    if (spend_coupon_id) {
        data.spend_coupon_id = spend_coupon_id;
    }
    if (spend_coupon_record_id) {
        data.spend_coupon_record_id = spend_coupon_record_id;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**   广告（激励视频）信息查询 接口回调
 * ** postComicPayInfo method:  POST   /v2/comicbuy/pre_comic_price_h5,
 * @author:zhilichao
 * wiki: https://wiki.quickcan.com/pages/viewpage.action?pageId=131009278
 * 对接后端: 付费组
 * @param(参数):   备注
 * @from          区分支付平台，小程序固定传3    0:未记录，1:主app，2:快看club，3:微信小程序，4:QQ小程序，5:M站   页面传递
 * @topic_id      专题id   页面传递
 * @comic_id      章节id    页面传递
 *
 * return Promise
 * **/
function requestAdsInfo({ topic_id = 0, comic_id = 0, from = 3 } = {}) {
    let url = "/v2/comicbuy/pre_comic_price_h5";
    let method = "post";
    let host = "pay";
    let data = {
        from,
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
 * requestAdOk 观看广告后解锁漫画_H5/小程序    POST : /v2/comicbuy/adv/comic_auth_buy_h5
 * @author:zhilichao
 * 对接后端: 付费组->苏素飞
 * yapi: https://yapi.quickcan.com/project/317/interface/api/8508
 * @param(参数):   备注
 * topic_id       专题id  页面传递
 * comic_id       章节id  页面传递
 * business_id    业务id  广告（激励视频）信息查询获得
 * order_id       订单号   广告（激励视频）信息查询获得
 * pos_id         位置id  广告（激励视频）信息查询获得
 * attach         贴上    广告（激励视频）信息查询获得
 * sign           签名    广告（激励视频）信息查询获得
 * from           区分支付平台，小程序固定传3    0:未记录，1:主app，2:快看club，3:微信小程序，4:QQ小程序，5:M站   页面传递
 * **/
function requestAdOk({ topic_id = 0, comic_id = 0, business_id = "", order_id = "", pos_id = "", attach = "", sign = "", from = 3 } = {}) {
    let url = "/v2/comicbuy/adv/comic_auth_buy_h5";
    let method = "post";
    let host = "pay";
    // 请求的数据不存在
    if (!sign || !pos_id || !attach || !order_id || !business_id) {
        return false;
    }
    let data = {
        topic_id,
        comic_id,
        business_id,
        order_id,
        pos_id,
        attach,
        sign,
        from,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * requestGoods 漫画购买弹窗KK币余额不足时充值套餐列表    POST : /v1/pay/recharge_good/window_good
 * @author:xuling
 * 对接后端: 付费组->喻诗祥
 * yapi: https://yapi.quickcan.com/project/311/interface/api/5474
 * @param(参数):   备注
 * comic_price_list           是       漫画购买弹窗价格档位列表
 * topic_id                   是       来源专题id
 * non_iap_supported_device   否       设备是否能越狱，true表示能越狱
 * from                       否       设备来源
 * **/
function requestGoods({ comic_price_list, topic_id, from } = {}) {
    let url = "/v1/pay/recharge_good/window_good";
    let method = "get";
    let host = "pay";
    let data = {
        comic_price_list,
        topic_id,
        from,
    };

    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * getPointCharge 用户充值相关埋点        get: /v2/kb/point/charge
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/311/interface/api/4157
 * 对接后端: 汤冬冬
 * charge_time_idx    否    需要获取最近第N次付款 默认1表示最近一次
 * comic_id    否    漫画id
 * topic_id    否    专题id
 *
 * return Promise
 * **/
const getPointCharge = util_getPointCharge;

/**
 * chargeActivityAssign 购买弹窗10元充值礼包-领取专题    POST : /v2/kb/charge_activity/assign
 * @author:lina
 * 对接后端: 付费组->喻诗祥
 * yapi: https://yapi.quickcan.com/project/311/interface/api/25116
 * @param(参数):   备注
 * activity_name           是       活动名称
 * assign_encrypt_str      是       领取加密串
 * **/
function chargeActivityAssign({ assign_encrypt_str, activity_name } = {}) {
    let url = "/v2/kb/charge_activity/assign";
    let method = "post";
    let host = "pay";
    let data = {
        assign_encrypt_str,
        activity_name,
    };

    return util_request({
        url,
        method,
        host,
        data,
    });
}

// 付费聚合主接口
// 3: 微信，4:QQ，12:快手，8:百度，9:支付宝
const payMainApi = ({ source = 3, from = 3, topic_id = 10, comic_id = 0 } = {}) => {
    let url = "/v2/comicbuy/comic_pay_window_h5";
    let method = "post";
    let host = "pay";
    let data = {
        source,
        topic_id,
        comic_id,
        from: global.payfrom,
        entrance_type: 0, // 需要更换
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 充值套餐接口
const getRechargeList = () => {
    let url = "/v2/kb/recharge_good/list_h5";
    let method = "get";
    let host = "pay";
    let data = {
        from: global.payfrom,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

module.exports = {
    payMainApi,
    requestPayInfo, // 查询付费信息 接口回调
    requestPaid, // 支付kkb 接口回调
    requestAdsInfo, // 广告（激励视频）信息查询
    requestAdOk, // 观看广告后解锁漫画_H5/小程序
    requestGoods, // 漫画购买弹窗KK币余额不足时充值套餐列表
    getPointCharge, // 获取上次充值信息，用于数据上报
    chargeActivityAssign, // 购买弹窗10元充值礼包-领取专题
    getRechargeList, // 充值套餐
};
