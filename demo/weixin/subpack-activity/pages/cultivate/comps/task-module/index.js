import { getTaskList } from "../../api";
import { util_showToast, util_initTask, util_doTask } from "../../../../../util.js";
const { cultivateImgs } = require("../../../../../cdn.js");

const app = getApp();
const TASKTYPES = {
    1: "阅读时长",
    2: "发送弹幕",
    3: "签到",
    4: "打卡",
    5: "分享",
    6: "看广告",
    7: "消费kkb",
    8: "添加桌面",
    9: "关注专题",
    10: "充值月度会员",
    11: "充值季度会员",
    12: "充值年度会员",
};

const TASK_BUTTON = {
    1: "去阅读",
    2: "发弹幕",
    3: "去签到",
    4: "去打卡",
    5: "去分享",
    6: "看广告",
    7: "去消费",
    8: "去添加",
    9: "去关注",
    10: "去充值",
    11: "去充值",
    12: "去充值",
};

Component({
    properties: {
        activityId: {
            type: String,
            default: "",
        },
        activityName: {
            type: String,
            default: "",
        },
        userInfo: {
            type: Object,
            default: null,
        },
    },

    data: {
        cultivateImgs,
        taskList: [],
    },

    // 监听数据变化
    observers: {
        activityId() {
            this.init();
        },
    },

    lifetimes: {
        attached() {
            util_initTask([
                {
                    taskType: 5,
                    config: {
                        shareTitle: "参与星球作战，赢漫画周边大奖",
                    },
                },
                {
                    taskType: 6,
                    config: {
                        adUnitId: "adunit-d0b61b5dd8e17979",
                    },
                },
            ]);
        },
    },

    methods: {
        init() {
            if (!this.data.activityId) return false;
            getTaskList({ activity_id: this.data.activityId })
                .then((res) => {
                    const { data } = res;
                    const taskList = data.task_list.map((item) => {
                        let buttonName = "";
                        let buttonType = 0; // 1: 可点击 ；0: 不可点击
                        switch (item.task_status) {
                            case 1:
                                // 未完成
                                buttonName = TASK_BUTTON[item.task_type];
                                buttonType = 1;
                                break;
                            case 2:
                                // 已完成 未领取
                                if (item.award_grant_type === 1) {
                                    buttonName = "待领取";
                                    buttonType = 1;
                                } else if (item.award_grant_type === 2) {
                                    buttonName = "已领取";
                                    buttonType = 0;
                                }
                                break;
                            case 3:
                                // 已领取
                                buttonName = "已领取";
                                buttonType = 0;
                                break;
                            default:
                                break;
                        }

                        return {
                            ...item,
                            buttonName,
                            buttonType,
                        };
                    });
                    this.setData({
                        taskList,
                    });
                })
                .catch((err) => {
                    util_showToast({
                        title: err.message,
                    });
                });
        },

        doTask(e) {
            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }
            const { index } = e.currentTarget.dataset;
            const { taskList } = this.data;
            const task = taskList[index];

            this.kksa("CommonItemClk", {
                ElementType: "首页任务区任务按钮",
                ElementShowTxt: `首页任务区${TASKTYPES[task.task_type]}`,
            });

            Object.assign(task, {
                activity_id: this.data.activityId,
            });

            util_doTask(task, () => {
                this.triggerEvent("taskDone", task);
            });
        },

        kksa(name, properties) {
            app.kksaTrack(
                name,
                Object.assign(
                    {
                        CurPage: "KK星球养成活动首页",
                        ActivityName: this.data.activityName,
                    },
                    properties
                )
            );
        },
    },
});
