import { util_request } from "../../util.js";

/**   查询付费信息 接口回调
 * ** requestPayInfo method:  POST   /v2/comicbuy/comic_price_info_h5,
 * @author:zhilichao
 * wiki: https://wiki.quickcan.com/pages/viewpage.action?pageId=131009278
 * 对接后端: 付费组
 * @param(参数):   备注
 * @from          区分支付平台，小程序固定传3   页面传递
 * @topic_id      专题id    页面传递
 * @comic_id      章节id    页面传递
 * @iap_hidden    是否隐藏iap充值，true表示支持越狱   默认 false   非必填
 * @sms_hidden    是否隐藏短信支付，true表示不支持    默认 false   非必填
 * return Promise
 * **/
function requestPayInfo({ from = 3, topic_id = 10, comic_id = 0 } = {}) {
    let url = "/v2/comicbuy/comic_price_info_h5";
    let method = "post";
    let host = "pay";
    let data = {
        from,
        topic_id,
        comic_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

export { requestPayInfo };
