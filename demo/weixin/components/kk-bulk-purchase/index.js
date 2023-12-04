/**
 * 一键购买弹窗
 * @param show  是否显示组件
 * @param wallet kkb余额
 * @param topicId 专题id
 * @param topicCover 专题封面
 * @param triggerPage 所在页面
 * @param vipInfo  当前用户vip信息
 * @param onCloseBulkPurchase 通知父级关闭弹窗&刷新数据函数
 **/
import {
    postComicPay, // 查询数据
    psotBuyComic, // 购买漫画
    getComicId, // 专题续读
} from './api.js';
import { util_action } from '../../util.js';
const app = getApp();
const API = wx;

Component({
    properties: {
        show: {
            type: Boolean,
            value: false,
        },
        wallet: {
            type: [String, Number],
            value: 0,
        },
        topicId: {
            type: [String, Number],
            value: 0,
        },
        topicName: {
            type: String,
            value: '',
        },
        topicCover: {
            type: String,
            value: '',
        },
        triggerPage: {
            type: String,
            value: 'TopicPage',
        },
        vipInfo: {
            // vipInfo.vip_type > 0 是会员
            type: [Object, String],
            value: {},
        },
        preposition: {
            type: Boolean,
            value: false,
        },
    },

    // 组件的内部数据，和 properties 一同用于组件的模板渲染
    data: {
        compShow: false, // 是否显示一键购买模块
        openId: '', // 与微信号绑定的唯一id
        userId: '', // 快看帐号唯一id
        isLogin: null, // 用户是否登录了
        isiOS: false, // iOS的判断
        iPhoneX: false, // iPhoneX的判断
        images: {
            kkb: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/mini-kkb_3f21789.png',
            vipIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/vip_icon_999d809.png',
            discount: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/discount_abb9369.png',
            arrowr: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/v_arrow_r_dc9d8d5.png',
            upArrow: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/up_arrow_e67408d.png',
            starsIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/stars_icon_8a81ce1.png',
            loading: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/loading_d1d3e29.png', // 加载转圈效果
        },
        showVipTips: false, // 点击控制是否显示vip提示
        showDialog: false, // 是否显示购买成功对话框
        priceInfo: {}, // 接口返回商品信息
        prchaseData: {}, // 展示的价格信息
        coupon: {}, // 代金券数据
        isLoading: false, // 购买中加载状态
        errDialog: {
            // 异常弹窗
            show: false,
            title: '',
            content: '',
            close: false, // 是否关闭当前组件, 通知父级刷新数据
        },
        comicRead: null, // 漫画续读信息
        discountLabel: {}, // 控制展示角标字段
    },

    // 组件生命周期函数，在组件实例进入页面节点树时执行
    attached() {
        this.setSysAndUserInfo(() => {
            this.getCompData(); // 查询数据
            this.toTrack('PayPopup'); // 显示弹窗上报埋点
        });
        getComicId({ topic_ids: this.properties.topicId }).then((res) => {
            let { data } = res;
            let comicRead = data.comic_read || [];
            comicRead = comicRead[0] || null;
            if (comicRead) {
                comicRead.comic_id = comicRead.last_read_comic_id || 0;
            }
            this.data.comicRead = comicRead; // 漫画续期信息
        });
    },

    // 组件的方法，包括事件响应函数和任意的自定义方法，关于事件响应函数的使用
    methods: {
        // 设置基本设备信息和登录状态
        setSysAndUserInfo(callback) {
            let { isiOS, iPhoneX, payfrom, openId, userId } = app.globalData;
            let userInfo = this.data.userInfo; // 用户信息
            this.setData(
                {
                    isiOS,
                    iPhoneX,
                    isLogin: !!userInfo,
                    payfrom,
                    openId,
                    userId,
                },
                () => {
                    if (callback && typeof callback == 'function') {
                        callback();
                    }
                }
            ); // 设置设备信息
        },

        // 点击弹窗外层盒子
        clickPopupWarp() {
            this.toTrack('ClickPayPopup', { ButtonName: '关闭弹窗' }); // 上报埋点
            this.triggerEvent('closeBulkPurchase', { isRefresh: false }); // 通知父级关闭弹窗
        },

        // 点击vip折扣按钮
        clickVipBtn() {
            const { vipInfo, topicId, wallet } = this.properties;
            const { prchaseData } = this.data;

            if (wallet < prchaseData.selling_kk_currency && vipInfo.vip_type <= 0) {
                // kkb不足并且不是vip情况
                util_action({ type: 43, params: { topicid: topicId } });
                this.toTrack('ClickPayPopup', { ButtonName: '开通vip' }); // 上报埋点
                return false;
            }
            if (this.data.showVipTips) {
                return false;
            }
            this.toTrack('ClickPayPopup', { ButtonName: 'vip折扣' }); // 上报埋点
            this.setData({
                showVipTips: true,
            });
            let time = setTimeout(() => {
                clearTimeout(time);
                this.setData({
                    showVipTips: false,
                });
            }, 3000);
        },

        // 点击确认购买(去充值)按钮
        clickBuyBtn() {
            let { wallet, topicId } = this.properties;
            let { prchaseData } = this.data;
            let isBuy = wallet >= prchaseData.selling_kk_currency;
            if (this.data.isLoading) {
                return false;
            }
            if (isBuy) {
                this.data.isLoading = true;
                this.setData({ isLoading: true });
                this.toTrack('ClickPayPopup', { ButtonName: '确认购买' }); // 上报埋点
                psotBuyComic({
                    spend_coupon_id: prchaseData.spend_coupon_id,
                    spend_coupon_record_id: prchaseData.spend_coupon_record_id,
                    comicbuy_encrypt_str: prchaseData.comicbuy_encrypt_str || '',
                    target_id: 0,
                })
                    .then((res) => {
                        let { code, data } = res;
                        if (code != 200) {
                            this.setData({
                                isLoading: false, // 关闭状态
                                errDialog: {
                                    // 异常弹窗
                                    show: true,
                                    title: '购买失败',
                                    content: '遇到了一点小问题，请稍后再试',
                                },
                            });
                            return false;
                        }
                        data = data ? data : {};
                        // 获取kk支付信息(赠送和充值kkb的字段)
                        let consume_info = data.consume_info ? data.consume_info : {};

                        this.toTrack('Consume', {
                            BatchDiscount: prchaseData.origin_kk_currency - prchaseData.selling_kk_currency, // 批量购买优惠总额
                            BatchPaid: true, // 是否批量购买
                            BatchCount: prchaseData.comic_ids.length, // 批量购买数量
                            ComicName: '', // 漫画名称
                            ComicID: prchaseData.comic_ids.toString(), // 漫画ID
                            TopicID: topicId,
                            CurrentPrice: prchaseData.selling_kk_currency, // 实际支付价格
                            SpendGiveCurrency: consume_info.activity_consume ? consume_info.activity_consume : 0, // 消费赠币数量
                            SpendRecharge: consume_info.kb_consume ? consume_info.kb_consume : 0, // 消费充值币数量
                            VoucherPaid: !!prchaseData.red_packet_deduction, // 是否有代金券优惠
                        }); // 购买成功埋点
                        this.setData({ isLoading: false, showDialog: true });
                    })
                    .catch(() => {
                        this.setData({
                            isLoading: false, // 关闭状态
                            errDialog: {
                                // 异常弹窗
                                show: true,
                                title: '购买失败',
                                content: '遇到了一点小问题，请稍后再试',
                            },
                        });
                    });
            } else {
                this.clickRecharge(true); // 去充值
            }
        },

        // 点击充值按钮
        clickRecharge(type) {
            let { topicId, preposition } = this.properties;
            this.toTrack('ClickPayPopup', { ButtonName: type ? '立即充值' : '充值' }); // 上报埋点
            API.navigateTo({
                url: `/subpack-auxiliary/pages/buykkb/buykkb?type=2&topicid=${topicId}&trigger_page=TopicPage&arg_type=${preposition ? 1 : 2}`,
            });
        },

        // 埋点
        toTrack(name = '', data = {}) {
            const { topicName, triggerPage, preposition } = this.properties;
            let param = {
                TriggerPage: triggerPage,
                NoticeType: triggerPage == 'TopicPage' ? (preposition ? '专题页新增入口购买' : '专题页批量购买') : '漫画页目录批量购买',
                TopicName: topicName,
                SourcePlatform: app.globalData.channel,
                ...data,
            };
            app.kksaTrack(name, param);
        },

        // 点击购买成功弹窗
        tapDialogButton(e) {
            let { triggerPage } = this.properties;
            let { comicRead } = this.data;
            let data = e.detail;
            if (data.index === 1) {
                if (comicRead) {
                    if (triggerPage == 'TopicPage') {
                        util_action({ type: 3, id: comicRead.comic_id });
                        this.triggerEvent('closeBulkPurchase', { isRefresh: true, type: 0 }); // 通知父级关闭弹窗
                    } else {
                        API.redirectTo({
                            url: `/pages/comic/comic?id=${comicRead.comic_id}&dirmark=true`,
                        });
                    }
                }
                this.toTrack('ClickPayPopup', { ButtonName: '去看漫画' }); // 上报埋点
            }
            if (data.index === 0) {
                this.toTrack('ClickPayPopup', { ButtonName: '关闭' }); // 上报埋点
                this.triggerEvent('closeBulkPurchase', { isRefresh: true, type: 0 }); // 通知父级关闭弹窗
            }
            this.setData({ showDialog: false });
        },

        // 点击异常对话框按钮
        tapErrDialogButton() {
            let errDialog = this.data.errDialog;
            this.toTrack('ClickPayPopup', { ButtonName: '确认' }); // 上报埋点
            if (errDialog.close) {
                this.triggerEvent('closeBulkPurchase', { isRefresh: true, type: 1 }); // 通知父级关闭弹窗,并且刷新目录
            }
            this.setData({
                errDialog: {
                    // 清空异常弹窗
                    show: false,
                    title: '',
                    content: '',
                    close: false,
                },
            });
        },

        // 获取组件需要的数据（查询一键购买弹窗数据）
        getCompData() {
            const { topicId } = this.properties;
            postComicPay({ topic_id: topicId })
                .then((res) => {
                    let { code, data } = res;
                    if (code != 200) {
                        return false;
                    }
                    data = data || {};
                    data.price_info = data.price_info || {};
                    const coupon = data.price_info.coupon || {};
                    let priceInfo = data.price_info.batch_purchase_list || []; // 批量档位信息
                    priceInfo = priceInfo[0] || {};
                    let textInfo = priceInfo.text_info || {};
                    let discountLabel = textInfo.discount_label || {};
                    let info = priceInfo.price_info; // 支付价格实际信息
                    let deduction_texts = info.deduction_texts || []; // vip 提示语数组
                    let origin_kk_currency = info.origin_kk_currency || 0;
                    let red_packet_deduction = info.red_packet_deduction || 0;
                    let platform_deduction = info.platform_deduction || 0;

                    // 优惠信息
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

                    // 返币icon，购买按钮的角标
                    const iconInfo = priceInfo.icon || {};
                    const payIconUrl = iconInfo.icon_url || '';

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
                        comicbuy_encrypt_str: priceInfo.comicbuy_encrypt_str || '',
                        deduction_texts,
                        // 点击vip角标的提示
                        deduction_texts_tips: deduction_texts.toString(),
                        // 原价
                        origin_kk_currency,
                        // 价格优惠券折扣的价格
                        red_packet_deduction,
                        platform_deduction, // 平台折扣价
                        // 需要支付的价格
                        selling_kk_currency: info.selling_kk_currency || 0,
                        total_discount: info.total_discount,
                        total_discounts: parseFloat(info.total_discount / 10),
                        // 购买按钮角标
                        payIconUrl,
                        // 满减卷信息
                        spend_coupon_id,
                        spend_coupon_record_id,
                    };
                    // batch_count 可购买的章节
                    if (priceInfo.batch_count <= 0) {
                        this.setData({
                            compShow: false, // 显示组件
                            errDialog: {
                                // 异常弹窗
                                show: true,
                                title: '暂无可购买章节',
                                content: '全部章节都已收入囊中，没有可购买的章节啦',
                                close: true, // 关闭当前组件, 通知父级刷新数据
                            },
                        });
                        return false;
                    }
                    this.data.priceInfo = priceInfo; // 接口返回商品信息
                    this.setData({
                        discountInfo,
                        discountLabel, // 展示的角标
                        prchaseData: prchaseData,
                        coupon, // 代金券数据
                        compShow: true, // 显示组件
                    });
                })
                .catch((err) => {
                    let errDialog = {};
                    if (err.code == 30014) {
                        errDialog = {
                            // 异常弹窗
                            show: true,
                            title: '暂无可购买章节',
                            content: '全部章节都已收入囊中，没有可购买的章节啦',
                            close: true, // 关闭当前组件, 通知父级刷新数据
                        };
                    }
                    this.setData({
                        compShow: false, // 显示组件
                        errDialog,
                    });
                });
        },
    },
});
