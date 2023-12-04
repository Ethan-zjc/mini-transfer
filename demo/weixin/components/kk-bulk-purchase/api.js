import { util_request } from "../../util.js";
const app = getApp();

/**
 * postComicPay 付费弹窗(查询一键购买信息【专题、漫画详情】)
 * @author: zhilichao
 * yapi: https://yapi.quickcan.com/project/317/interface/api/56990
 * @param source {str/num} 来源
 * @param topic_id {str/num} 专题id
 * @param entrance_type {str/num} 入口类型，0：漫画章节批量购买（默认） 1：专题批量购买；
 * @param index {str/num} 来源 代表第几季，0:代表整本，只有在入口类型为1(专题批量购买)的时候才会用该参数
 * @param from {str/num} 哪个端，1:端内，2:快看漫画club，3:微信小程序，4:QQ小程序，5:M站
 *
 * @return Promise
 * **/
function postComicPay({ topic_id = 0 } = {}) {
    let url = "/v2/comicbuy/comic_pay_window_h5";
    let method = "post";
    let host = "pay";
    let data = {
        topic_id, // 专题id
        entrance_type: 1,
        source: 3,
        from: app.globalData.payfrom,
        cps: app.globalData.cps,
        index: 0,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**   支付kkb 接口回调
 * ** psotBuyComic method:  POST  /v2/comicbuy/encrypt_buy_h5
 * @author: zhilichao
 * yapi: https://yapi.quickcan.com/project/317/interface/api/5843
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
 * @return Promise
 * **/
function psotBuyComic({ spend_coupon_id = 0, spend_coupon_record_id = 0, comicbuy_encrypt_str = 0, target_id = 1 } = {}) {
    let url = "/v2/comicbuy/encrypt_buy_h5";
    let method = "post";
    let host = "pay";
    let data = {
        target_id,
        comicbuy_encrypt_str,
        auto_pay: false,
        source: app.globalData.payfrom,
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

/**
 * getComicId 专题续读(根据专题查询最近阅读章节)
 * @author: zhilichao
 * yapi: https://yapi.quickcan.com/project/317/interface/api/13218
 * 对接后端: 付费组
 * 参数:
 * @param topic_ids {str/num} 查询专题的续读(专题数量不能超过50)
 *
 * @return Promise
 * **/
function getComicId({ topic_ids = "" } = {}) {
    let url = "/v2/comicbuy/read/get_comic_ids";
    let method = "get";
    let host = "pay";
    let data = {
        topic_ids,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}
export { postComicPay, psotBuyComic, getComicId };
