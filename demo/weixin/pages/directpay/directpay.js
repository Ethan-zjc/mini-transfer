import { util_request, util_action, util_showToast, util_hideToast, util_buyRedirect, util_checkVipInfo } from "../../util.js";

const app = getApp();
const { connect } = app.Store;
const api = require("./api");

const page = {
    data: {
        isiOS: app.globalData.isiOS, // 是否ios系统
        iPhoneX: app.globalData.iPhoneX, // 是否为ios全屏手机
        paySource: 1, // 下单来源  1:我的钱包  2:活动页
        good_type: 2, // 1:充值业务 2:会员充值业务
        productId: "", // 充值的商品id
        trigger_page: "", // 触发页面,埋点使用
        payfrom: app.globalData.payfrom, // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
        open_id: "",
        activeItem: {}, // 选中的商品数据(需要下单的商品数据)
        payTypes: {}, // 付款类型 pay_types[0]微信  pay_types[1]qq  app.globalData.channel 平台标识，微信: wechat，QQ: qq，用于接口url传参{channel}
        order_id: "", // 订单id
        isShowMpDialog: false, // 是否显示定点查询失败弹窗  true:显示  false:不显示
        contractCode: "", // 通知服务的续费状态的code
        costType: 1, // 订单类型 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
        // eslint-disable-next-line no-dupe-keys
        isShowPopup: false, // 是否显示充值成功弹窗  true:显示  false:不显示
        isShowCoupon: false,
        images: {
            close: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/close_00499c9.png",
            arrowR: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/arrow-r_3b70804.png",
            arrow: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/arrow_c76ddff.png",
            coupon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/coupon_cd6996a.png",
            popupBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/popup-bg_74381ce.png",
            popupTitle: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/popup-title_5148f21.png",
            loading: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/loading_d1d3e29.png", // 加载转圈效果
        },
        isUpdateData: true, // 是否在onShow中更新数据 true:是   false:不更新
        isShowlazyLoadPopup: false, // 加载转圈效果(是否显示延迟查询订单状态)
        setLazyLoadType: false, // 是否在设置查询订单中弹窗 false:没设置   true:是在设置中
        imgClass: {},
        getVipStatus: false, // 是否上报过访问页面埋点
        goodId: "", // 使用优惠卷传递商品id
        couponId: "", // 使用优惠卷传递优惠卷id
        isUse: true, // 是否使用优惠卷
        isShowTip: true, // 是否展示选择优惠卷提示
        VIPDiscountName: "", // 会员优惠券名称
        isPayed: false, // 默认没有发起支付
        delayCheckOrder: 0, // 查询订单状态，轮询查询次数
        __track_param: {}, // h5透传的上报埋点集合
    },

    // computed: {},
    // 页面创建时执行
    onLoad(options) {
        // let extraData = JSON.parse(decodeURIComponent(opts.extraData))
        // this.postPayOrder()
        let getParam = JSON.parse(decodeURIComponent(options.v_param));
        if (getParam) {
            let {
                // 接口所需字段
                third_activity, // 活动id
                paySource, // 1我的钱包 2活动页
                good_type, // 1kkb 2vip
                good_id: productId, // 商品id
                coupon_id: couponId,
                coupon_type,
                comic_id,
                topic_id,
                source_type, // 1签到，2皇冠，3作品，4礼包
                invite_code, // 拉新活动时候会有邀请码
                VIPDiscountName,
                redirect_url, // 支付成功后返回的地址
                // 埋点所需字段
                cps,
                trigger_page, // 充值成功上报的触发页面
                __track_param, // h5透传的上报埋点集合
            } = getParam;
            if (cps) {
                app.globalData.cps = cps;
            }
            VIPDiscountName = VIPDiscountName ? VIPDiscountName : "";
            // paySource 下单来源  1:我的钱包  2:活动页
            paySource = paySource == 1 ? 1 : paySource == 2 ? 2 : 1;
            // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
            let payfrom = app.globalData.payfrom;

            // 加载页面时，清楚webview残留数据
            this.clearWebview();

            // 存储下单来源
            this.data.productId = productId || "";
            this.data.redirect_url = redirect_url || "";
            this.data.third_activity = third_activity || "";
            this.data.couponId = couponId || "";
            this.data.coupon_type = coupon_type || "";
            this.data.comic_id = comic_id || "";
            this.data.topic_id = topic_id || "";
            this.data.source_type = source_type || "";
            this.data.invite_code = invite_code || "";
            this.data.cps = cps || "";
            this.data.good_type = good_type || "";
            this.data.trigger_page = trigger_page || "";
            this.data.__track_param = Object.prototype.toString.call(__track_param) == "[object Object]" ? __track_param : {};
            this.setData({ paySource, payfrom, VIPDiscountName });
        }
    },

    // 页面出现在前台时执行
    onShow(options) {
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
        app.globalData.cps = this.data.cps || app.globalData.cps;

        util_buyRedirect(app); // 充值业务页面 如果是微信平台并且是ios设备在线上环境,的页面跳转

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
                    this.getGoodsList().then(() => {
                        // 会员套餐列表接口_端外
                        if (!res) {
                            // 如果没有发起过支付，才会默认调用支付方法
                            if (!this.data.isPayed) {
                                this.buyInit();
                            }
                        } else {
                            this.setData({ order_id: res });
                            // 删除本地存储的订单号
                            this.removeStorageOrderId();
                            let { contractCode, costType } = this.data;
                            // app.global.toSignProgram 是否跳转过签约页面 contractCode:签约协议ID  costType:支付类型
                            if (contractCode && costType == 2 && app.global.toSignProgram) {
                                // 查询订单
                                this.getOrderId(res, () => {
                                    // 签约商品回调 (列如:连续包月vip)  contract_code : 签约协议ID
                                    this.getPayContract(contractCode);
                                });
                            } else {
                                this.getOrderId(res);
                            }
                        }
                    });
                })
                .catch(() => {
                    // 没有存储数据的情况
                    if (this.data.good_type == 1) {
                        this.getGoodsList().then(() => {
                            if (!this.data.isPayed) {
                                this.buyInit();
                            }
                        });
                        return false;
                    }

                    // 会员信息查询 (是否展示会员)
                    this.checkVipInfo(() => {
                        // 上报访问页面埋点 S
                        if (!this.data.getVipStatus) {
                            let vipInfo = this.data.vipInfo ? this.data.vipInfo : {};
                            let data = {
                                SourcePlatform: app.globalData.channel,
                                MembershipClassify: vipInfo.vip_type ? 1 : 0, // 会员的身份	Number	1会员，0非会员
                            };
                            // app.kksaTrack('VisitRechargeVIPPage', data);
                            this.setData({ getVipStatus: true }); // 下次显示页面不能上报数据
                        }
                        // 上报访问页面埋点 E

                        // 获取完成vip转态后获取vip 商品列表
                        if (this.data.isUpdateData) {
                            // 是否在onShow中更新数据 true:是   false:不更新
                            // 会员套餐列表接口_端外
                            this.getGoodsList().then(() => {
                                // 如果没有发起过支付，才会默认调用支付方法
                                if (!this.data.isPayed) {
                                    this.buyInit();
                                }
                            });
                        }
                        let time = setTimeout(() => {
                            clearTimeout(time);
                            this.setData({ isUpdateData: true });
                        }, 100);
                    });
                });
        });
    },

    // 页面从前台变为后台时执行
    onHide() {
        if (this.data.good_type == 2) {
            api.unloadReportPayInfo({ type: "vip" })
                .then(() => {
                    console.log("上报成功");
                })
                .catch(() => {});
        } else {
            api.unloadReportPayInfo({ type: "kkb" })
                .then(() => {
                    console.log("上报成功");
                })
                .catch(() => {});
        }
    },

    // 页面销毁时执行
    onUnload() {
        if (this.data.good_type == 2) {
            api.unloadReportPayInfo({ type: "vip" })
                .then(() => {
                    console.log("上报成功");
                })
                .catch(() => {});
        } else {
            api.unloadReportPayInfo({ type: "kkb" })
                .then(() => {
                    console.log("上报成功");
                })
                .catch(() => {});
        }

        if (this.data.isShowMpDialog || this.data.isShowPopup) {
            console.log("返回");
            let pages = getCurrentPages();
            let prevPage = pages[pages.length - 2]; // 上一个页面
            // 直接调用上一个页面的setData()方法，把数据存到上一个页面中去
            let backh5url = this.data.redirect_url;
            // 返回h5活动页面的上一个页面
            app.globalData.webviewRedirectUrl = backh5url; // 全局变量记录的webview重定向地址
            prevPage.setData({ redirect_url: backh5url });
        }
    },

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
                key: this.data.good_type == 2 ? "active_order_id" : "active_kkb_order_id",
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
            key: this.data.good_type == 2 ? "active_order_id" : "active_kkb_order_id",
            success(res) {
                // console.log('removeStorageOrderId:',res)
            },
        });
    },

    // 会员套餐列表接口_端外
    getGoodsList() {
        return new Promise((resolve, reject) => {
            api.getGoodsApi({
                good_type: this.data.good_type,
                good_id: this.data.productId,
                third_activity: this.data.third_activity,
            })
                .then((res) => {
                    let { code, data, message } = res;
                    if (code != 200) {
                        util_showToast({
                            title: message,
                            type: "error",
                            mask: true,
                            duration: 3000,
                        });
                        reject();
                        return null;
                    }
                    let {
                        wechat_ticket,
                        recharge_good: recharges, // 充值信息
                        pay_types, // 支付类型
                        member_good: activeItem,
                        request_id,
                    } = data;

                    let payTypesIndex = 10; // wechat: 10
                    let payTypes = {};
                    if (pay_types && pay_types.length > 0) {
                        pay_types.forEach((item) => {
                            if (item.pay_type == payTypesIndex) {
                                payTypes = item;
                            }
                        });
                    }

                    if (this.data.good_type == 1) {
                        // kkb内容
                        recharges = recharges ? recharges : {};
                        let { recharge_type, words_info } = recharges;

                        // 文案展示, 主要使用words_info.wallet_word(充值副标题)
                        let wordsInfo = words_info ? words_info : {};
                        // 充值类型
                        let rechargeType = recharge_type ? recharge_type : "";
                        recharges.realPrice = recharges.real_price / 100;

                        // 存储付款类型 pay_types 信息E
                        this.setData(
                            {
                                activeItem: recharges, // 选中的商品数据(需要下单的商品数据)
                                rechargeType, // 充值类型
                                wordsInfo, // 文案展示 主要使用words_info.wallet_word(充值副标题)
                                open_id: app.globalData.openId, // 开放id
                                payTypes, // 付款类型
                            },
                            () => {
                                resolve();
                            }
                        );
                        return;
                    }

                    activeItem.description = activeItem.description ? activeItem.description : ""; // 商品描述
                    activeItem.discount_tips = activeItem.discount_tips ? activeItem.discount_tips : ""; // 商品折扣信息
                    // coupon优惠券列表, coupon.usable_list 可用清单  coupon.unreachable_list 不可用优惠券
                    activeItem.coupon = activeItem.coupon ? activeItem.coupon : { usable_list: [], unreachable_list: [] };

                    if (this.data.couponId) {
                        // 如果是优惠卷页打开的
                        if (activeItem.coupon.usable_list.length) {
                            const coupon = activeItem.coupon.usable_list.filter((value) => {
                                return value.id == this.data.couponId;
                            });
                            activeItem.usableCouponFirst = coupon[0] ? coupon[0] : null;
                            // activeItem.usableCouponFirst = coupon[0] ? coupon[0] : activeItem.coupon.usable_list[0];
                        } else {
                            activeItem.usableCouponFirst = null;
                        }
                    } else {
                        activeItem.usableCouponFirst = null; // 可用的优惠券的第一个 自定义参数
                    }

                    // 不使用优惠卷
                    if (!this.data.isUse) {
                        activeItem.usableCouponFirst = null;
                    }

                    if (activeItem.usableCouponFirst || !this.data.isUse) {
                        this.setData({ isShowCoupon: true }); // 有优惠券存在才显示 优惠券入口
                    }
                    activeItem.platform = activeItem.platform ? activeItem.platform : 0; // 平台
                    activeItem.mark_price = activeItem.price.mark_price ? activeItem.price.mark_price : 0; // 标记价格(优惠前的价格) 单位分
                    activeItem.real_price = activeItem.price.real_price ? activeItem.price.real_price : 0; // 实际价格
                    activeItem.realPrice = activeItem.real_price / 100;

                    // 存储付款类型 pay_types 信息E
                    this.setData(
                        {
                            activeItem,
                            payTypes,
                            request_id,
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

    // 获取会员下单 端外下单(点击立即支付按钮调用[获取订单号])  callback:回调函数
    postPayOrder(callback) {
        // 设置请求参数
        let activeItem = this.data.activeItem; // 选中的商品数据
        let pay_info = {};
        if (this.data.topic_id) {
            pay_info.topic_id = this.data.topic_id;
        }
        if (this.data.third_activity) {
            pay_info.third_activity = this.data.third_activity;
        }
        if (activeItem.usableCouponFirst) {
            // 默认选中第一个可用优惠券
            pay_info.coupon_id = activeItem.usableCouponFirst.id; // 可用优惠券id
        }

        let sendData = {
            pay_type: this.data.payTypes.pay_type, // 下单的业务 支付类型
            pay_source: this.data.paySource, // 下单来源  1:我的钱包  2:活动页
            good_type: this.data.good_type, // 1:充值业务 2:会员充值业务
            good_id: this.data.productId, // activeItem.iap_good_id,
            pay_info: JSON.stringify(pay_info),
            open_id: app.globalData.openId, // 开放id
            from: this.data.payfrom, // 1,端内,2微信公众号，3微信小程序，4QQ小程序，5.M站，6分销，7支付SDK
            platform: app.globalData.isiOS ? 2 : 1, // 1：安卓，2：IOS
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
                    wx.setStorage({
                        key: this.data.good_type == 2 ? "active_order_id" : "active_kkb_order_id",
                        data: order_id,
                    });
                    let contract_code = request_data.contract_code ? request_data.contract_code : "";
                    this.setData({
                        contractCode: contract_code, // 订单类型 通知服务的续费状态的code
                        costType: 2, // 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
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
    getOrderId(id, callback) {
        let order_id = id ? id : this.data.order_id; // 订单id
        if (!order_id) {
            return false;
        }

        this.showLoading(); // 打开加载浮层
        let delayCheckTimer = setTimeout(() => {
            clearTimeout(delayCheckTimer);
            // 请求接口 查询订单状态
            api.getOrderIdApi({ order_id, good_type: this.data.good_type })
                .then((res) => {
                    let { code, data } = res;
                    let pay_order = data.pay_order ? data.pay_order : {};

                    // vip&kkb公共的失败处理
                    if (code != 200 || data.pay_order.pay_status != 2) {
                        this.data.delayCheckOrder++;
                        if (this.data.delayCheckOrder < 4) {
                            // 查询3次后提示
                            let time = setTimeout(() => {
                                clearTimeout(time);
                                this.getOrderId(id);
                            }, 1000);
                            return false;
                        }
                        this.setData({
                            isShowMpDialog: true,
                        }); // 显示查询失败弹窗
                        this.data.delayCheckOrder = 0; // 查询订单次数 重置为0
                        this.hideLoading(); // 关闭加载弹窗
                        return false;
                    }
                    this.hideLoading(); // 关闭加载弹窗
                    this.data.delayCheckOrder = 0; // 查询订单次数 重置为0

                    // 查询订单id，进行区分vip&kkb 1: kkb 2: vip
                    if (this.data.good_type == 1) {
                        // this.checkWallet(); // 检查kk币余额
                        let kb_charge_result = data.kb_charge_result || {};
                        // 充值的kkb数据
                        let recharge_value = pay_order.recharge_value ? pay_order.recharge_value : 0;
                        // 充值赠送的kkb数量
                        let present_red_kkb = kb_charge_result.present_red_kkb ? kb_charge_result.present_red_kkb : 0;
                        // 充值kkb总数结果 =  充值的kkb数据 + 充值赠送的kkb数量;
                        this.data.rechargeResult = recharge_value + present_red_kkb;
                        // 充值送代金券活动名称
                        this.data.present_red_pack_activity_name = kb_charge_result.present_red_pack_activity_name || "";
                        // 是否展示充值代金券活动
                        this.data.present_red_pack_activity_show_banner = !kb_charge_result.present_red_pack_activity_show_banner;
                        this.kkbTrackData({ event: "RechargeResult", status: 1, order_fee: pay_order.order_fee });
                        this.setData({
                            isShowPopup: true, // 是否显示充值成功弹窗
                        });
                        return;
                    } else {
                        if (callback && typeof callback === "function") {
                            callback();
                        }
                        this.TrackBuyVipRes(pay_order, 1, {}); // 上报会员开通结果埋点  1是成功

                        // 弹窗展示数据
                        this.checkVipInfo(() => {
                            // 查询vip 状态后展示弹窗
                            this.hideLoading(); // 关闭加载弹窗
                            this.setData({
                                isShowPopup: true, // 是否显示充值成功弹窗
                            });
                        });
                    }
                })
                .catch((err) => {
                    this.data.delayCheckOrder++;
                    if (this.data.delayCheckOrder < 4) {
                        this.getOrderId(id, callback);
                    } else {
                        // 失败时处理数据
                        if (this.data.good_type == 2) {
                            this.handleTrackData(err);
                        } else {
                            this.kkbTrackData({ event: "RechargeResult", status: 0, infos: err });
                        }

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

    // 进入页面进行支付
    buyInit() {
        let _this = this;
        if (!this.data.userInfo) {
            wx.navigateTo({ url: "/pages/login/login" });
            return false;
        }

        this.postPayOrder((res) => {
            let {
                pay_data, // 支付信息对象requestPayment支付所有信息
                pay_order, // 订单号信息对象  pay_order:order_id 订单信息
            } = res;
            pay_order = pay_order ? pay_order : {};
            let order_id = pay_order.order_id ? pay_order.order_id : ""; // 订单号

            // this.getPayContract()
            // 本地存的订单id,防止支付成功后退出小程序或者微信,在显示页面中查询
            wx.setStorage({
                key: this.data.good_type == 2 ? "active_order_id" : "active_kkb_order_id",
                data: order_id,
            });
            this.setData({ order_id });

            wx.requestPayment({
                ...pay_data,
                success: (res) => {
                    let succRes = res;
                    // 设置是否显示延迟获取订单(查询订单信息)  如果是签约的情况需要延迟查询
                    // _this.setIsShowlazyLoadPopup(() => {
                    // 查询本地存储的订单号后,查询订单,并且删除本地存储的订单号
                    _this.getStorageOrderId().then((res) => {
                        // 支付成功执行
                        if (_this.data.good_type == 2) {
                            _this.TrackBuyVipRes(pay_order, 1, succRes); // 上报会员开通结果埋点  1是成功
                        }
                        if (!res) {
                            return false;
                        }

                        _this.removeStorageOrderId(); // 删除本地存储的订单号
                        _this.setIsShowlazyLoadPopup(() => {
                            _this.getOrderId(res); // 查询订单
                        });
                    });
                    // });
                },
                fail: (res) => {
                    // 支付失败执行
                    if (_this.data.good_type == 2) {
                        // 会员的支付失败上报
                        _this.TrackBuyVipRes(pay_order, 0, res);
                    } else {
                        // kkb的支持失败上报
                        _this.trackErrPay(res);
                    }

                    // 查询本地订单号 后删除
                    _this.getStorageOrderId().then(() => {
                        _this.removeStorageOrderId();
                    });
                    wx.navigateBack({ delta: 1 });
                },
                complete: () => {
                    // 不管支付成功还是失败都会执行
                    // 如果是发起过支付的，onshow时就不会再自动调用支付方法
                    _this.data.isPayed = true;
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

    // 返回h5活动页
    payback() {
        let backh5url = this.data.redirect_url;
        let pages = getCurrentPages();
        let prevPage = pages[pages.length - 2]; // 上一个页面
        app.globalData.webviewRedirectUrl = backh5url; // 全局变量记录的webview重定向地址
        prevPage.setData({ redirect_url: backh5url });
        wx.navigateBack({ delta: 1 });
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

    // 神策埋点 - 上报会员开通结果
    TrackBuyVipRes(info, type, res) {
        const buyState = !!type; // 支付成果还是失败的结果
        const couponNum = info.coupon_model ? info.coupon_model.coupon_amount || 0 : 0; // 优惠券金额
        let vipInfo = this.data.vipInfo ? this.data.vipInfo : {};
        let data = {
            TriggerPage: this.data.trigger_page || "会员开通",
            MembershipPrdName: info.order_title, // 会员套餐名称 => 12个月 连续包月 3个月
            MembershipDayCount: info.recharge_value, // 会员套餐时长 => 100(天)
            OriginalPrice: info.order_fee, // 优惠前价格 => 1200（分）
            CurrentPrice: info.pay_fee, // 当前价格 => 1200（分)
            IsFirstOpen: info.cost_type == 2, // 是否首次开通 => true/false
            ChargePlatform: info.pay_type_name, // 支付方式 => 微信/QQ/支付宝
            isBuySuccess: buyState, // 是否购买成功 => true/false
            Error: buyState ? "" : res.errMsg, // 购买失败原因
            IsVIPBuyDiscount: !!couponNum, // 是否使用优惠券 => true/false
            DiscountPrice: couponNum, // 优惠券金额 => 300（分）
            SourcePlatform: app.globalData.channel, // 来源平台 => wechat、qq
            VIPDiscountName: this.data.VIPDiscountName,
            TopicName: "无",
            MiniMembershipClassify: vipInfo.vip_group_type_name ? vipInfo.vip_group_type_name : "",
        };
        data = {
            ...data,
            ...this.data.__track_param, // h5透传给小程序上报属性
        };

        app.kksaTrack("BeMembershipResult", data);
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

    // kkb充值相关埋点
    kkbTrackData({ event = "", status = 1, infos = {}, order_fee = 0 } = {}) {
        api.getPointCharge().then((res) => {
            let {
                    LastRechargeTime, // 最后充值时间
                    RechargeType, // 累计充值次数
                } = res,
                kksaRechargeResult = {};
            kksaRechargeResult.IsRechargeVoucher = this.data.present_red_pack_activity_show_banner; // 是否展示充值代金券活动
            kksaRechargeResult.RechargeVoucherActivityName = this.data.present_red_pack_activity_name; // 充值送代金券活动名称
            kksaRechargeResult.FailReason = ""; // 充值失败原因
            kksaRechargeResult.LastRechargeTime = LastRechargeTime; // 最后充值时间
            kksaRechargeResult.RechargeType = RechargeType; // 累计充值次数
            kksaRechargeResult.SourcePlatform = app.globalData.channel; // 来源平台
            kksaRechargeResult.TriggerPage = this.data.trigger_page || "RechargePage 充值中心"; // 触发页面
            kksaRechargeResult.TopicName = "无";

            if (status == 1) {
                kksaRechargeResult.PaymentsAccount = order_fee; // 充值人民币金额
                kksaRechargeResult.KkAccount = this.data.rechargeResult; // 埋点用的到账金额
                kksaRechargeResult.IsRechargeSuccess = "True"; // 埋点使用是否充值成功 True/False
            } else {
                kksaRechargeResult.FailReason = infos.message; // 充值失败原因
                kksaRechargeResult.PaymentsAccount = 0; // 充值人民币金额
                kksaRechargeResult.KkAccount = 0; // 埋点用的到账金额
                kksaRechargeResult.IsRechargeSuccess = "False";
            }
            kksaRechargeResult = {
                ...kksaRechargeResult,
                ...this.data.__track_param, // h5透传给小程序上报属性
            };
            app.kksaTrack(event, kksaRechargeResult); // 埋点
        });
    },

    // kkb充值失败时上报神策
    trackErrPay(res) {
        // 选中的充值信息
        const { activeItem, LastRechargeTime, RechargeType } = this.data; // 充值kkb总数结果 =  充值的kkb数据 + 充值赠送的kkb数量;

        const KkAccount = (activeItem.recharge_value || 0) + (activeItem.present_value || 0);
        const data = {
            TriggerPage: this.data.trigger_page || "RechargePage 充值中心",
            // 触发页面
            PaymentsAccount: activeItem.real_price,
            // 充值人民币金额
            KkAccount,
            // 到账kk币金额
            IsRechargeSuccess: "False",
            // 充值是否成功
            FailReason: res.errMsg,
            // 失败原因
            LastRechargeTime,
            // 最后充值时间
            RechargeType,
            // 累计充值次数
            SourcePlatform: app.globalData.channel,
            // 来源平台
            IsRechargeVoucher: this.data.shotCouponActivity,
            RechargeVoucherActivityName: this.data.couponActivityName,
            TopicName: "无",
            ...this.data.__track_param, // h5透传给小程序上报属性
        };
        app.kksaTrack("RechargeResult", data);
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
