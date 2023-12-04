import { util_request } from "../../util.js";

/**
 * ** getDiscoveryList 通用发现页接口      Get:/mini/v1/comic/{channel}/discovery/list
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/406/interface/api/13272
 * 对接后端: 曾礼
 * @param(参数):   备注
 * @channel          是必填项,默认:wechat    使用渠道channel有wechat、qq两种(url拼接)
 * @gender          是必填项,默认:0         用户性别 0-女性 1-男性 3-中性
 * @cold_boot      是必填项是,默认:1       是否冷启动 ，0：非冷启动，1 ：冷启动
 *
 * return Promise
 * **/

function getDiscoveryList({ channel = "wechat", gender = 0, cold_boot = 1, ad_topic_id = "", page = 0, count = 4 } = {}) {
    let url = `/mini/v1/comic/${channel}/discovery/list`;
    let method = "get";
    let host = "api"; // 'api', 'search', 'pay'
    let data = {
        gender,
        cold_boot,
        ad_topic_id,
    };
    if (page && page > 0 && count > 0) {
        data.page = page;
        data.count = count;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * ** getDiscoveryModuleChange 通用发现页换一换接口      Get:/mini/v1/comic/{channel}/discovery/module_change
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/406/interface/api/13320
 * 对接后端: 曾礼
 * @param(参数):        备注
 * @channel               是必填项,默认:wechat    使用渠道channel有wechat、qq两种(url拼接)
 * @module_id           是必填项,默认:0         当前模块id
 * @filter_ids         是必填项,默认:[]        需要过滤的id
 * @card_type           是必填项,默认:0         模块推荐类型，透传发现页接口对应模块返回的card_type字段值
 * @gender               是必填项,默认:0         点前用户性别 0-女性 1-男性 3-中性
 *
 * return Promise
 * **/
function getDiscoveryModuleChange({ channel = "wechat", module_id = 0, filter_ids = [], card_type = 0, gender = 0, subtitle = "" } = {}) {
    let url = `/mini/v1/comic/${channel}/discovery/module_change`;
    let method = "get";
    let host = "api"; // 'api', 'search', 'pay'
    let data = {
        module_id,
        filter_ids,
        card_type,
        gender,
        subtitle,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * ** getUserLabel 小程序新用户选标签      Get:/v1/ironman/mini/{channel}/user_label/list
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/742/interface/api/32892
 * 对接后端: 学惠
 * @param(参数):   备注
 * @channel          是必填项,默认:wechat    使用渠道channel有wechat、qq、baidu三种(url拼接)
 *
 * return Promise
 * **/
function getUserLabel({ channel = "wechat" } = {}) {
    let url = `/v1/ironman/mini/${channel}/user_label/list`;
    let method = "get";
    let host = "api"; // 'api', 'search', 'pay'
    return util_request({
        url,
        method,
        host,
    });
}

/**
 * ** getTopicFree 小程序发现页-限免主页     Get:/v1/payactivity/topic_free/discover_page_topic
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/347/interface/api/41548
 * 对接后端: 苏素飞
 * @param(参数):       备注
 * @activity_name      是必填项,活动唯一标识
 * @pool_names          是必填项,专题池标识，多个逗号分隔
 *
 * return Promise
 * **/
function getTopicFree() {
    let url = `/v1/payactivity/topic_free_mini/discover_page_topic`;
    let method = "get";
    let host = "pay";
    let data = {
        activity_name: "totalfree",
        pool_name: "totalfreelist",
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * ** limitFreeAssign 活动作品限免领取     post:/v1/payactivity/topic_free/assign_topic
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/347/interface/api/39318
 * 对接后端: 苏素飞
 * @param(参数):        备注
 * @assign_encrypt_str 是必填项,领取加密串
 * @order_from           是必填项,来源0    未记录 1    端内 2    快看club  3    微信小程序  4    qq小程序  5    m站  6    分销订单  7    支付sdk 8 百度小程序
 *
 * return Promise
 * **/
function limitFreeAssign({ assign_encrypt_str = "", order_from = 3 } = {}) {
    let url = `/v1/payactivity/topic_free_mini/assign_topic`;
    let method = "post";
    let host = "pay";
    let data = {
        assign_encrypt_str,
        order_from,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * ** getContinueComic 专题续读(根据专题查询最近阅读章节)     get:/v2/comicbuy/read/get_comic_ids
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/317/interface/api/13218
 * 对接后端: 汤冬冬
 * @param(参数):        备注
 * @topic_ids          是必填项,查询专题的续读1,2,3(专题数量不能超过50)
 *
 * return Promise
 * **/
const getContinueComic = ({ topicId = "" } = {}) => {
    let url = "/v2/comicbuy/read/get_comic_ids";
    let method = "get";
    let host = "pay";
    let data = {
        topic_ids: topicId,
    };

    return util_request({
        url,
        method,
        host,
        data,
    });
};

/**
 * ** 订阅弹窗接口
 * yapi: https://yapi.quickcan.com/project/406/interface/api/56486
 * **/
const getMessagePop = ({ channel = "wechat" } = {}) => {
    let url = `/mini/v1/comic/${channel}/comic_message/pop`;
    let method = "get";
    return util_request({
        url,
        method,
    });
};

module.exports = {
    getMessagePop, // 发现页订阅弹窗接口
    getDiscoveryList, // 通用发现页接口
    getDiscoveryModuleChange, // 通用发现页换一换接口
    getUserLabel, // 小程序新用户选标签
    getTopicFree, // 发现页限免模块数据
    limitFreeAssign, // 活动作品限免领取
    getContinueComic, // 根据专题查询最近阅读章节
};
