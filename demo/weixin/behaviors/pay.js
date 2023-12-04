import { util_showToast, util_hideToast, util_checkWallet, util_getPointCharge, util_checkVipInfo } from '../util.js';
import { postPayOrderApi, getOrderIdResultApi } from '../common/js/pay.api.js';

const app = getApp();
const global = app.globalData;

module.exports = Behavior({
    methods: {
        /**
         * 根据商品信息获取订单和支付信息
         * 关注传入信息pay_source、good_type、pay_info
         * payfrom没有使用确定
         * 传入goodInfos集合
         * goodInfos: {
         *    pay_source: 1, // 非必传，不传默认1 来源为我的钱包 2 活动页
         *    good_type: 1, // 非必传，不传默认1 为kkb充值 2: 会员
         *    good_item: {}, // 必传商品信息字段 id: 商品id, real_price: 充值人民币金额(未转换单位前，服务端下发)，recharge_value: 充值的kkb数量, present_value: 赠送的kkb数量，不传均按0处理
         *    pay_info: {}, // 非必传，埋点等所携带信息，例如third_activity
         *    sa_infos: {
         *        NoticeType: "" // 弹窗提醒类型
         *        ...
         *    }
         * }
         */
        postPayOrder(goodInfos) {
            return new Promise((resolve, reject) => {
                const { pay_source = 1, good_type = 1, good_item = {}, pay_info = {} } = goodInfos || {};
                const { id = 0, recharge_value = '' } = good_item;
                const errorMessage = {
                    title: '',
                    type: 'error',
                    mask: true,
                    duration: 3000,
                };

                // 如果商品id不存在拦截
                if (!id) {
                    util_showToast(Object.assign(errorMessage, { title: '商品id不存在' }));
                    reject(null);
                    return;
                }
                let sendData = {
                    pay_source, // 下单来源  1:我的钱包  2:活动页
                    good_type, // 1:充值kkb业务 2:会员充值业务
                    good_id: id, // 商品id
                    pay_info,
                };

                // 点击购买按钮信息上报
                if (good_type == 1) {
                    this.getPointChargeFun({
                        isPay: false,
                        PaymentsAccount: recharge_value,
                        eventName: 'ClickRechargeButton',
                    });
                }
                // 跟据充值信息获取订单信息
                postPayOrderApi(sendData)
                    .then((res) => {
                        let { code, data, message } = res || {};
                        if (code != 200) {
                            util_showToast(Object.assign(errorMessage, { title: message }));
                            return null;
                        }
                        resolve(data);
                    })
                    .catch((err) => {
                        util_showToast(Object.assign(errorMessage, { title: err.message }));
                        reject(null);
                    });
            });
        },

        // 支付失败处理
        async payError(good_type, pay_order, errMsg) {
            if (good_type == 2) {
                this.trackBuyVipRes(pay_order, 0, { errMsg });
            } else {
                this.trackErrPay(errMsg); // 上报
            }
            let orderId = (await this.getStorageOrderId(good_type)) || 0;
            if (orderId) {
                this.removeStorageOrderId(good_type);
            }
        },

        // 统一充值方法，充值kkb、充值vip
        // goods 商品信息
        // type 充值类型kkb, vip
        surePayFun(goodInfos) {
            // eslint-disable-next-line no-async-promise-executor
            return new Promise(async (resolve, reject) => {
                // 拦截防止重复点击
                if (this.data.clickPayEvent) {
                    return;
                }
                this.data.clickPayEvent = true;

                const { good_type = 1, good_item = {}, sa_infos = {} } = goodInfos;
                let res = (await this.postPayOrder(goodInfos)) || {};
                if (!res) {
                    // console.log("出现异常");
                    this.data.clickPayEvent = false;
                    reject();
                    return;
                }

                // 下单后返回信息
                let { pay_data, pay_order = {} } = res;
                let order_id = pay_order.order_id || '';

                if (pay_order.cost_type == 2) {
                    // 会员签约商品设置
                    this.setVipSignInfo(pay_data);
                }

                // 本地存的订单id、商品信息，防止与页面部分参数冲突
                this.data._order_id = order_id;
                this.data._good_item = good_item;
                this.data._sa_infos = sa_infos;
                this.data._good_type = good_type;

                // 种植存储加_防止与充值中心存储冲突
                wx.setStorage({ key: '_buy_order_id', data: order_id });

                // 调取支付api

                wx.requestPayment({
                    ...pay_data,
                    success: async () => {
                        this.data.clickPayEvent = false;
                        await this.paySuccess(good_type);
                        resolve();
                    },
                    fail: (res) => {
                        this.data.clickPayEvent = false;
                        this.payError(good_type, pay_order, res.message);
                        reject();
                    },
                    complete: () => {
                        this.data.clickPayEvent = false;
                    },
                });
            });
        },

        // 会员签约商品设置
        setVipSignInfo(pay_data) {
            // 首次使用签约(续费)vip
            let request_data = pay_data.request_data || {};
            wx.navigateTo({ url: '/pages/pay/pay?pagetype=auto&extraData=' + encodeURIComponent(request_data) });

            let contract_code = request_data.contract_code || '';

            // 是否继续使用原有的查单业务
            Object.assign(this.data, {
                _contract_code: contract_code, // 订单类型 通知服务的续费状态的code
                _cost_type: 2, // 1：普通订单 2 首次签约开通 3：自动续费订单 4：复用签约协议签约
            });
        },

        // 获取订单号处理
        getStorageOrderId() {
            return new Promise((resolve, reject) => {
                wx.getStorage({
                    key: '_buy_order_id',
                    success: (res) => {
                        resolve(res.data);
                    },
                    fail: () => {
                        reject();
                    },
                });
            });
        },

        // 删除订单
        removeStorageOrderId() {
            wx.removeStorage({
                key: '_buy_order_id',
                success() {},
            });
        },
        showLoading() {
            util_showToast({
                title: '',
                type: 'loading',
            });
        },

        // 查询订单状态, 区分vip和kkb
        checkOrderStatus(id) {
            return getOrderIdResultApi({ order_id: id, type: this.data._good_type }).then((res) => {
                const { code, data = {} } = res || {};
                const { pay_order = {} } = data || {};

                if (code == 200 && pay_order.pay_status == 2) {
                    this.data._delayCheckOrder = 0;
                    return { status: true, result: res };
                }
                this.data._delayCheckOrder++;
                if (this.data._delayCheckOrder > 3) {
                    this.data._delayCheckOrder = 0;
                    return { status: false, result: res };
                }
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        resolve(await this.checkOrderStatus(id));
                    }, 500 * this.data._delayCheckOrder);
                });
            });
        },

        // 查询订单
        async checkOrderId(id, cb) {
            if (!id) {
                return false;
            }
            this.showLoading();

            try {
                const payResult = await this.checkOrderStatus(id);
                util_hideToast();

                const { status = false, result = {} } = payResult;
                let { pay_order = {}, kb_charge_result = {}, vip_charge_result = {} } = result.data || {};
                if (status) {
                    const pages = getCurrentPages();
                    const length = pages.length;
                    const currentPage = pages[length - 1];
                    if (this.data._good_type == 2) {
                        util_checkVipInfo(currentPage, () => {
                            util_showToast({
                                title: '充值成功',
                                duration: 2000,
                            });
                            this.trackBuyVipRes(pay_order, 1, {}); // 上报会员开通结果埋点  1是成功
                        });
                    } else {
                        util_checkWallet(currentPage); // 检查kk币余额

                        let present_red_kkb = kb_charge_result.present_red_kkb || 0; // 充值是否送了代金券
                        // let shotCouponText = kb_charge_result.present_red_pack > 0; // 充值的kkb数据

                        let recharge_value = pay_order.recharge_value || 0; // 充值kkb总数结果 =  充值的kkb数据 + 充值赠送的kkb数量;

                        let rechargeResult = recharge_value + present_red_kkb;

                        this.getPointChargeFun({
                            isPay: true,
                            KkAccount: rechargeResult,
                            PaymentsAccount: pay_order.order_fee,
                            eventName: 'RechargeResult',
                            IsRechargeSuccess: 'True',
                        });

                        util_showToast({
                            title: '充值成功',
                            duration: 2000,
                        });
                    }
                    this.data._vipChargeResult = vip_charge_result;
                    cb && cb(1);
                } else {
                    cb && cb(0);
                    this.handleTrackData(result || {});
                }
            } catch (err) {
                cb && cb(0);
                util_hideToast();
                this.handleTrackData(err || {});
            }
        },

        // 支付成功处理失败有信息上报，需要包裹
        async paySuccess(good_type) {
            let orderId = (await this.getStorageOrderId(good_type)) || 0;
            return new Promise((resolve, reject) => {
                if (orderId) {
                    this.removeStorageOrderId(good_type);

                    // 查询订单
                    this.checkOrderId(orderId, (res) => {
                        if (res) {
                            resolve();
                        } else {
                            reject();
                        }
                    });
                } else {
                    reject();
                }
            });
        },

        // 获取当前页面栈
        getPage() {
            const pages = getCurrentPages();
            const route = pages[pages.length - 1].route;
            const pagesObj = {
                topic: '专题页',
                feed: '推荐页',
                comic: '漫画详情页',
                chapters: '漫剧播放页',
                'vip-center': '小程序新会员中心页面',
            };
            return pagesObj[route.substring(route.lastIndexOf('/') + 1)] || '';
        },

        // 订单失败上报
        trackErrPay(errMsg) {
            // 需要将当前订单信息和失败返回等透传出来
            let { _good_item = {} } = this.data || {};
            let { LastRechargeTime, RechargeType } = this.data;

            // 充值kkb总数结果 =  充值的kkb数据 + 充值赠送的kkb数量;
            const KkAccount = (_good_item.recharge_value || 0) + (_good_item.present_value || 0);

            const data = {
                TriggerPage: this.getPage(), // 触发页面
                PaymentsAccount: _good_item.real_price || 0, // 充值人民币金额
                KkAccount, // 到账kk币金额
                IsRechargeSuccess: 'False', // 充值是否成功
                FailReason: errMsg || '', // 失败原因
                LastRechargeTime, // 最后充值时间
                RechargeType, // 累计充值次数
                SourcePlatform: global.channel, // 来源平台
                IsRechargeVoucher: false, // 暂无活动信息
                RechargeVoucherActivityName: '', // this.data.couponActivityName,
                TopicName: '', // this.data.couponInfo.topicName || "无"
            };

            Object.assign(data, this.data._sa_infos || {});

            app.kksaTrack('RechargeResult', data);
        },

        /**
         * 埋点
         * @param {*} goods
         * @param {*} type
         */
        getPointChargeFun({ PaymentsAccount = 0, KkAccount = 0, FailReason = '', eventName = '', isPay = false, IsRechargeSuccess = 'False' } = {}) {
            // 充值失败埋点 S PaymentsAccount
            util_getPointCharge().then((res) => {
                let { LastRechargeTime, RechargeType } = res;
                // eslint-disable-next-line sonarjs/prefer-object-literal
                let kksaRechargeResult = {};
                kksaRechargeResult.LatestBalance = this.data.wallet; // 需要页面引入
                kksaRechargeResult.IsRechargeVoucher = false; // 是否展示充值代金券活动
                kksaRechargeResult.RechargeVoucherActivityName = ''; // 充值送代金券活动名称
                kksaRechargeResult.LastRechargeTime = LastRechargeTime; // 最后充值时间
                kksaRechargeResult.RechargeType = RechargeType; // 累计充值次数
                kksaRechargeResult.SourcePlatform = global.channel; // 来源平台
                kksaRechargeResult.TopicName = '无';

                // 补充埋点
                Object.assign(kksaRechargeResult, this.data._sa_infos || {});

                // 充值特有属性
                if (isPay) {
                    kksaRechargeResult.TriggerPage = this.getPage(); // 触发页面
                    kksaRechargeResult.IsRechargeSuccess = IsRechargeSuccess; // 埋点使用是否充值成功 True/False
                    kksaRechargeResult.FailReason = FailReason; // 充值失败原因
                }
                if (PaymentsAccount) {
                    kksaRechargeResult.PaymentsAccount = PaymentsAccount; // 充值人民币金额
                }
                if (KkAccount) {
                    kksaRechargeResult.KkAccount = KkAccount; // 埋点用的到账金额
                }

                Object.assign(this.data, {
                    RechargeType,
                    LastRechargeTime,
                });
                app.kksaTrack(eventName, kksaRechargeResult);
            });
        },

        // 会员充值结果上报
        trackBuyVipRes(info, type, res) {
            const buyState = !!type; // 支付成果还是失败的结果
            const couponNum = (info.coupon_model && info.coupon_model.coupon_amount) || 0; // 优惠券金额
            const { environment } = global;

            const data = {
                TriggerPage: this.getPage(),
                MembershipPrdName: info.order_title,
                MembershipDayCount: info.recharge_value,
                OriginalPrice: info.order_fee, // 优惠前价格 => 1200（分）
                CurrentPrice: info.pay_fee, // 当前价格 => 1200（分)
                IsFirstOpen: info.cost_type == 2,
                ChargePlatform: info.pay_type_name,
                Error: buyState ? '' : res.errMsg,
                IsVIPBuyDiscount: !!couponNum,
                DiscountPrice: couponNum,
                SourcePlatform: app.globalData.channel,
                VIPDiscountName: '',
                TopicName: '无',
            };
            if (environment === 'prod') {
                data.isBuySuccess = buyState; // 是否购买成功 => true/false
            } else {
                data.IsBuySuccess = buyState; // 是否购买成功 => true/false
            }
            Object.assign(data, this.data._sa_infos || {});
            app.kksaTrack('BeMembershipResult', data);
        },

        // 会员订单查询失败时信息整合
        handleTrackData(err) {
            const { _good_item = {}, _cost_type } = this.data;

            // 优惠金额
            const coupon_amount =
                _good_item.coupon && _good_item.coupon.usable_list
                    ? _good_item.coupon.usable_list.reduce((a, b) => {
                          a += b.amount;
                      }, 0)
                    : 0;

            const info = {
                order_title: _good_item.title, // 会员套餐名称
                recharge_value: _good_item.recharge_value, // 会员套餐时长
                order_fee: _good_item.mark_price, // 优惠前价格
                pay_fee: _good_item.real_price, // 当前价格
                cost_type: _cost_type ? _cost_type : 0, // 是否首次开通
                pay_type_name: '', // 支付方式
                coupon_model: {
                    coupon_amount,
                },
            };
            this.trackBuyVipRes(info, 0, {
                errMsg: err.message || err.errMsg,
            });
        },
    },
});
