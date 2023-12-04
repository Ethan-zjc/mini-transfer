import { global, request } from "../common/subapp";

/**
 * getPostDataApi 获取帖子详情
 * @author:zhangjinchao
 * yapi: https://yapi.quickcan.com/project/11/interface/api/36662
 * 后端: 杨依潇
 */
const getPostDataApi = ({ postId = "" } = {}) => {
    let url = `/v1/graph/mini/posts/${postId}`;
    let method = "get";
    let host = "social";
    let data = {};
    return request({
        url,
        method,
        host,
        data,
    });
};

/**
 * getPostMoreApi 猜你想看
 * @author:zhangjinchao
 * yapi: https://yapi.quickcan.com/project/11/interface/api/36666
 * 后端: 杨依潇
 */
const getPostMoreApi = ({ postId = "", since = 0 } = {}) => {
    let url = "/v1/graph/mini/posts/afterReadPost";
    let method = "get";
    let host = "social";
    let data = {
        postId,
        since,
    };
    return request({
        url,
        method,
        host,
        data,
    });
};

/**
 * 帖子点赞
 *
 */

const postPraiseApi = ({ postId = "", isRemove = false } = {}) => {
    let url = `/v1/graph/mini/posts/${postId}/fav/safe`;
    let method = "post";
    let host = "social";
    let data = {
        isRemove,
    };
    return request({
        url,
        method,
        host,
        data,
        // sign: true
    });
};

/**
 * 推荐和关联专题
 */
const getRelevanceApi = ({ postId = "", gender = 0 } = {}) => {
    let url = `/mini/v1/comic/${global.channel}/recommend/post_comic`;
    let data = {
        gender,
        post_id: postId,
    };
    return request({
        url,
        data,
    });
};

export { getPostDataApi, getPostMoreApi, postPraiseApi, getRelevanceApi };
