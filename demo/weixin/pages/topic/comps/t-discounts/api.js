import { util_request } from "../../../../util.js";

/**
 * https://yapi.quickcan.com/project/317/interface/api/56990
 * 素飞
 */
const payMainApi = ({ topic_id = 0, comic_id = 0 } = {}) => {
    const { cps, payfrom } = getApp().globalData;
    let url = "/v2/comicbuy/comic_pay_window_h5";
    let method = "post";
    let host = "pay";
    let data = {
        cps,
        topic_id,
        comic_id,
        source: 3,
        from: payfrom,
        entrance_type: 1,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

export { payMainApi };
