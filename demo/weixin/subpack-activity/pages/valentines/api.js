import { util_request } from "../../../util.js";

// 主接口，https://yapi.quickcan.com/project/347/interface/api/94710
const getHomePage = ({ activity_name = "" } = {}) => {
    let url = `/v1/payactivity/mini/task_lottery/home_page`;
    let method = "post";
    let host = "pay";
    let data = {
        activity_name,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

/* 抽奖接口
 * 登录: https://yapi.quickcan.com/project/347/interface/api/13716
 * 未登录：https://yapi.quickcan.com/project/347/interface/api/94717
 */
const postLotteryStart = ({ activity_name = "" } = {}) => {
    let method = "post";
    let host = "pay";
    let data = {
        activity_name,
    };
    let url = "/v1/payactivity/lottery/start";
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 领奖接口 https://yapi.quickcan.com/project/347/interface/api/51619
const postAssign = ({ activity_name = "", award_name = "" } = {}) => {
    let url = `/v1/payactivity/mini/task_lottery/free_assign`;
    let method = "post";
    let host = "pay";
    let data = {
        activity_name,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 添加抽奖次数 https://yapi.quickcan.com/project/347/interface/api/94745
const postAddBalance = ({ activity_name = "" } = {}) => {
    let url = `/v1/payactivity/mini/task_lottery/add_lottery_balance`;
    let method = "post";
    let host = "pay";
    let data = {
        activity_name,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 减少抽奖次数 https://yapi.quickcan.com/project/347/interface/api/100033
const postReduceBalance = ({ activity_name = "" } = {}) => {
    let url = `/v1/payactivity/mini/task_lottery/deduction_balance`;
    let method = "post";
    let host = "pay";
    let data = {
        activity_name,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 中奖记录 https://yapi.quickcan.com/project/347/interface/api/4044
const getAwardList = ({ activity_name = "" } = {}) => {
    let url = `/v1/payactivity/lottery/award_list`;
    let method = "get";
    let host = "pay";
    let data = {
        activity_name,
        sub_activity_name: "",
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

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

export { getHomePage, getAwardList, postAddBalance, postAssign, postLotteryStart, getSignInfo, postReduceBalance };
