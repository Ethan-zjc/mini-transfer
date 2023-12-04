/**
 * 书架页运营位
 * 代金券 view_type=1，banner_type永远是0（在kkb页面，不在此组件）
 * 金券之外的，view_type=2，banner_type=0表示常规banner、banner_type=1表示彩蛋卡、banner_type=2 表示多
 * 充多送
 * **/

import { getAwardApi } from "../../api.js";
import { util_action, util_showToast } from "../../../../../util.js";

const app = getApp();
const global = app.globalData;

Component({
    properties: {
        couponInfo: {
            type: Object,
            value: {},
        },
        activity: {
            type: Object,
            value: {},
        },
        bottomTxt: {
            type: String,
            value: "",
        },
    },
    data: {
        showDetail: false,
    },
    methods: {
        actDetail() {
            if (!global.userId) {
                wx.navigateTo({
                    url: "/pages/login/login",
                });
                return;
            }
            this.kksaReport(3, -1);
            this.setData({
                showDetail: true,
            });
        },
        closeCallback() {
            this.setData({
                showDetail: false,
            });
        },
        getAwardSuccess() {
            this.triggerEvent("refreshKkbPage");
        },

        // banner跳转
        bannerTap(e) {
            const { action_target = {}, contentId = "" } = this.data.couponInfo || {};
            if (!action_target.action_type) {
                return;
            }
            const { action_type: type, target_id: id, parent_target_id: parentid } = action_target;
            const url = action_target.target_web_url || action_target.hybrid_url || "";

            // 点击埋点
            app.kksaTrack("RechargePageClk", {
                ClkItemType: "常规banner",
                ModuleName: "充值中心运营位",
                ContentID: contentId,
            });
            util_action({ type, id, parentid, url });
        },

        // 跳转整本限免
        actionAward(e) {
            // 根据状态判断是否可跳转
            const { url, index } = e.currentTarget.dataset;
            if (!url) {
                return;
            }

            // 跳转到自选限免页面
            this.kksaReport(2, index);
            util_action({ type: 2003, url });
        },

        // 按钮相关触发
        awardBtn(e) {
            const { index } = e.currentTarget.dataset;
            const item = this.data.activity.accum_level_list[index];
            const levelId = item.accum_level_id;

            // 领取奖励
            const data = {
                topic_id: "",
                activity_id: this.data.activity.activity_id,
                accum_level_id: levelId,
            };
            this.kksaReport(1, index);

            // 根据状态区分
            if (item.level_award_url && item.assign_status == 3) {
                // 跳转
                util_action({ type: 2003, url: item.level_award_url });
            } else if (item.level_award_url && (item.assign_status == 1 || item.assign_status == 6)) {
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
        },
        getAwardFun(data) {
            return new Promise((resolve) => {
                getAwardApi(data)
                    .then((res) => {
                        const { toast = "" } = res.data;
                        if (toast) {
                            util_showToast({ title: toast, duration: 2000 });
                        }
                        this.triggerEvent("refreshKkbPage");
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

        // 多充多送点击埋点
        kksaReport(behavior, index) {
            const { activity_id, accum_level_list } = this.data.activity;
            const btnNames = {
                1: "领取",
                2: "展开",
                3: "活动详情",
            };
            const data = {
                ContentID: activity_id,
                ClkItemType: "多充多送",
                ModuleName: "充值中心运营位",
                ButtonName: btnNames[behavior],
            };
            if (index >= 0) {
                data.GearName = `多充多送_${activity_id}_${accum_level_list[index].level_value}`;
            }
            console.log("埋点要上报的内容", behavior, data);
            app.kksaTrack("RechargePageClk", data);
        },
    },
});
