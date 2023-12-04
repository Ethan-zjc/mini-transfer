import { util_request } from "../../util.js";

const app = getApp();
const global = app.globalData;

const getHomePage = ({ gender = 0, cold_boot = 1, ad_topic_id = "", page = 1, count = 4, location = 2 } = {}) => {
    let url = `/mini/v1/comic/${global.channel}/discovery/list`;
    let method = "get";
    let host = "api";
    let data = {
        gender,
        cold_boot,
        ad_topic_id,
        location,
        page,
        count,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

const getModuleChange = ({ module_id = 0, filter_ids = [], card_type = 0, gender = 0, subtitle = "" } = {}) => {
    let url = `/mini/v1/comic/${global.channel}/discovery/module_change`;
    let method = "get";
    let host = "api";
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
};

export { getHomePage, getModuleChange };
