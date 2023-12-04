// subpack-activity/pages/award-list/exchange-popup/index.js
const app = getApp();

Component({
    properties: {
        prizeData: {
            type: Object,
            default: null,
        },
    },

    methods: {
        close() {
            this.triggerEvent("close");
        },

        copy() {
            const { prizeData } = this.properties;
            app.kksaTrack("ClickButton", {
                CurPage: "23Q1抽奖活动-我的奖品（原生）",
                ButtonName: "兑换码弹窗-复制",
            });
            wx.setClipboardData({
                data: prizeData.exchange,
                success() {},
            });
        },
    },
});
