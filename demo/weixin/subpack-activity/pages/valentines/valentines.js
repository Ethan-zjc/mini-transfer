const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

const { lotteryImgs, valentImgs } = require("../../../cdn.js");

import { util_prevPage, util_formatTime, util_showToast } from "../../../util.js";

import { getHomePage, getAwardList, getSignInfo } from "./api.js";

const page = {
    data: {
        valentImgs,
        lotteryImgs,
        title: "",
        dialog: {},
        isFirstLoad: true, // 是否冷启动
        isLogin: !!global.userId, // 是否登录
        loading: true, // 首次加载
        pageLoading: false, // 页面加载状态
        query: {}, // 地址传参
        activity_name: "", // 活动id
        origin: 1, // 来源
        bannerUrl: "", // 头图地址
        luckyTitle: "",
        luckyList: [], // 七夕图片，
        dialogRecord: { show: false, list: [] }, //中奖记录
        ruleUrl: "", // 规则图片
        balance: 0, // 剩余抽奖次数
        tasksList: [], // 任务列表
        isShowTask: false, // 是否展示任务列表
        tokeCount: 10, // 点击总次数
        tokeTime: 10, //活动约定时间，秒数
        currentIndex: 0, //活动进度
    },
    async onLoad(options) {
        const { name } = util_prevPage();
        if (!name) {
            await app.getOpenId();
        }
        this.pageInit(options);
        this.data.query = options;
    },
    onShow() {
        if (!this.data.isFirstLoad) {
            this.getMainInfo(() => {
                this.pageComplete();
            });
        }
    },
    onHide() {
        this.data.isFirstLoad = false;
    },
    onPullDownRefresh() {
        this.getMainInfo(() => {
            let time = setTimeout(() => {
                clearTimeout(time);
                wx.stopPullDownRefresh();
            }, 200);
        });
    },

    // 初始化
    async pageInit(options = {}) {
        const { activity_name = "", origin = "" } = options;
        this.setData({
            activity_name,
            origin,
        });
        this.getMainInfo(() => {
            this.pageComplete();
        });
    },
    pageComplete() {
        wx.setNavigationBarTitle({
            title: this.data.title,
        });
        this.checkTask();
        this.commonTrack("CommonPageOpen", {
            IsLoginStatus: this.data.isLogin,
        });
    },
    // 主接口请求
    getMainInfo(callback) {
        const { activity_name, pageLoading } = this.data;

        if (pageLoading) {
            callback && callback();
            return false;
        }

        this.data.pageLoading = true;

        getHomePage({
            activity_name,
        })
            .then((res) => {
                const { code, data = {} } = res;
                if (code == 200) {
                    const { lottery_balance: balance = 0, awards = [], image_info = {}, words_info = {}, target_info = {}, tasks = [] } = data;
                    const { theme_pic: bannerUrl = "", rule: ruleUrl = "" } = image_info;

                    const luckyList = this.formatLucky(awards);
                    const { page_title: title = "雪糕活动", lottery_pool_title: luckyTitle = "", game_click_count: tokeCount = "50", game_time: tokeTime = "20" } = words_info;

                    this.setData(
                        {
                            title,
                            luckyTitle,
                            luckyList,
                            bannerUrl,
                            balance,
                            loading: false,
                            isLogin: !!global.userId,
                            ruleUrl,
                            tokeTime: parseInt(tokeTime),
                            tokeCount: parseInt(tokeCount),
                        },
                        () => {
                            this.formatTask(tasks, words_info, target_info);
                        }
                    );
                }
                this.data.isFirstLoad = false;
                this.data.pageLoading = false;
                callback && callback();
            })
            .catch(() => {
                this.data.isFirstLoad = false;
                this.data.pageLoading = false;
                callback && callback();
            });
    },
    // 获取签到领取阅读币的h5Url地址
    getSignUrl() {
        return new Promise((resolve) => {
            getSignInfo()
                .then((res) => {
                    let { data = {} } = res;
                    let { target_url, new_target_url } = data;
                    let url = new_target_url || target_url || "";
                    resolve(url);
                })
                .catch(() => {
                    resolve("");
                });
        });
    },
    // 设置任务数据
    async formatTask(value, info, action) {
        let isCheck = value.some((item) => item.task_type == 1);
        let checkUrl = "";
        if (isCheck) {
            checkUrl = await this.getSignUrl();
        }
        const tasksList = value
            .filter((item) => {
                const type = item.task_type || 1;
                return global.isiOS ? ![4].includes(type) : true;
            })
            .map((item) => {
                const type = item.task_type || 1;
                item.title = info[`task_main_title_${type}`] || "";
                item.subtitle = info[`task_sub_title_${type}`] || "";
                item.track = item.title;
                item.button_name = info[`task_btn_title_${type}`] || "";
                item.action = action[`task_action_${type}`] || {};
                if (isCheck && type == 1) {
                    item.action = {
                        type: 2003,
                        target_web_url: checkUrl,
                    };
                }
                return item;
            });
        this.setData({
            tasksList,
        });
    },
    // 设置扭蛋数据
    formatLucky(value) {
        const list = value.filter((item) => item.award_type != 10000);
        const len = list.length;
        let ary = [];
        for (let i = 0; i < 4; i++) {
            const index = i % len;
            const item = list[index] || {};
            ary.push(item);
        }
        return ary;
    },
    reloadData() {
        this.getMainInfo(() => {
            this.checkTask();
        });
    },
    handleLuckyMove(event) {
        const { currentIndex } = event.detail || {};
        this.setData({
            currentIndex,
        });
    },
    // 点击中奖记录按钮
    tapLuckyRecord() {
        const { activity_name } = this.data;
        getAwardList({
            activity_name,
        })
            .then((res) => {
                const { code, data = {} } = res;
                let recordList = [];
                if (code == 200) {
                    const list = data.list || [];
                    recordList = list.map((item) => {
                        item.formatTime = util_formatTime(item.award_time, "yyyy-MM-dd hh:mm:ss");
                        const info = item.target_info || {};
                        const link = info.award_link || {};
                        if (link.type) {
                            if (link.type == 1 || link.type == 18) {
                                link.type = 2003;
                            }
                            if (link.type != 13) {
                                item.action = Object.assign({}, link);
                            }
                        } else {
                            if (item.award_type == 5 || item.award_type == 31) {
                                item.action = {
                                    type: 21,
                                };
                            } else if (item.award_type == 1) {
                                item.action = {
                                    type: 44,
                                };
                            } else if (item.award_type == 18) {
                                item.action = {
                                    type: 43,
                                };
                            }
                        }
                        return item;
                    });
                }
                this.dialogRecordShow(recordList);
            })
            .catch(() => {
                this.dialogRecordShow();
            });
        this.commonTrack("CommonItemClk", {
            ElementType: "中奖记录查看按钮",
        });
    },
    // 中奖记录显示
    dialogRecordShow(list = []) {
        this.setData({
            dialogRecord: {
                list,
                show: true,
            },
        });
    },
    // 中奖记录关闭
    dialogRecordClose() {
        this.setData({
            dialogRecord: {
                show: false,
            },
        });
    },
    // 校验任务列表是否展示
    checkTask() {
        const storageName = "valentines:task";
        const time = new Date().getTime();
        const storage = wx.getStorageSync(storageName);
        if (storage) {
            if (parseInt(storage) < time) {
                this.setData({
                    isShowTask: true,
                });
            } else {
                this.setData({
                    isShowTask: false,
                });
                wx.setStorageSync(storageName, time);
            }
        } else {
            this.setData({
                isShowTask: false,
            });
            wx.setStorageSync(storageName, time);
        }
    },
    // 跳转至任务区
    toTask() {
        wx.pageScrollTo({
            selector: "#valentines-task",
            offsetTop: -20,
            duration: 0,
        });
    },
    originLogin(e) {
        app.originLogin({})
            .then(() => {
                this.pageInit(this.data.query);
                util_showToast({ title: "登录成功" });
            })
            .catch();
    },
    commonTrack(evnet, value = {}) {
        const { title = "雪糕活动", origin = "" } = this.data;
        app.kksaTrack(evnet, {
            CurPage: title,
            TabModuleType: origin,
            ...value,
        });
    },
    // 静默登录相关
    showDialog() {
        this.setData({
            dialog: {
                show: true,
                title: "登录成功",
                content: "授权手机号登录，可以同步其他平台的漫画阅读历史",
                button: [{ text: "拒绝" }],
            },
        });
    },
    hideDialog() {
        this.setData({
            dialog: {
                show: false,
            },
        });
    },
    onDialogButtontapEvent(e) {
        app.onDialogButtontapEvent(e);
    },
    onDiallogGetPhoneNumberEvent(e) {
        app.onDiallogGetPhoneNumberEvent(e);
    },
};

const ConnectPage = connect(({ userInfo }) => {
    return {
        userInfo,
    };
})(page);

Page(ConnectPage);
