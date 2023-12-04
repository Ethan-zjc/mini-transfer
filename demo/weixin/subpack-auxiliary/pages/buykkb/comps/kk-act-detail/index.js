/**
 * 开屏新手福利浮窗 20211025 新增
 * **/
const app = getApp();
const global = app.globalData;

import { getActDetail } from "./api.js";
import { getAwardApi } from "../../api.js";
import { util_action, util_showToast } from "../../../../../util.js";

const btnStatus = {
    0: "unclaimed",
    1: "getaward",
    2: "already",
    3: "getaward",
    5: "unclaimed",
    6: "getaward",
};
Component({
    properties: {},
    data: {
        isShow: false, // 接口返回的是否显示悬浮框
        activity: {},
        btnStatus,
    },
    attached() {
        this.initData();
    },
    methods: {
        initData() {
            getActDetail()
                .then((res) => {
                    res = res || {};
                    const { data } = res;
                    this.setData(
                        {
                            isShow: true,
                            activity: data,
                            activityDesc: data.activity_desc.replace("活动说明：<br/>", ""),
                        },
                        () => {
                            this.setData({
                                showTrans: true,
                            });
                        }
                    );

                    this.kksaReport(0);
                })
                .catch(() => {
                    this.setStatus();
                });
        },
        containTap() {
            return;
        },
        maskclose() {
            this.setData({
                isShow: false,
            });
            this.triggerEvent("closeCallback");
        },

        // 埋点内容
        kksaReport(behavior) {
            const data = {
                CurPage: "RechargeCenter",
                popupName: "多充多送查看奖励弹窗",
            };
            if (behavior) {
                const btnNames = {
                    1: "我的奖励",
                    2: "去领取",
                    3: "联合会员领取中心",
                    4: "展开详情",
                };
                data.ButtonName = btnNames[behavior];
            }
            console.log("埋点要上报的内容", behavior, data);
            app.kksaTrack(behavior ? "PopupClk" : "CommonPopup", data);
        },

        // 设置弹窗结束状态
        setStatus() {
            this.triggerEvent("closeCallback");
        },

        // 我的奖励
        myAward() {
            this.kksaReport(1);
            const url = `https://${global.onRelease ? "h5.kuaikanmanhua.com" : "mini.kkmh.com"}/native/pay_myAward`;
            util_action({ type: 2003, url });
        },

        // 跳转整本限免
        actionAward(e) {
            const { url } = e.currentTarget.dataset;
            if (!url) {
                return;
            }
            this.kksaReport(4);

            // 跳转到自选限免页面
            util_action({ type: 2003, url });
        },

        // 按钮领取
        awardBtn(e) {
            const { status, index } = e.currentTarget.dataset;
            if (status == 1 || status == 3 || status == 6) {
                // 领取奖励
                const item = this.data.activity.accum_level_list[index];
                const data = {
                    topic_id: "",
                    activity_id: item.activity_id,
                    accum_level_id: item.accum_level_id,
                };
                this.kksaReport(2);

                // 根据状态区分
                if (item.level_award_url && status == 3) {
                    // 跳转
                    util_action({ type: 2003, url: item.level_award_url });
                } else if (item.level_award_url && (status == 1 || status == 6)) {
                    // 领取kkb然后跳转
                    this.getAwardFun(data).then(() => {
                        const timer = setTimeout(() => {
                            clearTimeout(timer);
                            util_action({ type: 2003, url: item.level_award_url });
                        }, 600);
                    });
                } else {
                    this.getAwardFun(data);
                }
            }
        },
        getAwardFun(data) {
            return new Promise((resolve) => {
                getAwardApi(data)
                    .then((res) => {
                        console.log("领取成功,刷新页面");
                        const { toast = "" } = res.data;
                        if (toast) {
                            util_showToast({ title: toast, duration: 2000 });
                        }

                        // 刷新弹窗，刷新kkb页面
                        getActDetail().then((res) => {
                            res = res || {};
                            const { data } = res;
                            this.setData({
                                activity: data,
                            });
                        });

                        this.triggerEvent("getAwardSuccess");
                        resolve();
                    })
                    .catch((error) => {
                        if (error.message) {
                            util_showToast({
                                title: error.message,
                                duration: 2000,
                            });
                        }
                    });
            });
        },

        // 跳转联合会员中心
        uniteCenter() {
            this.kksaReport(3);
            const { link_vip_url } = this.data.activity;
            util_action({ type: 2003, url: link_vip_url });
        },
    },
});
