import { util_request } from "../../util.js";
const app = getApp();
const global = app.globalData;

/**
 * ** 新手福利、领取代金券倒计时 接口回调
 * ** getNewBenefitCountdown method:  POST   /v1/payactivity/new_user_benefit/benefit_countdown,
 * @author:zhilichao
 * wiki: https://yapi.quickcan.com/project/347/interface/api/44108
 * 对接后端: 付费组|苏素飞
 * @param(参数):   无
 * return Promise
 * **/
function getNewBenefitCountdown() {
    let url = "/v1/payactivity/new_user_benefit/benefit_countdown";
    let method = "get";
    let host = "pay";
    let data = {
        order_from: global.payfrom || 3,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });

    // return new Promise((resolve) => {
    //     setTimeout(() => {
    //       resolve({
    //         "code": 200,
    //         "data": {
    //           "time_remaining": 1000 * 60 * 35, // 1000 * 60 * 60 * 23, // 1000 * 60 * 60 * 24 * 1.5 // 1000 * 60 * 60 * 24 // 1000 * 60 * 60 * 24 * 2 + 1000 * 60 * 60 * 3 + 1000 * 60 * 15 + 1000 * 18,
    //           "assign_rp_times": 2,
    //           "rp_activity_rule": "1\n2\n3\n4",
    //           "rp_activity_url": "https://m.kuaikanmanhua.com/"
    //         },
    //         "message": "ok"
    //       })
    //     }, 1000);
    // })
}

/**
 * ** 小程序发代金券主页与弹窗
 * ** getSignInfo method:  POST /v1/payactivity/rp_mini/sign_info,
 * @author:zhilichao
 * wiki: https://yapi.quickcan.com/project/347/interface/api/40178
 * 对接后端: 付费组|张鑫
 * @param activity_name  活动名称,必填参数
 * @param pool_name      专题名称,必填参数
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

export { getNewBenefitCountdown, getSignInfo };
