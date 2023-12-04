import { util_request } from "../../../util.js";

/**
 * 订单列表
 * yapi: https://yapi.quickcan.com/project/1431/interface/api/124806
 * 后端: 素飞
 */
function getOrderList(data) {
    return util_request({
        host: "pay",
        url: "/v1/video_buy/video_mini/recent_orders",
        method: "get",
        data,
    });
}
export { getOrderList };
