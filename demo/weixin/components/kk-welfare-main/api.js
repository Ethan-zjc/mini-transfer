import { util_request } from "../../util.js";

const app = getApp();
const global = app.globalData;

/**
 * 获取弹窗信息
 * yapi:https://yapi.quickcan.com/project/812/interface/api/60136
 */
export const getDisplay = () => {
    return util_request({
        url: `/v2/checkin/api/mini/${global.channel}/benefit/display`,
        method: "get",
    });
};

/**
 * 获取入口信息(领取福利接口)
 * yapi: https://yapi.quickcan.com/project/812/interface/api/60145
 */
export const postAssign = ({ benefit_id = 1 } = {}) => {
    return util_request({
        url: `/v2/checkin/api/mini/${global.channel}/benefit/assign`,
        method: "post",
        data: {
            benefit_id,
        },
    });
};

/**
 * 检查专题是否在新手福利专题池接口
 * yapi:https://yapi.quickcan.com/project/812/interface/api/60235
 */
export const getCheckTopic = ({ benefit_id = 1, topic_id = 0 }) => {
    return util_request({
        url: `/v2/checkin/api/mini/${global.channel}/benefit/check_topic`,
        method: "get",
        data: {
            benefit_id,
            topic_id,
        },
    });
};

/**
 * 获取奖励弹窗漫画信息
 * yapi: https://yapi.quickcan.com/project/812/interface/api/63241
 */
export const getAssignTopics = () => {
    return util_request({
        url: `/v2/checkin/api/mini/${global.channel}/benefit/assign/pop/recommend_topics`,
        data: {
            gender: global.gender,
        },
    });
};
