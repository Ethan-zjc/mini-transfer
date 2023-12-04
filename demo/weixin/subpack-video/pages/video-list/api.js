import { util_request } from "../../../util.js";
const app = getApp();
const global = app.globalData;

function getVideoList({ module_id = 0, since = 0, limit = 20 } = {}) {
    const url = `/mini/v1/comic/${global.channel}/discovery/comic_video/module_more`;
    const method = "get";
    const data = {
        module_id,
        since,
        limit,
    };
    return util_request({
        url,
        method,
        data,
    });
}

module.exports = {
    getVideoList,
};
