import { util_request } from "../../util.js";

// https://yapi.quickcan.com/project/812/interface/api/56360
const getNewWelfareApi = () => {
    let url = `/v1/checkin/api/mini/${getApp().globalData.channel}/benefit/pop`;
    let host = "api";
    let data = {};
    return util_request({
        url,
        host,
        data,
    });
};

export { getNewWelfareApi };
