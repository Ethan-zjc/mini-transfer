import { util_request } from "../../../util.js";

/**
 * 获取漫底列表
 * https://yapi.quickcan.com/project/702/interface/api/29466
 */
const getBaseCommentList = ({ comicId = "", from = "" } = {}) => {
    return util_request({
        url: "/v2/comments/cruel/hot_floor_list",
        data: {
            target_type: "comic",
            target_id: comicId,
        },
    });
};

/**
 * 获取漫评列表最新/最热
 * https://yapi.quickcan.com/project/702/interface/api/29472
 */
const getCommentList = ({ comicId = "", order = "score", offset = 0, limit = 20 } = {}) => {
    return util_request({
        url: "/v2/comments/cruel/floor_list",
        data: {
            order,
            limit,
            offset,
            source: 0,
            total: true,
            target_type: "comic",
            target_id: comicId,
        },
    });
};

module.exports = {
    getCommentList,
    getBaseCommentList,
};
