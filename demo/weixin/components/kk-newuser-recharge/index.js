import { util_formatTime, util_getPointCharge, util_action, util_showToast, util_multPage } from "../../util";
Component({
    data: {
        isShow: false,
        isToLogin: false,

        CurPage: "",
    },

    pageLifetimes: {
        show() {
            const storage = wx.getStorageSync("newuserrecharge:date") || "";
            const curDate = util_formatTime(new Date(), "yyyy-MM-dd");
            const { userId } = getApp().globalData;
            const multPage = util_multPage();
            this.data.CurPage = multPage.CurPage;

            if (!storage || storage != curDate) {
                util_getPointCharge().then((res) => {
                    const { recharge_type } = res;
                    if (!recharge_type) {
                        wx.setStorage({
                            key: "newuserrecharge:date",
                            data: curDate,
                        });

                        getApp().kksaTrack("CommonPopup", {
                            CurPage: this.data.CurPage,
                            popupName: "新用户充值弹窗",
                        });
                    }

                    this.setData({
                        isShow: !recharge_type,
                    });
                });
            } else if (this.data.isToLogin && userId) {
                util_getPointCharge().then((res) => {
                    const { recharge_type } = res;
                    const type = recharge_type ? 21 : 22;

                    util_action({ type, subpack: true });
                    this.setData({
                        isToLogin: false,
                        isShow: false,
                    });
                    setTimeout(() => {
                        recharge_type &&
                            util_showToast({
                                title: "此优惠仅限新用户，看看别的活动吧~",
                            });
                    }, 1000);
                });
            }
        },
    },

    methods: {
        clickBtn() {
            getApp().kksaTrack("CommonPopup", {
                CurPage: this.data.CurPage,
                popupName: "新用户充值弹窗",
                ButtonName: "立享福利",
            });

            if (!global.userId) this.data.isToLogin = true;
            util_action({ type: 21, subpack: true });
        },

        clickClose() {
            this.setData({
                isShow: false,
            });
        },
    },
});
