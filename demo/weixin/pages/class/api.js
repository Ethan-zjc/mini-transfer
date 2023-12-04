import { util_request } from "../../util.js";

/**
 * ** getMultiFilter 分类筛选接口      Get:/search/mini/topic/multi_filter
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/mock/198/search/mini/topic/multi_filte
 * 对接后端: 王辉(搜索)
 * @param(参数):   备注
 * @page         页码，默认1
 * @size         请求数量，默认10
 * @tagId       分类id    tag_id=0
 * @gender       男女版 [0-女版 1-男版 2-未知/老版本]
 * @updateStatus 更新状态 [0-全部 1-连载中 2-完结]  update_status
 * @payStatus    付费状态 [0-全部 1-免费 2-付费 3-抢先看] pay_status
 * @sort          排序 [1-推荐 2-人气值 3-新上架 4-关注数]
 * @favFilter    是否过滤已关注，默认0 [0-否 1-是] fav_filter
 * @region       地区筛选 1：全部，2：国漫，3：韩漫，4：日漫
 *
 * return Promise
 * **/
function getMultiFilter({ page = 1, size = 10, tagId = 0, gender = 0, updateStatus = 0, payStatus = 0, sort = 1, favFilter = 0, region = 1 } = {}) {
    let url = "/search/mini/topic/multi_filter";
    let method = "get";
    let host = "search";
    let data = {
        page,
        size,
        tag_id: tagId,
        gender,
        update_status: updateStatus,
        pay_status: payStatus,
        sort,
        fav_filter: favFilter,
        label_dimension_origin: region,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

module.exports = {
    getMultiFilter,
};
