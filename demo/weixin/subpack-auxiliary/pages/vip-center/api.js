import { util_request } from '../../../util.js';
const global = getApp().globalData;

/**
 * ** getMultiFilter 新会员中心模块banner列表接口 Get:/v1/vip/banner/new_list
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/329/interface/api/3139
 * 对接后端: 喻诗祥
 * @param(参数):               备注
 * @offset                     非必填  int,当前页 默认值:0
 * @limit                      非必填     int,每页显示banner数量 默认值:20
 * @is_cold_start              非必填     是否冷启动 默认值:false
 * @non_iap_supported_device   非必填     是否是越狱设备，true表示是，4.2版本添加     默认:false
 * @order_from                 非必填     来源类型 0    未记录 1    端内 2    快看club  3    微信小程序  4    qq小程序  5    m站  6    分销订单  7    支付sdk
 *
 *
 * return Promise
 * **/
const getVipNewList = ({ offset = 0, limit = 20, is_cold_start = false, non_iap_supported_device = false } = {}) => {
    let url = '/v1/vip/banner/new_list';
    let method = 'get';
    let host = 'pay';
    let data = {
        offset,
        limit,
        is_cold_start,
        non_iap_supported_device,
        order_from: global.payfrom,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

/**
 * ** getCommonPopups 通用弹窗信息     Get:/v1/vip/banner/common_popups
 * @author:zhilichao
 * yapi: https://yapi.quickcan.com/project/329/interface/api/9408
 * 对接后端: 袁鑫/汤冬冬
 * @param(参数):               备注
 * @non_iap_supported_device   是必填    布尔类型,是否越狱  默认:false
 * @popups_type                是必填     int,弹窗来源类型，0会员中心，1弹幕页开通
 *
 *
 * return Promise
 * **/
const getCommonPopups = ({ non_iap_supported_device = false, popups_type = 0 } = {}) => {
    let url = '/v1/vip/banner/common_popups';
    let method = 'get';
    let host = 'pay';
    let data = {
        non_iap_supported_device,
        popups_type,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

/**
 * ** getTipsGift 获取tips礼包接口     Get:/v1/vip/banner/list
 * @author:lina
 * yapi: https://yapi.quickcan.com/project/329/interface/api/4239
 * 对接后端: 袁鑫
 * @param(参数):               备注
 * order_from 来源
 * return Promise
 * **/
const getTipsGift = () => {
    let url = '/v1/vip/banner/list';
    let method = 'get';
    let host = 'pay';
    let data = {
        order_from: global.payfrom,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

/**
 * getGifts 请求会员礼包接口
 * 参数: bags 是否为更新数据   get  url:/v1/vip/gift/list
 * https://yapi.quickcan.com/project/341/interface/api/4035
 * 后端对接人:付费服务端(汤冬冬)
 * **/
const getGiftListApi = () => {
    let url = '/v1/vip/gift/list';
    let method = 'get';
    let host = 'pay';
    let data = {
        order_from: global.payfrom,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

const getVideoListApi = () => {
    let url = '/v1/miniactivity/vip/banner/center';
    let method = 'get';
    let data = {};
    return util_request({
        url,
        method,
        data,
    });
};

/**
 * getChargeSuccessBanner 充值成功弹窗运营位_V2       get: /v1/vip/banner/charge_success_banner_v2
 * @author:xubowei
 * yapi: https://yapi.quickcan.com/project/329/interface/api/38686
 * 对接后端: 张鑫 (付费)
 * @param(参数):                是否必填     备注
 * @order_id                 	是      订单ID
 *
 * return Promise
 * **/
const getChargeSuccess = ({ order_id = '' } = {}) => {
    let url = '/v1/vip/banner/charge_success_banner_v2';
    let method = 'get';
    let host = 'pay';
    let data = {
        order_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

/**
 * getCouponList 优惠券领取
 * **/
const getCouponList = () => {
    let url = '/v1/vip/vip_coupon/h5/coupon_popups_list';
    let method = 'get';
    let host = 'pay';
    let data = {
        source: 1,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

module.exports = {
    getVipNewList, // 新会员中心模块banner列表接口
    getCommonPopups, // 通用弹窗信息
    getTipsGift, // 获取tips礼包接口
    getGiftListApi, // 获取礼包列表
    getVideoListApi, // 获取视频列表
    getChargeSuccess, // 获取充值成功
    getCouponList, // 会员优惠券
};
