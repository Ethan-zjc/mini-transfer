import { util_request } from "../../../util.js";

export const getPageInfo = ({ topicIds, activity_name }) => {
    const url = "/v1/payactivity/mini/toys/home_page";
    const data = {
        topicIds,
        activity_name,
    };

    return util_request({
        url,
        method: "get",
        host: "pay",
        data,
    });
};

export const getCode = (activity_name) => {
    const url = "/v1/payactivity/mini/toys/assign_benefits_award";

    return util_request({
        url,
        method: "get",
        host: "pay",
        data: { activity_name },
    });
};

export const focusTopics = (topicIds) => {
    const url = "/mini/v1/comic/wechat/favourite/topic/batch";

    return util_request({
        url,
        method: "post",
        host: "api",
        data: { topic_ids: topicIds },
    });
};

module.exports = {
    getPageInfo,
    getCode,
    focusTopics,
};
