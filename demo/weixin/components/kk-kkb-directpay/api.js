import { util_request, util_getPointCharge } from "../../util.js";
const app = getApp();

/**
 * ** getKkbProduct 根据id获取kk币详细信息      Get:/v1/pay/recharge_good/detail
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/311/interface/api/32130
 * 对接后端: 喻诗祥 / 袁鑫 (付费)
 * @param(参数):             是否必填     备注:
 * @good_id                     是否必填      商品id
 * @from                     非必填参数      设备来源
 *
 * return Promise
 * **/
function getKkbProduct({ good_id = "", from = 3 } = {}) {
    let url = "/v1/pay/recharge_good/detail";
    let method = "get";
    let host = "pay";
    let data = {
        from,
    };
    if (good_id) {
        data.good_id = good_id;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/*
 app.globalData.appId
 scene: 0,               // 场景值，每次App.onShow()更新，https://developers.weixin.qq.com/miniprogram/dev/reference/scene-list.html
 appId: '',              // 部分场景值下还可以获取来源应用、公众号或小程序的appId，https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/scene.html
 cps: '',
 */

/**
 * ** postPayOrder 下单_端外      Get:/v1/pay/pay_order/add_h5
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/382/interface/api/14286
 * 对接后端: 袁鑫 (付费)
 * @param(参数):             是否必填     备注:
 * @pay_type                   是             1:支付宝   2:微信支付3:QQ支付4:APPLE PAY
 * @pay_source                   是             1:我的钱包  2:活动页
 * @good_type                     是             1:充值业务 2:会员充值业务
 * @good_id                       是          商品id
 * @pay_info                 是          '{}' comic_id:漫画id topic_id:专题id source_type说明：1：签到，2：皇冠，3：作品，4：礼包  invite_code：邀请码  coupon_id:优惠券id third_activity:其他活动信息
 assign_info:开通会员赠送福利信息(透传参数)   sign:验签  request_id:member_good接口返回 vip_source:会员下单运营位来源
 * @cps                        否
 * @from                        否    1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
 * @open_id                      否  微信小程序用户的那个open_id，微信支付支付时需要传入。
 * @platform                    是    1：安卓，2：IOS
 *
 * return Promise
 * **/
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

/**
 * * getKkbOrderId kk币订单查询接口   get: /v1/pay/pay_order/query/detail_order_id_recharge
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/382/interface/api/4211
 * 对接后端: 喻诗祥 / 袁鑫 (付费)
 * @param(参数):             是否必填     备注
 * @order_id                否          kkb订单号
 *
 * return Promise
 * **/
function getKkbOrderId({ order_id = "" } = {}) {
    let url = "/v1/pay/pay_order/query/detail_order_id_recharge";
    let method = "get";
    let host = "pay";
    let data = {
        order_id, // kkb订单id
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * getPayTopicList 请求付费漫画推荐       get: /v2/comicbuy/topic/recommend
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/317/interface/api/14226
 * 对接后端: 袁鑫 (付费)
 * @param(参数):             是否必填     备注
 * @无
 *
 * return Promise
 * **/
function getPayTopicList() {
    let url = "/v2/comicbuy/topic/recommend";
    let method = "get";
    let host = "pay";
    let data = {};
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * getChargeBanner kk币充值中心运营位       get: /v2/kb/banner/recharge
 * @author:xuling
 * yapi: https://yapi.quickcan.com/project/311/interface/api/4262
 * 对接后端: 汤冬冬 (付费)
 * @param(参数):                是否必填     备注
 * @non_iap_supported_device   否          是否是越狱设备，true表示是，4.2版本添加
 * @topic_id                   否          专题id
 * @source_type                否          0普通，1彩蛋卡
 * @from                       否          访问来源 1端内 2公众号 3微信小程序 4qq小程序 5M站 6分销订单 7支付SDK
 *
 * return Promise
 * **/
function getChargeBanner({ topic_id = "", from = "" } = {}) {
    let url = "/v2/kb/banner/recharge";
    let method = "get";
    let host = "pay";
    let data = {
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
 * unloadReportPayInfo kk币充值中心运营位       post: /v1/fox/behavior/delay_add_h5
 * @author:zhangjinchao
 * yapi: https://yapi.quickcan.com/project/329/interface/api/8532
 * 对接后端: 袁鑫 (付费)
 * @param(参数):                是否必填     备注
 * @exit_open_vip                 否      退出会员开通页 （打开会员半屏页时请求）
 * @exit_open_kkb                 否      退出充值中心页（打开kkb充值半屏页时请求）
 *
 * return Promise
 * **/
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

module.exports = {
    getKkbProduct, // 获取kk币充值套餐列表—端外
    postPayOrder, // 下单_端外
    getKkbOrderId, // kk币订单查询接口
    getPayTopicList, // 请求付费漫画推荐
    getChargeBanner, // kk币充值中心运营位
    unloadReportPayInfo, // 离开kk币充值页上报，调整定价策略
    getPointCharge, // 用户充值相关埋点
};
