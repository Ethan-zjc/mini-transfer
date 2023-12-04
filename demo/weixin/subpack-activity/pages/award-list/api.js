import { util_request } from "../../../util.js";

const app = getApp();
const global = app.globalData;

export const getRecordApi = ({ activity_name = "" } = {}) => {
    const url = "/v1/payactivity/lottery/common_award_list";
    let method = "get";
    let host = "pay";
    let data = {
        activity_name,
        sort: "award_time:desc",
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

export const getRedeemCodeApi = (activity_name, order_id) => {
    const url = `/v1/payactivity/lottery/redeem_code`;
    let method = "get";
    let host = "pay";
    let data = {
        activity_name,
        order_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};
