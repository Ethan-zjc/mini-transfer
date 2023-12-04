import { util_request } from "../../util.js";

// https://yapi.quickcan.com/project/438/interface/api/55093 -> 判断是否显示悬浮框
const getMiniBaseOperation = ({
    page = "", // 1-发现页 2-推荐页 3-漫画页
    topic_id = "",
    gender = "",
} = {}) => {
    let url = `/v1/business/mini/${getApp().globalData.channel}/operation/get`;
    let host = "api";
    let data = { page, gender };
    if (page == 3) {
        data.topic_id = topic_id;
    }
    return util_request({
        url,
        host,
        data,
    });
};

// 行为事件上报
const operationEvent = ({
    id = "",
    event = "", // 1-曝光 2-点击 3-关闭
    page = "",
} = {}) => {
    let url = `/v1/business/mini/${getApp().globalData.channel}/operation/report`;
    let host = "api",
        method = "post";
    let data = { operation_id: id, event, page };
    return util_request({
        url,
        host,
        method,
        data,
    });
};

export { operationEvent, getMiniBaseOperation };
