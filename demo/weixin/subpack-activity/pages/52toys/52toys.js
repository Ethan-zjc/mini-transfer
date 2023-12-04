import { getCode, getPageInfo, focusTopics } from "./api";
import { util_action } from "../../../util";

const app = getApp();
const { connect } = app.Store;

const page = {
    data: {
        topicList: [
            {
                id: 1338,
                name: "航海王",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/onePieceComic_c27c665.png",
            },
            {
                id: 15089,
                name: "蜡笔小新",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/crayonComic_686ddb4.png",
            },
            {
                id: 5895,
                name: "鬼灭之刃",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/bladeComic_5a0aef8.png",
            },
            {
                id: 6387,
                name: "名侦探柯南",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/conanComic_c6ba621.png",
            },
            {
                id: 2377,
                name: "摩卡少女樱",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/sakuraComic_990357a.png",
            },
        ],
        productList: [
            {
                id: 10114,
                path: "pages/play/startPlay/startPlay?id=8584&sharerId=108138943",
                name: "海贼王",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/onePieceProduct_4424321.png",
            },
            {
                id: 9195,
                path: "pages/play/startPlay/startPlay?id=9195&sharerId=108138943",
                name: "蜡笔小新",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/crayonProduct_ee29220.png",
            },
            {
                id: 8584,
                path: "pages/play/startPlay/startPlay?id=8584&sharerId=108138943",
                name: "鬼灭之刃",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/bladeProduct_01b5454.png",
            },
            {
                id: 5777,
                path: "pages/play/startPlay/startPlay?id=5777&sharerId=108138943",
                name: "名侦探柯南",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/conanProduct_95043fc.png",
            },
            {
                id: 9623,
                path: "pages/play/startPlay/startPlay?id=9623&sharerId=108138943",
                name: "摩卡少女樱",
                iamgeCover: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/52toys/sakuraProduct_408ec3e.png",
            },
        ],
        showLogin: false,
        cps: "",
        isShowPackageDialog: false,
        isShowCodeDialog: false,
        code: "",
        focusStatus: false,
        codeDesc1: "·复制好兑换码后，点击去兑换进入【蛋趣】小程序-礼包兑换进行优惠券兑换，兑换截止时间为2022年11月11日。",
        codeDesc2: "·兑换好的优惠券可以在我的-蛋券中查看，优惠券有效期为自兑换领取后7天。",
    },
    onLoad({ cps }) {
        this.data.cps = cps || "";
    },
    onShow() {
        this.init();
    },
    async init() {
        app.kksaTrack("CommonPageOpen", {
            CurPage: "52toys合作",
            cps_parameter: this.data.cps,
        });

        const { data = {} } = await getPageInfo({ topicIds: this.data.topicList.map((item) => item.id).join(","), activity_name: "toys" });
        const { follow_topics, benefits_content } = data || {};
        this.setData({
            focusStatus: follow_topics,
            code: benefits_content,
        });
    },
    commonClickReport(elementShowTxt) {
        app.kksaTrack("CommonItemClk", {
            CurPage: "52toys合作",
            ElementType: "52toys活动按钮",
            ElementShowTxt: elementShowTxt,
        });
    },
    popupClickReport({ popupName, elementShowTxt }) {
        app.kksaTrack("PopupClk", {
            popupName,
            ElementShowTxt: elementShowTxt,
        });
    },
    popupShowReport(popupName) {
        app.kksaTrack("PopupShow", {
            CurPage: "52toys合作",
            popupName,
        });
    },
    checkLoginStatus() {
        this.setData({
            showLogin: !this.data.userInfo,
        });
        return !!this.data.userInfo;
    },
    closeLogin() {
        this.setData({
            showLogin: false,
        });
    },
    toComicetail(e) {
        if (!this.checkLoginStatus()) {
            return;
        }
        const id = e.currentTarget.dataset.id;
        util_action({ type: 68, parentid: id });
    },
    toParnterApp(e) {
        if (!this.checkLoginStatus()) {
            return;
        }
        const id = e.currentTarget.dataset.id;
        util_action({ type: 2005, id: "wx0fb7418ae1fd6009", url: `pages/play/startPlay/startPlay?id=${id}&sharerId=108138943` });
    },
    async focusTopic() {
        if (!this.checkLoginStatus()) {
            return;
        }
        this.commonClickReport("一键关注");
        await focusTopics(this.data.topicList.map((item) => item.id));
        this.setData({
            focusStatus: true,
        });
    },
    async getPackage() {
        if (!this.checkLoginStatus()) {
            return;
        }
        this.commonClickReport("领取券包");
        const { data } = await getCode("toys");
        this.setData({
            code: (data || {}).benefits_content,
        });
        this.openCodeDialog();
    },
    toCoin() {
        if (!this.checkLoginStatus()) {
            return;
        }
        this.popupClickReport({ popupName: "我的券包弹窗", elementShowTxt: "去兑换" });
        wx.setClipboardData({
            data: this.data.code,
            success: function () {
                wx.hideToast();
            },
            complete: () => {
                wx.hideToast();
            },
        });
        util_action({ type: 2005, id: "wx0fb7418ae1fd6009", url: `pages/usercenter/giftbag/giftbag?sharerId=108138943` });
    },
    viewCode() {
        this.popupClickReport({ popupName: "我的券包弹窗", elementShowTxt: "查看兑换码" });
        this.setData({
            isShowCodeDialog: true,
            isShowPackageDialog: false,
        });
    },
    openCodeDialog() {
        this.popupShowReport("兑换码弹窗");
        this.setData({
            isShowCodeDialog: true,
        });
    },
    closeCodeDialog() {
        this.setData({
            isShowCodeDialog: false,
        });
    },
    copyCode() {
        this.popupClickReport({ popupName: "兑换码弹窗", elementShowTxt: "点击复制" });
        wx.setClipboardData({
            data: this.data.code,
            success: () => {
                wx.showToast({
                    title: "兑换码已复制!",
                    duration: 3000,
                });
            },
        });
    },
    openPackageDialog() {
        if (!this.checkLoginStatus()) {
            return;
        }
        if (!this.data.code) {
            wx.showModal({
                content: "您还没有领取过券包~",
                showCancel: false,
            });
            return;
        }
        this.commonClickReport("我的券包");
        this.popupShowReport("我的券包弹窗");
        this.setData({
            isShowPackageDialog: true,
        });
    },
    closePackageDialog() {
        this.setData({
            isShowPackageDialog: false,
        });
    },
};

const ConnectPage = connect(({ userInfo }) => {
    return {
        userInfo,
    };
})(page);

Page(ConnectPage);
