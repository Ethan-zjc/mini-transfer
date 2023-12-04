/**
 * 开屏新手福利浮窗 20211025 新增
 * **/
const app = getApp();
const global = app.globalData;

import { getNewWelfareApi } from "./api.js";

Component({
    properties: {},
    data: {
        isShow: false, // 接口返回的是否显示悬浮框
        popInfo: {},
    },
    pageLifetimes: {
        show() {
            if (global.userId && this.data.isShow) {
                this.setData({
                    isShow: false,
                });
                this.setStatus();
            }
        },
    },
    attached() {
        if (global.isExpNewUser) {
            getNewWelfareApi()
                .then((res) => {
                    res = res || {};
                    let { pop_title, pop_sub_title, pop_banner } = res.data;
                    global.isExpNewUser = false;
                    this.setData(
                        {
                            isShow: true,
                            popInfo: {
                                title: pop_title,
                                subtitle: pop_sub_title,
                                popImg: pop_banner,
                            },
                        },
                        () => {
                            this.setData({
                                showTrans: true,
                            });
                        }
                    );
                    this.welfareCount("set");
                    this.kksaReport(0);
                })
                .catch(() => {
                    this.setStatus();
                });
        } else {
            this.setStatus();
        }
    },
    methods: {
        containTap() {
            return;
        },
        welfareCount(type = "get") {
            let num = wx.getStorageSync("newWelfareCount") || 0;
            if (type == "get") {
                return String(num);
            } else {
                num++;
                wx.setStorage({
                    key: "newWelfareCount",
                    data: num,
                });
            }
        },
        getWelfare() {
            this.kksaReport(1);
            if (!global.userId) {
                app.originLogin({}, false).then((res) => {
                    this.setData({
                        isShow: false,
                    });
                    this.triggerEvent("welfareEventBack");
                    this.loginTrack();
                });
            }
        },
        abandon() {
            this.kksaReport(2);
            this.setData({
                isShow: false,
            });
            this.setStatus();
        },

        // 埋点内容
        kksaReport(behavior) {
            const data = {
                CurPage: "FindPage",
                popupName: "新手福利弹窗",
            };
            if (behavior) {
                data.ElementType = "弹窗按钮";
                data.ElementShowTxt = behavior == 2 ? "关闭" : "领取";
            } else {
                const count = this.welfareCount();
                data.PUWID = count == "0" ? "1" : count;
            }
            // console.log("埋点要上报的内容",behavior, data)
            app.kksaTrack(behavior ? "PopupClk" : "PopupShow", data);
        },
        // 设置弹窗结束状态
        setStatus() {
            this.triggerEvent("welfareFinish");
        },
        // 登录埋点
        loginTrack() {
            const options = {
                IsLogSuccess: true,
                LoginType: "静默登录",
                AuthorizedLoginType: "新用户全场畅读弹窗",
                CurPage: "FindPage",
            };
            app.kksaTrack("LoginProgram", options);
        },
    },
});
