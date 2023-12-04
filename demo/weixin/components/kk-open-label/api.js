import { util_request } from "../../util.js";

// https://yapi.quickcan.com/project/742/interface/api/32892
const getOpenLabelApi = () => {
    let url = `/v1/ironman/mini/${getApp().globalData.channel}/user_label/list`;
    let method = "get";
    let host = "api";
    return util_request({
        url,
        method,
        host,
    });
};

export { getOpenLabelApi };
