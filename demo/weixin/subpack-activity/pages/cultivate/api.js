import { util_request } from "../../../util.js";

const app = getApp();
const global = app.globalData;

// 主接口，https://yapi.quickcan.com/project/347/interface/api/101779
const getHomePage = ({ activity_name = "" } = {}) => {
    let url = `/v1/payactivity/develop/activity/home_page`;
    let method = "get";
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

// 加料接口 https://yapi.quickcan.com/project/347/interface/api/101815
const postUpgrade = ({ activity_name = "" } = {}) => {
    let url = `/v1/payactivity/develop/activity/upgrade`;
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

// 获取任务列表 https://yapi.quickcan.com/project/347/interface/api/101785
const getTaskList = ({ activity_id = "" } = {}) => {
    let url = `/v1/applet/task/list`;
    let method = "get";
    let host = "api";
    let data = {
        activity_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

export { getHomePage, postUpgrade, getTaskList };
