import { util_request } from "../../util.js";

/**
 * ** getRankList 排行榜接口      Get:/mini/v1/comic/{channel}/rank_list
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/406/interface/api/13290
 * 对接后端: 马雪彦
 * @param(参数):   备注
 * @channel          是必填项,默认:wechat      使用渠道channel有wechat、qq两种(url拼接)
 * @rank_id       是必填项,默认0    排行榜id
 * @need_ranks      是必填项,默认:true        是否需要排行榜(tab)信息   可选值 true/false
 * @since            是必填项,默认:0           页码，-1代表没有下一页，首次传0，之后传上一次服务端接口返回的since字段值（注意：这里对于防止翻页过程中专题出现重复很重要）
 * @limit         是必填项,默认:20          每页返回的数据条数
 * return Promise
 * **/

function getRankList({ channel = "wechat", rank_id = 0, need_ranks = true, since = 0, limit = 20 } = {}) {
    let url = `/mini/v1/comic/${channel}/rank_list`;
    let method = "get";
    let host = "api"; // 'api', 'search', 'pay'
    let data = {
        // rank_id,
        need_ranks,
        since,
        limit,
    };
    if (rank_id) {
        // 排行id存在的情况
        data.rank_id = rank_id;
    }
    return util_request({
        url,
        method,
        host,
        data,
    });
}

module.exports = {
    getRankList, // 排行榜接口
};
