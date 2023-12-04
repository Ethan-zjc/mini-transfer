import { util_request } from "../../util.js";

// https://yapi.quickcan.com/project/438/interface/api/56351
const getBookBannerApi = () => {
    let url = `/v1/business/mini/${getApp().globalData.channel}/operation/bookshelf/get`;
    let host = "api";
    let data = {};
    return util_request({
        url,
        host,
        data,
    });
};

export { getBookBannerApi };
