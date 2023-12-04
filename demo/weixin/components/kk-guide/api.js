import { util_request } from "../../util.js";

const global = getApp().globalData;

/**
 * 是否显示桌面任务
 */
const isShowTaskApi = () => {
    const url = `/mini/v1/comic/${global.channel}/task/desktop/show`;
    return util_request({
        url,
    });
};

/**
 * 奖励领取弹窗
 */
const awardDialogApi = () => {
    const url = `/mini/v1/comic/${global.channel}/task/desktop/popup`;
    return util_request({
        url,
    });
};

/**
 * 领取奖励按钮
 */
const getAwardApi = (data) => {
    const url = `/mini/v1/comic/${global.channel}/task/desktop/take_award`;
    const method = "post";
    return util_request({
        url,
        method,
        data: { ...data },
    });
};

module.exports = {
    isShowTaskApi,
    awardDialogApi,
    getAwardApi,
};
