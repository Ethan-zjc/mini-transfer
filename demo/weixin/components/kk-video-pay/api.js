import { util_request } from '../../util.js';

/**
 * 支付kkb 接口回调
 **/
function requestPaidApi({ video_buy_encrypt_str = 0 } = {}) {
    let url = '/v1/video_buy/h5/buy';
    let method = 'post';
    let host = 'pay';
    let data = {
        video_buy_encrypt_str,
        cps: getApp().globalData.cps,
        from: getApp().globalData.payfrom,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
}

/**
 * kkb套餐列表
 * **/
const getKkbSetMealListApi = () => {
    let url = '/v2/kb/recharge_good/h5_list';
    let method = 'get';
    let host = 'pay';
    let data = { from: getApp().globalData.payfrom };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

/**
 * 批量档位
 */
const batchListApi = ({ comic_video_id = '', post_id = '' } = {}) => {
    let url = '/v1/video_buy/h5/window';
    let method = 'get';
    let host = 'pay';
    let data = {
        comic_video_id,
        post_id,
        from: getApp().globalData.payfrom,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

/**
 * 查询订单
 */
const getKkbOrderIdApi = ({ order_id = '' } = {}) => {
    let url = '/v1/pay/pay_order/query/detail_order_id_recharge';
    let method = 'get';
    let host = 'pay';
    let data = {
        order_id, // kkb订单id
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

export {
    batchListApi,
    requestPaidApi, // 支付kkb 接口回调
    getKkbOrderIdApi,
    getKkbSetMealListApi, // 漫画购买弹窗KK币余额不足时充值套餐列表
};
