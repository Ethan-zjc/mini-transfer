const app = getApp();
const global = app.globalData;
const api = require('./api.js');
const { connect } = app.Store;
const { cdnIconsImgs } = require('../../../cdn.js');
import { util_showToast, util_action, util_request, util_getTime, util_requestSubscribeMessage, util_sendMessageApi, util_checkVipInfo, util_formatTime } from '../../../util.js';

const images = {
    // 礼包弹窗
    dialog: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/dialog_3c78a61.png',
    direct: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/direct_9f4fb81.png',
    giftSpecial: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/gift-special_5905dfd.png',
    light: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/light_09d8c4e.png',
    month: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/month_6643af8.png',
    total: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/total_60f7f6c.png',
    temporaryClosePopup: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/close-popup_427a25d.png',
    temporaryHeadBg: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/head-bg_a71ca8c.png',
    temporaryTopKkbBg: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/top-kkb-bg_7e18737.png',
};
const page = {
    data: {
        images,
        isiOS: false,
        isVip: false,
        gifts: null,
        tipsgift: null,
        times: [],
        clock: {},
        isRefresh: false,
        unreadMessage: null,
        success: { show: false },
        bags: { show: false },
        isColdStart: false,
        topicDataList: [],
        isShowLoad: false,
        temporaryPopup: {
            show: false,
            andBtn: null, // {0:'x元',1:'开VIP·免费领' ,2:"送500KK币"}
            iosBtn: '立即开通，领取KK币',
        },
        cdnIconsImgs,
        canPay: false, // 当前平台是否可以付费
        activeItem: {}, // 当前选中支付档位
        videoList: [], // 漫剧列表
        sucData: {
            kkb: 0,
            title: '',
            vipDays: 0,
            bannerData: {},
        },
        showVipPop: false,
        vipCouponList: [], // 会员优惠券列表
        showInitCoupon: false,
        showDetain: false, // 显示挽留
        detainCoupon: {},
    },
    onLoad(options) {
        // 会员中心接收优惠券信息
        const { coupon_id } = options;
        const { isiOS } = app.globalData;
        global.defaultCouponItem = null;
        this.setData({
            isiOS,
            gifts: [],
            couponId: coupon_id,
            canPay: !global.isiOS || global.iosIsShowPay,
        });

        // 获取list数据漫画
        this.getVipDataList();

        // 获取漫剧列表模块
        this.getVideoList();

        // 获取tips礼包数据,暂时不需要
        // this.getTipsGift();

        this.init(() => {
            this.data.isShowLoad = true;

            // 访问会员中心
            let vipInfo = this.data.vipInfo ? this.data.vipInfo : {};
            app.kksaTrack('CommonPageOpen', {
                MembershipClassify: vipInfo.vip_type ? 1 : 0, // 1会员，0非会员
                CurPage: '小程序新会员中心页面',
            });

            // 获取临时提醒弹窗,按钮营销文案;
            this.getCommonPopups();
        });
    },

    onShow() {
        // 发现从webview页面返回, 比如到过会员开通页，则刷新页面，更新余额
        if (this.data.isShowLoad) {
            this.init();

            // 获取临时提醒弹窗,按钮营销文案;
            this.getCommonPopups();
        }
    },

    init(callback) {
        callback = callback ? callback : () => {};
        // const vipInfo = this.data.vipInfo || {};
        this.data.isRefresh = true;

        util_checkVipInfo(this, (vipInfo) => {
            this.data.isRefresh = false;
            this.setData({ isVip: !!vipInfo.vip_type });

            let time = setTimeout(() => {
                clearTimeout(time);
                callback();
            }, 300);
        });

        // 获取礼包数据
        this.getGifts();
    },

    // 获取优惠券
    onCarryCoupon() {
        this.getCouponList();
    },

    // 获取会员优惠券
    async getCouponList() {
        const { data = {} } = await api.getCouponList();
        let { vip_coupon = [] } = data.coupon_activity || {};
        vip_coupon.forEach((item) => {
            item.amount_str = item.coupon_amount_cent / 100;
            item.start_time = util_formatTime(item.start_time, 'yyyy.MM.dd');
            item.end_time = util_formatTime(item.end_time, 'yyyy.MM.dd');
        });
        const options = {
            vipCouponList: vip_coupon,
        };
        options.showInitCoupon = true;
        this.setData(options);
    },

    // 关闭弹窗刷新档位
    commonCoupon(behavior) {
        const options = {};
        if (behavior == 2 || behavior == 0) {
            options.showDetain = false;
        } else {
            options.showInitCoupon = false;
        }
        this.setData(options);
        const payComp = this.selectComponent('#payComp'); // 刷新档位信息
        if (payComp) {
            payComp.getVipGoodList();
        }
    },

    // 领取使用
    onCouponCallback(e) {
        const { behavior = 1 } = e.detail;
        this.commonCoupon(behavior);
    },

    // 领券关闭弹窗
    onCouponClose() {
        this.commonCoupon(1);
    },

    // 返回拦截
    async navigateBackPress() {
        let coupon = [];
        if (this.data.canPay) {
            const payComp = this.selectComponent('#payComp');
            if (payComp) {
                payComp.data.membersList.forEach((item) => {
                    if (item.coupon.usable_list.length) {
                        coupon = [...coupon, ...item.coupon.usable_list];
                    }
                });
            }
            const curDate = util_formatTime(new Date(), 'yyyy-MM-dd');
            const sign = wx.getStorageSync('coupon:detain') || '';
            if (coupon.length && sign != curDate) {
                wx.setStorage({
                    key: 'coupon:detain',
                    data: curDate,
                });
                coupon[0].amount_str = coupon[0].amount / 100;
                coupon[0].end_time = util_formatTime(coupon[0].end_at, 'yyyy.MM.dd');
                this.setData({
                    showDetain: true,
                    detainCoupon: coupon[0],
                });
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    },

    // 获取礼包数据
    async getGifts(bags) {
        const { data = {} } = await api.getGiftListApi();
        if (bags) {
            // 更新聚合礼包
            const newbags = data.list.filter((item) => item.id === bags.id);
            if (newbags[0]) {
                this.openBags(newbags[0]);
            }
        } else {
            let gifts = data.list.filter((item) => item.gift_show_type !== 2);
            gifts = gifts.map((item) => {
                return this.handleGiftItem(item);
            });
            this.setData({ gifts });
        }
    },

    // 获取横滑模块专题列表
    async getVipDataList() {
        let sendData = {
            offset: 0,
            limit: 20,
            is_cold_start: this.data.isColdStart,
            non_iap_supported_device: false,
            order_from: app.globalData.payfrom,
        };

        try {
            const { data = {} } = await api.getVipNewList(sendData);
            if (this.data.isColdStart) {
                // 改为非冷启动
                this.setData({ isColdStart: false });
            }
            let bannerList = data.banner_list || [];
            let serverTime = data.server_time ? data.server_time : new Date().getTime();
            let list = [];
            bannerList.forEach((item) => {
                // banner_type: 2:三图/3:作品券/4:双图/5:限免/6:横滑/7:通栏/8:4图/9:6图/16:三图/37:会员使用情况卡片 / 48:小图横滑 / 90:专题活动运营位(暂定，待产品确定最后名称)  3(代金券)
                if (item.banner_type == 6 || item.banner_type == 5) {
                    item.id = item.id || '';
                    item.title = item.title || '';
                    item.uuid = `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`;
                    item.max = false;
                    item.banner_children = item.banner_children || [];
                    item.banner_children.forEach((obj) => {
                        obj.id = obj.id || 0;
                        obj.title = obj.title || '';
                        obj.uuid = `${Date.now().toString(36)}_${obj.id}_${Math.random().toString(36)}`;
                        obj.description = obj.description || ''; // 专题描述文案
                        obj.cover_image = obj.cover_image || ''; // 专题封面图片
                        obj.icon_image = obj.icon_image || ''; // 专题封面角标图片
                        obj.button_target = obj.button_target || {}; // 专题其它按钮
                        obj.activity_info = obj.activity_info || {};
                        obj.lower_detail = obj.lower_detail || {}; // 专题图片下方描述文案
                        if (obj.lower_detail.description) {
                            item.max = true;
                        }
                        obj.lower_detail.time = ''; // 剩余时间

                        let end_at = obj.lower_detail.end_at; // 开始时间
                        let start_at = obj.lower_detail.start_at; // 结束时间
                        if (end_at && start_at && end_at > 0) {
                            // 设置剩余天数
                            // let times = new Date().getTime(); //当前时间戳
                            let time = end_at - serverTime; // serverTime 服务端下发时间
                            time = Math.floor(time / 1000 / 60 / 60 / 24);
                            time = time <= 0 ? '' : time; // 最小只能是1天
                            obj.lower_detail.time = time;
                        }
                        obj.extra_title_view = obj.extra_title_view ? obj.extra_title_view : {}; // 专题卡片类型
                        obj.action_target = obj.action_target ? obj.action_target : {}; // 跳转类型
                    });
                    list.push(item);
                }
            });
            this.setData({ topicDataList: list }); // 存储横滑模块数据列表
        } catch (err) {
            // 加载失败提示
            util_showToast({
                title: err.message,
                type: 'error',
            });
        }
    },

    // 获取横滑漫剧模块
    async getVideoList() {
        let { data = {} } = await api.getVideoListApi();
        let { list = [] } = data;
        list.forEach((v) => {
            v.banner_children = v.items.map((item) => ({
                uuid: item.compilation_id,
                id: item.compilation_id,
                cover_image: item.cover_img,
                title: item.title,
            }));
        });
        this.setData({ videoList: list });
    },

    // 领取列表接口
    handleGiftBefore(dataset) {
        return new Promise((resolve) => {
            const { type = '', report = '', gift_show_type = 0, action_target = {}, notsupport = '', sub_gift_list = [], assign_status = -1 } = dataset.item || {};
            if (report) {
                this.pageBtnKksaTrack(report);
            }

            // 特殊礼包和tips礼包
            if (gift_show_type == 1 || type == 7) {
                const action = action_target;
                let type = action.action_type;
                let id = action.target_id;
                let url = action.hybrid_url;
                util_action({ type: type, id: id, url: url });
                return;
            }

            // APP内领取
            if (notsupport) {
                return;
            }

            // 聚合礼包展开
            const list = sub_gift_list;
            if (list && list.length) {
                this.getGifts(dataset.item); // 重新请求，以获取正确的倒计时时间
                return;
            }

            // 聚合礼包，领取次数上限导致的不可领（展示领取前信息）
            if (assign_status == 3) {
                return;
            }

            // 跳转开通页
            if (!this.data.isVip) {
                this.goJoin();
                return;
            }
            resolve();
        });
    },

    // 页面中礼包立即领取按钮点击
    giftWrapClick(e) {
        if (this.data.isRefresh) {
            return false;
        }
        const dataset = e.detail || {};
        const { index = 0, item = {} } = dataset;
        if (item.notsupport) {
            let { isVip } = this.data;
            if (!isVip) {
                util_showToast({
                    title: '开通会员，即可领取',
                    position: { bottom: '30%' },
                });
                return false;
            }
        }

        this.handleGiftBefore(dataset).then(() => {
            if (this.data.gifts[index].disabled) {
                return;
            }
            this.data.gifts[index].disabled = true;
            this.giftCallback(item.assign_param).then((result) => {
                this.data.gifts[index].disabled = false;
                if (result.success) {
                    // 外层列表弹出领取成功dialog
                    this.setData({
                        success: {
                            show: true,
                            title: result.assign_title,
                            subtitle: result.assign_word,
                        },
                    });
                    if (!result.can_assign) {
                        // 不能继续领取，改变按钮状态
                        this.setData({
                            [`gifts[${index}].assign_status`]: 2,
                        });
                    }
                }
            });
        });
    },

    // N选1礼包弹窗中的领取按钮点击
    giftInnerClick(e) {
        const dataset = e.currentTarget.dataset;
        const { item = {}, index = '' } = dataset || {};
        const vipInfo = this.data.vipInfo; // vip状态数据
        if (item.notsupport) {
            // 点击 APP内领取 领取
            let { isVip, isiOS } = this.data;
            // 不是会员并且不是ios手机,跳转到开通会员页面
            if (!isVip && !isiOS) {
                util_showToast({
                    title: '开通会员，即可领取',
                    position: { bottom: '30%' },
                });
                return false;
            }
        }
        // temporary_vip boolean	非必须 是否临时会员 true是 false否 (/v1/vip/me接口 20200520 新增字段)
        if (vipInfo.temporary_vip) {
            // 体验会员
            this.setData({
                'temporaryPopup.show': true, // 显示临时会员领取提示弹窗弹窗
            });
            return false;
        }

        this.handleGiftBefore(dataset).then(() => {
            if (this.data.bags.list[index].disabled) {
                return;
            }
            this.data.bags.list[index].disabled = true;
            this.giftCallback(item.assign_param).then(async (result) => {
                this.data.bags.list[index].disabled = false;
                if (result.success) {
                    if (!result.can_assign) {
                        // 不能继续领取，改变按钮状态
                        this.setData({
                            [`bags.list[${index}].assign_status`]: 2,
                        });
                    }
                    this.getGifts(this.data.bags);
                    // 领取赠币成功提醒
                    const receiveDonationTmplId = 'kMMgdlcv9rVGIuUWNi6O-3iz7zY7aWTm6ofDp4wVizQ';
                    // 赠币即将到期提醒
                    const dueReminderTmplId = 'Qrcpkl_X3dMUAAH-Sl36GXlBJVXD6GrStWe0Yi7dRfQ';
                    let isAccept = false,
                        // errCode = '',
                        receiveDonationResult = '',
                        res = null;
                    if (item.gift_real_type === 1 || item.gift_real_type === 4 || item.gift_real_type === 10) {
                        res = await util_requestSubscribeMessage({ tmplIds: [receiveDonationTmplId, dueReminderTmplId] });
                        if (res) {
                            receiveDonationResult = res[receiveDonationTmplId] || '';
                            // errCode = res.errCode || '';
                            isAccept = receiveDonationResult === 'accept';
                            app.kksaTrack('TriggerAuthorization', {
                                AuthorizationResult: ~~isAccept,
                                TriggerTiming: '领取赠币',
                            });
                        }
                    }
                    if (isAccept) {
                        let date = util_getTime();
                        util_sendMessageApi({
                            notice_type: 5,
                            data: {
                                thing4: '免费KK币', // 红包名称
                                amount3: result.assign_fee, // item.assigned_title, // 领取金额
                                time2: date, // 领取时间
                            },
                        }).then((res) => {
                            const { code } = res;
                            if (code === 200) {
                                app.kksaTrack('MessageSending', {
                                    MessageDetail: '订阅消息-赠币领取成功',
                                });
                            }
                        });
                    }
                } else {
                    this.closeDialog({
                        currentTarget: { dataset: { dialog: 'bags' } },
                    });
                }
            });
        });
    },

    openBags(item) {
        const list = item.sub_gift_list.map((item) => {
            return this.handleGiftItem(item);
        });
        const time1 = item.server_time;
        const time2 = item.assign_time_limit;
        const clock = !!(time1 && time2);
        if (clock) {
            this.setClock(Math.abs(time1 - time2));
        }
        const margin = (list.length > 3 ? 30 : 60) + (clock ? -15 : 0);
        this.setData({
            bags: {
                show: true,
                id: item.id,
                title: item.big_bag_title,
                subtitle: item.big_bag_subtitle,
                icon: item.head_icon,
                list,
                clock,
                margin,
            },
        });
    },

    // 前端处理礼包
    handleGiftItem(item) {
        const reportObj = {
            1: '领取日礼包',
            4: '领取周礼包',
            9: '点击聚合礼包',
            10: '领取聚合礼包-KK币',
            11: '领取聚合礼包-抽卡爱心',
            12: '领取聚合礼包-彩蛋卡券',
        };
        if (item.gift_show_type == 1) {
            item.report = '领取特殊礼包';
        } else {
            item.report = reportObj[item.gift_real_type];
            if (![1, 5].includes(item.assign_type)) {
                // 小程序不可领
                item.notsupport = true;
                item.buttonText = item.button_text; // 不是会员使用
                item.assignedButtonText = item.assigned_button_text; // 不是会员使用
                item.button_text = 'APP内领取';
                item.assigned_button_text = 'APP内使用';
            } else if ([11, 12].includes(item.gift_real_type)) {
                item.assignedButtonText = item.assigned_button_text; // 不是会员使用
                // 聚合-抽卡爱心/彩蛋卡券，领取后文案前端控制
                item.assigned_button_text = 'APP内使用';
            }
        }
        return item;
    },

    giftCallback(data) {
        return new Promise((resolve) => {
            util_request({
                host: 'pay',
                method: 'post',
                url: '/v1/vip/gift/assign',
                data,
            }).then((res) => {
                const result = res.data.assign_result;
                resolve(result);
                if (result.assign_code == 1) {
                    // 直接跳转开通页
                    this.goJoin();
                } else if (!result.success) {
                    // 领取失败
                    this.getGifts();
                    util_showToast({
                        title: result.assign_title,
                        type: 'error',
                    });
                }
            });
        });
    },

    setClock(diff) {
        const oneday = 24 * 3600 * 1000;
        const onehour = 3600 * 1000;
        const oneminute = 60 * 1000;
        const day = Math.floor(diff / oneday);
        const level1 = diff % oneday;
        const hour = Math.floor(level1 / onehour);
        const level2 = level1 % onehour;
        let minute = Math.floor(level2 / oneminute);
        if (day == 0 && hour == 0 && minute == 0) {
            minute = 1;
        }
        this.setData({
            times: [this.numbers(day), this.numbers(hour), this.numbers(minute)],
        });
        const after = diff - oneminute;
        if (after < 1) {
            // 倒计时结束，刷新聚合礼包
            this.getGifts(this.data.bags);
            return;
        }
        this.data.clock = setTimeout(() => {
            this.setClock(after);
        }, oneminute);
    },

    numbers(num) {
        return num < 10 ? '0' + num : num + '';
    },

    closeDialog(e) {
        const dialog = e.currentTarget.dataset.dialog;
        this.setData({
            [`${dialog}`]: { show: false },
        });
        if (dialog == 'bags' && this.data.bags.clock) {
            clearTimeout(this.data.clock);
        }
        // 关闭弹窗更新更新数据
        this.getGifts();
    },

    // 点击续费/开通按钮事件
    goJoin(e) {
        if (e) {
            const button_type = e.currentTarget.dataset.report;
            this.pageBtnKksaTrack(button_type); // 点击开通按钮上报
        }
        let time = setTimeout(() => {
            clearTimeout(time);
            util_showToast({
                title: '开通会员，即可领取',
                position: { bottom: '30%' },
            });
        }, 300);
    },

    // 点击临时会员领取提醒弹窗中的,开通会员按钮
    goVip() {
        this.closeTemporaryPopup(); // 关闭弹窗,并且跳转会员开通页
        this.goJoin(); // 跳转会员开通页
    },

    // 关闭临时会员领取聚合礼包弹窗
    closeTemporaryPopup() {
        this.setData({
            'temporaryPopup.show': false, // 隐藏弹窗
        });
    },

    // 专题类表->点击专题
    topicActionTap(event) {
        this.clickTrack('漫画作品');
        const { action_type: type, target_id: id, parent_target_id: pid, target_web_url: url } = event.detail.action_target || {};
        util_action({ type: type, id: id, parentid: pid, url: url, params: { source: 'vip-center' } });
    },

    // 漫剧跳转
    videoActionTap(event) {
        this.clickTrack('漫剧作品');
        const { id } = event.detail;

        // 跳转漫剧详情页
        util_action({ type: 2009, parentid: id });
    },

    // 页面按钮点击事件埋点
    pageBtnKksaTrack(btnText = '') {
        let vipInfo = this.data.vipInfo ? this.data.vipInfo : {};
        let data = {
            ButtonType: btnText, // 按钮类型
            SourcePlatform: app.globalData.channel, // 来源平台	String	wechat、qq、zijietiaodong、baidu、Alipay、M站
            MembershipClassify: vipInfo.vip_type ? 1 : 0, // 会员的身份	Number	1会员，0非会员
        };
        app.kksaTrack('ClickMembershipCenter', data);
    },

    // 获取tips礼包
    async getTipsGift() {
        const { data = {} } = await api.getTipsGift();
        const list = data.list || [];

        // tips礼包数据、 未读消息
        let tipsgift, unreadMessage;
        for (let i = 0; i < list.length; i++) {
            let item = list[i] || {};
            let type = item.type || 0;
            switch (type) {
                case 3:
                    unreadMessage = item;
                    break;
                case 7:
                    if (!tipsgift) {
                        tipsgift = item;
                    }
                    break;
                default:
                    break;
            }
        }
        if (tipsgift) {
            tipsgift.report = '领取tips礼包';
        }
        this.setData({ tipsgift, unreadMessage });
    },

    // 获取临时提醒弹窗,按钮营销文案;
    async getCommonPopups() {
        if (this.data.isiOS) {
            return false;
        }

        let { code, data = {} } = await api.getCommonPopups();
        if (code != 200) {
            return false;
        }
        let {
            bubble_text = '', // 按钮小角标文啊
            main_text, // 按钮大文案
        } = data;
        let str = main_text;
        if (str && str[0] == '#') {
            str = str.replace('#', ''); // 清除第一个#符号
        }
        let strAry = str.split('#');
        let andBtn = { 2: bubble_text };
        if (strAry && strAry.length > 0) {
            andBtn[0] = strAry[0];
            andBtn[1] = strAry[1];
        }
        this.setData({
            'temporaryPopup.andBtn': andBtn, // 只修改文案内容
        });
    },

    // 新增逻辑
    onChoiceItem(e) {
        // 当前选中档位信息
        this.clickTrack('会员档位卡片');
        this.setData({
            activeItem: e.detail,
        });
    },
    async onPaySuccess(e) {
        this.init(); // 刷新礼包数据
        const payComp = this.selectComponent('#payComp'); // 刷新档位信息
        if (payComp) {
            payComp.getVipGoodList();
        }

        const { orderId = 0, vipResult = null } = e.detail;
        if (orderId) {
            const sucData = {};
            if (vipResult) {
                sucData.title = vipResult.title || '';
                sucData.kkb = vipResult.kkb_giving || '';
                sucData.vipDays = vipResult.days_giving || '';
            }

            // 显示充值成功弹窗推荐
            const res = await api.getChargeSuccess({ order_id: orderId });
            let { code, data } = res;
            if (code === 200) {
                let charge_success_info = data.charge_success_info || [];
                charge_success_info = charge_success_info.filter((i) => i.type === 1)[0] || {};
                let benefits = charge_success_info.benefits || [];
                benefits = benefits.filter((i) => i.award_type === 22)[0] || {};

                sucData.bannerData = {
                    content: benefits.content || '',
                    content_arr: benefits.content ? benefits.content.split('#') : [],
                    button_text: benefits.button_text || '',
                    action_target: benefits.action_target || null,
                    award_type: benefits.award_type || 0,
                };
                this.setData({
                    sucData,
                    showVipPop: true,
                });
            }
        }
    },
    closePopup() {
        this.setData({
            showVipPop: false,
        });
    },

    // 点击埋点
    clickTrack(name) {
        const data = {
            CurPage: '小程序新会员中心页面',
            name,
        };
        app.kksaTrack('ClickButton', data);
    },
};

const ConnectPage = connect(
    ({ userInfo, vipInfo }) => {
        return {
            userInfo,
            vipInfo,
        };
    },
    (setState) => ({
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
