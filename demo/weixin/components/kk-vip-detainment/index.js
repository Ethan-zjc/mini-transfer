/**
 * kk-vip-detainment 挽留弹窗(vip 挽留弹窗)
 * @param topicId {Number} 漫画专题id
 * @param comicId {Number} 漫画专题id
 * @param type    {Number} 弹窗所在的页面 0是漫画页，1是会员开通页
 * @param source  {Number} 弹窗来源，1普通付费弹窗，2会员限免弹窗，3会员专享提前看弹窗，4会员专享固定锁住弹窗，5广告前置弹窗，6定向限免前置弹窗
 * @param pageName {String} 页面名称
 * @param isShowNow {Boolean} 是否直接显示挽留弹窗
 * */
const API = wx;
// API.setStorageSync("vipDetainmentListData", "[]"); // 调试 - 调试完成后需要删除

const app = getApp();

import { util_action, util_showToast } from "../../util.js";

import {
    setStoreVipData, // 设置存储挽留弹窗的数据
    getStoreVipData, // 获取存储挽留弹窗的数据
    getTodayDate, // 获取今天日期
    specifySecondInterval, // 指定x秒间隔执行回调函数 s:默认10秒  cb:默认空函数 newthis:当前块的this
    specifyMinuteInterval, // 指定x分钟间隔执行回调函数 m:默认20分钟  cb:默认空函数 newthis:当前块的this
    judgmentDate, // 判断日期
} from "./computing-time.js";
import {
    getPopupsActivityInfo, // 获取优惠券列表判断是否可以领取
    getPopupsAssign, // vip挽留券领取
    getKkbAssign, // 普通挽留弹窗免费券领取
} from "./api.js";

