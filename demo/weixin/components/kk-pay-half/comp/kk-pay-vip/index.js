/*
 * kk-vip-dialog 会员弹窗
 * 1、popType   会员弹窗类型 2: 限免，3: 提前看，4: 固定锁住
 * 2、trackProps 埋点属性
 */
import { util_action, util_logout, util_getPointCharge } from "../../../../util.js";

const app = getApp();
const global = app.globalData;
const images = {
    arrowOpen: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipdialog/ic_arrow_open_5d1772e.png",
    vipPayBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipdialog/vip-pay-bg_b591a5f.png",
    limitBtn: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipdialog/limit-btn_52706b2.png",
};

Component({
    properties: {
        trackProps: {
            type: Object,
            value: () => {},
        },
        vipData: {
            type: Object,
            value: {},
        },
        popType: {
            type: [Number, String],
            value: "",
        },
    },
    data: {
        images,
        vipTitle: "", // title内容
        comics: [], // 推荐章节列表
        topicTitle: "", // 专题title
        bubbleText: "", // 按钮右上角气泡文案
        topBubbleo: "", // 覆层运营位第一行
        topBubblet: "", // 覆层运营位第二行
        btnLeftText: "", // 按钮左侧文案
        btnRightText: "", // 按钮右侧文案
        originalPrice: "", // 按钮原价文案
        IsVIPDiscount: false, // 是否命中会员优惠卷
        VIPDiscountName: "", // 会员优惠券名称
        VIPPrice: 0, // 会员开通价格
        isClickClose: true, // 是否可以点击关弹窗按钮
        showVipDetainment: false, // 是否直接显示挽留弹窗
        isLogin: false, // 用户是否登录
    },

    // 监听数据变化
    attached() {
        this.setData(
            {
                isLogin: !!global.userId,
                ...this.data.vipData,
            },
            () => {
                this.dialogTrackData();
            }
        );
    },
    methods: {
        // 点击关闭按钮
        clickCloseBtn() {
            // 回调到父组件处理
            this.triggerEvent("clickCloseBtn");
        },
        openVip() {
            if (this.data.popType == 2) {
                this.triggerEvent("openVipPageFun", { type: 0 });
                return;
            }

            // 提前看、固定锁住，点击弹窗按钮的上报和跳转
            this.dialogTrackData({ type: 1 });
            if (!this.data.isLogin) {
                util_logout();
            } else {
                let { topicId, topicTitle } = this.data;
                util_action({ type: 43, subpack: true, params: { type: 2, VIPDiscountName: this.data.VIPDiscountName, topicId, topicTitle } });
            }
        },
        actionTopic() {
            const { topicId } = this.data.vipData;
            wx.redirectTo({
                url: `/pages/topic/topic?id=${topicId}`,
            });
        },
        dialogTrackData({ type = 0 } = {}) {
            const { topicId, comicId } = this.data.vipData;
            const trackData = this.data.trackProps || {};
            const { popType = 2 } = this.data;
            if (popType == 2) {
                // 延续老版上报，在父组件中上报
                return;
            }
            const names = { 2: "会员限免", 3: "会员提前看", 4: "会员专享" };

            util_getPointCharge({ topic_id: topicId, comic_id: comicId }).then((res) => {
                const { RechargeType, LastRechargeTime } = res;
                const track = {
                    TriggerPage: "comic",
                    NoticeType: names[popType], // 会员提前看/会员专享
                    LastRechargeTime,
                    RechargeType,
                    MembershipClassify: trackData.isvip ? 1 : 0,
                    SourcePlatform: global.channel,
                };
                if (type == 1) {
                    track.ButtonName = this.data.btnRightText;
                    track.ButtonType = "下方开通会员按钮";
                }
                Object.assign(trackData, track);
                // 如果是限免/提前看弹窗 上报
                if (this.data.popType == 2 || this.data.popType == 3) {
                    trackData.IsVIPDiscount = this.data.IsVIPDiscount;
                    trackData.VIPDiscountName = this.data.VIPDiscountName;
                    trackData.VIPPrice = this.data.VIPPrice;
                    // trackData.PUWID = this.data.PUWID;
                }
                console.log("会员弹窗相关埋点", type, trackData);
                app.kksaTrack(type ? "ClickVipPopup" : "VipPopup", trackData);
            });
        },
    },
});
