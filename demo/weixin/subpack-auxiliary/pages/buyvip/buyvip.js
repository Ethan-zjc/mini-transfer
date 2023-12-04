import {
    util_request,
    util_action,
    util_showToast,
    util_hideToast,
    util_buyRedirect,
    util_requestSubscribeMessage,
    util_getTime,
    util_sendMessageApi,
    util_logManager,
    util_checkVipInfo,
} from "../../../util.js";

const app = getApp();
let _global = app.globalData;
const { connect } = app.Store;
const api = require("./api"); // api 请求

const page = {
    data: {
        isiOS: app.globalData.isiOS, // 是否ios系统
        iPhoneX: app.globalData.iPhoneX, // 是否为ios全屏手机
        isShowPopup: false, // 是否显示 充值成功弹窗
        wechatTicket: {
            // 微信(qq)支付必要信息
            timeStamp: "", // 时间戳，从 1970 年 1 月 1 日 00:00:00 至今的秒数，即当前的时间
            nonceStr: "", // 随机字符串，长度为32个字符以下
            package: "", // 统一下单接口返回的 prepay_id 参数值，提交格式如：prepay_id=***
            signType: "MD5", // 签名算法
            paySign: "", // 签名，具体签名方案参见
        },
        paySource: 1, // 下单来源  1:我的钱包  2:活动页
        goodType: 2, // 1:充值业务 2:会员充值业务
        payfrom: app.globalData.payfrom, // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
        open_id: "",
        membersList: [], // 商品列表(vip卡片列表)
        activeItem: {}, // 选中的商品数据(需要下单的商品数据)
        payTypes: {}, // 付款类型 pay_types[0]微信  pay_types[1]qq  app.globalData.channel 平台标识，微信: wechat，QQ: qq，用于接口url传参{channel}
        order_id: "", // 订单id
        isBuyBtnTap: true, // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
        isShowMpDialog: false, // 是否显示定点查询失败弹窗  true:显示  false:不显示
        contractCode: "", // 通知服务的续费状态的code
        costType: 1, // 订单类型 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
        // eslint-disable-next-line no-dupe-keys
        viptitle: "", // 弹窗展示的标题
        kkb: 0, // 充值成功赠送的kkb
        vipDays: 0, // 充值成功赠送的会员天数
        isShowCoupon: false,
        images: {
            close: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/close_00499c9.png",
            arrowR: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/arrow-r_3b70804.png",
            arrow: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/arrow_c76ddff.png",
            coupon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/coupon_cd6996a.png",
            headerBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/header-bg_201231a.png",
            itemBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/item-bg_9ee8915.png",
            popupBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/popup-bg_74381ce.png",
            popupTitle: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/popup-title_5148f21.png",
            vip1_1: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_1_02eb219.png",
            vip1_2: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_2_e447016.png",
            vip1_3: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_3_e8fca64.png",
            vip1_4: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_4_b129267.png",
            vip2_5: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/2_5_4704b8e.png",
            loading: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/loading_d1d3e29.png", // 加载转圈效果
        },
        isUpdateData: true, // 是否在onShow中更新数据 true:是   false:不更新
        isShowlazyLoadPopup: false, // 加载转圈效果(是否显示延迟查询订单状态)
        setLazyLoadType: false, // 是否在设置查询订单中弹窗 false:没设置   true:是在设置中
        imgClass: {},
        getVipStatus: false, // 是否上报过访问页面埋点
        goodId: "", // 使用优惠卷传递商品id
        couponId: "", // 使用优惠卷传递优惠卷id
        toView: "", // 滚动到指定商品
        isUse: true, // 是否使用优惠卷
        isShowTip: true, // 是否展示选择优惠卷提示
        VIPDiscountName: "", // 会员优惠券名称
        delayCheckOrder: 0, // 查询订单状态，轮询查询次数
        chargeSuccessBannerData: null, // 充值成功之后 充值成功弹窗展示数据
        vipInfo: null,
        isOnShow: false, // 记录页面隐藏显示
        NoticeType: "", // 挽留弹窗埋-埋点类型
        limitFree: {}, // 定向限免活动数据
    },

    onLoad(options) {
        let { type, VIPDiscountName, limitFree, good_id, coupon_id, popupSource, topicId, topicTitle } = options;
        VIPDiscountName = VIPDiscountName ? VIPDiscountName : "";
        // type 下单来源  1:我的钱包  2:活动页
        type = type == 1 ? 1 : type == 2 ? 2 : 1;
        // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
        let payfrom = app.globalData.payfrom;
        // 是否从定向限免弹窗跳转过来
        limitFree = limitFree ? JSON.parse(limitFree) : {};
        let third_activity = "";
        if (limitFree && limitFree.isLimitFree && limitFree.activity_name) {
            third_activity = limitFree.activity_name;
        }
        // 加载页面时，清楚webview残留数据
        this.clearWebview();
        this.data.goodId = good_id; // 漫画详情页挽留弹窗带来的商品id
        this.data.couponId = coupon_id; // 漫画详情页挽留弹窗带来的优惠券id
        this.data.NoticeType = popupSource || "";
        this.data.topicId = topicId || "";
        this.data.topicTitle = topicTitle || "";

        // 存储下单来源
        this.setData({ paySource: type, payfrom, VIPDiscountName, limitFree, third_activity });
    },

    // 页面出现在前台时执行
    onShow() {
        this.setData({ isOnShow: true });
        const { data } = this.data.webview;

        // 判断优惠卷列表返回参数
        if (data && Array.isArray(data)) {
            const length = data.length;
            const row = data[length - 1];
            if (row.status) {
                const isUse = row.status == 2;
                this.data.goodId = row.goodId;
                this.data.couponId = row.couponId;
                this.setData({
                    isUse,
                    isUpdateData: true,
                });
                if (isUse && this.data.isShowTip) {
                    this.data.isShowTip = false;
                    util_showToast({
                        title: "已为您选择优惠券对应商品",
                        duration: 3000,
                    });
                }
            }
        }

        util_buyRedirect(app); // 充值业务页面 如果是微信平台并且是ios设备在线上环境,的页面跳转

        this.setData({ isBuyBtnTap: true });
        this.topLoginTap(); // 强制登录

        // 签约后回到当前页面sence、ops
        if (wx.getStorageSync("sign:params")) {
            const { sence, cps } = wx.getStorageSync("sign:params");
            getApp().globalData.sence = sence || "";
            getApp().globalData.cps = cps;
            wx.removeStorageSync("sign:params");
        }

        // 设置是否显示延迟获取订单(查询订单信息)  如果是签约的情况需要延迟查询
        this.setIsShowlazyLoadPopup(() => {
            // 查询本地存储的订单号后,查询订单,并且删除本地存储的订单号
            this.getStorageOrderId()
                .then((res) => {
                    this.getVipGoodList(); // 会员套餐列表接口_端外
                    if (!res) {
                        return false;
                    }
                    this.setData({ order_id: res });
                    // 删除本地存储的订单号
                    this.removeStorageOrderId();
                    let { contractCode, costType } = this.data;
                    // app.global.toSignProgram 是否跳转过签约页面 contractCode:签约协议ID  costType:支付类型
                    if (contractCode && costType == 2 && app.global.toSignProgram) {
                        // 查询订单
                        this.getVipOrderId(res, () => {
                            // 签约商品回调 (列如:连续包月vip)  contract_code : 签约协议ID
                            this.getPayContract(contractCode);
                        });
                    } else {
                        this.getVipOrderId(res);
                    }
                })
                .catch(() => {
                    // 没有存储数据的情况
                    // 会员信息查询 (是否展示会员)
                    this.checkVipInfo(() => {
                        // 上报访问页面埋点 S
                        if (!this.data.getVipStatus) {
                            let vipInfo = this.data.vipInfo ? this.data.vipInfo : {};
                            let data = {
                                SourcePlatform: app.globalData.channel, // 来源平台	String	wechat、qq、zijietiaodong、baidu、Alipay、M站
                                MembershipClassify: vipInfo.vip_type ? 1 : 0, // 会员的身份	Number	1会员，0非会员
                            };
                            app.kksaTrack("VisitRechargeVIPPage", data);
                            this.setData({ getVipStatus: true }); // 下次显示页面不能上报数据
                        }
                        // 上报访问页面埋点 E

                        // 获取完成vip转态后获取vip 商品列表
                        if (this.data.isUpdateData) {
                            // 是否在onShow中更新数据 true:是   false:不更新
                            this.getVipGoodList(); // 会员套餐列表接口_端外
                        }
                        let time = setTimeout(() => {
                            clearTimeout(time);
                            this.setData({ isUpdateData: true }); // 是否在onShow中更新数据 true:是   false:不更新
                        }, 100);
                    });
                });
        });
    },

    // 页面从前台变为后台时执行
    onHide() {
        this.setData({ isOnShow: false });
        api.unloadReportPayInfo({ type: "vip" })
            .then(() => {
                console.log("上报成功");
            })
            .catch(() => {});
    },

    // 页面销毁时执行
    onUnload() {
        this.setData({ isOnShow: false });
        api.unloadReportPayInfo({ type: "vip" })
            .then(() => {
                console.log("上报成功");
            })
            .catch(() => {});
    },

    // 页面被用户分享时执行
    onShareAppMessage() {},

    // 设置是否显示延迟获取订单(查询订单信息)  如果是签约的情况需要延迟查询
    setIsShowlazyLoadPopup(callback) {
        // 是否在设置查询订单中弹窗,是什么也不做防止重复执行
        if (this.data.setLazyLoadType) {
            return false;
        }
        this.setData({ setLazyLoadType: true }); // 是否在设置查询订单中弹窗,是什么也不做防止重复执行
        if (!callback || typeof callback != "function") {
            callback = function () {};
        }
        let costType = this.data.costType; // 订单类型 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
        let time = null;
        if (costType == 2) {
            this.setData({ isShowlazyLoadPopup: true });
            // 是签约订单  延迟3秒查询订单
            time = setTimeout(() => {
                clearTimeout(time);
                this.setData({ isShowlazyLoadPopup: false });
                callback();
            }, 3000);
        } else {
            callback();
        }
        let time1 = null;
        time1 = setTimeout(() => {
            clearTimeout(time1);
            // 是否在设置查询订单中弹窗,是什么也不做防止重复执行
            this.setData({ setLazyLoadType: false });
        }, 500);
    },

    // 会员信息查询 (是否展示会员)
    checkVipInfo(callback) {
        if (!this.data.userInfo) {
            this.setVipinfo({});
            if (callback && typeof callback === "function") {
                callback();
            }
            return;
        }
        util_checkVipInfo(this, callback);
    },

    // 获取本地存储的订单id,onShow查询订单状态使用
    getStorageOrderId() {
        return new Promise((resolve, reject) => {
            wx.getStorage({
                key: "buyvip_order_id",
                success: (res) => {
                    resolve(res.data);
                },
                fail: (error) => {
                    reject();
                },
            });
        });
    },

    // 删除本地存储要查询的订单号
    removeStorageOrderId() {
        wx.removeStorage({
            key: "buyvip_order_id",
            success(res) {},
        });
    },

    // 会员套餐列表接口_端外
    getVipGoodList(callback) {
        if (!callback || typeof callback != "function") {
            callback = () => {};
        }
        api.getVipGoodList()
            .then((res) => {
                let { code, data, message } = res;
                if (code != 200) {
                    return false;
                }
                data = data ? data : {};
                let {
                    current_at, // 当前时间
                    customer_renew_status, // 客户续订状态
                    default_good_id, // 默认商品id
                    iap_recharge_type, // 充值类型
                    iap_sand_box_status, // 其他组织状态
                    member_recently_renew_status, // 商品最近更新状态
                    members, // 商品数据
                    open_id, // 开放id
                    request_id, // 请求id
                    user, // 用户信息
                    user_member_renew_sms_status, // 用户_会员_续费_短信_状态
                    user_member_renew_status, // 用户_会员_续订_状态
                    vip, // 用户会员信息
                    wechat_share, // 分享信息
                    share_image_url, // 分享图片和链接
                    wechat_ticket, // 支付签名等信息
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

                // 商品数据
                members = members[0] ? members[0] : {};
                let {
                    first_recharge_info, // 首次充电信息  数组数据类型
                    pay_types, // 付款类型  数组数据类型
                    recharge_goods, // 充值商品列表  数组数据类型
                    recharge_type, // 充值类型  数字类型
                    recharge_type_desc, // 充值类型描述  字符串
                    recharge_type_name, // 充值类型标题   字符串
                    recharge_type_renew_desc, // 充值类型更新描述 字符串
                    recharge_type_renew_name, // 充值类型更新标题 字符串
                    renew_goods, // 更新商品数据(显示在第一位商品???)
                } = members; // 解构商品数据
                // 更新商品数据(更新商品列表)[更新vip商品卡片]
                renew_goods = renew_goods ? renew_goods : [];
                // 充值商品列表[vip商品卡片列表]
                recharge_goods = recharge_goods ? recharge_goods : [];
                let vipInfo = this.data.vipInfo ? this.data.vipInfo : {};
                let userInfo = this.data.userInfo;
                // 用户信息存在并且是vip续约账号 或者是在qq环境(qq小程序不支持签约连包月续支付)
                if ((userInfo && vipInfo.auto_keep) || app.globalData.channel == "qq") {
                    renew_goods = []; // 不展示续约商品
                }
                // 合并格式商品列表 S

                let membersList = [...renew_goods, ...recharge_goods]; // 更新商品数据(第一位) 拼接 recharge_goods
                let combo_list = "";
                membersList.forEach((item) => {
                    combo_list += item.combo + ",";
                    item.description = item.description ? item.description : ""; // 商品描述
                    item.discount_tips = item.discount_tips ? item.discount_tips : ""; // 商品折扣信息
                    // coupon优惠券列表, coupon.usable_list 可用清单  coupon.unreachable_list 不可用优惠券
                    item.coupon = item.coupon ? item.coupon : { usable_list: [], unreachable_list: [] };

                    if (this.data.couponId) {
                        // 如果是优惠卷页打开的
                        if (item.coupon.usable_list.length) {
                            const coupon = item.coupon.usable_list.filter((value) => {
                                return value.id == this.data.couponId;
                            });
                            item.usableCouponFirst = coupon[0] ? coupon[0] : item.coupon.usable_list[0];
                        } else {
                            item.usableCouponFirst = null;
                        }
                    } else {
                        item.usableCouponFirst = item.coupon.usable_list[0] ? item.coupon.usable_list[0] : null; // 可用的优惠券的第一个 自定义参数
                    }

                    // 不使用优惠卷
                    if (!this.data.isUse) {
                        item.usableCouponFirst = null;
                    }

                    if (item.usableCouponFirst || !this.data.isUse) {
                        this.setData({ isShowCoupon: true }); // 有优惠券存在才显示 优惠券入口
                    }
                    (item.label_title = item.label_title ? item.label_title : ""), // 商品标题
                        (item.platform = item.platform ? item.platform : 0); // 平台
                    item.id = item.id ? item.id : 0; // 商品id
                    item.icon = item.icon ? item.icon : ""; // 商品卡片右上角的小icon图片
                    item.sale_tips = item.sale_tips ? item.sale_tips : ""; // 底部优惠展示
                    item.banner = item.banner ? item.banner : ""; // 赠送kkb的图标
                    item.mark_price = item.mark_price ? item.mark_price : 0; // 标记价格(优惠前的价格) 单位分
                    item.markPruice = item.mark_price / 100; // 以元为单位
                    item.real_price = item.real_price ? item.real_price : 0; // 实际价格
                    item.realPrice = item.real_price / 100;
                    item.promotion_price = item.promotion_price ? item.promotion_price : 0; // 单位分
                    item.promotionPrice = item.promotion_price / 100; // 以元为单位
                    item.sequence = item.sequence ? item.sequence : 0; // 排序值
                });
                membersList = membersList.sort((a, b) => {
                    return a.sequence - b.sequence;
                }); // 显示顺序调整
                // 合并格式商品列表 E
                let activeGoodIndex = membersList.findIndex((item) => item.id == this.data.goodId);
                // 是否是从定向限免跳转
                if (this.data.limitFree && this.data.limitFree.isLimitFree && this.data.limitFree.good_id) {
                    // 如果是定向限免 默认选中穿过来的id
                    activeGoodIndex = membersList.findIndex((item) => item.id == this.data.limitFree.good_id);
                }
                let activeIndex = activeGoodIndex < 0 ? 0 : activeGoodIndex;
                let activeItem = membersList[activeIndex] ? membersList[activeIndex] : {}; // 选中的数据

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

                this.setData({
                    wechatTicket,
                    membersList,
                    activeItem,
                    payTypes,
                    toView: `view${activeGoodIndex}`,
                });
                // 是否是从定向限免跳转
                if (this.data.limitFree && this.data.limitFree.isLimitFree) {
                    combo_list = combo_list.substr(0, combo_list.length - 1);
                    let { activity_name, topic_id, comic_id } = this.data.limitFree;
                    api.getFreeCalculate({
                        activity_name,
                        combo_list,
                        topic_id,
                        comic_id,
                        get_right_now: false,
                    }).then((res) => {
                        this.setData({
                            freeEncryptList: res.data,
                        });
                    });
                }
                // 执行回调
                callback();
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

    // 获取会员下单 端外下单(点击立即支付按钮调用[获取订单号])  callback:回调函数
    postPayOrder(callback) {
        /*  pay_info={}
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
        // 设置请求参数
        let activeItem = this.data.activeItem; // 选中的商品数据
        let { topic_id, comic_id } = this.data.limitFree;
        let pay_info = {
            topic_id: topic_id ? topic_id * 1 : 0, // 必须是init
            comic_id: comic_id ? comic_id * 1 : 0, // 必须是init
        };
        if (activeItem.usableCouponFirst) {
            // 默认选中第一个可用优惠券
            pay_info.coupon_id = activeItem.usableCouponFirst.id; // 可用优惠券id
        }
        // 如果有第三方活动
        if (this.data.third_activity) {
            pay_info.third_activity = this.data.third_activity;
        }
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

                // 订单号信息对象  pay_order:order_id 订单信息
                data.pay_order = data.pay_order ? data.pay_order : {};
                // 支付信息对象requestPayment支付所有信息
                data.pay_data = data.pay_data ? data.pay_data : {};
                let order_id = data.pay_order.order_id ? data.pay_order.order_id : ""; // 订单号
                if (data.pay_order.cost_type == 2) {
                    // 首次使用签约(续费)vip
                    let request_data = data.pay_data.request_data;
                    if (app.globalData.channel == "qq") {
                        util_action({ type: 18, url: request_data, params: { channel: "qq", name: "vip" } });
                    } else {
                        wx.navigateTo({ url: "/pages/pay/pay?pagetype=auto&extraData=" + encodeURIComponent(request_data) });
                    }
                    // 本地存的订单id,防止支付成功后退出小程序或者微信,在显示页面中查询
                    wx.setStorage({ key: "buyvip_order_id", data: order_id });
                    let contract_code = request_data.contract_code ? request_data.contract_code : "";
                    this.setData({
                        contractCode: contract_code, // 订单类型 通知服务的续费状态的code
                        costType: 2, // 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
                        // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
                        isBuyBtnTap: true,
                    });
                    // this.getPayContract(contract_code);
                    return false;
                } else {
                    this.setData({ costType: 0 }); // 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
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

    // 查询订单状态 id:传递来的订单号,查询使用 callback回调函数
    getVipOrderId(id, callback) {
        let order_id = id ? id : this.data.order_id; // 订单id
        if (!order_id) {
            return false;
        }

        this.showLoading(); // 打开加载浮层
        let delayCheckTimer = setTimeout(() => {
            clearTimeout(delayCheckTimer);
            // 请求接口 查询订单状态
            api.getVipOrderId({ order_id })
                .then((res) => {
                    let { code, data, message } = res;
                    if (code != 200) {
                        this.hideLoading(); // 关闭加载弹窗
                        this.setData({ isShowMpDialog: true }); // 显示查询失败弹窗
                        this.handleTrackData(res); // 失败时处理数据
                        return false;
                    }
                    if (callback && typeof callback === "function") {
                        callback();
                    }
                    let {
                        assign_benefits, // 分配的福利
                        bus_info, // 公开信息
                        pay_order, // 支付的订单信息
                        vip, // 信息
                        vip_charge_result, // vip充值结果
                    } = data;

                    pay_order = pay_order ? pay_order : {};
                    if (pay_order.pay_status != 2) {
                        // pay_order.pay_status  1待支付， 2交易成功 3交易关闭
                        this.data.delayCheckOrder++;
                        if (this.data.delayCheckOrder < 4) {
                            this.getVipOrderId(id, callback);
                        } else {
                            this.hideLoading(); // 关闭加载弹窗
                            this.setData({ isShowMpDialog: true }); // 显示查询失败弹窗
                        }
                        return false;
                    }

                    // 弹窗展示数据
                    vip_charge_result = vip_charge_result ? vip_charge_result : {};
                    let viptitle = vip_charge_result.title ? vip_charge_result.title : "";
                    let kkb = vip_charge_result.kkb_giving ? vip_charge_result.kkb_giving : "";
                    let vipDays = vip_charge_result.days_giving ? vip_charge_result.days_giving : "";
                    this.checkVipInfo(() => {
                        // 查询vip 状态后展示弹窗
                        api.getChargeSuccessBanner({ order_id }).then((res) => {
                            let { code, data } = res;
                            let chargeSuccessBannerData = null;
                            if (code === 200) {
                                let charge_success_info = data.charge_success_info || [];
                                charge_success_info = charge_success_info.filter((i) => i.type === 1)[0] || {};
                                let benefits = charge_success_info.benefits || [];
                                benefits = benefits.filter((i) => i.award_type === 22)[0] || {};

                                chargeSuccessBannerData = {
                                    content: benefits.content || "",
                                    content_arr: benefits.content ? benefits.content.split("#") : [],
                                    button_text: benefits.button_text || "",
                                    action_target: benefits.action_target || null,
                                    award_type: benefits.award_type || 0,
                                };
                            }
                            this.hideLoading(); // 关闭加载弹窗
                            this.setData({
                                viptitle, // 弹窗展示的标题
                                kkb, // 充值成功赠送的kkb
                                vipDays, // 赠送的会员天数
                                chargeSuccessBannerData, // 充值成功 弹窗显示的数据
                                isShowPopup: true, // 是否显示充值成功弹窗
                            });
                            this.TrackBuyVipRes(pay_order, 1, {}); // 上报会员开通结果埋点  1是成功
                        });
                    });

                    /**
                data ={
                assign_benefits: [//分配福利
                    {type: 13, title: "KK币", content: "500", pic: "https://f12stag.kkmh.com/image/190426/IBOMYDRkV.png-w750"},
                    {type: 14, title: "会员成长值", content: "20", pic: "https://f12stag.kkmh.com/image/190426/4j9jOwg1b.png-w750"}
                ],
                bus_info:{ //公共信息
                    coupon_used: true 使用优惠券
                    coupon_used_fee: 1 优惠券使用费
                    first_open: false //第一个打开
                    good_title: "3个月" //商品标题
                    has_activity: true //是否有活动
                    origin_price: 5000 //原价
                    real_price: 1 //实际价格
                    rp_assign: false //分配
                    rp_assigned_fee: 0 // 分配费用
                    vip_expire_value: 93 //vip过期值
                }
                pay_order:{ 支付的订单信息
                    admin_pay_order_status: 4 //管理付款订单状态
                    cost_type: 1 //订单类型 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
                    coupon_model: {coupon_record_id: "5625762276015800448", coupon_amount: 1}//优惠券模型
                    created_at: 1585590285726 //创建时间
                    discount: 100 //折扣
                    expire_time: 30000 //过期时间
                    extra_info: "" //额外信息
                    good_id: 103 //商品id
                    good_type: 2 //商品类型
                    iap_good_id: "MEMBER_S_103"
                    inner_pay_at: 1585590291534 //支付时间
                    notify_service_at: 1585590291635 //服务器接收通知时间
                    order_desc: "" //订单描述
                    order_fee: 5000 // 订单原价
                    order_id: "20200331014445726110101100001202" //订单号
                    order_notify_type: 1 //订单通知类型
                    order_title: "3个月" //订单标题
                    out_order_id: "4200000500202003311011732495"//订单号
                    out_pay_at: 1585590290000 //下单时间
                    parent_order_id: ""//父级订单
                    pay_fee: 1 //支付费用
                    pay_info: "{"vip_source":0,"coupon_id":"5625762276015800448","present_id":0,"version_code":542000}"//支付信息
                    pay_platform: 1 //支付平台
                    pay_platform_info: "iPhone"//支付平台名称
                    pay_source: 1 //支付来源
                    pay_status: 2 //支付状态
                    pay_type: 10 //支付类型
                    pay_type_name: "微信公众号支付" //支付工具名称
                    present_value: 0 //现值
                    recharge_value: 93 //充值
                    refunded_fee: 0 //退款
                    service_notify_type: 1 //服务通知类型
                    uid: 1100001202 //用户id
                    updated_at: 1585590291635 //更新时间
                }
                pay_order_renew_title: "",//支付订单更新标题
                vip:{ //vip
                    auto_keep: 0 //是否自动续费
                    expire_at: 1597375624054 //过期时间
                    level: 1 //等级
                    score: 70 //分数
                    started_at: 1584588424054 //开始时间
                    status: 0 //状态
                    type: 3 //类型
                    vip_big_icon: "https://f2.kkmh.com/recharge/190524/TT0L4rYDs.png"
                    vip_group_type: 14
                    vip_group_type_name: "非7天内充值会员"
                    vip_icon: "https://f2.kkmh.com/image/190523/pXFtClqsl.png-w750"
                },
                vip_charge_result:{ //vip充值结果
                    days_giving: 0 //赠送的会员天数
                    end_at: 1597375624054//结束时间
                    growth_score: 20 //成长得分
                    has_activity: true //是否有活动
                    kkb_giving: 500 //赠送的kkb
                    red_packet_assign: {present_red_pack: 0, red_pack_expire_at: 0, topic_id: 0, topic_title: "", topic_image_url: ""} //红包分配
                    start_at: 1589340424054 //开始时间
                    title: "续费3个月会员成功" //提示标题
                    vip_before: 1 //以前的vip
                    vip_group_type_before: 14 //
                    vip_group_type_name_before: "非7天内充值会员"
                    vip_status_before: 1
                }
            }
                 **/
                })
                .catch((err) => {
                    this.data.delayCheckOrder++;
                    if (this.data.delayCheckOrder < 4) {
                        this.getVipOrderId(id, callback);
                    } else {
                        this.handleTrackData(err); // 失败时处理数据

                        this.hideLoading(); // 关闭加载弹窗
                        this.setData({ isShowMpDialog: true }); // 显示查询失败弹窗
                    }
                });
        }, 1000);
    },

    // 签约商品回调 (列如:连续包月vip)  contract_code : 签约协议ID
    getPayContract(contract_code) {
        api.getPayContract({ contract_code }).then((res) => {
            console.log(res);
        });
    },

    // 选择商品的点击事件(改为选中状态)
    choiceGoodTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let { index, id, des, title } = dataset;
        let data = this.data.activeItem ? this.data.activeItem : { id: 0 };
        if (data.id == id) {
            // 点击相同的商品什么也不做
            return false;
        }
        let activeItem = this.data.membersList[index]; // 充值商品列表

        this.setData({
            activeItem, // 选中的商品数据(需要下单的商品数据)
        });
    },

    // 点击开通会员页面按钮上报数据( 立即开通/交易明细/会员权益介绍/常见问题 )
    clickBtnKksa(btnText) {
        let vipInfo = this.data.vipInfo ? this.data.vipInfo : {};
        let data = {
            ButtonName: btnText, // 按钮名称 立即开通/交易明细/会员权益介绍/常见问题
            SourcePlatform: app.globalData.channel, // 来源平台	String	wechat、qq、zijietiaodong、baidu、Alipay、M站
            MembershipClassify: vipInfo.vip_type ? 1 : 0, // 会员的身份	Number	1会员，0非会员
        };
        app.kksaTrack("ClickRechargeVIPButton", data);
    },

    // 点击开通按钮
    async buyBtnTap() {
        let _this = this;
        if (!this.data.userInfo) {
            wx.navigateTo({ url: "/pages/login/login" });
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

        // 点击开通按钮上报埋点 S
        this.clickBtnKksa("立即开通");
        // 点击开通按钮上报埋点 E

        // 是否是从定向限免跳转
        if (this.data.limitFree && this.data.limitFree.isLimitFree) {
            let free_encrypt_str = "";
            let { topic_id, comic_id } = this.data.limitFree;
            this.data.freeEncryptList.map((item) => {
                if (item.combo == this.data.activeItem.combo) {
                    free_encrypt_str = item.free_encrypt_str;
                }
            });
            // 领取专题定向限免
            api.getFreeAssign({
                free_encrypt_str,
                topic_id,
                comic_id,
            });
        }
        this.postPayOrder((res) => {
            let {
                pay_data, // 支付信息对象requestPayment支付所有信息
                pay_order, // 订单号信息对象  pay_order:order_id 订单信息
            } = res; // 下单信息 pay_order:order_id
            pay_order = pay_order ? pay_order : {};
            let order_id = pay_order.order_id ? pay_order.order_id : ""; // 订单号

            // this.getPayContract()
            // 本地存的订单id,防止支付成功后退出小程序或者微信,在显示页面中查询
            wx.setStorage({ key: "buyvip_order_id", data: order_id });
            this.setData({ order_id }); // data记录订单号
            wx.requestPayment({
                // timeStamp: pay_data.timeStamp ,
                // nonceStr: pay_data.nonceStr, package: pay_data.package,
                // signType: pay_data.signType, paySign: pay_data.paySign,
                ...pay_data,
                async success(res) {
                    let succRes = res;
                    // 会员开通成功提醒
                    const successfullyOpenedTmplId = "QYM94K7Si1ydMAP8I-bneCp902Masn5TugwKTTpsND4";
                    // 会员到期提醒
                    const dueReminderTmplId = "cbZXh3DpxJ-30XhOEyRa1H2i6qynPAtNYedU15UakUQ";
                    // 会员过期提示
                    const expiredReminderTmplId = "LpRSnLC9fegtVpUM6Yi8lv26uLPMUv5G-i1iLEY7570";
                    const {
                        [dueReminderTmplId]: dueReminderResult,
                        [successfullyOpenedTmplId]: successfullyOpenedResult,
                        [expiredReminderTmplId]: expiredReminderResult,
                    } = await util_requestSubscribeMessage({ tmplIds: [dueReminderTmplId, successfullyOpenedTmplId, expiredReminderTmplId] });
                    const isAccept = successfullyOpenedResult === "accept";
                    app.kksaTrack("TriggerAuthorization", {
                        AuthorizationResult: ~~isAccept,
                        TriggerTiming: "开通会员",
                    });
                    let date = util_getTime();
                    if (isAccept) {
                        util_sendMessageApi({
                            notice_type: 2,
                            data: {
                                time1: date,
                                thing2: "会员开通成功，快去阅读漫画吧！",
                            },
                        }).then((res) => {
                            const { code } = res;
                            if (code === 200) {
                                app.kksaTrack("MessageSending", {
                                    MessageDetail: "订阅消息-开通会员",
                                });
                            }
                        });
                    }
                    // console.log('succes',res)
                    // 设置是否显示延迟获取订单(查询订单信息)  如果是签约的情况需要延迟查询
                    _this.setIsShowlazyLoadPopup(() => {
                        // 查询本地存储的订单号后,查询订单,并且删除本地存储的订单号
                        _this.getStorageOrderId().then((res) => {
                            // 支付成功执行
                            _this.TrackBuyVipRes(pay_order, 1, succRes); // 上报会员开通结果埋点  1是成功
                            _this.getVipGoodList();
                            if (!res) {
                                return false;
                            }
                            // 删除本地存储的订单号
                            _this.removeStorageOrderId();
                            // 查询订单
                            _this.getVipOrderId(res);
                        });
                    });
                },
                fail(res) {
                    // 支付失败执行
                    _this.TrackBuyVipRes(pay_order, 0, res); // 上报会员开通结果埋点 0 是失败
                    // 查询本地订单号 后删除
                    _this.getStorageOrderId().then(() => {
                        _this.removeStorageOrderId();
                    });
                },
                complete(res) {
                    // 不管支付成功还是失败都会执行
                    _this.setData({
                        // 是否可以点击立即支付按钮  true:可以点击  false:不可以点击
                        isBuyBtnTap: true,
                    });
                },
            });
        });
    },

    // 点击头部的时候,只有在没有登录状态跳转登录
    topLoginTap() {
        if (!this.data.userInfo) {
            wx.navigateTo({ url: "/pages/login/login" });
        }
        return false;
    },

    // 点击交易明细按钮
    transactionDetailsTap() {
        // 点击开通会员页面按钮上报数据( 立即开通/交易明细/会员权益介绍/常见问题 )
        this.clickBtnKksa("交易明细");
        // 埋点结束 S

        this.setData({ isUpdateData: false }); // 是否在onShow中更新数据 true:是   false:不更新
        let env = app.globalData.environment;
        let url = "";
        if (env == "prod") {
            // 是先上环境
            url = `https://www.kuaikanmanhua.com/webapp/mini/webapp_vip_member_bill.html?env=p`;
        } else {
            url = `https://www.kuaikanmanhua.com/webapp/mini/webapp_vip_member_bill.html?env=s`;
        }
        util_action({ type: 18, id: "", url: url, params: { source: "mini-app", page: "buyvip" } });
    },

    // 点击去使用优惠券按钮
    clickCouponTap() {
        this.setData({ isUpdateData: false }); // 是否在onShow中更新数据 true:是   false:不更新
        let activeItem = this.data.activeItem;
        let env = app.globalData.environment;
        let miniparam = {
            good_id: activeItem.id,
            third_activity: this.data.third_activity || "",
        };
        if (env == "prod") {
            // 是线上环境
            miniparam.env = "p";
        } else {
            miniparam.env = "s";
        }
        miniparam = JSON.stringify(miniparam);

        this.data.isShowTip = true;

        let url = `https://www.kuaikanmanhua.com/webapp/mini/webapp_vip_purchase_coupon.html?type=h5&miniparam=${miniparam}`;
        util_action({ type: 18, id: "", url: url });
    },

    // 点击底部的会员特权
    vipPrivilegeTap(event) {
        // 点击开通会员页面按钮上报数据( 立即开通/交易明细/会员权益介绍/常见问题 )
        this.clickBtnKksa("会员权益介绍");
        // 埋点结束 S

        this.setData({ isUpdateData: false }); // 是否在onShow中更新数据 true:是   false:不更新
        let dataset = event.currentTarget.dataset; // 数据集合
        let { type } = dataset;
        let url = `https://www.kuaikanmanhua.com/webapp/mini/anim_vip_help.html?type=${type}`;
        util_action({ type: 18, id: "", url: url, params: { source: "mini-app", page: "buyvip" } });
    },

    // 点击常见问题跳转
    questionAllTap(event) {
        // 点击开通会员页面按钮上报数据( 立即开通/交易明细/会员权益介绍/常见问题 )
        this.clickBtnKksa("常见问题");
        // 埋点结束 S

        this.setData({ isUpdateData: false }); // 是否在onShow中更新数据 true:是   false:不更新
        let dataset = event.currentTarget.dataset; // 数据集合
        let { id } = dataset;
        let url; // https://www.kuaikanmanhua.com/anim/vip/faq.html
        if (id == 1) {
            url = "https://www.kuaikanmanhua.com/webapp/mini/anim_vip_faq.html";
        } else if (id == 2) {
            // 会员服务协议
            url = `https://www.kuaikanmanhua.com/anim/vipAgreement.html`;
        } else {
            // 自动续费协议
            url = `https://www.kuaikanmanhua.com/anim/autoRenew.html`;
        }
        util_action({ type: 18, id: "", url: url, params: { source: "mini-app", page: "buyvip" } });
    },

    // 关闭充值成功弹窗
    closeBtnTap() {
        this.setData({
            isShowPopup: false, // 关闭弹窗
        });
    },
    // 弹窗点击按钮事件
    popBtnTap() {
        let chargeSuccessBannerData = this.data.chargeSuccessBannerData || {};
        let action_target = chargeSuccessBannerData.action_target || null;
        if (action_target && action_target.action_type) {
            const { action_type: type, target_id: id, target_web_url: url } = action_target;
            util_action({ type, id, url });
        } else {
            this.setData({
                isShowPopup: false, // 关闭弹窗
            });
        }
    },

    // 点击对话框的按钮事件
    tapDialogButton(event) {
        let { index, item } = event.detail;
        if (index == 1) {
            this.getVipOrderId(this.data.order_id); // 查询订单号
        }

        // costType 设置为不是为首次签约订单
        this.setData({ isShowMpDialog: false, costType: 1 }); // 关闭弹窗
    },

    // 显示加载弹窗浮层(显示loading)
    showLoading() {
        // mask无效，强制为true
        util_showToast({
            title: "",
            type: "loading",
        });
    },

    // 赠送的图片宽高设置
    imgbindload(e) {
        // console.log(e)
        let { index } = e.currentTarget.dataset;
        let { width, height } = e.detail;
        let imgClass = this.data.imgClass;
        imgClass[index] = height > 110 ? 1 : 2; // 1:大高度图 2:小高度
        this.setData({ imgClass });
    },

    // 隐藏加载弹窗浮层(关闭loading)
    hideLoading() {
        util_hideToast();
    },

    // 神策埋点 - 上报会员开通结果
    TrackBuyVipRes(info, type, res) {
        const buyState = !!type; // 支付成果还是失败的结果
        const couponNum = info.coupon_model.coupon_amount || 0; // 优惠券金额
        const { environment } = _global;

        const data = {
            TriggerPage: "会员开通",
            MembershipPrdName: info.order_title, // 会员套餐名称 => 12个月 连续包月 3个月
            MembershipDayCount: info.recharge_value, // 会员套餐时长 => 100(天)
            OriginalPrice: info.order_fee, // 优惠前价格 => 1200（分）
            CurrentPrice: info.pay_fee, // 当前价格 => 1200（分)
            IsFirstOpen: info.cost_type == 2, // 是否首次开通 => true/false
            ChargePlatform: info.pay_type_name, // 支付方式 => 微信/QQ/支付宝
            Error: buyState ? "" : res.errMsg, // 购买失败原因
            IsVIPBuyDiscount: !!couponNum, // 是否使用优惠券 => true/false
            DiscountPrice: couponNum, // 优惠券金额 => 300（分）
            SourcePlatform: app.globalData.channel, // 来源平台 => wechat、qq
            VIPDiscountName: this.data.VIPDiscountName,
            TopicName: "无",
        };
        if (environment === "prod") {
            data.isBuySuccess = buyState; // 是否购买成功 => true/false
        } else {
            data.IsBuySuccess = buyState; // 是否购买成功 => true/false
        }
        if (this.data.limitFree && this.data.limitFree.isLimitFree) {
            data.NoticeType = "定向限免";
        }
        if (this.data.chargeSuccessBannerData && this.data.chargeSuccessBannerData.award_type === 22) {
            data.NoticeType = "畅读卡";
        }
        if (this.data.NoticeType) {
            data.NoticeType = "挽留弹窗";
        }
        if (this.data.topicId) {
            data.TopicID = this.data.topicId;
            data.TopicName = this.data.topicTitle;
        }
        app.kksaTrack("BeMembershipResult", data);
        if (!buyState) {
            util_logManager({
                LogType: "requestPayment",
                LogInfo: {
                    type: "会员开通",
                    order_id: info.order_id || "",
                },
                ErrorMsg: res.errMsg,
            });
        }
    },

    // 失败时处理埋点数据
    handleTrackData(err) {
        const { activeItem, costType } = this.data;
        // 优惠金额
        const coupon_amount = activeItem.coupon.usable_list.reduce((a, b) => {
            a += b.amount;
        }, 0);

        const info = {
            order_title: activeItem.title, // 会员套餐名称
            recharge_value: activeItem.recharge_value, // 会员套餐时长
            order_fee: activeItem.mark_price, // 优惠前价格
            pay_fee: activeItem.real_price, // 当前价格
            cost_type: costType, // 是否首次开通
            pay_type_name: "", // 支付方式
            coupon_model: {
                coupon_amount,
            },
        };
        this.TrackBuyVipRes(info, 0, {
            errMsg: err.message || err.errMsg,
        }); // 上报会员开通结果埋点 0 是失败
    },

    // 会员页面点击挽留弹窗的回调
    onVipDetaUseBtn(e) {
        const { displayData } = e.detail;
        this.data.goodId = displayData.good_id || "";
        this.data.couponId = displayData.id || "";
        if (displayData.good_id && displayData.good_id) {
            this.data.VIPDiscountName = displayData.title || "";
            this.data.NoticeType = displayData.popupSource || false;
        }
        util_showToast({
            title: "已为您选择优惠券对应商品",
            duration: 3000,
        });
        this.getVipGoodList();
    },

    // 挽留弹窗点击关闭按钮
    onVipDetaClose(e) {
        // const { displayData } = e.detail;
        // if (!displayData) { // 只有点击关闭按钮才会触发
        //     return false;
        // }
        // this.data.goodId = displayData.good_id || "";
        // this.data.couponId = displayData.id || "";
        // if (displayData.good_id && displayData.good_id) {
        //     this.data.VIPDiscountName = displayData.title || "";
        //     this.data.NoticeType = displayData.popupSource || false;
        // }
        let activeItem = JSON.parse(JSON.stringify(this.data.activeItem || {}));
        this.getVipGoodList(() => {
            this.setData({ activeItem });
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, vipInfo, webview }) => {
        return {
            userInfo,
            vipInfo,
            webview,
        };
    },
    (setState, _state) => ({
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
        clearWebview() {
            setState({ webview: {} });
        },
    })
)(page);

Page(ConnectPage);
