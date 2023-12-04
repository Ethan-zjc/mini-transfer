/**
 * 专题页付费(20220928)
 * **/
const app = getApp();
const global = app.globalData;
const payBehavior = require("../../../../behaviors/pay");

import { payMainApi } from "./api.js";
import { paidCartoonApi, getKkbMealListApi } from "../../../../common/js/pay.api.js";
import { util_showToast, util_formatTime } from "../../../../util.js";

Component({
    behaviors: [payBehavior],
    properties: {
        userInfo: {
            type: [Object, String],
            default: "",
        },
        wallet: {
            type: Number | String,
            value: 0,
        },
        topicId: {
            type: Number | String,
            value: 0,
        },
        vipInfo: {
            // vipInfo.vip_type > 0 是会员
            type: [Object, String],
            value: {},
        },
        topicName: {
            type: String,
            value: "",
        },
        loginSuccess: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        isShow: false, // 接口返回的是否显示悬浮框
        countDown: 0,
        images: {
            kkb: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/kkb_c6c729e.png",
        },
    },
    observers: {
        loginSuccess(val) {
            if (val) {
                this.initPage();
            }
        },
    },
    attached() {},
    methods: {
        async initPage() {
            const storage = wx.getStorageSync("topic:discount") || "";
            const curDate = util_formatTime(new Date(), "yyyy-MM-dd");
            if (!storage || storage != curDate) {
                if (!global.abtestSign.length) {
                    await app.getAbTest();
                }
                if (global.abtestSign.includes("s_wechatpop_a")) {
                    this.initMainApi();
                }
            }
        },
        initMainApi() {
            payMainApi({ topic_id: this.data.topicId })
                .then(async (res) => {
                    let { price_info = {} } = res.data || {};
                    let { coupon = {}, batch_purchase_list = [], text_info = {}, topic_info_view = {} } = price_info;
                    if (!batch_purchase_list.length) {
                        console.log("没有批量购买章节，无需展示弹窗");
                        return;
                    }
                    let priceInfo = batch_purchase_list.length ? batch_purchase_list[0] : {};
                    let { discount_label: discountLabel = {}, market_text: marketInfo = {} } = text_info;

                    // 支付价格实际信息
                    let {
                        deduction_texts = [],
                        origin_kk_currency = 0,
                        red_packet_deduction = 0,
                        platform_deduction = 0,
                        selling_kk_currency = 0,
                        total_discount = 0,
                    } = priceInfo.price_info || {};
                    let isShow = false;

                    let { wallet = 0 } = this.properties;
                    if (!global.isiOS || selling_kk_currency <= wallet) {
                        isShow = true;
                    } else {
                        // 此时不满足条件无需走下面逻辑, 记得放开
                        return;
                    }

                    // 优惠信息
                    let market_text = marketInfo.text || "";
                    const discountInfo = {
                        discount_text: marketInfo.discount_text, // 优惠多少
                        discount_left: discountLabel.left_text || "", // vip图标
                        discount_right: discountLabel.right_text || "", // vip类型
                        market_text, // 原价多少，删除线
                    };
                    if (market_text) {
                        discountInfo.market_delete = market_text.indexOf("$") > -1; // 优惠信息是否带删除线
                        discountInfo.market_text = market_text.replace(/\$/g, ""); // 优惠信息左侧（原价）
                    }

                    // 返币icon，购买按钮的角标
                    const iconInfo = priceInfo.icon || {};
                    const payIconUrl = iconInfo.icon_url || "";

                    // 满减卷信息
                    let spend_coupon_view_list = priceInfo.spend_coupon_view_list || [];
                    let spend_coupon_info = spend_coupon_view_list[0] || {};
                    let spend_coupon_id = spend_coupon_info.spend_coupon_id || 0;
                    let spend_coupon_record_id = spend_coupon_info.spend_coupon_record_id || 0;

                    // 购买价格信息
                    let prchaseData = {
                        batch_count: priceInfo.batch_count || 0, // 可购买的章节数
                        comic_ids: priceInfo.comic_ids || [], // 可以购买的章节id
                        // 可购买的加密串
                        comicbuy_encrypt_str: priceInfo.comicbuy_encrypt_str || "",
                        deduction_texts,
                        deduction_texts_tips: deduction_texts.toString(), // 点击vip角标的提示
                        origin_kk_currency, // 原价
                        red_packet_deduction, // 价格优惠券折扣的价格
                        platform_deduction, // 平台折扣价
                        selling_kk_currency, // 需要支付的价格
                        total_discount,
                        total_discounts: parseFloat(total_discount / 10),
                        payIconUrl, // 购买按钮角标
                        spend_coupon_id, // 满减卷信息
                        spend_coupon_record_id,
                    };
                    if (priceInfo.batch_count <= 0) {
                        return false;
                    }

                    // 是否存在折扣
                    let discount = false,
                        countDown = 0;
                    if (prchaseData.total_discounts && prchaseData.total_discounts > 0 && prchaseData.total_discounts < 10) {
                        discount = true;
                    }

                    // 如果余额不足展示充值档位
                    if (selling_kk_currency > wallet) {
                        this.getKkbList();
                    }

                    // 存在折扣、已登录、且弹窗显示，暂时倒计时
                    if (discount && isShow) {
                        let nowTime = Date.now();
                        let endTime = new Date(new Date().toLocaleDateString()).getTime() + 24 * 60 * 60 * 1000 - 1;
                        countDown = Math.round(endTime - nowTime);
                    }
                    console.log(isShow, 8888);
                    this.setData(
                        {
                            coupon, // 代金券数据
                            discountInfo,
                            discountLabel, // 展示的角标
                            prchaseData: prchaseData,
                            topicInfo: topic_info_view,
                            isShow,
                            discount, // 是否存在折扣
                            countDown,
                            isLogin: !!global.userId, // !!this.data.userInfo, // 是否登录
                            balance: wallet >= selling_kk_currency, // 余额是否充值
                        },
                        () => {
                            // 当前现显示一次，记录
                            this.setData({
                                showTrans: true,
                            });
                            const curDate = util_formatTime(new Date(), "yyyy-MM-dd");
                            wx.setStorage({
                                key: "topic:discount",
                                data: curDate, // new Date().getTime()
                            });
                        }
                    );

                    this.kksaReport(0, !this.data.userInfo ? 0 : wallet >= selling_kk_currency ? 2 : 1);
                })
                .catch(() => {
                    // console.log("获取付费接口失败")
                });
        },
        containTap() {
            return;
        },
        getOneKeyBuy(e) {
            this.kksaReport(1, 0);
            if (!global.userId) {
                // 需要清除本地的频控缓存
                wx.removeStorageSync("topic:discount");
                // this.setData({ isShow: false });
                app.originLogin(e.detail).then(() => {
                    this.triggerEvent("loginSuccessCb");
                });
            }
        },

        // 余额不足时拉起的商品档位列表
        async getKkbList() {
            let res = (await getKkbMealListApi()) || {};
            if (res.code == 200) {
                let { recharges = [] } = res.data || {};
                let { recharge_goods = [] } = recharges[0] || {};
                let rechargeList = recharge_goods;

                rechargeList.forEach((item) => {
                    item.real_price = item.real_price ? item.real_price : 0; // 实际价格  单位分
                    item.realPrice = item.real_price / 100; // 以元为单位
                    item.sequence = item.sequence ? item.sequence : 0;
                });
                rechargeList = rechargeList.sort((a, b) => {
                    return a.sequence - b.sequence;
                });
                if (!rechargeList.length) {
                    return;
                }
                if (rechargeList.length > 3) {
                    rechargeList = rechargeList.slice(0, 3);
                }
                this.setData({
                    activeItem: {
                        id: rechargeList[0].id,
                        real_price: rechargeList[0].real_price || 0,
                        recharge_value: rechargeList[0].recharge_value || 0,
                        present_value: rechargeList[0].present_value || 0,
                    },
                    rechargeList,
                });
            }
        },

        // 选择商品的点击事件(改为选中状态)
        choiceGoodTap(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            let { index, id } = dataset;
            let data = this.data.activeItem ? this.data.activeItem : { id: 0 };
            if (data.id == id) {
                return false;
            }
            let activeItem = this.data.rechargeList[index];
            this.setData({
                activeItem: {
                    id: activeItem.id,
                    real_price: activeItem.real_price || 0,
                    recharge_value: activeItem.recharge_value || 0,
                    present_value: activeItem.present_value || 0,
                },
            });
        },

        // 点击购买按钮
        surePay() {
            if (this.data.balance) {
                // 余额充足，此时直接购买章节
                this.kksaReport(1, 2);
                const { prchaseData, topicId } = this.data;
                paidCartoonApi({
                    encrypt: prchaseData.comicbuy_encrypt_str,
                    target_id: topicId,
                }).then((res) => {
                    let { code = 0, data } = res;
                    if (code == 200) {
                        // 获取kk支付信息(赠送和充值kkb的字段)
                        let consume_info = data.consume_info ? data.consume_info : {};

                        // 埋点上报
                        this.toTrack("Consume", {
                            BatchDiscount: prchaseData.origin_kk_currency - prchaseData.selling_kk_currency, // 批量购买优惠总额
                            BatchPaid: true, // 是否批量购买
                            BatchCount: prchaseData.comic_ids.length, // 批量购买数量
                            ComicName: "", // 漫画名称
                            ComicID: prchaseData.comic_ids.toString(), // 漫画ID
                            TopicID: topicId,
                            CurrentPrice: prchaseData.selling_kk_currency, // 实际支付价格
                            SpendGiveCurrency: consume_info.activity_consume ? consume_info.activity_consume : 0, // 消费赠币数量
                            SpendRecharge: consume_info.kb_consume ? consume_info.kb_consume : 0, // 消费充值币数量
                            VoucherPaid: !!prchaseData.red_packet_deduction, // 是否有代金券优惠
                            BatchallPaid: prchaseData.total_discounts && prchaseData.total_discounts > 0 && prchaseData.total_discounts < 10,
                        });

                        util_showToast({
                            title: `已成功购买${prchaseData.batch_count}话，快去享用吧！
                            (已跳过临时免费章节）`,
                            duration: 2000,
                        });

                        this.triggerEvent("topicApiRefresh");
                    }
                });
            } else {
                // 余额不足点击充值
                this.kksaReport(1, 1);
                const { id, real_price = 0, recharge_value = 0, present_value = 0 } = this.data.activeItem;
                this.surePayFun({
                    pay_source: 2,
                    good_item: {
                        id,
                        real_price,
                        recharge_value,
                        present_value,
                    },
                    sa_infos: { NoticeType: "限时特惠弹窗" },
                    pay_info: { topic_id: "", third_activity: "" },
                }).then(() => {
                    wx.removeStorageSync("topic:discount");
                    this.triggerEvent("topicApiRefresh");
                });
            }
        },

        // 埋点
        toTrack(name = "", data = {}) {
            const { topicName } = this.properties;
            let param = {
                TriggerPage: "专题页",
                NoticeType: "专题页弹窗购买",
                TopicName: topicName,
                SourcePlatform: app.globalData.channel,
                ...data,
            };
            app.kksaTrack(name, param);
        },

        abandon() {
            this.kksaReport(1, 3);
            this.setData({
                isShow: false,
            });
            this.triggerEvent("closeDiscounts");
        },

        // 埋点内容
        kksaReport(behavior, type) {
            const data = {
                CurPage: "TopicPage",
            };
            const popupNames = {
                0: "专题页整本购弹窗", // 未登录
                1: "专题页整本购充值", // 已登录余额不足
                2: "专题页整本购购买", // 已登录余额充足
            };
            if (behavior) {
                const btnNames = {
                    0: "一键购买",
                    1: "立即充值",
                    2: "整本购买",
                    3: "关闭",
                };
                data.ButtonName = btnNames[type];
            } else {
                data.popupName = popupNames[type];
            }
            // console.log("埋点要上报的内容",behavior, data)
            app.kksaTrack(behavior ? "PopupClk" : "PopupShow", data);
        },
    },
});
