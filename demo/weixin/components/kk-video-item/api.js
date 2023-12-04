import { util_request } from "../../util.js";
const app = getApp();
const golbal = app.globalData;
function followHandler(type, id) {
    const url = `/mini/v1/comic/${golbal.channel}/comic_video/${type ? "un" : ""}follow`;
    const method = "post";
    const data = {
        compilation_id: id,
    };

    return util_request({ url, method, data });
}

module.exports = {
    followHandler,
};
