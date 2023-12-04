/**
 * kk币充值
 */
import { util_action, util_showToast, util_hideToast, util_checkWallet, util_buyRedirect, util_logManager, util_getDynamicData } from '../../../util.js';

const app = getApp();
const { connect } = app.Store;
const api = require('./api'); // api 请求
let loadTrackBack = null;

const page = {
    data: {
        isiOS: app.globalData.isiOS, // 是否ios系统
        iPhoneX: app.globalData.iPhoneX, // 是否为ios全屏手机
        wechatTicket: {
            // 微信(qq)支付必要信息
            timeStamp: '', // 时间戳，从 1970 年 1 月 1 日 00:00:00 至今的秒数，即当前的时间
            nonceStr: '', // 随机字符串，长度为32个字符以下
            package: '', // 统一下单接口返回的 prepay_id 参数值，提交格式如：prepay_id=***
            signType: 'MD5', // 签名算法
            paySign: '', // 签名，具体签名方案参见
        },
        rechargeList: [], // 充值商品列表
        rechargeType: '', // 充值类型
        wordsInfo: {}, // 文案展示 主要使用 wordsInfo.wallet_word (充值副标题)
        rechargeDesc: '', // 充值文案描述
        paySource: 1, // 下单来源  1:我的钱包  2:活动页
        // payType: 2, // 1:支付宝   2:微信支付3:QQ支付4:APPLE PAY  接口获取
        goodType: 1, // 1:充值业务 2:会员充值业务 (kkb充值==1)
        payfrom: app.globalData.payfrom, // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
        open_id: '',
        activeItem: {}, // 选中的商品数据(需要下单的商品数据)
        payTypes: {}, // 付款类型 pay_types[0]微信  pay_types[1]qq  app.globalData.channel 平台标识，微信: wechat，QQ: qq，用于接口url传参{channel}
        order_id: '', // 订单id
        isBuyBtnTap: true, // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
        isShowMpDialog: false, // 是否显示定点查询失败弹窗  true:显示  false:不显示
        isShowPopup: false, // 是否显示 充值成功弹窗
        rechargeResult: 0, // 本次充值的金额  充值成功弹窗使用
        userAccount: 0, // 充值成功弹窗显示的当前余额
        rechargeKkb: {
            // 本次充值的金额 充值了多少,赠送了多少
            recharge_value: 0, // 充值的kkb
            present_red_kkb: 0, // 赠送的kkb
        },
        topicList: [], // 充值成功弹窗 展示的推荐专题
        // 页面需要使用的图片远程地址
        images: {
            close: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/close_00499c9.png',
            kkb: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/kkb_c6c729e.png',
            popup: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/popup_b0c5425.png',
            subtitleIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/subtitle-icon_b6b0859.png',
            topBg: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/top-bg_de77397.png',
            couponBg: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/mask_35a1bc1.png',
        },
        RechargeType: 0, // 累计充值次数
        LastRechargeTime: -2, // 最后充值时间

        topicId: '', // 专题ID
        shotCouponActivity: false, // 是否命中活动
        shotCouponText: false, // 是否命中代金券

        isPayPopTest: false, // 支付成功弹窗，新版（实验）

        // 运营位充值banner信息
        couponInfo: {},
        // 运营位活动名称
        couponActivityName: '',
        delayCheckOrder: 0, // 查询订单状态，轮询查询次数
        awardList: '', // 充值奖励联合会员
        redirect_url: '', // 支付成功后返回的地址
        isRedirectUrl: false, // 是否设置返回刷新H5
        accumActivity: {}, // 多充多送模块信息
        chargeQualificationActivity: null, // 赠币活动信息
        param_trigger_page: '', // 链接参数带来的当前充值来源页面名称(埋点使用)
        param_activity_name: '', // 链接参数带来的当前充值来源页面活动名称(埋点使用)
        param_arg_type: '',
    },

    onLoad(options) {
        let {
            type,
            topicid,
            arg_type,
            redirect_url, // 支付成功后返回的地址
            trigger_page, // 链接参数带来的当前充值来源页面名称(埋点使用)
            activity_name, // 链接参数带来的当前充值来源页面活动名称(埋点使用)
        } = options;

        // 下单来源  1:我的钱包  2:活动页
        type = type == 1 ? 1 : type == 2 ? 2 : 1;

        // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
        let payfrom = app.globalData.payfrom;

        this.data.redirect_url = redirect_url || '';
        // 链接参数带来的当前充值来源页面名称(埋点使用)
        this.data.param_trigger_page = decodeURIComponent(trigger_page || '');
        // 链接参数带来的当前充值来源页面活动名称(埋点使用)
        this.data.param_activity_name = decodeURIComponent(activity_name || '');
        // 其他参数类型
        this.data.param_arg_type = decodeURIComponent(arg_type || '');

        // 存储下单来源
        this.setData({
            paySource: type,
            payfrom,
            topicId: topicid || '',
        });

        // 在钱包接口拉取成功后执行回调进行埋点
        if (this.data.userInfo) {
            loadTrackBack = () => {
                this.onloadTrackFun();
            };
        } else {
            this.setWallet(0);
            this.onloadTrackFun();
        }

        // 支付弹窗实验
        app.getAbTest().then((list) => {
            this.setData({
                isPayPopTest: list.includes('s_pay_siyuwx_a'), // 是否命中新版实验弹窗
            });
        });

        // 获取充值文案
        this.getRechargeDesc();
    },

    // 页面出现在前台时执行
    onShow() {
        util_buyRedirect(app); // 充值业务页面 如果是微信平台并且是ios设备在线上环境,的页面跳转
        // buykkb_order_id 本地存储的订单号
        // this.checkWallet();// 检查kk币余额

        // 检查是否命中活动
        this.getKKBCoupon();

        // 获取kkb充值套餐
        this.getKkbSetMealList();

        // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
        this.setData({
            isBuyBtnTap: true,
        });

        // 查询本地存储的订单号后,查询订单,并且删除本地存储的订单号
        this.getStorageOrderId()
            .then((res) => {
                if (!res) {
                    return false;
                }
                this.setData({ order_id: res });
                // 删除本地存储的订单号
                this.removeStorageOrderId();
                // 查询订单
                this.getKkbOrderId(res);
            })
            .catch(() => {});
    },

    // onload埋点相关回调方法
    onloadTrackFun() {
        let kksaTrackData = {
            LatestBalance: '', // 我的余额
            LastRechargeTime: '', // 最后充值时间
            RechargeType: '', // 累计充值次数
            SourcePlatform: app.globalData.channel, // 来源平台
        };
        api.getPointCharge().then((res) => {
            let {
                LastRechargeTime, // 最后充值时间
                RechargeType, // 累计充值次数
            } = res;
            kksaTrackData.LastRechargeTime = LastRechargeTime;
            kksaTrackData.RechargeType = RechargeType; // 累计充值次数
            kksaTrackData.LatestBalance = this.data.wallet; // kkb数量
            kksaTrackData.IsRechargeVoucher = this.data.shotCouponActivity; // 是否展示充值代金券活动
            kksaTrackData.RechargeVoucherActivityName = this.data.couponActivityName; // 充值送代金券活动名称
            const { shotCouponActivity, couponInfo } = this.data;
            if (!shotCouponActivity && couponInfo.comicImg) {
                kksaTrackData.ModuleName = '充值中心运营位-banner';
            }

            // 多充多送模块属性
            if (couponInfo.bannerType == 2 && couponInfo.viewType == 2) {
                kksaTrackData.ModuleName = `充值中心运营位-多充多送-${this.data.accumActivity.activity_id}`;
            }
            // 如果url参数代用trigger_page埋点上报TriggerPage
            if (this.data.param_trigger_page) {
                kksaTrackData.TriggerPage = this.data.param_trigger_page;
            }
            this.setData({ RechargeType, LastRechargeTime });
            app.kksaTrack('VisitCheckout', kksaTrackData); // 埋点
        });
    },

    // 页面从前台变为后台时执行
    onHide() {
        this.setData({ chargeQualificationActivity: null });
        api.unloadReportPayInfo({ type: 'kkb' })
            .then(() => {
                // eslint-disable-next-line no-console
                console.log('上报成功');
            })
            .catch(() => {});
    },

    // 页面销毁时执行
    onUnload() {
        let { isRedirectUrl, redirect_url } = this.data;
        if (isRedirectUrl && redirect_url) {
            // let pages = getCurrentPages();
            // let prevPage = pages[pages.length - 2]; // 上一个页面
            let backh5url = this.data.redirect_url;
            app.globalData.webviewRedirectUrl = backh5url; // 全局变量记录的webview重定向地址
            // prevPage.setData({ redirect_url: backh5url });
        }
        api.unloadReportPayInfo({ type: 'kkb' })
            .then(() => {
                // eslint-disable-next-line no-console
                console.log('上报成功');
            })
            .catch(() => {});
    },

    // 页面被用户分享时执行
    onShareAppMessage() {},

    // 检查kk币余额，以及set钱包运营文案      kkb展示的气泡文案
    checkWallet(callBack) {
        if (!this.data.userInfo) {
            this.setWallet(0);
            // 回调函数
            if (callBack && typeof callBack == 'function') {
                let time = setTimeout(() => {
                    clearTimeout(time);
                    callBack();
                }, 500);
            }
            return false;
        }
        // 查询kkb余额,并且存储
        util_checkWallet(this)
            .then(() => {
                if (callBack && typeof callBack == 'function') {
                    let time = setTimeout(() => {
                        clearTimeout(time);
                        callBack();
                    }, 500);
                }
            })
            .catch(() => {
                this.setState(0);
                // 回调函数
                if (callBack && typeof callBack == 'function') {
                    let time = setTimeout(() => {
                        clearTimeout(time);
                        callBack();
                    }, 500);
                }
            });
    },

    // 获取本地存储的订单id,onShow查询订单状态使用
    getStorageOrderId() {
        return new Promise((resolve, reject) => {
            wx.getStorage({
                key: 'buykkb_order_id',
                success: (res) => {
                    resolve(res.data);
                },
                fail: () => {
                    reject();
                },
            });
        });
    },

    // 删除本地存储要查询的订单号
    removeStorageOrderId() {
        wx.removeStorage({
            key: 'buykkb_order_id',
            success() {
                // console.log('removeStorageOrderId:',res)
            },
        });
    },

    async partInActivity() {
        let activity_code = wx.getStorageSync('buykkb:activitycode') || '';
        if (!activity_code) {
            const id = app.globalData.onRelease ? 75 : 49;
            const { data } = await util_getDynamicData({ id });
            activity_code = data ? data.desc : '';
            if (activity_code) {
                wx.setStorage({
                    key: 'buykkb:activitycode',
                    data: activity_code,
                });
            }
        }
        const { data } = await api.postParkInActivity({ activity_code }).catch(() => ({}));
        return data ? data.result_code : -1;
    },

    async getRechargeDesc() {
        const id = app.globalData.onRelease ? 102 : 59;
        const { data } = await util_getDynamicData({ id });
        const { order_froms, desc } = data;

        if (desc && order_froms.includes(3)) {
            this.setData({
                rechargeDesc: data.desc,
            });
        }
    },

    // 获取kkb充值套餐 ,请求参数暂无
    async getKkbSetMealList() {
        await this.partInActivity();
        const allPromise = this.data.userInfo ? [api.getKkbSetMealList({ from: this.data.payfrom }), util_checkWallet(this)] : [api.getKkbSetMealList({ from: this.data.payfrom })];
        Promise.all(allPromise)
            .then((res) => {
                let { code, data, message } = res[0];
                if (code != 200) {
                    // 错误提示
                    util_showToast({
                        title: message,
                        type: 'error',
                        mask: true,
                        duration: 3000,
                    });
                    return false;
                }
                let {
                    open_id, // 开放id
                    accum_activity, // 累积活动
                    recharges, // 充值信息
                    charge_qualification_activity, // 参与活动信息
                } = data; // 解构数据

                // 充值信息S
                recharges = recharges[0] ? recharges[0] : {};
                let {
                    recharge_type, // 充值类型
                    recharge_goods, // 充值列表
                    pay_types, // 支付渠道
                    recharge_type_desc, // 底部充值说明
                    words_info, // 文案展示, 主要使用words_info.wallet_word(充值副标题)
                } = recharges; // 解构充值信息

                // 文案展示, 主要使用words_info.wallet_word(充值副标题)
                let wordsInfo = words_info ? words_info : {};
                // 充值列表
                let rechargeType = recharge_type ? recharge_type : '';
                // 充值类型
                let rechargeList = recharge_goods ? recharge_goods : [];
                // 格式化充值列表 S
                rechargeList.forEach((item) => {
                    item.recharge_type = item.recharge_type ? item.recharge_type : ''; // 充值类型
                    item.recharge_type_name = item.recharge_type_name ? item.recharge_type_name : ''; // 充值类型名称
                    item.discount = item.discount ? item.discount : ''; // 折扣
                    item.description = item.description ? item.description : ''; // 描述
                    item.real_price = item.real_price ? item.real_price : 0; // 实际价格  单位分
                    item.realPrice = item.real_price / 100; // 以元为单位
                    item.title = item.title ? item.title : ''; // 充值标题
                    item.recharge_value = item.recharge_value ? item.recharge_value : ''; // 充值的kkb
                    item.iap_good_id = item.iap_good_id ? item.iap_good_id : ''; // 充值商品id
                    item.present_red_pack = item.present_red_pack ? item.present_red_pack : ''; // 赠送红包
                    item.platform = item.platform ? item.platform : ''; // 平台
                    item.recharge_good_type = item.recharge_good_type ? item.recharge_good_type : ''; // 充值方式
                    item.sequence = item.sequence ? item.sequence : 0;
                    // item.comic_buy_icon 充值icon
                    // item.kb_image_url kkb的icon
                    item.id = item.id ? item.id : 0; // id
                    // item.topic_id  专题id? show_image_url_source显示图像url源
                    // item.red_pack_activity_start_time 红包活动开始时间
                    // item.red_pack_activity_end_time 红包活动结束时间
                    // item.present_id  当前id   item.mark_price ?//
                    // item.good_type 商品类型  item.third_activity 三方活动?
                    // item.show_type 显示类型?  item.show_image_url kkb其它icon  item.sequence 序列
                    // red_pack_limit_time_millis红色包装限制时间毫秒  present_value现值
                    // kb_image_url_source 图片源 red_pack_show_image_url红包显示图片网址
                    // extra_info 额外信息  topic_title 主题名称  activity_status 活动状态  status状态
                    // activity_filter 活动过滤器  image_info 图片信息,对象
                    // item.words_info.explain_text 充值item中右上角红框文案
                    item.words_info = item.words_info ? item.words_info : { explain_text: '' };
                });
                rechargeList = rechargeList.sort((a, b) => {
                    return a.sequence - b.sequence;
                }); // 显示顺序调整
                // 格式化充值列表 E

                // 存储付款类型 pay_types 信息S   百度 pay_type: 24      微信:pay_type: 10   qq: pay_type: 12
                let payTypesIndex = 0;
                if (app.globalData.channel == 'wechat') {
                    payTypesIndex = 10;
                }
                if (app.globalData.channel == 'baidu') {
                    payTypesIndex = 24;
                }
                if (app.globalData.channel == 'qq') {
                    payTypesIndex = 12;
                }
                let payTypes = {};
                if (pay_types && pay_types.length > 0) {
                    pay_types.forEach((item) => {
                        if (item.pay_type == payTypesIndex) {
                            payTypes = item;
                        }
                    });
                }

                // 一元档位&首充突出展示
                this.filterUnitary({ res: res[1] || {}, rechargeList });

                // 针对多充多送信息处理
                if (accum_activity.accum_desc) {
                    accum_activity.accum_desc = this.textHandle(accum_activity.accum_desc, '#');
                }
                this.setData({
                    activeItem: this.data.unitary ? this.data.unitary : rechargeList[0] ? rechargeList[0] : {}, // 选中的商品数据(需要下单的商品数据)
                    rechargeList, // 充值商品列表
                    rechargeType, // 充值类型
                    wordsInfo, // 文案展示 主要使用words_info.wallet_word(充值副标题)
                    rechargeDesc: this.data.rechargeDesc || recharge_type_desc, // 充值文案描述
                    open_id, // 开放id
                    payTypes, // 付款类型
                    accumActivity: accum_activity,
                    chargeQualificationActivity: charge_qualification_activity,
                });
            })
            .catch((err) => {
                if (err) {
                    util_showToast({
                        title: err.message,
                        type: 'error',
                        mask: true,
                        duration: 3000,
                    });
                }
            });
    },
    textHandle(str, separator) {
        if (!str) {
            return '';
        }
        return str.split(separator);
    },

    // 针对一元突出展示特殊处理
    filterUnitary({ res = {}, rechargeList = [] } = {}) {
        // 拦截突出展示一元购买,用户首次充值且档位中有一元档位，一元档位提出单独展示，焦点改变到一元上
        // v2/kb/mini/wallet（total_charge_cnt）
        if (this.data.userInfo) {
            if (loadTrackBack) {
                loadTrackBack();
                loadTrackBack = null;
            }
            const initCharge = res.wallet.total_charge_cnt;
            const isExistUnitary = rechargeList.findIndex((item) => item.real_price == 100);
            if (isExistUnitary != -1 && initCharge == 0) {
                // 只过滤一条数据
                // 展示一元特殊档位
                const activeItem = rechargeList.splice(isExistUnitary, 1)[0];
                this.data.unitary = activeItem;
                this.setData({
                    showUnitary: true,
                    unitaryDefalt: true,
                });
            } else {
                this.data.unitary = '';
                this.setData({
                    showUnitary: false,
                    unitaryDefalt: false,
                });
            }
        } else {
            this.data.unitary = '';
            this.setData({
                showUnitary: false,
                unitaryDefalt: false,
            });
        }
    },

    // 获取kkb 端外下单(点击立即支付按钮调用[获取订单号])
    postPayOrder(callback) {
        let activeItem = this.data.activeItem; // 选中的商品数据
        // eslint-disable-next-line sonarjs/prefer-object-literal
        let pay_info = {};
        pay_info.topic_id = this.data.topicId ? this.data.topicId * 1 : '';
        pay_info.third_activity = activeItem.third_activity;

        /*
         comic_id : 漫画id
         topic_id : 专题id
         source_type 说明：1：签到，2：皇冠，3：作品，4：礼包
         invite_code ：邀请码
         coupon_id : 优惠券id
         third_activity : 其他活动信息
         assign_info : 开通会员赠送福利信息(透传参数)
         sign : 验签
         request_id : member_good接口返回
         vip_source : 会员下单运营位来源
         */
        let payfrom;
        if (this.data.iPhoneX) {
            payfrom = 2;
        }
        let sendData = {
            pay_type: this.data.payTypes.pay_type, // 下单的业务 支付类型
            pay_source: this.data.paySource, // 下单来源  1:我的钱包  2:活动页
            good_type: this.data.goodType, // 1:充值业务 2:会员充值业务
            good_id: activeItem.id, // activeItem.iap_good_id,
            pay_info: JSON.stringify(pay_info),
            open_id: app.globalData.openId, // 开放id
            from: this.data.payfrom, // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
            payfrom: payfrom == 2 ? 2 : app.globalData.isiOS ? 2 : 1, //	1：安卓，2：IOS
        };

        // 点击KK币充值页按钮 埋点 S
        api.getPointCharge().then((res) => {
            let kksaTrackData = {
                PaymentsAccount: '', // 1000（充值档位的金额，分为单位）
                LastRechargeTime: '', // 最后充值时间
                RechargeType: '', // 累计充值次数
                SourcePlatform: app.globalData.channel, // 来源平台 weixin、qq、zijietiaodong、baidu、Alipay、M站
            };
            let {
                LastRechargeTime, // 最后充值时间
                RechargeType, // 累计充值次数
            } = res;
            kksaTrackData.LastRechargeTime = LastRechargeTime;
            kksaTrackData.RechargeType = RechargeType; // 累计充值次数
            kksaTrackData.PaymentsAccount = activeItem.recharge_value; // kkb数量
            app.kksaTrack('ClickRechargeButton', kksaTrackData); // 埋点
        });

        api.postPayOrder(sendData)
            .then((res) => {
                let { code, data, message } = res;
                if (code != 200) {
                    util_showToast({
                        title: message,
                        type: 'error',
                        mask: true,
                        duration: 3000,
                    });
                    return null;
                }
                if (callback && typeof callback === 'function') {
                    callback(data);
                }
            })
            .catch((err) => {
                util_showToast({
                    title: err.message,
                    type: 'error',
                    mask: true,
                    duration: 3000,
                });
            });
    },

    // 点击头部的时候,只有在没有登录状态跳转登录
    topLoginTap() {
        if (!this.data.userInfo) {
            wx.navigateTo({ url: '/pages/login/login' });
        }
        return false;
    },

    // 选择商品的点击事件(改为选中状态)
    choiceGoodTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let { index, id } = dataset;
        let data = this.data.activeItem ? this.data.activeItem : { id: 0 };
        if (data.id == id) {
            // 点击相同的商品什么也不做
            return false;
        }
        let activeItem = this.data.rechargeList[index]; // 充值商品列表

        this.setData({
            unitaryDefalt: false,
            activeItem, // 选中的商品数据(需要下单的商品数据)
        });
    },

    // 选择一元特殊档位
    choiceUnitaryTap() {
        this.setData({
            activeItem: this.data.unitary,
            unitaryDefalt: true,
        });
    },

    // 点击支付按钮
    buyBtnTap() {
        let _this = this;
        if (!this.data.userInfo) {
            wx.navigateTo({ url: '/pages/login/login' });
            return false;
        }
        // 防止重复点击支付按钮
        if (!this.data.isBuyBtnTap) {
            return false;
        }
        this.setData({
            // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
            isBuyBtnTap: false,
        });
        // 获取订单号和支付信息
        this.postPayOrder((res) => {
            let {
                pay_data, // 支付信息对象requestPayment支付所有信息
                pay_order, // 订单号信息对象  pay_order:order_id 订单信息
            } = res; // 下单信息 pay_order:order_id
            pay_order = pay_order ? pay_order : {};
            let order_id = pay_order.order_id ? pay_order.order_id : ''; // 订单号

            // 本地存的订单id,防止支付成功后退出小程序或者微信,在显示页面中查询
            wx.setStorage({ key: 'buykkb_order_id', data: order_id });

            this.setData({ order_id }); // data记录订单号

            // 微信场景
            wx.requestPayment({
                // timeStamp: pay_data.timeStamp ,
                // nonceStr: pay_data.nonceStr, package: pay_data.package,
                // signType: pay_data.signType, paySign: pay_data.paySign,
                ...pay_data,
                success() {
                    // 支付成功执行
                    // 查询本地存储的订单号后,查询订单,并且删除本地存储的订单号
                    _this.getStorageOrderId().then((res) => {
                        if (!res) {
                            return false;
                        }
                        // 删除本地存储的订单号
                        _this.removeStorageOrderId();
                        // 查询订单
                        _this.getKkbOrderId(res);
                    });
                },
                fail(res) {
                    // 支付失败执行
                    _this.trackErrPay(res); // 取消支付时上报 支付KKB 结果
                    // 查询本地订单号 后删除
                    _this.getStorageOrderId().then(() => {
                        _this.removeStorageOrderId();
                    });
                    util_logManager({
                        LogType: 'requestPayment',
                        LogInfo: {
                            type: '充值中心',
                            order_id,
                        },
                        ErrorMsg: res.errMsg,
                    });
                },
                complete() {
                    // 不管支付成功还是失败都会执行
                    _this.setData({
                        // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
                        isBuyBtnTap: true,
                    });
                },
            });
        });
    },

    // 区分专题页整本购来源
    retNotice() {
        // url参数param_arg_type
        const names = {
            1: '专题页新增入口购买',
            2: '专题页批量购买',
        };
        return this.data.param_arg_type ? { NoticeType: names[this.data.param_arg_type] || '' } : {};
    },

    // 查询订单状态 id:传递来的订单号,查询使用
    getKkbOrderId(id) {
        let order_id = id ? id : this.data.order_id; // 订单id

        this.showLoading(); // 打开加载浮层
        // 请求接口 查询订单状态
        let delayCheckTimer = setTimeout(() => {
            clearTimeout(delayCheckTimer);
            // 充值结果埋点数据 S
            let kksaRechargeResult = {
                TriggerPage: 'RechargePage 充值中心', // 触发页面 RechargePage 充值中心
                PaymentsAccount: this.data.activeItem.real_price, // 充值人民币金额  Number   1000（分为单位）
                KkAccount: 0, // 到账kk币金额  1200（KK币为单位）
                IsRechargeSuccess: 'False', // 充值是否成功 True/False
                FailReason: '', // 失败原因
                LastRechargeTime: this.data.LastRechargeTime, // 最后充值时间
                RechargeType: this.data.RechargeType, // 最后充值时间
                SourcePlatform: app.globalData.channel, // 来源平台 weixin、qq、zijietiaodong、baidu、Alipay、M站
                IsRechargeVoucher: this.data.shotCouponActivity,
                RechargeVoucherActivityName: this.data.couponActivityName,
            };
            // 充值结果埋点数据 E

            api.getKkbOrderId({ order_id })
                .then((res) => {
                    let { code, data } = res;
                    this.hideLoading(); // 关闭加载弹窗
                    data = data ? data : {};
                    data.pay_order = data.pay_order ? data.pay_order : {};
                    if (code != 200 || data.pay_order.pay_status != 2) {
                        this.data.delayCheckOrder++;
                        if (this.data.delayCheckOrder < 4) {
                            this.getKkbOrderId(id);
                        } else {
                            this.setData({ isShowMpDialog: true }); // 显示查询失败弹窗
                        }
                        return false;
                    }

                    this.getPayTopicList(); // 查询付费推荐章节(充值成功弹窗使用)
                    this.checkWallet(); // 检查kk币余额

                    let {
                        award_list, // 充值赠送联合会员
                        kb_charge_result, // 充值赠送信息
                        pay_order, // 充值订单信息
                        user_account, // 用户账号总余额 包含ios/and
                    } = data;
                    kb_charge_result = kb_charge_result ? kb_charge_result : {};
                    pay_order = pay_order ? pay_order : {};
                    user_account = user_account ? user_account : {};
                    // 充值赠送的kkb数量
                    let present_red_kkb = kb_charge_result.present_red_kkb ? kb_charge_result.present_red_kkb : 0;

                    // 充值是否送了代金券
                    let shotCouponText = kb_charge_result.present_red_pack > 0;
                    // 充值的kkb数据
                    let recharge_value = pay_order.recharge_value ? pay_order.recharge_value : 0;
                    // 充值kkb总数结果 =  充值的kkb数据 + 充值赠送的kkb数量;
                    let rechargeResult = recharge_value + present_red_kkb;
                    // ios 账号下的金额
                    user_account.ios_balance = user_account.ios_balance ? user_account.ios_balance : 0;
                    // 安卓账号下的金额
                    user_account.non_ios_balance = user_account.non_ios_balance ? user_account.non_ios_balance : 0;
                    // 充值送代金券活动名称
                    let present_red_pack_activity_name = kb_charge_result.present_red_pack_activity_name || '';
                    // 是否展示充值代金券活动
                    let present_red_pack_activity_show_banner = !kb_charge_result.present_red_pack_activity_show_banner;
                    // 充值成功弹窗显示的当前余额
                    let userAccount = 0;
                    if (app.globalData.isiOS) {
                        userAccount = user_account.ios_balance;
                    } else {
                        userAccount = user_account.non_ios_balance;
                    }

                    // 充值成功埋点 S
                    api.getPointCharge().then((res) => {
                        let {
                            LastRechargeTime, // 最后充值时间
                            RechargeType, // 累计充值次数
                        } = res;
                        kksaRechargeResult.IsRechargeVoucher = present_red_pack_activity_show_banner; // 是否展示充值代金券活动
                        kksaRechargeResult.RechargeVoucherActivityName = present_red_pack_activity_name; // 充值送代金券活动名称
                        kksaRechargeResult.PaymentsAccount = pay_order.order_fee; // 充值人民币金额
                        kksaRechargeResult.KkAccount = rechargeResult; // 埋点用的到账金额
                        kksaRechargeResult.IsRechargeSuccess = 'True'; // 埋点使用是否充值成功 True/False
                        kksaRechargeResult.FailReason = ''; // 充值失败原因
                        kksaRechargeResult.LastRechargeTime = LastRechargeTime; // 最后充值时间
                        kksaRechargeResult.RechargeType = RechargeType; // 累计充值次数
                        kksaRechargeResult.TopicName = this.data.couponInfo.topicName || '无';

                        // 多充多送模块属性
                        if (this.data.couponInfo.bannerType == 2 && this.data.couponInfo.viewType == 2) {
                            kksaRechargeResult.PayActivityName = `多充多送_${this.data.accumActivity.activity_id}`;
                        }
                        // url参数中带有trigger_page 充值事件上报TriggerPage修改为url参数带的trigger_page
                        if (this.data.param_trigger_page) {
                            kksaRechargeResult.TriggerPage = this.data.param_trigger_page;
                        }
                        // url参数中带有activity_name 充值事件上报ActivityName
                        if (this.data.param_activity_name) {
                            kksaRechargeResult.ActivityName = this.data.param_activity_name;
                        }

                        Object.assign(kksaRechargeResult, this.retNotice());
                        this.setData({ RechargeType, LastRechargeTime });
                        app.kksaTrack('RechargeResult', kksaRechargeResult); // 埋点
                    });
                    // 充值成功埋点 E

                    this.setData({
                        rechargeKkb: {
                            recharge_value, // 充值的kkb
                            present_red_kkb, // 赠送的kkb
                        },
                        rechargeResult, // 本次充值的金额
                        userAccount, // 充值成功弹窗显示的当前余额
                        shotCouponText, // 充值是否赠送代金券
                        awardList:
                            award_list && award_list.length
                                ? {
                                      button_text: award_list[0].button_text,
                                      description: award_list[0].description.split('#'),
                                      action_target: award_list[0].action_target,
                                  }
                                : null,
                    });
                })
                .catch((err) => {
                    this.data.delayCheckOrder++;
                    if (this.data.delayCheckOrder < 4) {
                        this.getKkbOrderId(id);
                    } else {
                        // 充值失败埋点 S
                        api.getPointCharge().then((res) => {
                            let {
                                LastRechargeTime, // 最后充值时间
                                RechargeType, // 累计充值次数
                            } = res;

                            kksaRechargeResult.IsRechargeVoucher = false; // 是否展示充值代金券活动
                            kksaRechargeResult.RechargeVoucherActivityName = ''; // 充值送代金券活动名称
                            kksaRechargeResult.TriggerPage = 'RechargePage 充值中心'; // 触发页面
                            kksaRechargeResult.PaymentsAccount = 0; // 充值人民币金额
                            kksaRechargeResult.KkAccount = 0; // 埋点用的到账金额
                            kksaRechargeResult.IsRechargeSuccess = 'False'; // 埋点使用是否充值成功 True/False
                            kksaRechargeResult.FailReason = err.message; // 充值失败原因
                            kksaRechargeResult.LastRechargeTime = LastRechargeTime; // 最后充值时间
                            kksaRechargeResult.RechargeType = RechargeType; // 累计充值次数
                            kksaRechargeResult.SourcePlatform = app.globalData.channel; // 来源平台
                            kksaRechargeResult.TopicName = this.data.couponInfo.topicName || '无';

                            // 多充多送模块属性
                            if (this.data.couponInfo.bannerType == 2 && this.data.couponInfo.viewType == 2) {
                                kksaRechargeResult.PayActivityName = `多充多送_${this.data.accumActivity.activity_id}`;
                            }
                            // url参数中带有trigger_page 充值事件上报TriggerPage修改为url参数带的trigger_page
                            if (this.data.param_trigger_page) {
                                kksaRechargeResult.TriggerPage = this.data.param_trigger_page;
                            }
                            // url参数中带有activity_name 充值事件上报ActivityName
                            if (this.data.param_activity_name) {
                                kksaRechargeResult.ActivityName = this.data.param_activity_name;
                            }
                            Object.assign(kksaRechargeResult, this.retNotice());
                            this.setData({ RechargeType, LastRechargeTime });
                            app.kksaTrack('RechargeResult', kksaRechargeResult); // 埋点
                            util_logManager({
                                LogType: 'requestPayment',
                                LogInfo: {
                                    type: '充值中心',
                                    order_id,
                                },
                                ErrorMsg: '充值失败',
                            });
                        });
                        // 充值失败埋点 E

                        this.hideLoading(); // 关闭加载弹窗
                        this.setData({ isShowMpDialog: true }); // 显示查询失败弹窗
                    }
                });
        }, 1000);
    },

    // 联合会员聚合页跳转
    actionUnite(event) {
        const { traget } = event.currentTarget.dataset;
        const { action_type, target_id, target_web_url, hybrid_url } = traget;
        this.setData({ isShowPopup: false });
        util_action({ type: action_type, id: target_id, url: target_web_url || hybrid_url });
    },

    // 查询付费推荐章节(充值成功弹窗使用)
    getPayTopicList() {
        api.getPayTopicList()
            .then((res) => {
                let { code, data } = res;
                if (code != 200) {
                    return false;
                }
                let { infos } = data;
                infos = infos ? infos : [];
                let topicList = infos.slice(0, 3); // 最多要三个数据
                topicList.forEach((item) => {
                    // 男性的主题封面图片URL
                    item.maleTopicCoverImageUrl = item.maleTopicCoverImageUrl ? item.maleTopicCoverImageUrl : '';
                    // 推荐理由
                    item.recommendReason = item.recommendReason ? item.recommendReason : '';
                    // 主题封面图片URL
                    item.topicCoverImageUrl = item.topicCoverImageUrl ? item.topicCoverImageUrl : '';
                    // 专题id
                    item.topicId = item.topicId ? item.topicId : '';
                    // 专题标题
                    item.topicTitle = item.topicTitle ? item.topicTitle : '';
                    // 专题唯一标识
                    item.uuid = `${Date.now().toString(36)}_${item.topicId}_${Math.random().toString(36)}`;
                });
                // topicList
                this.setData({
                    topicList,
                    isShowPopup: true,
                    isRedirectUrl: true,
                });
                this.trackSuccess('imp');
            })
            .catch(() => {
                this.setData({
                    isShowPopup: true,
                    isRedirectUrl: true,
                });
                this.trackSuccess('imp');
            });
    },

    // 点击对话框的按钮事件
    tapDialogButton(e) {
        let { index } = e.detail;
        if (index == 1) {
            this.getKkbOrderId(this.data.order_id); // 查询订单号
        }
        this.setData({ isShowMpDialog: false }); // 关闭弹窗
    },

    // 显示加载弹窗浮层(显示loading)
    showLoading() {
        // mask无效，强制为true
        util_showToast({
            title: '',
            type: 'loading',
        });
    },

    // 隐藏加载弹窗浮层(关闭loading)
    hideLoading() {
        util_hideToast();
    },

    // 关闭充值成功弹窗
    closeBtnTap() {
        this.setData({
            isShowPopup: false, // 关闭弹窗
        });
    },

    // 点击充值成功弹窗中专题
    topicItemTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let { id, title } = dataset;
        util_action({ type: 2, id, params: { source: 'find', title } });
        this.trackSuccess('clk', 1);
    },

    // 充值失败时上报神策
    trackErrPay(res) {
        // 选中的充值信息
        const { activeItem, LastRechargeTime, RechargeType } = this.data;

        // 充值kkb总数结果 =  充值的kkb数据 + 充值赠送的kkb数量;
        const KkAccount = (activeItem.recharge_value || 0) + (activeItem.present_value || 0);

        const data = {
            TriggerPage: 'RechargePage 充值中心', // 触发页面
            PaymentsAccount: activeItem.real_price, // 充值人民币金额
            KkAccount, // 到账kk币金额
            IsRechargeSuccess: 'False', // 充值是否成功
            FailReason: res.errMsg, // 失败原因
            LastRechargeTime, // 最后充值时间
            RechargeType, // 累计充值次数
            SourcePlatform: app.globalData.channel, // 来源平台
            IsRechargeVoucher: this.data.shotCouponActivity,
            RechargeVoucherActivityName: this.data.couponActivityName,
            TopicName: this.data.couponInfo.topicName || '无',
        };

        // 多充多送模块属性
        if (this.data.couponInfo.bannerType == 2 && this.data.couponInfo.viewType == 2) {
            data.PayActivityName = `多充多送_${this.data.accumActivity.activity_id}`;
        }
        // url参数中带有trigger_page 充值事件上报TriggerPage修改为url参数带的trigger_page
        if (this.data.param_trigger_page) {
            data.TriggerPage = this.data.param_trigger_page;
        }
        // url参数中带有activity_name 充值事件上报ActivityName
        if (this.data.param_activity_name) {
            data.ActivityName = this.data.param_activity_name;
        }
        Object.assign(data, this.retNotice());
        app.kksaTrack('RechargeResult', data);
    },

    // 获取充值kkb活动banner
    getKKBCoupon() {
        api.getChargeBanner({
            topic_id: this.data.topicId,
            from: this.data.payfrom,
        }).then((res) => {
            let couponBanner = {},
                view_type = '';
            const banner = res.data.banners[0] || null;
            if (banner) {
                couponBanner = {
                    contentId: banner.id,
                    title: banner.title,
                    infoNum: banner.main_text,
                    topicName: banner.topic_name,
                    desc: banner.desc,
                    comicImg: banner.image,
                    icon: banner.icon,
                    action_target: banner.action_target,
                    bannerType: banner.banner_type,
                    viewType: banner.view_type,
                };
                view_type = banner.view_type;
            }

            // 如果没有命中则返回
            if (JSON.stringify(couponBanner) === '{}') {
                this.setData({
                    shotCouponActivity: false,
                });
                return;
            }

            const activity_name = (res.data.charge_rp_activity || {}).present_red_pack_activity_name || '';

            // 多充多送文案提示
            if (couponBanner.bannerType == 2 && couponBanner.viewType == 2) {
                // 获取文案提示
                api.getAwardInfoApi().then((res) => {
                    const { desc = '' } = res.data;
                    this.setData({
                        bottomTxt: desc,
                    });
                });
            }
            this.setData({
                shotCouponActivity: view_type == 1,
                couponActivityName: activity_name,
                couponInfo: { ...couponBanner },
            });
        });
    },

    // 多充多送奖励领取后刷新状态数据
    refreshKkbPage() {
        // 刷新多充多送模块是否展示
        this.getKKBCoupon();

        // 刷新kkb余额
        this.checkWallet();

        // 刷新多充多送相关状态局部
        api.getKkbSetMealList({ from: this.data.payfrom }).then((res) => {
            let { accum_activity } = res.data || {};

            // 针对多充多送信息处理
            if (accum_activity.accum_desc) {
                accum_activity.accum_desc = this.textHandle(accum_activity.accum_desc, '#');
            }
            this.setData({
                accumActivity: accum_activity,
            });
        });
    },
    handleSucc(event) {
        let { type } = event.detail || {};
        this.trackSuccess('clk', type);
    },
    trackSuccess(event = 'clk', type = 1) {
        const typeMap = {
            1: '支付成功引导推荐书籍',
            2: '支付成功私域二维码按钮',
        };
        const name = event == 'clk' ? 'CommonBtnClk' : 'CommonPopup';
        const options = {
            CurPage: '支付成功页面',
            popupName: this.data.isPayPopTest ? '支付完成私域引导弹窗' : '支付完成专题推荐弹窗',
        };
        if (event == 'clk') {
            Object.assign(options, {
                ButtonName: typeMap[type] || '',
            });
        }
        app.kksaTrack(name, options);
    },
};

const ConnectPage = connect(
    ({ userInfo, wallet }) => {
        return {
            userInfo,
            wallet,
        };
    },
    (setState) => ({
        setWallet(newVal) {
            setState({
                wallet: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
