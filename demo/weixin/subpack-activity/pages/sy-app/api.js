import { util_request } from "../../../util.js";

export const getPageInfo = ({ id }) => {
    const url = "/v1/miniactivity/param/config/search";
    const data = {
        id,
    };

    return util_request({
        url,
        method: "get",
        host: "api",
        data,
    });
};

module.exports = {
    getPageInfo,
};
