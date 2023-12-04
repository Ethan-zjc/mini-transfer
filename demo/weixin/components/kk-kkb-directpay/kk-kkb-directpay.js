/**
 * kk-vippay-halfscreen 老版本迁移的支付弹窗(basic:房防止后期扩展重名)
 * @param {Boolean} loadDirectPay : 是否加载数据
 * @param {Number/String} goodId : 商品id
 * @param {Object} userInfo : 页面的用户信息
 * @param {Number/String} topicId : 当前章节所在的专题id 请求接口使用
 * @param {String} topicTitle:当前章节所在的专题名称 埋点埋点使用预留参数
 * @param {Boolean} isPayed: 当前是否发生过支付
 */

const computedBehavior = require("miniprogram-computed");
const api = require("./api"); // api 请求
const app = getApp();
import { util_buyRedirect, util_checkWallet, util_action, util_showToast, util_hideToast } from "../../util.js";

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },
    behaviors: [computedBehavior],
    properties: {
        loadDirectPay: {
            type: Boolean,
            value: false,
        },

        userInfo: {
            // 用户信息
            type: null,
            value: null,
        },
        goodId: {
            type: [Number, String],
            value: 0,
        },

        topicId: {
            // 专题id
            type: [Number, String],
            value: 0, // 791->烈火青春==激励视频  96->叫我森林先生==kkb
        },

        topicTitle: {
            // 专题标题 - 埋点使用
            type: String,
            value: "",
        },

        isPayed: {
            // 章节标题 - 埋点使用
            type: Boolean,
            value: false,
        },
        activityName: {
            // 活动名称
            type: String,
            value: "",
        },
        activityId: {
            // 活动id
            type: [String, Number],
            value: "",
        },
        bannerTypeName: {
            // 充值礼包类型
            type: String,
            value: "",
        },
        // 父级页面传递的是否要展示充值成功的弹窗 默认展示
        pageIsShowPopup: {
            type: Boolean,
            value: true,
        },
    },

    // 组件的内部数据，和 properties 一同用于组件的模板渲染
    data: {
        isiOS: app.globalData.isiOS, // 是否ios系统
        iPhoneX: app.globalData.iPhoneX, // 是否为ios全屏手机
        wechatTicket: {
            // 微信(qq)支付必要信息
            timeStamp: "", // 时间戳，从 1970 年 1 月 1 日 00:00:00 至今的秒数，即当前的时间
            nonceStr: "", // 随机字符串，长度为32个字符以下
            package: "", // 统一下单接口返回的 prepay_id 参数值，提交格式如：prepay_id=***
            signType: "MD5", // 签名算法
            paySign: "", // 签名，具体签名方案参见
        },
        rechargeType: "", // 充值类型
        wordsInfo: {}, // 文案展示 主要使用 wordsInfo.wallet_word (充值副标题)
        rechargeDesc: "", // 充值文案描述
        paySource: 1, // 下单来源  1:我的钱包  2:活动页
        // payType: 2, // 1:支付宝   2:微信支付3:QQ支付4:APPLE PAY  接口获取
        goodType: 1, // 1:充值业务 2:会员充值业务 (kkb充值==1)
        payfrom: app.globalData.payfrom, // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
        open_id: "",
        activeItem: {}, // 选中的商品数据(需要下单的商品数据)
        payTypes: {}, // 付款类型 pay_types[0]微信  pay_types[1]qq  app.globalData.channel 平台标识，微信: wechat，QQ: qq，用于接口url传参{channel}
        order_id: "", // 订单id
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
            close: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/close_00499c9.png",
            kkb: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/kkb_c6c729e.png",
            popup: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/popup_b0c5425.png",
            subtitleIcon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/subtitle-icon_b6b0859.png",
            topBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/top-bg_de77397.png",
            couponBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/mask_35a1bc1.png",
        },
        RechargeType: 0, // 累计充值次数
        LastRechargeTime: -2, // 最后充值时间

        topicId: "", // 专题ID
        shotCouponActivity: false, // 是否命中活动
        shotCouponText: false, // 是否命中代金券

        // 运营位充值banner信息
        couponInfo: {},
        // 运营位活动名称
        couponActivityName: "",
        delayCheckOrder: 0, // 查询订单状态，轮询查询次数
    },

    // 检测数据吸顶变化
    watch: {
        webview() {},
        userInfo() {
            // this.setSysAndUserInfo();// 设置基本设备信息和登录状态
        },
        loadDirectPay(val) {
            if (val) {
                // 防止重复点击支付按钮
                if (!this.data.isBuyBtnTap) {
                    return false;
                }
                this.setData({
                    // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
                    isBuyBtnTap: false,
                });
                this.loadPage();
            }
        },
    },
    attached() {
        // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
        let payfrom = app.globalData.payfrom;

        // 存储下单来源
        this.setData({
            payfrom,
        });
        // 检查是否命中活动
        this.getKKBCoupon();
        // 检查kk币余额
        this.checkWallet(() => {
            // 数据埋点 S
            let kksaTrackData = {
                LatestBalance: "", // 我的余额
                LastRechargeTime: "", // 最后充值时间
                RechargeType: "", // 累计充值次数
                SourcePlatform: app.globalData.channel, // 来源平台
            };
            api.getPointCharge().then((res) => {
                let {
                    last_recharge_time, // 最后充值时间
                    LastRechargeTime, // 最后充值时间
                    recharge_type, // 累计充值次数
                    RechargeType, // 累计充值次数
                } = res;
                kksaTrackData.LastRechargeTime = LastRechargeTime;
                kksaTrackData.RechargeType = RechargeType; // 累计充值次数
                kksaTrackData.LatestBalance = this.data.wallet; // kkb数量
                kksaTrackData.IsRechargeVoucher = this.data.shotCouponActivity; // 是否展示充值代金券活动
                kksaTrackData.RechargeVoucherActivityName = this.data.couponActivityName; // 充值送代金券活动名称
                this.setData({ RechargeType, LastRechargeTime });
                app.kksaTrack("VisitCheckout", kksaTrackData); // 埋点
            });
            // 数据埋点 E
        });
    },
    dttached() {
        api.unloadReportPayInfo({ type: "kkb" })
            .then(() => {
                console.log("上报成功");
            })
            .catch(() => {});
    },
    pageLifetimes: {
        show() {
            this.loadPage();
        },
        hide() {
            api.unloadReportPayInfo({ type: "kkb" })
                .then(() => {
                    console.log("上报成功");
                })
                .catch(() => {});
        },
        resize() {},
    },
    methods: {
        loadPage() {
            if (this.data.loadDirectPay) {
                util_buyRedirect(app); // 充值业务页面 如果是微信平台并且是ios设备在线上环境,的页面跳转
                // this.checkWallet();// 检查kk币余额

                // 查询本地存储的订单号后,查询订单,并且删除本地存储的订单号
                this.getStorageOrderId()
                    .then((res) => {
                        // 获取kkb充值详细数据
                        this.getKkbProduct().then(() => {
                            if (!res) {
                                // 如果没有发起过支付，才会默认调用支付方法
                                if (!this.data.isPayed) {
                                    this.buyInit();
                                }
                            } else {
                                this.setData({ order_id: res });
                                // 删除本地存储的订单号
                                this.removeStorageOrderId();
                                // 查询订单
                                this.getKkbOrderId(res);
                            }
                        });
                    })
                    .catch(() => {
                        // 获取kkb充值详细数据
                        this.getKkbProduct().then(() => {
                            // 如果没有发起过支付，才会默认调用支付方法
                            if (!this.data.isPayed) {
                                this.buyInit();
                            }
                        });
                    });
            }
        },
        // 检查kk币余额，以及set钱包运营文案      kkb展示的气泡文案
        checkWallet(callBack) {
            if (!this.data.userInfo) {
                // this.setWallet(0)
                this.triggerEvent("clearWallet");
                // 回调函数
                if (callBack && typeof callBack == "function") {
                    let time = setTimeout(() => {
                        clearTimeout(time);
                        callBack();
                    }, 500);
                }
                return false;
            }
            // 查询kkb余额,并且存储
            let pages = getCurrentPages();
            let curPage = pages[pages.length - 1];
            util_checkWallet(curPage)
                .then(() => {
                    if (callBack && typeof callBack == "function") {
                        let time = setTimeout(() => {
                            clearTimeout(time);
                            callBack();
                        }, 500);
                    }
                })
                .catch(() => {
                    // this.setState(0)
                    this.triggerEvent("clearWallet");
                    // 回调函数
                    if (callBack && typeof callBack == "function") {
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
                    key: "direct_buykkb_order_id",
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
                key: "direct_buykkb_order_id",
                success(res) {
                    // console.log('removeStorageOrderId:',res)
                },
            });
        },

        // 获取kkb充值套餐 ,请求参数暂无
        getKkbProduct() {
            return new Promise((resolve, reject) => {
                api.getKkbProduct({ from: this.data.payfrom, good_id: this.data.goodId })
                    .then((res) => {
                        let { code, data, message } = res;
                        if (code != 200) {
                            // 错误提示
                            util_showToast({
                                title: message,
                                type: "error",
                                mask: true,
                                duration: 3000,
                            });
                            return false;
                        }
                        let {
                            wechat_ticket, // 微信(qq)支付必要信息
                            user,
                            wechat_share, // 分享文案
                            recharge_discount_name, // 充值折扣名称
                            accum_activity, // 累积活动
                            user_account, // 用户账号kkb(ios/安卓/总共的)
                            iap_recharge_type, // iap_充电类型
                            recharge_value_limit, // 充值上限
                            iap_sand_box_status, // ???
                            recharge_good: recharges, // 充值信息
                            pay_types, // 支付类型
                        } = data; // 解构数据

                        // 微信(qq)支付必要信息(其他渠道待接入)
                        let wechatTicket = wechat_ticket
                            ? wechat_ticket
                            : {
                                  timeStamp: "", // 时间戳，从 1970 年 1 月 1 日 00:00:00 至今的秒数，即当前的时间
                                  nonceStr: "", // 随机字符串，长度为32个字符以下
                                  package: "", // 统一下单接口返回的 prepay_id 参数值，提交格式如：prepay_id=***
                                  signType: "MD5", // 签名算法
                                  paySign: "", // 签名，具体签名方案参见
                              };
                        // 充值信息S
                        recharges = recharges ? recharges : {};
                        let {
                            recharge_type, // 充值类型
                            recharge_goods, // 充值列表
                            recharge_type_desc, // 底部充值说明
                            goods_title, // 充值名称
                            remark, // 评论??
                            show_all, // 全部显示? 1(全部?)是否有其它值?  是否显示所有档位入口
                            recharge_type_name, // 充值类型名称
                            banner_goods, // 充值轮播??
                            words_info, // 文案展示, 主要使用words_info.wallet_word(充值副标题)
                            image_info, // 外层图片集合(用途未知)
                        } = recharges; // 解构充值信息

                        // 文案展示, 主要使用words_info.wallet_word(充值副标题)
                        let wordsInfo = words_info ? words_info : {};
                        // 充值类型
                        let rechargeType = recharge_type ? recharge_type : "";

                        // 存储付款类型 pay_types 信息S   百度 pay_type: 24      微信:pay_type: 10   qq: pay_type: 12
                        let payTypesIndex = 0;
                        if (app.globalData.channel == "wechat") {
                            payTypesIndex = 10;
                        }
                        if (app.globalData.channel == "baidu") {
                            payTypesIndex = 24;
                        }
                        if (app.globalData.channel == "qq") {
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
                        // 存储付款类型 pay_types 信息E

                        this.setData(
                            {
                                activeItem: recharges, // 选中的商品数据(需要下单的商品数据)
                                rechargeType, // 充值类型
                                wordsInfo, // 文案展示 主要使用words_info.wallet_word(充值副标题)
                                // rechargeDesc: recharge_type_desc, // 充值文案描述
                                open_id: app.globalData.openId, // 开放id
                                payTypes, // 付款类型
                            },
                            () => {
                                resolve();
                            }
                        );
                    })
                    .catch((err) => {
                        reject();
                        util_showToast({
                            title: err.message,
                            type: "error",
                            mask: true,
                            duration: 3000,
                        });
                    });
            });
        },

        // 获取kkb 端外下单(点击立即支付按钮调用[获取订单号])
        postPayOrder(callback) {
            let activeItem = this.data.activeItem; // 选中的商品数据
            let pay_info = {};
            pay_info.topic_id = this.data.topicId ? this.data.topicId * 1 : "";
            pay_info.third_activity = this.data.activityName;

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
                    PaymentsAccount: "", // 1000（充值档位的金额，分为单位）
                    LastRechargeTime: "", // 最后充值时间
                    RechargeType: "", // 累计充值次数
                    SourcePlatform: app.globalData.channel, // 来源平台 weixin、qq、zijietiaodong、baidu、Alipay、M站
                };
                let {
                    last_recharge_time, // 最后充值时间
                    LastRechargeTime, // 最后充值时间
                    recharge_type, // 累计充值次数
                    RechargeType, // 累计充值次数
                } = res;
                kksaTrackData.LastRechargeTime = LastRechargeTime;
                kksaTrackData.RechargeType = RechargeType; // 累计充值次数
                kksaTrackData.PaymentsAccount = activeItem.recharge_value; // kkb数量
                app.kksaTrack("ClickRechargeButton", kksaTrackData); // 埋点
            });
            // 点击KK币充值页按钮 埋点 E

            api.postPayOrder(sendData)
                .then((res) => {
                    let { code, data, message } = res;
                    if (code != 200) {
                        util_showToast({
                            title: message,
                            type: "error",
                            mask: true,
                            duration: 3000,
                        });
                        return null;
                    }
                    if (callback && typeof callback === "function") {
                        callback(data);
                    }
                })
                .catch((err) => {
                    util_showToast({
                        title: err.message,
                        type: "error",
                        mask: true,
                        duration: 3000,
                    });
                });
        },

        // 点击支付按钮
        buyInit() {
            let _this = this;
            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }
            // 获取订单号和支付信息
            this.postPayOrder((res) => {
                let {
                    pay_data, // 支付信息对象requestPayment支付所有信息
                    pay_order, // 订单号信息对象  pay_order:order_id 订单信息
                } = res; // 下单信息 pay_order:order_id
                pay_order = pay_order ? pay_order : {};
                let order_id = pay_order.order_id ? pay_order.order_id : ""; // 订单号

                // 本地存的订单id,防止支付成功后退出小程序或者微信,在显示页面中查询
                wx.setStorage({ key: "direct_buykkb_order_id", data: order_id });

                this.setData({ order_id }); // data记录订单号

                // 微信场景
                wx.requestPayment({
                    // timeStamp: pay_data.timeStamp ,
                    // nonceStr: pay_data.nonceStr, package: pay_data.package,
                    // signType: pay_data.signType, paySign: pay_data.paySign,
                    ...pay_data,
                    success(res) {
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
                    },
                    complete(res) {
                        // 不管支付成功还是失败都会执行
                        _this.setData({
                            isPayed: true,
                            isBuyBtnTap: true, // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
                        });
                    },
                });
            });
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
                    PUWID: (this.data.activityId || 0) + "", // 活动弹窗id
                    PayActivityName: this.data.activityName || "无", // 活动名称
                    TopicName: this.data.topicTitle || "无", // 触发活动的专题名称
                    TriggerPage: "comicPage", // 触发页面
                    PaymentsAccount: this.data.activeItem.real_price, // 充值人民币金额  Number   1000（分为单位）
                    KkAccount: 0, // 到账kk币金额  1200（KK币为单位）
                    IsRechargeSuccess: "False", // 充值是否成功 True/False
                    FailReason: "", // 失败原因
                    LastRechargeTime: this.data.LastRechargeTime, // 最后充值时间
                    RechargeType: this.data.RechargeType, // 最后充值时间
                    SourcePlatform: app.globalData.channel, // 来源平台 weixin、qq、zijietiaodong、baidu、Alipay、M站
                    IsRechargeVoucher: this.data.shotCouponActivity,
                    RechargeVoucherActivityName: this.data.couponActivityName,
                };
                // 充值结果埋点数据 E

                api.getKkbOrderId({ order_id })
                    .then((res) => {
                        let { code, data, message } = res;
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
                        this.triggerEvent("paysucc", true);
                        this.getPayTopicList(); // 查询付费推荐章节(充值成功弹窗使用)
                        // this.checkWallet();// 检查kk币余额

                        let {
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
                        let present_red_pack_activity_name = kb_charge_result.present_red_pack_activity_name || "";
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
                                last_recharge_time, // 最后充值时间
                                LastRechargeTime, // 最后充值时间
                                recharge_type, // 累计充值次数
                                RechargeType, // 累计充值次数
                            } = res;
                            kksaRechargeResult.IsRechargeVoucher = present_red_pack_activity_show_banner; // 是否展示充值代金券活动
                            kksaRechargeResult.RechargeVoucherActivityName = present_red_pack_activity_name; // 充值送代金券活动名称
                            kksaRechargeResult.PaymentsAccount = pay_order.order_fee; // 充值人民币金额
                            kksaRechargeResult.KkAccount = rechargeResult; // 埋点用的到账金额
                            kksaRechargeResult.IsRechargeSuccess = "True"; // 埋点使用是否充值成功 True/False
                            kksaRechargeResult.FailReason = ""; // 充值失败原因
                            kksaRechargeResult.LastRechargeTime = LastRechargeTime; // 最后充值时间
                            kksaRechargeResult.RechargeType = RechargeType; // 累计充值次数
                            kksaRechargeResult.NoticeType = this.data.bannerTypeName; // 活动名称
                            kksaRechargeResult.TopicName = this.data.topicTitle || "无";

                            this.setData({ RechargeType, LastRechargeTime });
                            app.kksaTrack("RechargeResult", kksaRechargeResult); // 埋点
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
                        });
                        // user_account: {ios_balance: 135, non_ios_balance: 1471}
                        /**
                     data ={

                    kb_charge_result:{ kkb充值赠送结果
                        has_activity: true //是有有活动
                        present_red_kkb: 50 // 赠送的kkb
                        present_red_pack: 0 //赠送红包 赠送的kkb
                        red_pack_expire_at: 0 //红包过期时间
                        topic_id: 0 //专题id
                        topic_image_url: "" //专题封面
                        topic_title: "" //专题标题
                    }
                    pay_order:{//支付订单信息
                        admin_pay_order_status: 4 //管理付款订单状态
                        cost_type: 1 //成本类型
                        created_at: 1585501415877 //创建时间
                        discount: 100 //折扣
                        expire_time: 30000 //过期时间
                        extra_info: "{"charge_activity_id":960}"
                        good_id: 68 //商品id
                        good_type: 1 //商品类型
                        iap_good_id: "RECHARGE_S_68"//公司商品id
                        inner_pay_at: 1585501421507 //创建订单付款时间
                        notify_service_at: 1585501421569//通知服务时间  查询时间?
                        order_desc: "" //订单描述
                        order_fee: 1//订单花费金额 单位分
                        order_id: "20200330010335877110100094391009"//订单号
                        order_notify_type: 1//订单通知类型
                        order_title: "测试大礼包"//订单标题
                        out_order_id: "4200000473202003302835526864"//订单号
                        out_pay_at: 1585501420000//付款时间
                        parent_order_id: ""//父订单号
                        pay_fee: 1 //支付费用 单位分
                        pay_info: "{"present_id":0,"third_activity":"","version_code":542000,"topic_id":0}"//支付信息
                        pay_platform: 1 //支付设备
                        pay_platform_info: "iPhone" //支付设备名称
                        pay_source: 1 //支付来源
                        pay_status: 2 //支付状态
                        pay_type: 10//付款方式
                        pay_type_name: "微信公众号支付" //付款方式名称
                        present_value: 0 //现值
                        recharge_value: 666 //充值的kkb
                        refunded_fee: 0 //是否退款
                        service_notify_type: 1 //服务通知类型
                        uid: 94391009 //uid
                        updated_at: 1585501421569//更新时间
                    }

                    //用户账号kkb总数
                    user_account: {ios_balance: 135, non_ios_balance: 1471}
                }
                     **/
                    })
                    .catch((err) => {
                        this.data.delayCheckOrder++;
                        if (this.data.delayCheckOrder < 4) {
                            this.getKkbOrderId(id);
                        } else {
                            // 充值失败埋点 S
                            api.getPointCharge().then((res) => {
                                let {
                                    last_recharge_time, // 最后充值时间
                                    LastRechargeTime, // 最后充值时间
                                    recharge_type, // 累计充值次数
                                    RechargeType, // 累计充值次数
                                } = res;

                                kksaRechargeResult.IsRechargeVoucher = false; // 是否展示充值代金券活动
                                kksaRechargeResult.RechargeVoucherActivityName = ""; // 充值送代金券活动名称
                                kksaRechargeResult.TriggerPage = "comicPage"; // 触发页面
                                kksaRechargeResult.PaymentsAccount = 0; // 充值人民币金额
                                kksaRechargeResult.KkAccount = 0; // 埋点用的到账金额
                                kksaRechargeResult.IsRechargeSuccess = "False"; // 埋点使用是否充值成功 True/False
                                kksaRechargeResult.FailReason = err.message; // 充值失败原因
                                kksaRechargeResult.LastRechargeTime = LastRechargeTime; // 最后充值时间
                                kksaRechargeResult.RechargeType = RechargeType; // 累计充值次数
                                kksaRechargeResult.SourcePlatform = app.globalData.channel; // 来源平台
                                kksaRechargeResult.NoticeType = this.data.bannerTypeName; // 活动名称
                                kksaRechargeResult.TopicName = this.data.topicTitle || "无";

                                this.setData({ RechargeType, LastRechargeTime });
                                app.kksaTrack("RechargeResult", kksaRechargeResult); // 埋点
                            });
                            // 充值失败埋点 E

                            this.hideLoading(); // 关闭加载弹窗
                            this.setData({ isShowMpDialog: true }); // 显示查询失败弹窗
                        }
                    });
            }, 1000);
        },

        // 查询付费推荐章节(充值成功弹窗使用)
        getPayTopicList() {
            api.getPayTopicList()
                .then((res) => {
                    let { code, data, message } = res;
                    if (code != 200) {
                        return false;
                    }
                    let { infos } = data;
                    infos = infos ? infos : [];
                    let topicList = infos.slice(0, 3); // 最多要三个数据
                    topicList.forEach((item) => {
                        // 男性的主题封面图片URL
                        item.maleTopicCoverImageUrl = item.maleTopicCoverImageUrl ? item.maleTopicCoverImageUrl : "";
                        // 推荐理由
                        item.recommendReason = item.recommendReason ? item.recommendReason : "";
                        // 主题封面图片URL
                        item.topicCoverImageUrl = item.topicCoverImageUrl ? item.topicCoverImageUrl : "";
                        // 专题id
                        item.topicId = item.topicId ? item.topicId : "";
                        // 专题标题
                        item.topicTitle = item.topicTitle ? item.topicTitle : "";
                        // 专题唯一标识
                        item.uuid = `${Date.now().toString(36)}_${item.topicId}_${Math.random().toString(36)}`;
                    });
                    // topicList
                    this.setData({
                        topicList,
                        isShowPopup: true,
                    });
                })
                .catch((err) => {});
        },

        // 点击对话框的按钮事件
        tapDialogButton(e) {
            let { index, item } = e.detail;
            if (index == 1) {
                this.getKkbOrderId(this.data.order_id); // 查询订单号
            }
            this.setData({ isShowMpDialog: false }); // 关闭弹窗
        },

        // 显示加载弹窗浮层(显示loading)
        showLoading() {
            // mask无效，强制为true
            util_showToast({
                title: "",
                type: "loading",
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
            this.triggerEvent("reloadPage");
        },

        // 点击充值成功弹窗中专题
        topicItemTap(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            let { id, title } = dataset;
            util_action({ type: 2, id, params: { source: "find", title } });
        },

        // 充值失败时上报神策
        trackErrPay(res) {
            // 选中的充值信息
            const { activeItem, LastRechargeTime, RechargeType } = this.data;

            // 充值kkb总数结果 =  充值的kkb数据 + 充值赠送的kkb数量;
            const KkAccount = (activeItem.recharge_value || 0) + (activeItem.present_value || 0);

            const data = {
                PUWID: (this.data.activityId || 0) + "", // 活动弹窗id
                PayActivityName: this.data.activityName || "无", // 活动名称
                TopicName: this.data.topicTitle || "无", // 触发活动的专题名称
                TriggerPage: "comicPage", // 触发页面
                PaymentsAccount: activeItem.real_price, // 充值人民币金额
                KkAccount, // 到账kk币金额
                IsRechargeSuccess: "False", // 充值是否成功
                FailReason: res.errMsg, // 失败原因
                LastRechargeTime, // 最后充值时间
                RechargeType, // 累计充值次数
                SourcePlatform: app.globalData.channel, // 来源平台
                IsRechargeVoucher: this.data.shotCouponActivity,
                RechargeVoucherActivityName: this.data.couponActivityName,
                NoticeType: this.data.bannerTypeName,
            };
            app.kksaTrack("RechargeResult", data);
        },

        // 获取充值kkb活动banner
        getKKBCoupon() {
            // topicId为空时不请求banner
            if (this.data.topicId == "") {
                return;
            }

            api.getChargeBanner({
                topic_id: this.data.topicId,
                from: this.data.payfrom,
            }).then((res) => {
                let couponBanner = {};
                const banner = res.data.banners[0] || null;
                if (banner) {
                    couponBanner = {
                        title: banner.title,
                        infoNum: banner.main_text,
                        topicName: banner.topic_name,
                        desc: banner.desc,
                        comicImg: banner.image,
                        icon: banner.icon,
                    };
                }

                // 如果没有命中则返回
                if (JSON.stringify(couponBanner) === "{}") {
                    this.setData({
                        shotCouponActivity: false,
                    });
                    return;
                }

                const activity_name = (res.data.charge_rp_activity || {}).present_red_pack_activity_name || "";

                this.setData({
                    shotCouponActivity: true,
                    couponActivityName: activity_name,
                    couponInfo: { ...couponBanner },
                });
            });
        },
    },
});