Component({
    properties: {
        // 漫画专题id
        topicId: {
            type: [Number, String],
            value: 0,
        },
        topicName: {
            type: [Number, String],
            value: "",
        },
        comicName: {
            type: [Number, String],
            value: "",
        },
        // 漫画章节id
        comicId: {
            type: [Number, String],
            value: 0,
        },
        // 弹窗所在的页面 0是漫画页，1是会员开通页
        type: {
            type: [Number, String],
            value: 0,
        },
        // 弹窗来源，1普通付费弹窗，2会员限免弹窗，3会员专享提前看弹窗，4会员专享固定锁住弹窗，5广告前置弹窗，6定向限免前置弹窗
        source: {
            type: [Number, String],
            value: 0,
        },
        // 页面的名称
        pageName: {
            type: String,
            value: "",
        },
        // 是否直接显示挽留弹窗  true:立即请求显示挽留弹窗  false:正常逻辑计时10秒或者20分后显示
        isShowNow: {
            type: Boolean,
            value: false,
        },
        // 用户vip数据
        vipInfo: {
            type: [String, Object],
            value: null,
        },
    },

    data: {
        popType: 0, // 弹窗类型: 0: 不显示  1:普通挽留弹窗(202110只有漫画页有)  2:vip挽留弹窗(漫画页/vip开通页)
        isShow: false, // 是否显示弹窗
        time_s: null, // 倒计时秒的记录变量
        time_m: null, // 倒计时分的记录变量
        isReceive: false, // 是否显示挽留领取弹窗 true:是  false:不是,显示提醒用券
        displayData: null, // vip挽留弹窗内容显示的数据
        retainData: null, // 漫画页普通挽留弹窗内容数据
        images: {
            unclaimed: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/vip-retain-unclaimed_5318737.png", // 挽留弹窗-领券标题icon
            used: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/vip-retain-used_429448d.png", // 挽留弹窗-优惠券待使用标题icon
            couponRight: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/vip-coupon-right_db34d0e.png", // 优惠券右侧背景
            couponLeft: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/vip-coupon-left_a948f5d.png", // 优惠券左侧背景
            close: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/vip-retain-close_e170c9b.png", // 关闭弹窗按钮
            textbg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/vip-retain-textbg_de294ae.png", // 挽留弹窗-标题文字背景
            kkbTitleBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/buyvip/kkb-title-bg_fea01ee.png", // 普通挽留弹窗标题图片
        },
        current_time: 0, // 优惠券接口返回的当前时间
    },

    attached() {
        this.clearComType(() => {
            const { isShowNow } = this.properties;
            if (isShowNow) {
                // 立即显示弹窗
                this.getPopupData(() => {
                    setStoreVipData({ num: 1 });
                    this.setData({ isShow: true });
                    this.initCompKksaTrack(); // 埋点
                });
            } else {
                // 计时显示弹窗
                this.initTime();
            }
        });
    },

    pageLifetimes: {
        show() {},
        hide() {
            this.clearComType();
        },
    },

    // 在组件实例被从页面节点树移除时执行
    detached() {
        this.clearComType();
    },

    methods: {
        // 格式化后输出埋点NoticeType的字符串
        getNoticeType() {
            let { source } = this.properties;
            // 1普通付费弹窗，2会员限免弹窗，3会员专享提前看弹窗，4会员专享固定锁住弹窗，5广告前置弹窗，6定向限免前置弹窗
            let text = "无";
            if (source == 1) {
                text = "普通付费";
            } else if (source == 2) {
                text = "会员限免";
            } else if (source == 3) {
                text = "会员专享提前看";
            } else if (source == 4) {
                text = "会员专享固定锁住";
            } else if (source == 5) {
                text = "广告前置";
            } else if (source == 6) {
                text = "定向限免";
            } else if (source == 7) {
                text = "整本限免";
            }
            return text;
        },

        // 初始埋点
        initCompKksaTrack() {
            const { pageName, topicName, comicName, vipInfo } = this.properties;
            const noticeType = this.getNoticeType();
            app.kksaTrack("RetainPopup", {
                TriggerPage: pageName == "buyvip" ? "会员中心" : "漫画详情页面",
                NoticeType: noticeType,
                TopicName: topicName,
                ComicName: comicName,
                MembershipClassify: vipInfo && vipInfo.vip_type ? vipInfo.vip_type : 0,
                SourcePlatform: app.globalData.channel,
            });
        },

        // vip挽留弹窗点击按钮触发
        clickBtnKksaTrack(ButtonName) {
            if (!ButtonName) {
                return false;
            }
            const noticeType = this.getNoticeType();
            const { pageName, vipInfo, topicName, comicName } = this.properties;
            app.kksaTrack("ClickRetainPopup", {
                TriggerPage: pageName == "buyvip" ? "会员中心" : "漫画详情页面",
                NoticeType: noticeType,
                ButtonName,
                MembershipClassify: vipInfo && vipInfo.vip_type ? vipInfo.vip_type : 0,
                TextType: "无",
                PayActivityName: this.displayData ? this.displayData.title || "无" : "无",
                TopicName: topicName,
                ComicName: comicName,
                SourcePlatform: app.globalData.channel,
            });
        },

        // 清空组件记录的状态
        clearComType(cb) {
            if (!cb || typeof cb != "function") {
                cb = () => {};
            }
            clearInterval(this.data.time_m);
            clearInterval(this.data.time_s);
            this.data.time_m = null;
            this.data.time_s = null;
            this.setData(
                {
                    isShow: false,
                    isReceive: false, // 修改为初始值
                    displayData: null, // vip挽留弹窗数据
                    retainData: null, // 普通挽留弹窗数据
                },
                () => {
                    cb();
                }
            );
        },

        // 获取时间计算弹窗显示时机和显示弹窗的类型
        initTime() {
            const _this = this;
            let storeDate = getStoreVipData(); // 获取存储的时间
            let curDate = getTodayDate(); // 获取当前时间
            // 判断存储日期和今天日期比较结果
            let dateResult = judgmentDate(storeDate.time, curDate.time);
            if (dateResult.futureDate) {
                // 未来的时间
                return false;
            }
            if (dateResult.today && storeDate.showPopupNum < 2) {
                // 今天->需要倒计时20分钟
                specifyMinuteInterval({
                    newthis: this,
                    m: 20,
                    // debugSpeed: true, // 调试打开
                    cb: () => {
                        setStoreVipData({ num: 2 }); // 设置当天弹窗出现过的次数(更新)
                        this.setData({ isShow: true });
                        this.getPopupData();
                        this.initCompKksaTrack(); // 埋点
                    },
                });
                return false;
            }
            if (dateResult.pastDate) {
                // 过去的时间->倒计时10秒
                specifySecondInterval({
                    newthis: this,
                    s: 10,
                    cb: () => {
                        // 设置数据
                        setStoreVipData({ num: 1 });
                        this.setData({ isShow: true });
                        this.getPopupData();
                        this.initCompKksaTrack(); // 埋点
                    },
                });
                return false;
            }
        },

        // 获取弹窗展示需要的数据
        getPopupData(callback) {
            if (!callback || typeof callback != "function") {
                callback = () => {};
            }
            let { topicId, comicId, type, source } = this.properties;
            let sendData = {
                topic_id: topicId,
                comic_id: comicId,
                launch_type: type, // 挽留来源，0是普通类型，1是定向限免(5.69及以后版本弃用)
                popups_source: source, // 弹窗来源，1普通付费弹窗，2会员限免弹窗，3会员专享提前看弹窗，4会员专享固定锁住弹窗，5广告前置弹窗，6定向限免前置弹窗
            };
            getPopupsActivityInfo(sendData)
                .then((res) => {
                    let { code, data, message } = res;
                    if (code != 200) {
                        if (!message) {
                            return false;
                        }
                        util_showToast({
                            title: message,
                            type: "error",
                            mask: true,
                            duration: 3000,
                        });
                        return false;
                    }
                    let {
                        has_join = false, // 【弹窗发优惠券】是否参加活动(是否有活动)，已参加（false）下面的参数会是空
                        activity_id = "", // 【弹窗发优惠券】优惠券活动id
                        coupon_ids = null, // 【弹窗发优惠券】优惠券ID列表
                        has_retain = false, // 【普通挽留弹窗】是否有挽留
                        retain = [], // 【普通挽留弹窗】挽留礼物
                        coupon_list = [], // 【可用优惠券挽留】
                        // interval_time = 0 // 挽留策略间隔时间，单位秒
                        current_time, // 接口返回的当前时间
                    } = data;
                    this.data.current_time = current_time || new Date().getTime();
                    retain = Array.isArray(retain) ? retain : [];
                    let retainData = retain[0] ? retain[0] : Array.isArray(coupon_list) ? coupon_list[0] : null;

                    let isHasJoin = (!has_join && coupon_list && coupon_list.length > 0) || has_join;
                    // has_join=true发券 has_join=false && coupon_list使用券
                    // 说明是普通挽留弹窗
                    if (!isHasJoin && has_retain && retainData) {
                        this.initRetainData(retainData);
                        callback();
                        return false;
                    }
                    // 显示领取弹窗 -> 进行领取
                    if (has_join && coupon_ids && Array.isArray(coupon_ids) && coupon_ids.length > 0) {
                        this.popupsAssign({
                            coupon_id: coupon_ids[0] || 0,
                            activity_id,
                            callback,
                        });
                    } else {
                        let displayData = Array.isArray(coupon_list) ? coupon_list[0] : null;
                        if (!displayData) {
                            // 需要直接关闭弹窗(无挽留弹窗数据的情况)
                            this.triggerEvent("onVipDetaClose", { show: false, isNoData: true }, { bubbles: true });
                            return false;
                        }
                        this.initDisplayData(displayData);
                        callback();
                    }
                })
                .catch((err) => {
                    if (!err.message) {
                        return false;
                    }
                    util_showToast({
                        title: err.message,
                        type: "error",
                        mask: true,
                        duration: 3000,
                    });
                });
        },

        // 领取去代金券 id: getPopupsActivityInfo接口活动coupon_ids中的第一个, callback:回调函数
        popupsAssign({ coupon_id = "", activity_id = "", callback } = {}) {
            if (!callback || typeof callback != "function") {
                callback = () => {};
            }
            let { topicId, comicId, type } = this.properties;
            let sendData = {
                topic_id: topicId,
                comic_id: comicId,
                launch_type: type, // 挽留来源，0是普通类型，1是定向限免(5.69及以后版本弃用)
                coupon_id, // 接口获取的要领取代金券id
                activity_id, // 接口获取的活动id
            };
            getPopupsAssign(sendData)
                .then((res) => {
                    let { code, data, message } = res;
                    data = data || {};
                    if (code != 200) {
                        if (!message) {
                            return false;
                        }
                        util_showToast({
                            title: message,
                            type: "error",
                            mask: true,
                            duration: 3000,
                        });
                        return false;
                    }
                    this.setData({ isReceive: true });
                    this.getPopupData(callback); // 刷新数据
                })
                .catch((err) => {
                    if (!err.message) {
                        return false;
                    }
                    util_showToast({
                        title: err.message,
                        type: "error",
                        mask: true,
                        duration: 3000,
                    });
                });
        },

        // 格式化vip弹窗展示的内容数据
        initDisplayData(data) {
            if (!data) {
                return false;
            }
            let end_time = data.end_at || new Date().getTime() + 1000 * 60 * 2; // 默认+2分钟
            // let start_time = data.start_at || new Date().getTime(); // 开始时间
            let current_time = this.data.current_time || new Date().getTime(); // 开始时间
            let remainingTime = (end_time - current_time) / (1000 * 60 * 60);
            data.remaining_time = ""; // 要展示的过期时间(状态)
            data.amount = this.hasDot(data.amount / 100); // 优惠券金额 以元为单位,最多保留小数点后的两位
            data.final_price = this.hasDot(data.final_price / 100); // 现价
            data.original_price = this.hasDot(data.original_price / 100); // 原价
            data.title = data.title || "";
            data.tips = data.tips || "";
            data.id = data.id || "";
            data.good_id = data.good_id || "";
            if (remainingTime > 24) {
                data.remaining_time = Math.floor(remainingTime / 24) + "天后到期";
            } else if (remainingTime <= 24 && remainingTime >= 1) {
                data.remaining_time = "今天到期";
            } else {
                data.remaining_time = "";
            }
            // if (remainingTime < 72 && remainingTime > 24) {
            //     // data.remaining_time = `${Math.ceil(remainingTime / 24)}`;
            //     data.remaining_time = `${Math.ceil(remainingTime / 24)}`"有效期：" + util_formatTime(end_time, "yyyy-MM-dd hh:mm:ss");
            // }

            this.setData({ displayData: data || null, popType: 2 });
        },

        // 格式化漫画页普通弹窗数据
        initRetainData(data) {
            if (!data) {
                return false;
            }
            let action = data.action_target || {};
            action.action_type = action.action_type || 13;
            action.target_id = action.target_id || 0;
            action.target_web_url = action.target_web_url || "";
            action.hybrid_url = action.hybrid_url || "";
            data.action_target = action;
            data.btn_link_text = data.btn_link_text || "免费看";
            data.close_btn_text = data.close_btn_text || "残忍离开";
            data.text = data.text || data.tips || "";
            data.text_list = data.text.split("#");
            data.title = data.title || "";
            data.title_list = data.title.split("#");
            this.setData({ retainData: data, popType: 1 });
        },

        // 最多保留小数点后的两位
        hasDot(num) {
            if (!isNaN(num)) {
                return (num + "").indexOf(".") == -1 ? num : num.toFixed(2);
            } else {
                return num;
            }
        },

        // 点击vip挽留弹窗关闭按钮
        clickTapClose() {
            let displayData = this.data.displayData ? JSON.parse(JSON.stringify(this.data.displayData)) : null;
            if (displayData) {
                let source = this.properties.source;
                displayData.popupSource = source;
            }
            this.clearComType(() => {
                this.clickBtnKksaTrack("关闭按钮");
                // 传递给父级
                this.triggerEvent("onVipDetaClose", { show: false, displayData }, { bubbles: true });
            });
        },

        // 点击vip挽留弹窗使用(领取)按钮
        clickUseBtn() {
            let displayData = JSON.parse(JSON.stringify(this.data.displayData));
            let pageName = this.properties.pageName;
            let source = this.properties.source;
            displayData.popupSource = source;
            this.clickBtnKksaTrack("领券");
            this.triggerEvent("onVipDetaClose", { show: false }, { bubbles: true });
            this.clearComType(() => {
                if (pageName == "buyvip") {
                    // vip页面
                    this.triggerEvent("onVipDetaUseBtn", { displayData }, { bubbles: true });
                } else {
                    util_action({
                        type: 43,
                        params: {
                            good_id: displayData.good_id || 0,
                            coupon_id: displayData.id || 0,
                            VIPDiscountName: displayData.title || "",
                            popupSource: source,
                        },
                    });
                }
            });
        },

        // 普通挽留弹窗获取点击上报的活动类型
        getTextType(type) {
            let text = "无";
            if (type == 0) {
                text = "广告解锁";
            } else if (type == 1) {
                text = "免费代金券";
            } else if (type == 2) {
                text = "运营文案";
            } else if (type == 3) {
                text = "充值送代金券";
            } else if (type == 4) {
                text = "开会员送代金券";
            } else if (type == 5) {
                text = "定向限免";
            }
            return text;
        },

        // 点击普通(漫画)挽留弹窗确认按钮
        clickConfirmBtn() {
            if (!this.data.retainData) {
                return false;
            }
            let retainData = JSON.parse(JSON.stringify(this.data.retainData));
            this.data.retainData = null;
            this.triggerEvent("onVipDetaClose", { show: false }, { bubbles: true }); // 通知父级页面记录关闭弹窗
            this.kkbAssign({
                data: retainData,
                cb: () => {
                    let speed = retainData.activity_type == 1 ? 2000 : 0; // 是否需要提示和倒计时时间
                    let action = retainData.action_target;
                    const noticeType = this.getNoticeType();
                    const { vipInfo, topicName, comicName, topicId } = this.properties;
                    app.kksaTrack("ClickRetainPopup", {
                        TriggerPage: "漫画详情页面",
                        NoticeType: noticeType,
                        ButtonName: retainData.btn_link_text || "",
                        TextType: this.getTextType(retainData.activity_type || ""),
                        PayActivityName: retainData.title || "",
                        TopicName: topicName,
                        ComicName: comicName,
                        MembershipClassify: vipInfo && vipInfo.vip_type ? vipInfo.vip_type : 0,
                        SourcePlatform: app.globalData.channel,
                    });
                    if (speed > 0) {
                        util_showToast({
                            title: "领取成功",
                            duration: 2000,
                        });
                    }
                    let time = setTimeout(() => {
                        this.clearComType();
                        clearTimeout(time);
                        if (action.action_type == 13) {
                            let comicId = this.properties.comicId;
                            API.redirectTo({ url: `/pages/comic/comic?id=${comicId}` }); // 刷新当前页
                        } else {
                            util_action({
                                type: action.action_type,
                                id: retainData.id || "",
                                url: action.target_web_url || action.hybrid_url || "",
                                params: {
                                    coupon_id: retainData.coupon_id,
                                    topicid: topicId,
                                },
                            });
                        }
                    }, speed);
                },
            });
        },

        // 点击普通(漫画)挽留  关闭弹窗
        clickConfirmClose(e) {
            const detail = e.currentTarget.dataset || {};
            let retainData = JSON.parse(JSON.stringify(this.data.retainData));
            this.clearComType(() => {
                const noticeType = this.getNoticeType();
                const { vipInfo, topicName, comicName } = this.properties;
                app.kksaTrack("ClickRetainPopup", {
                    TriggerPage: "漫画详情页面",
                    NoticeType: noticeType,
                    ButtonName: detail.btnname || "",
                    TextType: this.getTextType(retainData.activity_type || ""),
                    PayActivityName: retainData.title || "",
                    TopicName: topicName,
                    ComicName: comicName,
                    MembershipClassify: vipInfo && vipInfo.vip_type ? vipInfo.vip_type : 0,
                    SourcePlatform: app.globalData.channel,
                });
                this.triggerEvent("onVipDetaClose", { show: false, isNoData: false }, { bubbles: true });
            });
        },

        // 普通挽留弹窗免费券领取
        kkbAssign({ data = {}, cb = () => {} } = {}) {
            data = data ? data : {};
            if (!cb || typeof cb != "function") {
                cb = () => {};
            }
            if (data.activity_type != 1) {
                cb();
                return false;
            }
            const { topicId } = this.properties;
            getKkbAssign({
                activity_id: data.coupon_id,
                topic_id: topicId,
            })
                .then((res) => {
                    console.log("res:", res);
                    cb();
                })
                .catch((err) => {
                    console.log("err:", err);
                    cb();
                });
        },
    },
});
