import { util_request } from "../../util.js";

// 主接口，https://yapi.quickcan.com/project/1358/interface/api/96811
const getHomePage = ({ page = 1 } = {}) => {
    let url = `/v1/applet/activity/center/get`;
    let method = "get";
    let host = "api";
    let data = {
        page,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

export { getHomePage };
