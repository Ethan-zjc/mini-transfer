import { util_request } from "../../util.js";
const app = getApp();
const global = app.globalData;

/**
 * ** getMultiFilter 阅读历史接口-需要登录      Get:/mini/v1/comic/{channel}/read_history/list
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/406/interface/api/13326
 * 对接后端: 马雪彦
 * @param(参数):           备注
 * @channel               url 渠道配置   微信小程序/qq小程序/百度小程序/头条小程序/阿里小程序
 * @only_favourite        非必填     默认值:false false-全部漫画，true-关注的漫画
 * @more_than_one         非必填     默认值:false false-全部漫画，true-大于1话的漫画
 * @since                 必填       默认值:0 页码，-1代表没有下一页，首次传0，之后传上一次服务端接口返回的since字段值（注意：这里对于防止翻页过程中专题出现重复很重要）
 * @limit                 必填       默认值:30 页大小
 *
 *
 * return Promise
 * **/
function getReadHistory({ channel = "", only_favourite = false, more_than_one = false, since = 0, limit = 30 } = {}) {
    let url = `/mini/v1/comic/${channel}/read_history/list`;
    let method = "get";
    let host = "api";
    let data = {
        only_favourite,
        more_than_one,
        since,
        limit,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * ** getCheckForUpdate 未登录时阅读历史页获取数据接口      Get:/mini/v1/comic/{channel}/read_history/check_for_update
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/406/interface/api/13620
 * 对接后端: 王学惠
 * @param(参数):           备注
 * @channel               url 渠道配置   微信小程序/qq小程序/百度小程序/头条小程序/阿里小程序
 * @topic_ids                是必填项         topic_ids=2,3,4要查询的专题id，用逗号隔开
 *
 *
 * return Promise
 * **/
function getCheckForUpdate({ channel = "", topic_ids = "" } = {}) {
    let url = `/mini/v1/comic/${channel}/read_history/check_for_update`;
    let method = "get";
    let host = "api";
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

/**
 * ** getFavouriteList 我的关注接口-需要登录      Get:/mini/v1/comic/{channel}/favourite/topic_list
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/406/interface/api/13338
 * 对接后端: 马雪彦
 * @param(参数):           备注
 * @channel               url 渠道配置       微信小程序/qq小程序/百度小程序/头条小程序/阿里小程序
 * @order_type              是必填项,默认:1     1-最近更新,2-最近关注
 * @since                 必填       默认值:0 页码，-1代表没有下一页，首次传0，之后传上一次服务端接口返回的since字段值（注意：这里对于防止翻页过程中专题出现重复很重要）
 * @limit                 必填       默认值:20 页大小
 *
 * return Promise
 * **/
function getFavouriteList({ channel = "", order_type = 1, since = 0, limit = 20 } = {}) {
    let url = `/mini/v1/comic/${channel}/favourite/topic_list`;
    let method = "get";
    let host = "api";
    let data = {
        order_type,
        since,
        limit,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * 我的页面获取文案接口
 * yapi: https://yapi.quickcan.com/project/385/interface/api/17136
 */
function getGreenHandTips({ channel = "" } = {}) {
    return util_request({
        url: `/v1/checkin/api/mini/${channel}/benefit/my_page`,
        method: "get",
        data: {},
    });
}

/**
 * ** getSignList 获取签到奖励列表      Get:/v1/checkin/mini/checkin/{channel}/record
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/812/interface/api/30738
 * 对接后端: 李迎晗
 * @param(参数):           备注
 * @channel               url 渠道配置       微信小程序/qq小程序/百度小程序/头条小程序/阿里小程序
 *
 * return Promise
 * **/
// function getSignList(channel) {
//     let url = `/v1/checkin/mini/checkin/${channel}/record`;
//     let method = "get";
//     let host = "api";
//     return util_request({
//         url,
//         method,
//         host
//     });
// };

/**
 * ** toSignIn 签到接口-需要登录      Post:/v1/checkin/mini/checkin/{channel}/checkin
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/812/interface/api/30696
 * 对接后端: 李迎晗
 * @param(参数):           备注
 * @channel               url 渠道配置       微信小程序/qq小程序/百度小程序/头条小程序/阿里小程序
 *
 * return Promise
 * **/
// function toSignIn(channel) {
//     let url = `/v1/checkin/mini/checkin/${channel}/checkin`;
//     let method = "post";
//     let host = "api";
//     return util_request({
//         url,
//         method,
//         host
//     });
// };

/**
 * ** 小程序发代金券主页与弹窗
 * ** getSignInfo method:  POST /v1/payactivity/rp_mini/sign_info,
 * @author:zhilichao
 * wiki: https://yapi.quickcan.com/project/347/interface/api/40178
 * 对接后端: 付费组|张鑫
 * @param activity_name  活动名称,非必填参数
 * @param pool_name      专题名称,非必填参数
 * @param topic_id       专题id,非必填参数
 * return Promise
 * **/
function getSignInfo() {
    let url = "/v1/payactivity/rp_mini/sign_info";
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

function getVideoHistory({ page = 0, limit = 20 } = {}) {
    const url = `/mini/v1/comic/${global.channel}/comic_video/history/list`;
    const method = "get";
    const data = {
        page,
        limit,
    };

    return util_request({
        url,
        method,
        data,
    });
}

function getVideoFollow({ page = 1, limit = 20 } = {}) {
    const url = `/mini/v1/comic/${global.channel}/comic_video/follow_list`;
    const method = "get";
    const data = {
        page,
        limit,
    };
    return util_request({
        url,
        method,
        data,
    });
}

module.exports = {
    getReadHistory, // 阅读历史接口-需要登录
    getCheckForUpdate, // 未登录时阅读历史页获取数据接口(未登录存储浏览历史)
    getFavouriteList, // 我的关注接口-需要登录
    getGreenHandTips, // 新手福利文案接口
    // getSignList, // 签到奖励列表接口
    // toSignIn // 签到接口-需要登录
    getSignInfo,
    getVideoHistory,
    getVideoFollow,
};
