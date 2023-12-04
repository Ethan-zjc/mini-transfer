import { util_request } from "../../util.js";

/**
 * ** 漫画页—弹窗发券&挽留弹窗接口
 * ** getPopupsActivityInfo method:  Get   /v1/vip/vip_coupon/popups_activity_info,
 * @author:zhilichao
 * wiki: https://yapi.quickcan.com/project/329/interface/api/4189
 * 对接后端: 小程序对接服务端(张鑫)
 * @param topic_id {{number}} 专题id   非必填
 * @param comic_id {{number}} 漫画id   非必填
 * @param non_iap_supported {{ bool }} 是否越狱   非必填(默认false)
 * @param launch_type {{number}}  投放类型, 0是漫画详情页 1是会员开通页  必填
 * @param retain_source {{number}} 挽留来源，0是普通类型，1是定向限免(5.69及以后版本弃用) 非必填
 * @param popups_source {{number}} 弹窗来源，1普通付费弹窗，2会员限免弹窗，3会员专享提前看弹窗，4会员专享固定锁住弹窗，5广告前置弹窗，6定向限免前置弹窗  非必填
 * return Promise
 * **/
function getPopupsActivityInfo({ topic_id = 0, comic_id = 0, non_iap_supported = false, launch_type = 0, retain_source = 0, popups_source = 0 } = {}) {
    let url = "/v1/vip/vip_coupon/popups_activity_info";
    let method = "get";
    let host = "pay";
    let data = {
        non_iap_supported, // ??
        launch_type,
        retain_source,
    };
    if (topic_id) {
        data.topic_id = topic_id;
    }
    if (comic_id) {
        data.comic_id = comic_id;
    }
    if (popups_source) {
        data.popups_source = popups_source == 7 ? 6 : popups_source;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * ** 弹窗发券
 * ** getPopupsAssign method:  Get   /v1/vip/vip_coupon/popups_assign,
 * @author:zhilichao
 * wiki: https://yapi.quickcan.com/project/329/interface/api/4190
 * 对接后端: 小程序对接服务端(张鑫)
 * @param coupon_id {{num/str}} 不传则领取活动所有优惠券 非必填
 * @param activity_id {{string}} 活动ID 是
 * @param topic_id {{number}} 专题id   非必填
 * @param comic_id {{number}} 漫画id   非必填
 * @param non_iap_supported {{ bool }} 是否越狱   非必填(默认false)
 * @param launch_type {{number}}  投放类型, 0是漫画详情页 1是会员开通页  必填
 * @param retain_source {{number}} 挽留来源，0是普通类型，1是定向限免(5.69及以后版本弃用) 非必填
 * return Promise
 * **/
function getPopupsAssign({ coupon_id = "", activity_id = "", topic_id = 0, comic_id = 0, non_iap_supported = false, launch_type = 0, retain_source = 0 } = {}) {
    let url = "/v1/vip/vip_coupon/popups_assign";
    let method = "get";
    let host = "pay";
    let data = {
        activity_id,
        non_iap_supported,
        launch_type,
        retain_source,
    };
    if (coupon_id) {
        data.coupon_id = coupon_id;
    }
    if (topic_id) {
        data.topic_id = topic_id;
    }
    if (comic_id) {
        data.comic_id = comic_id;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * ** 领取代金券(普通挽留弹窗)
 * ** getKkbAssign method:  Get   /v2/kb/rp/assign,
 * @author:zhilichao
 * wiki: https://yapi.quickcan.com/project/311/interface/api/4506
 * 对接后端: 小程序对接服务端(张鑫)
 * @param activity_id(id) {{string}} 活动ID 是
 * @param topic_id {{number}} 专题id   是
 * @param topic_desc {{number}} 专题描述   非必填
 * @param assign_type {{ bool }} 未知   非必填(默认false)
 * return Promise
 * **/
function getKkbAssign({ activity_id = "", topic_id = 0, topic_desc = "", assign_type = "" } = {}) {
    let url = "/v2/kb/rp/assign";
    let method = "post";
    let host = "pay";
    let data = {
        activity_id,
        topic_id,
    };
    if (topic_desc) {
        data.topic_desc = topic_desc;
    }
    if (assign_type) {
        data.assign_type = assign_type;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
}

export { getPopupsActivityInfo, getPopupsAssign, getKkbAssign };
