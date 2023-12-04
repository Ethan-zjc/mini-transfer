import { util_showToast, util_requestSubscribeMessage, util_sendNotifyApi } from "../../../util.js";

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

// 默认本地数据, 根据url参数type取值
const typeMap = {
    // 三周年，type=1
    1: {
        bg_color: true,
        track_name: "三周年",
        img_url: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/subscribe/type_1_bg_f363a50.jpg",
        title: "周年活动提醒",
        tips_text: "开启提醒，惊喜福利不容错过！",
        cancel_text: "放弃通知",
        confirm_text: "当然同意",
        ids: "-LZynjbtPPOTmAYB48NrR6x3bbLU9yH_-uXE_qBHHAc,m65ZpnxkKtmqTZ-kW38VcPOAMwt3lKd-geWV78zsoxs",
    },
    // 红包雨活动，type=2
    2: {
        track_name: "红包雨",
        img_url: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/subscribe/type_2_1_29f24cb.png",
        title: "是否开启活动提醒",
        tips_text: "专属提醒，不错过",
        tips_hot: "红包福利",
        cancel_text: "我再想想",
        confirm_text: "开启订阅",
        ids: "vDRcaMhhVIV41Fgd28SWpOi-L0TPD5MvDgIa4RaHDZs",
    },
};

const page = {
    data: {
        top: 42, // 返回按钮距离头部的位置
        height: 0, // 胶囊的高度
        type: 0, // 数据类型，type=1 || type=2
        isClick: true, // 是否可以点击同意按钮
        isBgColor: true, // 是否显示黑色半透明背景
        trackName: "活动", // 埋点名称
        images: {
            tabBtn: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay-fission/tab-btn_fbc3114.png",
            close: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/greenhands/close_63b4e3f.png",
            bg: false,
        },
        tmplIds: [], // 订阅消息-模板id
        popup: null, // {title:'弹窗标题', tips_text:'弹窗提示文案', cancel_text:'取消按钮文案', confirm_text:'确认按钮文案'}
    },
    onLoad(options) {
        let {
            type = 0, // url中的传递的 type 类型
            ids = "", // url中的传递的 订阅消息模板id
            img_url = false, // url中的传递的 页面的背景图
            title = "是否开启消息提示", // 弹窗标题
            tips_text = "专属提醒，不错过任何福利", // 弹窗提示文案
            tips_hot = "",
            cancel_text = "放弃通知", // 取消按钮文案
            confirm_text = "开启通知", // 确认按钮文案
        } = options;

        let tmplIds = [];
        let images = this.data.images;
        let isBgColor = true;
        let trackName = "活动";
        const typeNumber = Number(type);
        const typeData = typeMap[typeNumber];

        if (typeData) {
            images.bg = typeData.img_url || "";
            tmplIds = typeData.ids.split(",");
            title = typeData.title;
            tips_text = typeData.tips_text;
            tips_hot = typeData.tips_hot || "";
            cancel_text = typeData.cancel_text;
            confirm_text = typeData.confirm_text;
            isBgColor = !!typeData.bg_color;
            trackName = typeData.track_name || "活动";
        }

        // url中的传递的
        if (ids) {
            ids = decodeURIComponent(ids);
            tmplIds = ids.split(",");
        }
        if (img_url) {
            images.bg = decodeURIComponent(img_url);
        }

        if (tmplIds.length < 1) {
            util_showToast({
                title: "缺少必要参数!",
                duration: 5000,
            });
        }

        let popup = {
            title: decodeURIComponent(title),
            tips_text: decodeURIComponent(tips_text),
            tips_hot: decodeURIComponent(tips_hot),
            cancel_text: decodeURIComponent(cancel_text),
            confirm_text: decodeURIComponent(confirm_text),
        };
        this.getMenuTop();
        this.setData(
            {
                type,
                images,
                tmplIds,
                popup,
                isBgColor,
                trackName,
            },
            () => {
                this.triggerTrack("PopupShow");
            }
        );
    },
    // 获取胶囊信息
    getMenuTop() {
        if (!wx.getMenuButtonBoundingClientRect) {
            return;
        }
        const menuButton = wx.getMenuButtonBoundingClientRect();
        this.setData({
            height: menuButton.height,
            top: menuButton.top + 1,
        });
    },
    topNavigateBack() {
        let pages = getCurrentPages();
        global.activityTrackId = ""; // 清空活动标识(当前队伍)
        if (pages.length <= 1) {
            wx.reLaunch({
                url: "/pages/find/find",
            });
        } else {
            wx.navigateBack({ delta: 1 });
        }
    },
    tapClose() {
        const { popup = {} } = this.data;
        this.topNavigateBack();
        this.triggerTrack("PopupClk", {
            ElementShowTxt: popup.cancel_text,
        });
    },
    tapConfirm() {
        const { tmplIds, popup } = this.data;

        // 防止重复点击
        if (!this.data.isClick) {
            return false;
        }

        if (!tmplIds) {
            util_showToast({
                title: "订阅消息模板异常~",
                duration: 3000,
            });
            return false;
        }
        this.data.isClick = false;

        util_requestSubscribeMessage({ tmplIds })
            .then((res) => {
                this.data.isClick = true;
                const ids = tmplIds.filter((id) => {
                    return res[id] && res[id] === "accept";
                });
                if (ids.length) {
                    util_sendNotifyApi({ ids })
                        .then(() => {
                            this.topNavigateBack();
                        })
                        .catch(() => {
                            this.topNavigateBack();
                        });
                } else {
                    this.subscribeError();
                }
            })
            .catch(() => {
                this.data.isClick = true;
                this.subscribeError();
            });

        this.triggerTrack("PopupClk", {
            ElementShowTxt: popup.confirm_text,
        });
    },
    subscribeError() {
        util_showToast({
            title: "订阅失败",
            duration: 3000,
        });
    },
    triggerTrack(event, value = {}) {
        const { trackName } = this.data;
        const options = {
            ElementType: `${trackName}订阅按钮`,
            popupName: `${trackName}订阅弹窗`,
            CurPage: "活动媒介页",
        };
        Object.assign(options, value);
        app.kksaTrack(event, options);
    },
};

const ConnectPage = connect(
    ({ userInfo, vipInfo }) => {
        return {
            userInfo,
            vipInfo,
        };
    },
    (setState, _state) => ({
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
