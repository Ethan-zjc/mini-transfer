const computedBehavior = require('miniprogram-computed');
const api = require('./api'); // api 请求
const app = getApp();
const global = app.globalData;
const { globalImgs } = require('../../cdn.js');
const { jumpVipFun, clickNavigateBackFun } = require('./common.js');
const payBehavior = require('../../behaviors/pay.js');

const images = {
    arrowRightBrown: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay/arrow-right-brown_3351c84.png',
    arrowRightPurple: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay/arrow-right-purple_d586bbe.png',
    arrowRight: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay/arrow-right_30bc9ad.png',
    comicpay: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay/comicpay_8878a53.png',
    icoRadioFalse: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay/ico-radio-false_4e14c70.png',
    icoRadioTrue: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay/ico-radio-true_01d5b23.png',
    arrowOpen: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipdialog/ic_arrow_open_5d1772e.png',
    limitBtn: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipdialog/limit-btn_52706b2.png',
    aheadLook: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipdialog/vip-ahead_ab50cbb.png',
    vipFree: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipdialog/vip-free_fd6e734.png',
};
const cacheImgs = Object.keys(images).map((item) => {
    return images[item];
});

import { util_action, util_logout, util_logManager } from '../../util.js';

import {
    getTodayDate, // 获取今天日期
    judgmentDate, // 判断日期
    getStoreVipData, // 获取存储挽留弹窗的数据
} from '../kk-vip-detainment/computing-time.js';

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },

    // 类似于mixins和traits的组件间代码复用机制
    behaviors: [computedBehavior, payBehavior],
    properties: {
        isLoad: {
            // 是否显示弹框  类型->布尔值  true状态:请求接口 false:隐藏不请求
            type: Boolean,
            value: false,
        },
        userInfo: {
            // 用户信息
            type: null,
            value: null,
        },
        topicId: {
            // 专题id
            type: [Number, String],
            value: 0, // 791->烈火青春==激励视频  96->叫我森林先生==kkb
        },
        topicTitle: {
            // 专题标题 - 埋点使用
            type: String,
            value: '',
        },
        comicId: {
            // 章节id
            type: [Number, String],
            value: 0, // 11923->烈火青春章节==激励视频  487->叫我森林先生章节==kkb
        },
        comicTitle: {
            // 章节标题 - 埋点使用
            type: String,
            value: '',
        },
        paysucc: {
            type: Boolean,
            value: false,
        },
        pageShow: {
            // 页面的隐藏显示的状态.
            type: Boolean,
            value: false,
        },
        trackProps: {
            type: Object,
            value: {},
        },
    },
    data: {
        images,
        cacheImgs,
        userId: '',
        isLogin: null,
        isiOS: false,
        iPhoneX: false,
        wallet: 0, // 可用的kkb(kkb剩余的数量)
        price: 0, // 需要支付的价格
        isvip: false, // 用户是否为vip
        autoPay: false, // 是否为自动支付
        payTop: null, // 支付弹窗运营位
        encrypt: '', // 购买漫画的加密串,接口获取(支付查询接口)
        payLoading: false, // 防止重复提交购买
        payBtnText: '确认支付', // 购买按钮展示的文字
        batchPriceList: [], // 批量购档位列表
        batchPriceIndex: 0, // 批量购
        payIconUrl: '', // 购买按钮角标
        spendCouponId: 0, // 满减卷信息
        spendCouponRecordId: 0, // 满减卷信息
        isShowPopup: false, // 是否显示弹窗  默认不显示
        isShowPopupCon: false, // 是否显示弹窗内容 默认不显示

        payFrom: app.globalData.payfrom, // 使用app.js中的 3:微信小程序，4:QQ小程序
        showNum: 0, // 父级页的显示的次数
        hideNum: 0, // 父级页的隐藏的次数
        priceInfo: {}, // 价格信息
        discountIcons: [], // 折扣信息
        payTrackData: {}, // 付费埋点通用数据

        IsVIPDiscount: false, // 是否命中会员优惠卷
        VIPDiscountName: '', // 会员优惠券名称
        VIPPrice: 0, // 会员开通价格
        isPayGift: false, // 是否是充值礼包
        isLimitFree: false, // 是否是定向限免
        globalImgs: globalImgs,
        showVipDetainment: false, // 是否直接显示挽留弹窗.
        isClickClose: true, // 是否可以点击关弹窗按钮.
        activityId: '0', // 上报埋点使用[广告&活动查询接口]

        isShowRecharge: false, // 是否显示充值档位
        rechargeInfo: {}, // 充值档位信息
        rechargeIndex: 1, // 充值档位选中索引

        // 重构版新增参数
        isAdv: false, // 是否广告弹窗
        advData: {}, // 广告数据
        isAdLoading: false, // 是否广告预加载
        isReadCoupon: false, // 是否阅读卷弹窗
        readCouponCount: 0, // 阅读卷数量
        headData: {}, // 顶部头像和气泡数据
        popType: 1, // 付费弹窗类型（1: 普通付费 2: 会员限免 3: 会员提前看 4: 会员固定锁住）
        fooType: 1, // 弹窗底部工具栏类型（具体参考组件中说明）
    },

    // 检测数据吸顶变化
    watch: {
        userInfo() {
            this.setSysAndUserInfo(); // 设置基本设备信息和登录状态
        },
        isLoad(val) {
            let { comicId, topicId } = this.data;
            if (!comicId || !topicId) {
                return false;
            } else {
                if (val && !this.data.paysucc) {
                    this.payMainRequest();
                }
            }
        },
        paysucc(val) {
            if (val) {
                this.payMainRequest();
            }
        },
    },
    attached() {
        this.setData({
            isCanPay: !app.globalData.isiOS || app.globalData.iosIsShowPay,
        });

        // 设置基本设备信息和登录状态
        this.setSysAndUserInfo(() => {
            // this.payMainRequest(); // 聚合内容
        });
    },
    pageLifetimes: {
        show() {
            // 显示的页面的次数大于1的情况数据刷新
            this.setData({ showNum: this.data.showNum + 1 }, () => {
                if (this.data.showNum > 1) {
                    this.payMainRequest(); // 聚合内容
                }
            });
        },
        // hide() {
        //     this.setData({ hideNum: this.data.hideNum + 1 }, () => {});
        // },
    },
    methods: {
        // 新增付费信息聚合内容
        payMainRequest() {
            const { topicId, comicId } = this.properties;
            let params = {
                source: 3,
                topic_id: topicId,
                comic_id: comicId,
            };
            api.payMainApi(params).then((res) => {
                // 处理格式化各种弹窗数据
                // console.log(11111, res);
                const {
                    pop_ups_type = 1, // 弹窗类型
                    vip_enjoy = {}, // 会员（3，4）
                    vip_free = {}, // 会员限免（2）
                    pre_comic_price = {}, // 定向限免、充值礼包等信息
                    price_info = {}, // 付费信息（普通购买&批量购）
                    single_comic_price = {}, // 单个付费信息
                } = res.data;

                if (pop_ups_type == 1) {
                    // 处理普通付费数据
                    let hasPreposition = false;
                    const { pre_banner = [] } = pre_comic_price;
                    // 存储类型埋点使用
                    this.data.preBanner = pre_banner;
                    if (pre_banner.length) {
                        const preBanner = pre_banner[0] || {};
                        if (preBanner.type == 88) {
                            // 广告相关
                            hasPreposition = true;
                            this.formatGiftLimit({ data: pre_comic_price });
                        }
                        if (!global.isiOS) {
                            if (preBanner.type == 120) {
                                // 处理充值礼包数据
                                hasPreposition = true;
                                this.formatGiftLimit({ data: pre_comic_price });
                            }
                            if (preBanner.type == 89) {
                                // 处理定向限免
                                hasPreposition = true;
                                this.formatGiftLimit({ data: pre_comic_price });
                            }
                        }
                    }

                    // 处理普通付费信息
                    this.formatPayInfo({ data: price_info, hasPreposition });
                } else {
                    if (pop_ups_type == 2) {
                        this.formatSinglePrice({ data: single_comic_price });
                        // 会员限免弹窗
                        this.formatVipData({ data: vip_free, status: 2 });
                        this.setData({ fooType: 2 }); // 设置底部工具栏类型
                    } else if (pop_ups_type == 3 || pop_ups_type == 4) {
                        // 提前看，固定锁住
                        // vipshow为true时展示会员提前看弹窗（时机待调整）
                        this.formatVipData({ data: vip_enjoy, status: pop_ups_type });
                    }
                }
                this.setData(
                    {
                        isShowPopup: true,
                    },
                    () => {
                        this.setData({
                            isShowPopupCon: true,
                            popType: pop_ups_type, // 设置付费弹窗状态
                        });
                    }
                );
            });
        },

        // 格式化广告信息、充值礼包、定向限免数据
        formatGiftLimit({ data = {} } = {}) {
            if (data.pre_banner) {
                let filterPre = data.pre_banner || [];
                let filterData = filterPre[0] || {};
                let resultData = { activityId: (filterData.id || '0') + '' };

                // 广告信息
                if (filterData.type == 88) {
                    let adsInfo = filterData;
                    // data.pre_banner[x].adv_info
                    adsInfo = adsInfo.adv_info; // 广告信息

                    // 会员拆分定价上报信息
                    let IsVIPDiscount = this.data.IsVIPDiscount;
                    let coupon_title = '';
                    let price = '';
                    // let comic_free_info = data.pre_banner.comic_free_info || {};
                    // if (comic_free_info.charge_vip_info) {
                    //     coupon_title = comic_free_info.charge_vip_info.coupon_title || "";
                    //     coupon_record_id = comic_free_info.charge_vip_info.coupon_record_id || "";
                    //     price = comic_free_info.charge_vip_info.price || "";
                    //     if (coupon_title && coupon_record_id) {
                    //         IsVIPDiscount = true;
                    //     }
                    // }

                    const params = {
                        advData: adsInfo,
                        isAdv: true,
                        IsVIPDiscount: IsVIPDiscount, // 是否命中会员优惠券
                        VIPDiscountName: coupon_title, // 会员优惠券名称
                        VIPPrice: price, // 会员开通价格
                    };
                    Object.assign(resultData, params);
                }

                // 充值礼包弹窗
                if (this.data.isCanPay && filterData.type == 120) {
                    let payGift = filterData;
                    let pic_text_banner = payGift.pic_text_banner[0] || {}; // 弹窗悬浮层文案,以及跳转链接
                    let text1 = this.textHandle(payGift.pic_text_banner[0].text1, '#'); // 弹窗悬浮层文案
                    let text2 = this.textHandle(payGift.pic_text_banner[0].text2, '#'); // 弹窗悬浮层文案
                    // 顶部通用运营位
                    let payTop = this.formatTopOperate({ data: payGift.top_banner });
                    const params = {
                        payGiftData: filterData,
                        isPayGift: true,
                        pic_text_banner,
                        headData: {
                            text1,
                            text2,
                        },
                        payTop,
                        fooType: 2,
                    };
                    Object.assign(resultData, params);
                }

                // 定向限免
                if (this.data.isCanPay && filterData.type == 89) {
                    let limitFree = filterData.comic_free_info || {};
                    let comic_list = limitFree.comics; // 免费列表
                    let charge_vip_info = limitFree.charge_vip_info;
                    let left_text1 = this.textHandle(charge_vip_info.text1, '#');
                    let main_title = this.textHandle(limitFree.suggest_title, '#'); // 定向限免标题
                    let pic_text_banner = filterData.pic_text_banners[0] || {}; // 弹窗悬浮层文案,以及跳转链接
                    let text1 = this.textHandle(pic_text_banner.text1, '#'); // 弹窗悬浮层文案
                    let text2 = this.textHandle(pic_text_banner.text2, '#'); // 弹窗悬浮层文案

                    let activity_name = filterData.activity_name; // 活动标题

                    // 顶部通用运营位
                    let payTop = this.formatTopOperate({ data: filterData.top_banner });

                    const params = {
                        payTop,
                        headData: {
                            text1,
                            text2,
                            good_id: charge_vip_info.good_id,
                        },
                        fooType: 2,
                        isLimitFree: true,
                        orientLimitData: {
                            comic_list,
                            charge_vip_info,
                            main_title,
                            // pic_text_banner,
                            text1,
                            text2,
                            activity_name,
                            left_text1,
                            topicId: this.data.topicId,
                            comicId: this.data.comicId,
                            activityId: filterData.id,
                            VIPDiscountName: this.data.VIPDiscountName,
                        },
                    };
                    Object.assign(resultData, params);
                }

                this.setData({
                    ...resultData,
                });
            }
        },

        // 格式化单部漫画付费信息 (弹窗类型2时，使用到)
        formatSinglePrice({ data = {} } = {}) {
            const balance = data.balance;
            const wallet = balance < 0 ? 0 : balance; // 当前用户kk币余额
            const encrypt = data.comicbuy_encrypt_str; // 支付(购买签名) 漫画购买加密串
            const priceInfo = data.price_info; // 价格信息
            const price = priceInfo.selling_kk_currency; // 实际需要支付的价格
            const autoPay = data.auto_pay; // 是否自动支付
            this.setData(
                {
                    wallet,
                    price,
                    encrypt,
                    priceInfo,
                    autoPay,
                },
                () => {
                    this.commonTrack();
                }
            );
        },

        // 格式化普通付费信息
        formatPayInfo({ data = {}, hasPreposition = false } = {}) {
            const balance = data.kk_currency_balance;
            const wallet = balance < 0 ? 0 : balance; // 当前用户kk币余额
            const batchPriceList = data.batch_purchase_list; // 批量购档位
            const bannerInfo = data.pic_text_banners || []; // 运营位信息  主要获取对话框展示的信息
            const remember = data.auto_pay_reminder; // 是否支持自动购买/是否主动显示自动购买

            // 阅读券信息
            const readCoupon = data.coupon || {};
            // const readCouponCount = 30;
            const readCouponCount = readCoupon.coupon_count || 0;
            const isReadCoupon = readCouponCount > 0;

            const options = this.formatPayBase({
                index: 0, // 购买列表索引
                batchPriceList, // 批量购列表
            });

            // 余额不足满足展示提前付费条件
            const showRecharge = this.data.isCanPay && wallet < options.price && !hasPreposition;

            // 需要存储的数据
            let setData = {
                ...options,
                wallet, // 当前用户kk币余额
                autoPay: remember && remember.show ? remember.selected : data.autoPay, // 是否自动支付
                // bannerTxt: [bannerInfo.text1, bannerInfo.text2], // 对话框展示的文字
                headData: this.formatHeadBubble({ pic_text_banners: bannerInfo }),
                isvip: data.vip_info && data.vip_info.is_vip, // 用户是否为vip用户
                payBtnText: wallet < options.price ? '余额不足，立即充值' : '确认支付',
                isLogin: !!global.userId, // 登录状态
                batchPriceList: showRecharge ? batchPriceList.splice(0, 1) : batchPriceList, // 批量购档位
                isReadCoupon, // 是否展示阅读券弹窗
                readCouponCount, // 阅读券余额
            };

            this.setData(setData, () => {
                // 余额不足 请求余额不足的按钮
                if (showRecharge) {
                    // 展示档位
                    this.setData({
                        payBtnText: '立即充值',
                        isShowRecharge: true,
                        hidePerson: true,
                    });
                } else {
                    if (global.userId && wallet < options.price) {
                        this.getBtnText(options.price);
                    } else {
                        this.setData({
                            payBtnText: '确认支付',
                        });
                    }
                }

                if (!this.data.isAdv) {
                    this.commonTrack();
                }
            });
        },

        // 格式化会员弹窗相关数据
        formatVipData({ data = {}, status = 2 } = {}) {
            const { content, charge_vip_info, pic_text_banners, suggest_title: suggestTitle, vip_free_suggest: vipTopicList } = data,
                { title: vipTitle, comics } = content || {},
                // { title: topicTitle } = current_topic_info || {},
                { text1: btnLeftText, text2: btnRightText, text3: originalPrice, bubble_text: bubbleText } = charge_vip_info;

            // 判断是否命中会员优惠券
            let IsVIPDiscount = this.data.IsVIPDiscount;
            if (charge_vip_info.coupon_record_id && charge_vip_info.coupon_title) {
                IsVIPDiscount = true;
            }

            // 顶部头像气泡信息
            const headData = this.formatHeadBubble({ pic_text_banners });

            // 会员弹窗信息
            const vipData = {
                topicId: this.data.topicId,
                comicId: this.data.comicId,
                btnRightText,
                bubbleText: bubbleText || '',
                btnLeftText: this.textHandle(btnLeftText, '*'),
                originalPrice: this.textHandle(originalPrice, '$'),
                IsVIPDiscount,
                VIPDiscountName: charge_vip_info.coupon_title || '',
                VIPPrice: charge_vip_info.price || '',
                PUWID: this.data.activityId,
            };
            if (status == 2) {
                vipData.vipTopicList = vipTopicList;
                vipData.suggestTitle = this.textHandle(suggestTitle, '#');
            } else if (status == 3 || status == 4) {
                vipData.comics = comics;
                vipData.vipTitle = this.textHandle(vipTitle, '#');
                vipData.topicTitle = this.data.topicTitle;
            }

            this.setData({ headData, vipData });
        },

        // 格式化顶部头像和气泡信息
        formatHeadBubble({ pic_text_banners = {}, charge_vip_info = {} } = {}) {
            // 当为广告时，顶部气泡信息无，无需使用此格式化
            // 返回text1、text2、action_target: {action_type: "", target_id: "", target_web_url: "" }
            // 定向限免的顶部头像气泡使用到了charge_vip_info.good_id
            const { text1, text2, action_target } = pic_text_banners.length ? pic_text_banners[0] : {};
            const headData = {
                text1: ['章节尚未解锁'],
                text2: [this.data.isLogin ? '解锁后即可阅读哦' : '您需要先登录才能查看哦'],
            };

            if (text1 || text2) {
                // 气泡文案信息
                const textInfos = {
                    text1: this.textHandle(text1, '#'),
                    text2: this.textHandle(text2, '#'),
                };
                Object.assign(headData, textInfos);

                // 有跳转相关
                if (action_target.action_type) {
                    const params = {
                        action_type: action_target.action_type,
                        target_id: action_target.action_type,
                        target_web_url: action_target.target_web_url,
                    };
                    Object.assign(headData, { action_target: params });
                }

                // 定向限免传递商品id, 埋点使用
                if (charge_vip_info.good_id) {
                    headData.good_id = charge_vip_info.good_id; // 定向限免相关id
                }
            }

            return headData;
        },

        // 格式化顶部通用运营位信息
        formatTopOperate({ data = [] } = {}) {
            let payTop = null;
            if (data && data.length > 0) {
                const action = data[0].action_target || {};
                payTop = {
                    icon: data[0].pic,
                    text: data[0].title,
                    btn: action.target_title,
                    targetType: action.action_type,
                    targetId: action.target_id,
                    targetUrl: action.target_web_url || action.hybrid_url || '',
                };
            }
            return payTop;
        },

        // 格式化普通付费弹窗，包含普通购买、批量购通用基本信息
        formatPayBase(opitons) {
            const { index, batchPriceList } = opitons;

            const listItem = batchPriceList[index]; // 付费档位信息
            const encrypt = listItem.comicbuy_encrypt_str; // 支付(购买签名) 漫画购买加密串
            const priceInfo = listItem.price_info; // 价格信息
            const price = priceInfo.selling_kk_currency; // 实际需要支付的价格

            // 底部运营位信息 强提示
            const bottomVipBanner = listItem.text_info.bottom_vip_banners ? listItem.text_info.bottom_vip_banners[0] : '';
            const bottomVipBannerText = bottomVipBanner ? this.textHandle(bottomVipBanner.button_text, '@') : '';
            const activityName = bottomVipBanner ? bottomVipBanner.activity_name : '';

            // 返币icon，购买按钮的角标
            const iconInfo = listItem.icon || {};
            const payIconUrl = iconInfo.icon_url || '';

            // 满减卷信息
            let spend_coupon_view_list = listItem.spend_coupon_view_list || [];
            let spend_coupon_info = spend_coupon_view_list[0] || {};
            let spend_coupon_id = spend_coupon_info.spend_coupon_id || 0;
            let spend_coupon_record_id = spend_coupon_info.spend_coupon_record_id || 0;

            // 优惠信息
            const textInfo = listItem.text_info || {};
            const discountLabel = textInfo.discount_label || {};
            const marketInfo = textInfo.market_text || {};
            let market_text = marketInfo.text || '';

            const discountInfo = {
                discount_text: marketInfo.discount_text, // 优惠多少
                discount_left: discountLabel.left_text || '', // vip图标
                discount_right: discountLabel.right_text || '', // vip类型
                market_text, // 原价多少，删除线
            };

            if (market_text) {
                discountInfo.market_delete = market_text.indexOf('$') > -1; // 优惠信息是否带删除线
                discountInfo.market_text = market_text.replace(/\$/g, ''); // 优惠信息左侧（原价）
            }

            // 优惠折扣
            if (priceInfo.total_discount) {
                priceInfo.total_discounts = parseFloat(priceInfo.total_discount / 10);
            }

            // 存储的折扣信息
            const discountIcons = marketInfo.icon_types.map((id) => {
                const typeMap = {
                    2: '会员8.5折',
                    3: '代金券免单',
                    4: '券',
                    6: '阅读币抵扣',
                };
                const label = typeMap[id] || '';
                const options = {
                    id,
                    label,
                    color: '#FF751A',
                    bgColor: 'rgba(255, 117, 26, 0.08)',
                };
                if (id == 2) {
                    Object.assign(options, {
                        color: '#6C01CF',
                        bgColor: 'rgba(108, 1, 207, 0.08)',
                    });
                }
                return options;
            });

            // 顶部通用运营位信息
            const payTop = this.formatTopOperate({ data: textInfo.top_banners });

            return {
                price, // 实际需要支付的价格
                priceInfo, // 价格信息
                encrypt, // 支付(购买签名) 漫画购买加密串
                bottomVipBanner, // 底部运营位
                bottomVipBannerText, // 底部运营位处理文案
                activityName, // 活动名称
                payIconUrl, // 购买按钮角标
                discountIcons, // 折扣信息
                spendCouponId: spend_coupon_id, // 满减卷信息
                spendCouponRecordId: spend_coupon_record_id, // 满减卷信息
                discountInfo, // 优惠信息
                payTop, // 顶部通用运营位
            };
        },

        // 点击切换批量购档位
        tapChangeGear(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            let { batchPriceList, wallet } = this.data;
            const index = dataset.index;

            const options = this.formatPayBase({
                index, // 购买列表索引
                batchPriceList, // 批量购列表
            });

            const params = {
                ...options,
                batchPriceIndex: index,
            };

            // 余额不足 请求余额不足的按钮
            if (wallet < options.price && !!global.userId) {
                if (this.data.isShowRecharge) {
                    params.payBtnText = '立即充值';
                } else {
                    this.getBtnText(options.price);
                }
            } else {
                params.payBtnText = this.data.isShowRecharge ? '立即充值' : '确认支付';
            }

            this.setData(params);
        },

        // 获取埋点数据,并且上报显示弹窗埋点
        // 运营位的埋点可以复用此方法
        // 会员的曝光和点击看看如何调整复用此方法
        async commonTrack({ behavior = 0, eventName = 'PayPopup', clickParams = {} } = {}) {
            let { topicId, comicId } = this.data,
                res = {};
            if (!behavior) {
                res = await api.getPointCharge({ comic_id: comicId, topic_id: topicId });
            }
            // priceInfo 价格信息
            // discountIcons 原有折扣相关信息，待重新处理@赵栓
            // priceInfo.red_packet_deduction 确定当没有代金劵时，代金劵金额上传空字符串还是其他，待确定
            // payTop 付费弹窗顶部通用运营位信息
            // headData 人物气泡内信息（text1、text2、action_target）
            // batchPriceList 批量购档位列表
            const {
                wallet,
                price,
                isvip, // 待确定，2，3，4从用户信息中取，接口不下发的话
                popType = 1,
                payTop = {},
                headData = {},
                priceInfo = {}, // 待确定
                discountIcons = [],
                activityId,
                topicTitle,
                comicTitle,
                isLimitFree,
                batchPriceList,
            } = this.data;
            const hasCoupon = discountIcons.some((item) => item.id !== 2);
            const deduction = priceInfo.red_packet_deduction || '';
            const couponReport = [hasCoupon ? 1 : 0, deduction];

            // 付费相关通用埋点数据
            let payTrackData = behavior
                ? this.data.payTrackData
                : {
                      TriggerPage: 'ComicPage',
                      TopicName: topicTitle,
                      ComicName: comicTitle,
                      LatestBalance: wallet, // 我的余额
                      LastRechargeTime: res.LastRechargeTime, // 最后充值时间
                      RechargeType: res.RechargeType, // 累计充值次数
                      MembershipClassify: isvip ? 1 : 0, // 会员的身份 1会员，0非会员
                      VoucherPaid: couponReport[0], // 是否有代金券优惠
                      VoucherCount: couponReport[1], // 代金券优惠金额
                      TopText: payTop && payTop.text ? payTop.text : '空', // 顶部运营位文案
                  };

            let popActivityName = '',
                NoticeType = '付费';
            if (!this.data.isLogin) {
                // 人物气泡曝光上报参数
                popActivityName = !this.data.isCanPay ? '章节尚未解锁' : headData.text1.join('') + '您需要先登录才能查看哦';
                NoticeType = '登录';
                payTrackData.NoticeType = NoticeType;
            } else {
                if (!behavior) {
                    // behavior为0是曝光
                    if (popType == 1) {
                        let filterData = this.data.preBanner[0] || {};
                        if (filterData.type == 120 && this.data.isCanPay) {
                            // 充值礼包
                            // 浮层运营位曝光上报参数
                            popActivityName = headData.text1.join('') + headData.text2.join('');
                            NoticeType = filterData.charge_send_info.banner_type_name || '充值礼包';
                        } else if (filterData.type == 89 && this.data.isCanPay) {
                            // 定向限免
                            // 浮层运营位曝光上报参数
                            popActivityName = headData.text1.join('') + headData.text2.join('');
                            NoticeType = '定向限免';
                        } else {
                            // 普通付费
                            // 浮层运营位曝光上报参数
                            let text1 = !this.data.isCanPay ? '章节尚未解锁' : headData.text1.join('');
                            let text2 = !this.data.isCanPay ? '章节尚未解锁' : headData.text2.join('');
                            popActivityName = text1 + text2;
                            NoticeType = wallet < price ? '充值' : '付费';
                        }
                        if (this.data.isReadCoupon) {
                            NoticeType = '使用阅读券';
                        }
                    } else if (popType == 2) {
                        // 浮层运营位曝光上报参数
                        popActivityName = headData.text1.join('') + headData.text2.join('');
                        NoticeType = '会员限免';
                    }
                    payTrackData.NoticeType = NoticeType;
                } else {
                    // 点击
                    payTrackData.NoticeType = NoticeType;

                    Object.assign(payTrackData, clickParams);

                    // 点击其他特殊参数
                    // if (popType == 1) {}
                }
            }

            if (!behavior) {
                // 浮层运营位曝光上报(人物气泡)
                app.kksaTrack('PayPopup', {
                    PayActivityName: popActivityName,
                    NoticeType: NoticeType || '',
                    OperationName: '浮层运营文案',
                    IsPayPopupShow: false,
                    IsBatchPaidShow: isLimitFree && !!batchPriceList && batchPriceList.length > 1,
                    PUWID: activityId, // 弹窗id
                });
            }

            // 存储付费相关通用埋点数据@张金超 点击时不需要set，已处理
            const backFun = () => {
                return new Promise((resolve) => {
                    if (!behavior) {
                        this.setData(
                            {
                                payTrackData,
                            },
                            () => {
                                resolve();
                            }
                        );
                    } else {
                        resolve();
                    }
                });
            };
            backFun().then(() => {
                const { activityId, isAdv = false, isAdLoading = false, payTrackData = {}, PUWID, VIPPrice, isLimitFree, IsVIPDiscount, VIPDiscountName } = this.data;
                let data = {
                    ...payTrackData,
                    ShowSuccess: isAdv ? 1 : 0, // 有无广告
                    LoadSuccess: isAdv ? (isAdLoading ? 1 : 2) : 0, // 广告预加载结果
                    PUWID: activityId, // 弹窗id
                };

                // 限免类型弹窗 上报命中/会员优惠卷名称/会员价格
                if (popType == 2) {
                    data.IsVIPDiscount = IsVIPDiscount;
                    data.VIPDiscountName = VIPDiscountName;
                    data.VIPPrice = VIPPrice;
                    data.PUWID = PUWID;
                }

                // 除了浮层和运营位，都报true, 这部分待确定
                data.IsPayPopupShow = true;
                data.IsBatchPaidShow = isLimitFree && !!batchPriceList && batchPriceList.length > 1;
                app.kksaTrack(eventName, data); // 埋点
            });
        },

        // 跳转会员充值页面（只有会员限免弹窗按钮&人物气泡）
        // 0: 会员限免跳转 1:底部工具栏充值跳转
        openVipPageFun(e) {
            const { type = 0 } = e.detail;
            const params = {
                behavior: 1,
                eventName: 'ClickPayPopup',
            };
            if (type == 0) {
                params.clickParams = {
                    ButtonName: '会员限免',
                    ButtonType: '会员限免',
                };
            } else if (type == 1) {
                params.PUWID = this.data.activityId;
                params.clickParams = {
                    ButtonName: '充值',
                    ButtonType: '充值按钮',
                };
            }

            this.commonTrack(params);
            if (!this.data.isLogin) {
                util_logout();
            } else {
                const actionParams = {
                    type: 2,
                };
                if (type) {
                    actionParams.topicid = this.data.topicId;
                } else {
                    actionParams.topicId = this.data.topicId;
                    actionParams.topicName = this.data.topicTitle;
                    actionParams.VIPDiscountName = this.data.VIPDiscountName;
                }
                util_action({ type: type ? 22 : 43, subpack: true, params: actionParams });
            }
        },

        // 定向限免跳转会员开通页
        limitFreeVipFun(e) {
            // 传入一个类型btntype表示0: 底部强提示按钮，1:定向限免
            // 明确定向限免使用的跳转数据时charge_vip_info还是pic_中的action_target
            // 历史head用的pic_、中间内容按钮使用的charge_vip_info
            // 此部分关注注意
            let params = {},
                event = {};
            const { activityId, activity_name, topicId, comicId, VIPDiscountName, text1, text2, charge_vip_info } = this.data.orientLimitData || {};
            const { action_target = {}, good_id = '' } = charge_vip_info || {};
            const { action_type: type, target_id: id, target_web_url: url } = action_target;
            if (e.detail.btntype) {
                params = {
                    activityId,
                    activity_name,
                    topicId,
                    comicId,
                    VIPDiscountName,
                    text1,
                    text2,
                };
                event = {
                    type,
                    id,
                    url,
                };
            } else {
                params = {
                    activityId: this.data.activityId,
                };
            }

            Object.assign(event, {
                goodid: good_id,
                btntype: '', // 定向限免是limitFreeLink, 底部强提示，判断是强提示还是定向限免
                actname: '', // 底部强提示时活动名称actname
                jumptype: '', // 强提示按钮存在
                btnname: '', // 底部强提示按钮名称
            });
            Object.assign(event, e.detail);
            jumpVipFun({ event, params });
        },

        // 余额不足非会员未登录
        clickOpenVip() {
            if (!this.data.isLogin) {
                wx.navigateTo({ url: '/pages/login/login' });
                return false;
            }
            this.commonTrack({
                behavior: 1,
                eventName: 'ClickPayPopup',
                clickParams: {
                    ButtonName: '开通会员',
                    ButtonType: 'KK币余额不足',
                },
            });
            util_action({ type: 43 });
        },

        // 点击付费弹窗关闭按钮
        clickCloseBtn() {
            // 如果是向限免和正本限免的情况 防止重复点击
            if (!this.data.isClickClose) {
                return false;
            }
            this.data.isClickClose = false;

            let { isLogin } = this.data;
            let storeDate = getStoreVipData(); // 获取存储的时间
            let curDate = getTodayDate(); // 获取当前时间
            // 判断存储日期和今天日期比较结果
            let dateResult = judgmentDate(storeDate.time, curDate.time);
            if (dateResult.pastDate && isLogin) {
                this.setData({ showVipDetainment: true });
            } else {
                // 用户未登录的情况 或者不是每日首次点击
                this.data.isClickClose = true;
                this.clickNavigateBack();
            }
        },

        // 挽留弹窗关闭事件
        onVipDetaClose(e) {
            const { isNoData } = e.detail;
            let showVipDetainment = this.data.showVipDetainment;
            if (isNoData && showVipDetainment) {
                // 如果没有数据,并且是点击关闭的行为
                this.clickNavigateBack();
            } else {
                this.setData({ showVipDetainment: false });
                this.data.isClickClose = true; // 提前看可以点击关闭
            }
        },

        // 返回上一页能力
        clickNavigateBack() {
            let dataTrack = {
                ButtonName: '关闭',
                ButtonType: this.data.isShowRecharge ? 'KK币余额不足' : '关闭弹窗',
                PUWID: this.data.activityId, // 弹窗id
                NoticeType: this.data.isReadCoupon ? '使用阅读券' : '关闭',
            };
            app.kksaTrack('ClickPayPopup', dataTrack);
            clickNavigateBackFun({ topicId: this.properties.topicId });
        },

        /**
         * setEvent 发送给父级页面的信息 onUnlocking事件名称
         * 返送发数据
         * type:kkb  解锁方式  可选值: kkb(支付) / adv(广告)
         * state:true 解锁状态 可选值: true(成功) / false(失败)
         * message:'解锁成功' 解锁描述  可选值: 解锁成功 / 解锁失败
         * toast:{ show: false, message:'xxx' }
         * **/
        setEvent({ type = 'kkb', state = false, message = '解锁成功', toast = { show: false, message: '' } } = {}) {
            let event = 'onUnlocking';
            let sendData = {
                type, // 解锁方式  kkb(支付)  / adv(广告)
                state, // 解锁状态
                message,
                toast,
            };
            this.triggerEvent(event, sendData, { bubbles: true, composed: true });
        },

        // 解锁成功后关闭弹窗  callback=> 向父级发送数据
        closePopup(callback) {
            callback = callback ? callback : function () {};
            this.setData(
                {
                    isShowPopupCon: false, // 是否显示弹窗内容 默认不显示
                },
                () => {
                    setTimeout(() => {
                        this.setData({
                            isShowPopup: false, // 是否显示弹窗  默认不显示
                        });
                    }, 500);
                    if (callback && typeof callback == 'function') {
                        callback();
                    }
                }
            );
        },

        // 设置基本设备信息和登录状态
        setSysAndUserInfo(callback) {
            let { isiOS, iPhoneX } = app.globalData;
            let userInfo = this.data.userInfo; // 用户信息
            this.setData(
                {
                    isiOS,
                    iPhoneX,
                    isLogin: !!userInfo,
                },
                () => {
                    if (callback && typeof callback == 'function') {
                        callback();
                    }
                }
            );
        },

        handleItemChange(e) {
            const { activeItem = {} } = e.detail;
            this.setData({
                rechargeInfo: activeItem,
            });
        },

        // 点击支付或者余额不足，立即充值按钮
        onPayClick(event) {
            let { wallet, price, topicId: topicid, isLogin, activityId, isReadCoupon, isCanPay, isShowRecharge, rechargeInfo } = this.data;
            let time = setTimeout(async () => {
                clearInterval(time);
                let dataset = event.detail || {};

                // 公共埋点
                const options = {
                    PUWID: activityId,
                    ButtonName: dataset.btnname,
                    ButtonType: dataset.btntype,
                };
                if (isReadCoupon) {
                    options.NoticeType = '使用阅读券';
                }
                this.commonTrack({
                    behavior: 1,
                    eventName: 'ClickPayPopup',
                    clickParams: options,
                });

                if (!isLogin) {
                    wx.navigateTo({ url: '/pages/login/login' });
                    return false;
                }

                // kkb充足：确认支付操作；kkb不足&非ios: 跳充值页
                if (wallet >= price) {
                    this.requestPaid(dataset.btnname);
                } else {
                    if (isCanPay) {
                        if (isShowRecharge) {
                            this.commonTrack({
                                behavior: 1,
                                eventName: 'ClickPayPopup',
                                clickParams: {
                                    ButtonName: '立即充值',
                                    ButtonType: 'KK币余额不足',
                                },
                            });
                            await this.surePayFun({
                                pay_source: 2,
                                good_item: rechargeInfo,
                                sa_infos: {
                                    NoticeType: 'kk币余额不足弹窗',
                                },
                            });
                            this.triggerEvent('reloadPage');
                        } else {
                            util_action({
                                type: 22,
                                params: { type: 2, topicid },
                            });
                        }
                    }
                }
            }, 200);
        },

        // 点击运营项目操作
        goActivity(event) {
            let dataset = event.currentTarget.dataset;
            let { targetId, targetUrl, targetType } = this.data.payTop;

            // 公共埋点
            this.commonTrack({
                behavior: 1,
                eventName: 'ClickPayPopup',
                clickParams: {
                    PUWID: this.data.activityId,
                    ButtonName: dataset.btnname,
                    ButtonType: dataset.btntype,
                },
            });

            // 埋点 E
            if (targetType == 3) {
                wx.redirectTo({
                    url: `/pages/${getApp().globalData.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${targetId}&comicId=${targetId}`,
                });
            } else {
                util_action({ type: targetType, id: targetId, url: targetUrl });
            }
        },

        // 点击底部切换是否自动购买
        switchAuto() {
            this.setData({
                autoPay: !this.data.autoPay,
            });
        },

        // 广告预加载结果
        advPreLoad(event) {
            const detail = event.detail || {};
            const { isAdLoading = false } = detail;
            this.data.isAdLoading = isAdLoading;
            if (!this.data.isAdLoadFlag) {
                this.data.isAdLoadFlag = true;
                this.commonTrack();
            }
        },

        // 广告点击埋点
        advClickTrack(event) {
            const detail = event.detail || {};
            const { ButtonName, ButtonType } = detail;
            this.commonTrack({
                behavior: 1,
                eventName: 'ClickPayPopup',
                clickParams: {
                    ButtonName,
                    ButtonType,
                },
            });
        },

        // 支付操作
        requestPaid(TriggerButton = '') {
            if (this.data.payLoading) {
                return false; // 防止重复购买
            }
            let { topicId, comicId, payFrom, autoPay, encrypt, spendCouponId, spendCouponRecordId } = this.data;
            this.setData({
                payLoading: true, // 设置为加载状态
            });
            let postData = {
                spend_coupon_id: spendCouponId,
                spend_coupon_record_id: spendCouponRecordId,
                comicbuy_encrypt_str: encrypt,
                auto_pay: autoPay,
                source: payFrom,
                target_id: comicId, // 章节id
            };

            api.requestPaid(postData)
                .then((res) => {
                    // 缺少埋点操作
                    let { data } = res;
                    data = data ? data : {};
                    // 获取kk支付信息(赠送和充值kkb的字段)
                    let consume_info = data.consume_info ? data.consume_info : {};
                    // 代金劵活动id
                    let rp_activity_id = data.rp_activity_id;
                    // 漫画订单对象
                    let comic_order = data.comic_order || {};
                    // 埋点 S
                    let payTrackData = this.data.payTrackData;
                    let dataTrack = {
                        TopicName: payTrackData.TopicName, // 专题名称
                        ComicName: payTrackData.ComicName, // 漫画名称
                        AutoPaid: 0, // this.data.autoPay ? 1 : 0, //是否自动购买  1自动购买，0非自动购买
                        CurrentPrice: this.data.price, // 实际支付价格
                        SpendGiveCurrency: consume_info.activity_consume ? consume_info.activity_consume : 0, // 消费赠币数量
                        SpendRecharge: consume_info.kb_consume ? consume_info.kb_consume : 0, // 消费充值币数量
                        LastRechargeTime: payTrackData.LastRechargeTime, // 最后充值时间
                        TechargeType: payTrackData.RechargeType, // 累计充值次数
                        MembershipClassify: payTrackData.MembershipClassify, // 是否为会员
                        VoucherPaid: payTrackData.VoucherPaid, // 是否有代金券优惠  1有，0没有
                        VoucherCount: payTrackData.VoucherCount, // 代金券优惠金额
                        AdPaid: 0, // 使用广告解锁成功	1为广告解锁成功   0为广告解锁失败(无广告)
                        TriggerPage: 'ComicPage', // 触发的页面
                        TriggerButton: TriggerButton, // 点击的按钮
                        SourcePlatform: payTrackData.SourcePlatform, // 来源平台
                        VoucherActivityId: rp_activity_id || -1, // 代金劵活动id
                        BatchPaid: comic_order.product_type === 2, // 是否是批量购买
                        BatchDiscount: consume_info.batch_discount || 0, // 批量购买优惠金额
                    };

                    // 用户手动购买
                    app.kksaTrack('Consume', dataTrack);
                    // 埋点 E

                    // 前端日志
                    util_logManager({
                        LogType: 'pay',
                        LogInfo: {
                            currentPrice: this.data.price,
                            topicName: payTrackData.TopicName,
                            comicName: payTrackData.ComicName,
                            topicId,
                            comicId,
                        },
                    });

                    // const toast = this.data.autoPay ? '已开启自动购买，可在钱包中取消' : '买好啦，请愉快食用！'
                    const toast = '买好啦，请愉快食用！';
                    // 关闭弹窗
                    this.closePopup(() => {
                        // 发送父级数据
                        this.setEvent({
                            type: 'kkb',
                            state: true,
                            message: '解锁成功',
                            toast: { show: true, message: toast },
                        });
                        this.setData({
                            // 隐藏弹窗
                            payLoading: false, // 可以再次购买了
                        });
                    });
                    // wx.redirectTo({ url: `/pages/comic/comic?comicId=${ comicId }&toast=${ toast }` })
                })
                .catch((err) => {
                    this.closePopup(() => {
                        // 发送给父级数据
                        this.setEvent({
                            type: 'kkb',
                            state: true,
                            message: err.message,
                            toast: { show: true, message: err.message },
                        });
                        this.setData({
                            payLoading: false, // 可以再次购买了
                        });
                    });
                    let payTrackData = this.data.payTrackData || {};
                    util_logManager({
                        LogType: 'pay',
                        LogInfo: {
                            currentPrice: this.data.price,
                            topicName: payTrackData.TopicName,
                            comicName: payTrackData.ComicName,
                            topicId,
                            comicId,
                        },
                        ErrorMsg: '支付失败',
                    });
                });
        },
        textHandle(str, separator) {
            if (!str) {
                return '';
            }
            return str.split(separator);
        },

        // 获取充值余额不足文案
        getBtnText(price) {
            api.requestGoods({
                comic_price_list: JSON.stringify([price]),
                topic_id: this.data.topicId,
                from: app.globalData.payfrom,
            }).then((res) => {
                if (res.code == 200) {
                    const { data = {} } = res,
                        { recharges = [] } = data,
                        { recharge_goods = [] } = recharges[0],
                        { buy_title } = recharge_goods[0] || {};
                    this.setData({
                        payBtnText: buy_title || '余额不足，立即充值',
                    });
                }
            });
        },

        // 天将礼包部分优化,天将礼包展示时，付费弹窗人物头像不展示
        paySpreeShow() {
            this.setData({
                hidePerson: true,
            });
        },
    },
});
