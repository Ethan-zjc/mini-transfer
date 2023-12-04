import { util_action, util_showToast } from "../../../../util.js";

const api = require("../../api");
const app = getApp();
const global = app.globalData;
const { globalImgs } = require("../../../../cdn.js");

Component({
    properties: {
        isVip: {
            type: Boolean,
            value: false,
        },
        topicId: {
            type: [Number, String],
            value: 0,
        },
        comicId: {
            type: [Number, String],
            value: 0,
        },
        topicTitle: {
            type: String,
            value: "",
        },
        payGiftData: {
            type: [Object],
            value: "",
        },
    },
    data: {
        globalImgs,
        isLogin: false,
        award_info_list: [],
        charge_button: {},
        activity_name: "",
        main_title: "",
        banner_type_name: "",
        bubble_text: "",
        extraList: [],
    },
    attached() {
        this.setData(
            {
                isLogin: !!global.userId,
            },
            () => {
                this.initData();
            }
        );
    },
    methods: {
        initData() {
            const { payGiftData: payGift } = this.data;
            let award_info_list = payGift.charge_send_info.award_info_list; // 奖励列表
            let charge_button = payGift.charge_send_info.button_view; // 按钮状态
            let bubble_text = payGift.charge_send_info.bubble_text; // 充值按钮上气泡文案
            let main_title = payGift.charge_send_info.main_title; // 充值礼包标题
            main_title = main_title.split("#");
            let activity_name = payGift.charge_send_info.activity_name; // 活动标题
            let banner_type_name = payGift.charge_send_info.banner_type_name; // 充值礼包类型
            let comicAward = award_info_list.filter((item) => item.award_type == 21)[0] || {}; // 漫画奖励列表
            let comicAwardTopic = comicAward.assign_topic || {};
            let extraList = comicAwardTopic.extra_assign_topic_list || []; // 补齐作品

            // 截取文字，改变样式加粗
            award_info_list = award_info_list.map((item, index) => {
                item.sub_title_0 = this.textHandle(item.award_sub_title, "#")[0];
                item.sub_title_1 = this.textHandle(item.award_sub_title, "#")[1];
                item.sub_title_2 = this.textHandle(item.award_sub_title, "#")[2];
                return item;
            });
            this.setData({
                award_info_list,
                charge_button,
                activity_name,
                main_title,
                banner_type_name,
                extraList,
                bubble_text,
            });
        },
        textHandle(str, separator) {
            if (!str) {
                return "";
            }
            return str.split(separator);
        },
        // 吊起直接支付组件
        giftDirectPay(e) {
            let { id, button } = e.currentTarget.dataset;
            app.kksaTrack("ClickPayPopup", {
                NoticeType: this.data.banner_type_name || "充值礼包",
                TopicName: this.data.topicTitle,
                ButtonType: "充值按钮",
                ButtonName: button || "购买BTN",
            });
            this.onTrigger(
                "directPay",
                {
                    good_id: id,
                    activity_name: this.data.activity_name,
                    banner_type_name: this.data.banner_type_name,
                    extraList: this.data.extraList,
                },
                { bubbles: true, composed: true }
            );
        },
        // 充值礼包点击领取
        getGift(e) {
            let { button, assign } = e.currentTarget.dataset;
            api.chargeActivityAssign({
                assign_encrypt_str: assign,
                activity_name: this.data.activity_name,
            })
                .then((res) => {
                    if (res.data.assign_status == 1) {
                        // 提示领取成功，按钮置灰色
                        util_showToast({
                            title: "领取成功，快去享用吧！领取的书籍在【我 的钱包-已购书籍】中查看",
                            duration: 3000,
                        });
                        // 将领取按钮置灰色
                        if (this.data.award_info_list) {
                            this.data.award_info_list.filter((item) => item.award_type == 21)[0].status = 0;
                            this.setData({
                                award_info_list: this.data.award_info_list,
                            });
                        }
                        // 点击领取成功 埋点
                        app.kksaTrack("ClickPayPopup", {
                            NoticeType: this.data.banner_type_name,
                            TopicName: this.data.topicTitle,
                            ButtonName: button,
                            IsTakeSuccess: 1, // 是否领取成功 1成功 0失败
                        });
                        // 用户领取时触发
                        app.kksaTrack("Consume", {
                            NoticeType: this.data.banner_type_name,
                            TopicName: this.data.topicTitle,
                            TriggerPage: "ComicPage",
                            TriggerButton: button || "",
                            AdPaid: 0,
                        });

                        // 刷新页面
                        this.onTrigger("reloadPage");
                    } else {
                        util_showToast({ title: "领取失败" });
                    }
                })
                .catch((err) => {
                    util_showToast({ title: err });
                    // 点击领取失败 埋点
                    app.kksaTrack("ClickPayPopup", {
                        NoticeType: this.data.banner_type_name,
                        TopicName: this.data.topicTitle,
                        ButtonName: button,
                        IsTakeSuccess: 0, // 是否领取成功 1成功 0失败
                    });
                });
        },
        // 是否显示30话免费看详情浮层
        freeComic(e) {
            let status = e.currentTarget.dataset.status;
            // 请求接口
            this.setData({
                showFreeComic: status,
            });
        },
        // 点击立即阅读
        topicItemTap(event) {
            let dataset = event.currentTarget.dataset; // 数据集合
            let { id, title } = dataset;
            util_action({ type: 2, id, params: { source: "comic", title } });
        },
        onTrigger(event, options = {}) {
            this.triggerEvent(event, options, { bubbles: true, composed: true });
        },
        // 未登录: 点击登录按钮
        onLoginTap(event) {
            app.originLogin(event.detail).then((res) => {
                let comicId = this.data.comicId;
                wx.redirectTo({
                    url: `/pages/comic/comic?id=${comicId}&comicId=${comicId}`,
                });
            });
        },
    },
});
