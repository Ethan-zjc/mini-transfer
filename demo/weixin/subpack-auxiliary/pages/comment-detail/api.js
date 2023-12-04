import { util_request } from "../../../util.js";

/**
 * 获取漫评详情
 * https://yapi.quickcan.com/project/702/interface/api/29478
 */
const getCommentDetail = ({ commentId = "", since = 0, limit = 20, page = 0 } = {}) => {
    return util_request({
        url: "/v2/comments/cruel/floor_detail",
        data: {
            since,
            limit,
            direction: !page ? 0 : 1,
            comment_id: commentId,
        },
    });
};

module.exports = {
    getCommentDetail,
};
