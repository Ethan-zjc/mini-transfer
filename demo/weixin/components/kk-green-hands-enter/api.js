import { util_request } from "../../util.js";

const app = getApp();

/**
 * 获取弹窗信息
 * yapi: https://yapi.quickcan.com/project/385/interface/api/17040
 */
export const queryDialogInfo = () => {
    let { channel } = app.globalData;
    return util_request({
        url: `/v1/checkin/api/mini/${channel}/benefit/display`,
        method: "get",
        data: {},
    });
};

/**
 * 获取入口信息(领取福利接口)
 * yapi: https://yapi.quickcan.com/project/385/interface/api/17046
 */
export const queryEnter = ({ benefit_id = 1, topic_id = 0 } = {}) => {
    let { channel } = app.globalData;
    let data = { benefit_id: benefit_id };
    if (topic_id) {
        // 在付费弹窗领取的场景 需要专题id
        data.topic_id = topic_id;
    }
    return util_request({
        url: `/v1/checkin/api/mini/${channel}/benefit/take`,
        method: "post",
        data: data,
    });
};
