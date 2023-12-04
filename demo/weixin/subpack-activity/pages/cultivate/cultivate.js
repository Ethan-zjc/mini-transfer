const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const { cultivateImgs } = require("../../../cdn.js");

const page = {
    data: {
        activityName: "",
        activityId: "",
        cultivateImgs,
    },
    onLoad(options) {
        const { activity_name } = options;

        this.setData({
            activityName: activity_name,
        });

        app.kksaTrack("CommonPageOpen", {
            CurPage: "KK星球养成活动首页",
            ActivityName: activity_name,
        });
    },
    onShow() {},

    taskDone(e) {
        const task = e.detail;
        this.selectComponent("#homeModule").init();
        if (task.award_grant_type === 2 || (task.award_grant_type === 1 && task.task_status === 2)) {
            this.selectComponent("#homeModule").showTaskText({
                text: `${task.task_title}成功 ${task.award_title}燃料`,
            });
        }
    },

    inited(e) {
        this.setData({
            activityId: e.detail.currentTaskId,
        });
    },
};

const ConnectPage = connect(({ userInfo }) => {
    return {
        userInfo,
    };
})(page);

Page(ConnectPage);
