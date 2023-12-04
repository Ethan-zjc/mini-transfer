import { util_request } from "../../util.js";

// https://yapi.quickcan.com/project/438/interface/api/55093 -> 判断是否显示悬浮框
const getPaySpreeApi = ({
    comic_id = "", // 1-发现页 2-推荐页 3-漫画页
    topic_id = "",
} = {}) => {
    let url = `/v2/comicbuy/activity_gift/get_h5`;
    let host = "pay";
    let data = {
        topic_id,
        comic_id,
        order_from: getApp().globalData.payfrom,
    };
    return util_request({
        url,
        host,
        data,
    });
};

// https://yapi.quickcan.com/project/934/interface/api/47730
const postSpreeAssign = ({ activity_coupon_id = "", topic_id = "" } = {}) => {
    let url = "/v1/coupon_activity/activity_coupon/assign_h5";
    let host = "pay";
    let method = "post";
    let data = {
        activity_coupon_id,
        topic_id,
    };
    return util_request({
        url,
        host,
        method,
        data,
    });
};

export { getPaySpreeApi, postSpreeAssign };
