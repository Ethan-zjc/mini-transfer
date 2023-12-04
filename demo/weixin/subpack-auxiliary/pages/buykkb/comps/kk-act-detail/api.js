import { util_request } from "../../../../../util.js";

// https://yapi.quickcan.com/project/347/interface/api/4429
const getActDetail = () => {
    let url = "/v2/kb/accum_activity/detail";
    let host = "pay";
    let data = {
        from: getApp().globalData.payfrom,
    };
    return util_request({
        url,
        host,
        data,
    });
};

export { getActDetail };
