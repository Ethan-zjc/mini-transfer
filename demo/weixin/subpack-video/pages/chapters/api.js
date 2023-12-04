import { util_request } from '../../../util.js';

const app = getApp();
const global = app.globalData;

/**
 * ** 漫剧合集列表接口
 * **/
const getDetailList = ({ album_id = 0, chapter_id = 0, season = 0, is_season = false } = {}) => {
    let defUrl = `/mini/v1/comic/${global.channel}/comic_video/play`;
    let seasonUrl = `/mini/v1/comic/${global.channel}/comic_video/season/post_list`;
    let url = is_season ? seasonUrl : defUrl;
    let method = 'get';
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

const getChargeSuccess = ({ order_id = '' } = {}) => {
    let url = '/v1/vip/banner/charge_success_banner_v2';
    let method = 'get';
    let host = 'pay';
    let data = {
        order_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

export { getDetailList, getChargeSuccess };
