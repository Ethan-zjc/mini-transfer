const app = getApp();
const global = app.globalData;
const payBehavior = require("../../behaviors/pay");
const { videoImgs } = require("../../cdn.js");

import {
    util_action,
    util_showToast,
    util_checkWallet
} from '../../util.js';
import {
    batchListApi,
    requestPaidApi,
    getKkbSetMealListApi
} from './api';

/**
 * 漫剧半屏组件
 * -------------------------------
 * prarms参数
 * balance: 当前余额，必传
 * videoId: 合集ID，必传
 * postId: 章节ID，必传
 * showreelName: 合集名称，必传
 * chapterName: 章节名称，非必传
 * curPage: 当前页面，默认漫剧播放页
 * userInfo: 查询钱包时使用，必传
 * --------------------------------
 * callback方法
 * onPayPopupClose: 半屏关闭
 * onVirPayCallback: 虚拟币购买，{ type: 0 } 0: 失败 1: 成功
 * onRechargeSuccess: 购买kkb成功
 * onRechargeFail: 购买kkb失败
 */
Component({
    behaviors: [payBehavior],
    properties: {
        balance: { // 当前页, 必传, 可监听变化刷新
            type: Number,
            value: 0,
        },
        videoId: { // 合集id, 必传, mock 385150767073001476
            type: String,
            value: "",
        },
        postId: { // 章节id, 必传, mock 385123274987339927
            type: String,
            value: "",
        },
        curPage: { // 当前页, 必传
            type: String,
            value: "漫剧播放页",
        },
        showreelName: { // 合集名称, 必传
            type: String,
            value: '',
        },
        chapterName: { // 章节名称, 必传
            type: String,
            value: '',
        },
        userInfo: { // 用户信息，查询钱包时使用，必传
            type: Object,
            value: null
        }
    },
    data: {
        videoImgs,
        showTrans: false,
        enough: false, // 余额是否充足
        goodId: 0,
        activeIndex: 0, // 默认选择档位索引
        activeItem: {}, // 默认选择档位
        batchList: [],
        rechargeList: [],
        getKkbOrderIdNum: 0,
        showCashier: false,
        popupsType: false, // true整本档位 false批量
        virPopupsType: false, // 临时弹窗类型，整本购买一期整合到批量购买中
        showHead: false,
        banners: {}, // 顶部运营位文案
        paySource: 1, // 下单来源  1:我的钱包  2:活动页,外部传入为type
        goodType: 1,
        wallet: 0,
        price: 0, // 当前章节价格
        discountInfo: {},
        isVip: false,
        showTips: false,
        canPay: false,
    },
    observers: {
        balance() {
            this.onBalanceChange();
        },
    },
    attached() {
        // 如果没有登录，拦截跳转登录
        if (this.interceptLogin()) return;

        this.setData({
            canPay: !global.isiOS || global.iosIsShowPay,
        })
        this.payMainRequest();
    },
    methods: {
        closeVideoPay() {
            this.triggerEvent("onPayPopupClose");
        },
        tapButtonMore() {
            this.setData({
                showTips: !this.data.showTips
            })
        },
        onBalanceChange() {
            // this.judgeWallet();
            this.payMainRequest();
        },

        // 新增付费信息聚合内容
        async payMainRequest() {
            try {
                const { videoId = "", postId = "" } = this.properties;
                const res = await batchListApi({
                    comic_video_id: videoId,
                    post_id: postId,
                });
                if (res && res.code == 200) {
                    const dataObj = {};
                    if (res.code == 200) {
                        const {
                            popups_type = 0,
                            video_price_info = {},
                            video_post_info = {},
                        } = res.data || {};
                        const { batch_purchase_list = [], banners = {}, kk_currency_balance = 0 } = video_price_info;
                        const activeItem = batch_purchase_list[0] || {};
                        const price = activeItem.price_info.selling_kk_currency;
                        this.data.price = price;

                        dataObj.activeItem = activeItem;
                        dataObj.wallet = kk_currency_balance;
                        dataObj.batchList = batch_purchase_list || [];
                        dataObj.popupsType = !!popups_type; // 弹窗类型0:批量档位购买 1:整本购买
                        dataObj.videoInfo = video_post_info; // 整本信息
                        dataObj.banners = banners;

                        // 优惠信息
                        dataObj.discountInfo = this.formatPayDiscount();
                        dataObj.priceInfo = activeItem.price_info;

                        const vipInfo = global.vipInfo || {};
                        dataObj.isVip = !!vipInfo.vip_type;

                        // 余额充足拉取批量档位,不拉取商品列表
                        // 余额不足拉取批量档位(获取内部运营位信息)，拉取商品列表
                        const enough = kk_currency_balance >= price;
                        if (enough) {
                            dataObj.showTrans = true;
                            dataObj.enough = true;
                            this.setData(dataObj, () => {
                                this.setData({
                                    discountInfo: this.formatPayDiscount(0),
                                    priceInfo: activeItem.price_info
                                })
                            })
                        } else {
                            this.setData({
                                wallet: kk_currency_balance
                            })
                            this.getMealList();
                        }
                    }
                }
            } catch (e) {
                // console.error(e);
            }
        },

        formatPayDiscount(index = 0) {
            const list = this.data.batchList;
            const item = list[index] || {};
            // 优惠信息
            const textInfo = item.text_info || {};
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
                discountInfo.market_delete = market_text.indexOf("$") > -1; // 优惠信息是否带删除线
                discountInfo.market_text = market_text.replace(/\$/g, ""); // 优惠信息左侧（原价）
            }
            return discountInfo;
        },

        // 获取充值档位信息
        async getMealList() {
            try {
                const res = await getKkbSetMealListApi();
                if (res.code == 200) {
                    const { recharges = [] } = res.data || {};
                    const { recharge_goods = [] } = recharges[0] || {};
                    let rechargeList = recharge_goods
                        .map((item) => ({
                            realPrice: item.real_price / 100,
                            recharge_value: item.recharge_value || '',
                            id: item.id,
                            real_price: item.real_price,
                            sequence: item.sequence || 0,
                            words_info: item.words_info || { explain_text: "" },
                            image_info: item.image_info,
                            present_value: item.present_value
                        }))
                        .sort((a, b) => {
                            return a.sequence - b.sequence;
                        });
                    rechargeList = rechargeList
                        .map((item, index) => ({
                            ...item,
                            index,
                            icon_width: 60,
                        }))
                        .slice(0, 4);

                    this.setData({
                        activeItem: rechargeList[0] || {},
                        rechargeList,
                        showTrans: true
                    })
                }
            } catch (e) {
                // console.log(e);
            }
        },

        // 批量购买档位切换
        changeBatch(e) {
            this.trackClick(1);
            const { index = 0 } = e.currentTarget.dataset;
            this.setData({
                activeIndex: index,
                activeItem: this.data.batchList[index],
                discountInfo: this.formatPayDiscount(index),
                priceInfo: this.data.batchList[index].price_info
            })
        },

        // 选择购买档位切换
        changeCard(e) {
            this.trackClick(3);
            const { index = 0 } = e.currentTarget.dataset;
            this.setData({
                activeIndex: index,
                activeItem: this.data.rechargeList[index]
            })
        },

        // 跳转kkb页面
        openKkbPage() {
            if (this.interceptLogin()) return;
            util_action({ type: 22 });
        },

        // 虚拟币支付购买章节
        async virtualPay() {
            if (this.interceptLogin()) return;

            // 如果所对应档位支付金额不足，跳转到支付页面
            const { activeItem = {}, activeIndex = 0, batchList = [] } = this.data;
            const { video_buy_encrypt_str = '' } = activeItem;
            const item = batchList[activeIndex];
            const price = item.price_info.selling_kk_currency || 0;
            if (this.data.wallet < price) {
                this.trackClick(4);
                util_action({ type: 22 });
                return;
            }

            this.trackClick(2);
            try {
                let res = await requestPaidApi({
                    video_buy_encrypt_str: video_buy_encrypt_str
                });
                if (res.code == 200) {
                    util_showToast({
                        title: "购买成功",
                        duration: 2000,
                    });
                    this.trackConsume(item, res.data || {});
                    this.triggerEvent("onVirPayCallback", { type: 1 });
                } else {
                    throw "pay fail";
                }
            } catch (e) {
                // console.log('消耗虚拟币失败', e);
                this.triggerEvent("onVirPayCallback", { type: 0 });
            }
        },

        // 统一拦截登录
        interceptLogin() {
            if (!global.userId) {
                wx.navigateTo({ url: "/pages/login/login" });
                return true;
            }
        },

        // 支付成功是刷新弹窗还是整个页面刷新，刷新弹窗需要重新判断余额是否大于当前章节价格
        async realPay() {
            if (this.interceptLogin()) return;
            if (!this.data.rechargeList.length) {
                return;
            }

            // 收银台信息
            this.trackClick(2);
            try {
                const { id, real_price = 0, recharge_value = 0, present_value = 0 } = this.data.activeItem;
                await this.surePayFun({
                    pay_source: 2,
                    good_item: {
                        id,
                        real_price,
                        recharge_value,
                        present_value,
                    },
                    sa_infos: {
                        ShowreelName: this.data.showreelName,
                        ShowreelID: this.data.videoId,
                        ChapterName: this.data.chapterName,
                        ChapterID: this.data.postId
                    }
                })
                // 充值成功刷新弹窗数据
                this.triggerEvent("onRechargeSuccess");
                // this.judgeWallet();
                this.payMainRequest();
            } catch (e) {
                // console.log(e);
                this.triggerEvent("onRechargeFail");
            }
        },

        // 充值成功后判断余额是否充足
        async judgeWallet() {
            try {
                const res = await util_checkWallet(this); // 检查kk币余额
                const { wallet = {} } = res || {};
                let curWallet = 0;
                if (res && res.wallet) {
                    curWallet = wallet[`${global.isiOS ? "ios" : "nios"}_balance`]
                }

                const { price = 0, enough = false, batchList = [], rechargeList = [] } = this.data;
                this.setData({
                    wallet: curWallet,
                    enough: curWallet >= price,
                    activeIndex: 0,
                    activeItem: enough ? batchList[0] : rechargeList[0]
                })
            } catch (e) {
                // console.log(e);
            }
        },

        // 上报点击事件
        trackClick(type) {
            const types = {
                1: '弹窗购买集数选择',
                2: '弹窗购买集数支付按钮',
                3: '弹窗购买档位选择',
                4: '弹窗购买档位支付按钮'
            };
            const data = {
                CurPage: this.CurPage,
                ButtonName: types[type] || "",
            };
            app.kksaTrack('ClickButton', data);
        },

        // 虚拟币消费
        trackConsume(item, res) {
            const {
                selling_kk_currency = 0,
                origin_kk_currency = 0,
                discount_coupon_deduction = 0
            } = item.price_info || {};
            const vipInfo = global.vipInfo || {};
            const isVip = !!vipInfo.vip_type;

            const { buy_count = 0, kb_consume = 0, activity_consume = 0, discount = 0 } = res;
            const data = {
                CollectionName: this.data.showreelName,
                CollectionID: this.data.videoId,
                // ChapterID: this.postId,
                // chapterName: this.chapterName,
                BatchPaid: !this.data.popupsType,
                ConsumeCurrentPrice: selling_kk_currency,
                SpendGiveCurrency: activity_consume,
                SpendRecharge: kb_consume,
                TriggerPage: this.data.curPage,
                IsMember: isVip,
                Ifcouponuse: !!discount_coupon_deduction,
                CouponAmt: discount_coupon_deduction,
                OriginalPrice: origin_kk_currency,
                BatchCountNumber: buy_count,
            };
            app.kksaTrack("ConsumeVideo", data);
        },
    },
});
