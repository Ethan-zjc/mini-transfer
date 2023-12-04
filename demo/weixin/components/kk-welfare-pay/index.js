/**
 * 新手福利引导弹窗
 * @param show  是否显示组件
 **/
import {
    requestPayInfo, // 查询数据
} from "./api.js";
import { util_action } from "../../util.js";

const app = getApp();

Component({
    properties: {
        show: {
            type: Boolean,
            value: false,
        },
        count: {
            type: [Number, String],
            value: 1,
        },
        topicId: {
            type: [String, Number],
            value: 0,
        },
        topicName: {
            type: String,
            value: "",
        },
        comicId: {
            type: [Number, String],
            value: 0,
        },
        comicName: {
            type: String,
            value: "",
        },
        triggerPage: {
            type: String,
            value: "ComicPage",
        },
    },
    data: {
        compShow: false, // 是否显示一键购买模块
        openId: "", // 与微信号绑定的唯一id
        userId: "", // 快看帐号唯一id
        isLogin: null, // 用户是否登录了
        payfrom: 0,
        isiOS: false, // iOS的判断
        iPhoneX: false, // iPhoneX的判断
        priceInfo: {}, // 接口返回商品信息
    },
    attached() {
        this.setSysAndUserInfo(() => {
            this.getCompData(); // 查询数据
        });
    },
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
                    if (callback && typeof callback == "function") {
                        callback();
                    }
                }
            );
        },
        getCompData() {
            const { topicId, comicId } = this.properties;
            requestPayInfo({
                topic_id: topicId, // 章节id
                comic_id: comicId, // 章节id
                from: this.data.payFrom,
            })
                .then((res) => {
                    const { code, data } = res;
                    if (code == 200) {
                        const listItem = data.batch_purchase_list[0]; // 付费档位信息
                        const priceInfo = listItem.price_info; // 价格信息
                        this.setCompData(priceInfo);
                    } else {
                        this.setCompData({
                            selling_kk_currency: 0,
                        });
                    }
                })
                .catch(() => {
                    this.setCompData({
                        selling_kk_currency: 0,
                    });
                });
        },
        setCompData(priceInfo) {
            this.setData({
                priceInfo,
                compShow: true,
            });
            this.triggerTrack("PayPopup");
        },
        // 静默登录
        originLogin() {
            if (this.data.isLogin) {
                return false;
            }
            this.triggerTrack("ClickPayPopup", {
                ButtonName: "领取1天免费福利",
                ButtonType: "登录",
            });
            app.originLogin({}, false)
                .then(() => {
                    const { comicId } = this.properties;
                    this.loginTrack({
                        code: 200,
                    });
                    wx.redirectTo({
                        url: `/pages/comic/comic?id=${comicId}&comicId=${comicId}`,
                    });
                })
                .catch(() => {
                    this.loginTrack({
                        code: 400,
                        message: "未知",
                    });
                });
        },
        clickRecharge() {
            let { topicId: topicid } = this.properties;
            util_action({
                type: 22,
                params: {
                    type: 2,
                    topicid,
                },
            });
            this.triggerTrack("ClickPayPopup", {
                ButtonName: "充值按钮",
                ButtonType: "充值",
            });
        },
        // 登录埋点
        loginTrack(value) {
            const { code, message = "" } = value;
            const options = {
                IsLogSuccess: code === 200,
                LoginType: "静默登录",
                LogFailError: message,
                AuthorizedLoginType: "付费章节福利弹窗授权登录",
                TriggerPage: this.data.triggerPage,
            };
            app.kksaTrack("LoginProgram", options);
        },
        triggerTrack(event, value) {
            const { topicName, comicId, comicName, topicId, triggerPage } = this.data;
            const options = {
                ActivityName: "新手三天福利",
                popupName: "付费章节新手福利弹窗",
                TriggerPage: triggerPage,
                TopicName: topicName,
                TopicID: topicId,
                ComicID: comicId,
                ComicName: comicName,
                uid: "",
            };
            if (value && typeof value == "object") {
                Object.assign(options, value);
            }
            app.kksaTrack(event, options);
        },
    },
});
