import { util_request } from "../../../util.js";

const app = getApp();
const global = app.globalData;

/**
 * ** 漫剧关注相关接口
 * yapi: https://yapi.quickcan.com/project/406/interface/api/125588
 * **/
const updateFollowStatus = ({ id = 0, status = false } = {}) => {
    let url = `/mini/v1/comic/{channel}/comic_video/${status ? "unfollow" : "follow"}`;
    let method = "post";
    let data = {
        compilation_id: id,
    };
    return util_request({
        url,
        method,
        data,
    });
};

// 观看上报
const postPlayReport = ({ chapter_id = 0, album_id = 0, video_id = 0, ended = false, milli = 1000 } = {}) => {
    let url = "/v1/graph/shortvideo/play_data";
    let method = "post";
    let data = {
        compilationId: album_id,
        postPid: chapter_id,
        videoId: video_id,
        playedMilli: milli,
        ended,
    };
    return util_request({
        url,
        method,
        data,
        json: true,
    });
};

const getDetailList = ({ album_id = 0, chapter_id = 0, season = 0, is_season = false } = {}) => {
    let defUrl = `/mini/v1/comic/${global.channel}/comic_video/play`;
    let seasonUrl = `/mini/v1/comic/${global.channel}/comic_video/season/post_list`;
    let url = is_season ? seasonUrl : defUrl;
    let method = "get";
    let data = {
        compilation_id: album_id,
    };
    if (is_season) {
        Object.assign(data, {
            season,
        });
    } else {
        Object.assign(data, {
            post_id: chapter_id,
        });
    }
    return util_request({
        url,
        method,
        data,
    });
};

export { updateFollowStatus, postPlayReport, getDetailList };
