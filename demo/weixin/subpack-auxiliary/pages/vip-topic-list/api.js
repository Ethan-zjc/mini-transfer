import { util_request } from "../../../util.js";

/**
 * ** getBannerInfo 会员中心查看更多(二级页)     Get:/v1/vip/banner/banner_info
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/329/interface/api/3139
 * 对接后端: 汤冬冬
 * @param(参数):               备注
 * @id                         必填   int, banner_id 默认值:0
 * @is_cold_start              非必填     是否冷启动 默认值:0  1
 *
 *
 * return Promise
 * **/
function getBannerInfo({ id = 0, is_cold_start = 0 } = {}) {
    let url = `/v1/vip/banner/banner_info`;
    let method = "get";
    let host = "pay";
    let data = {
        id,
        is_cold_start,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}
module.exports = {
    getBannerInfo, // 新会员中心模块banner列表接口
};
