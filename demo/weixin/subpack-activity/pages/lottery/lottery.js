const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

const { lotteryImgs } = require("../../../cdn.js");

import { util_prevPage, util_formatTime, util_transNum, util_action, util_showToast, util_feSuffix } from "../../../util.js";

import { getHomePage, getAwardList, postAddBalance, postAssign, getSignInfo } from "./api.js";

const page = {
    data: {
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
        luckyTitle: "", // 扭蛋机标题
        luckyList: [], // 扭蛋机图片，固定为7张
        dialogInfo: {}, // 获奖弹窗
        dialogRecord: { show: false, list: [] }, //中奖记录
        dialogRuleVisible: false, // 活动规则
        dialogRuleUrl: "", // 规则图片
        balance: 0, // 剩余抽奖次数
        tasksList: [], // 任务列表
        isiOS: global.isiOS,
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
            this.getMainInfo();
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

        this.data.origin = origin;
        this.setData({
            activity_name,
            isiOS: global.isiOS,
        });
        this.getMainInfo(() => {
            wx.setNavigationBarTitle({ title: this.data.title });
            this.openTrack();
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
                    const { theme_pic: bannerUrl = "", rule: dialogRuleUrl = "" } = image_info;

                    const luckyList = this.formatLucky(awards);

                    const { gashapon_title: luckyTitle = "扭蛋机标题", page_title: title = "扭蛋机活动" } = words_info;

                    this.setData(
                        {
                            title,
                            luckyTitle,
                            luckyList,
                            bannerUrl,
                            balance,
                            loading: false,
                            isLogin: !!global.userId,
                            dialogRuleUrl,
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
                    let {
                        target_url, // 跳转的webapp的url地址
                        new_target_url, // 跳转的webapp的url地址
                    } = data;
                    let url = new_target_url || target_url || ""; // 签到领取阅读币url地址
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
        const tasksList = value.map((item) => {
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
        for (let i = 0; i < 7; i++) {
            const index = i % len;
            const item = list[index] || {};
            ary.push(item.award_icon);
        }
        return ary;
    },
    // 领取奖品接口提示
    checkAwardTips(value) {
        const title = value ? "领取成功" : "活动火爆，很遗憾奖品发送失败";
        util_showToast({ title });
    },
    // 封装领奖接口
    checkAssign(name) {
        return new Promise((resolve, reject) => {
            postAssign({
                activity_name: this.data.activity_name,
                award_name: name,
            })
                .then((res) => {
                    const { code } = res;
                    if (code == 200) {
                        resolve();
                    } else {
                        reject();
                    }
                })
                .catch(() => {
                    reject();
                });
        });
    },
    // 点击分享按钮
    tapTaskShare(event) {
        const { track } = event.currentTarget.dataset || {};
        if (this.data.isLogin) {
            postAddBalance({
                activity_name: this.data.activity_name,
            });
            this.clkTrack({
                ElementType: "task",
                ElementShowTxt: track,
            });
        }
    },
    tapTaskButton(event) {
        const { type, status, action, track } = event.currentTarget.dataset || {};
        if (action && status != 1) {
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action || {};
            if ((type == 2003) & !url) {
                util_showToast({ title: "服务异常，稍后重试" });
                return false;
            }
            util_action({ type, url, id, parentid });
            this.clkTrack({
                ElementType: "task",
                ElementShowTxt: track,
            });
        }
    },
    handleLuckyStart() {
        this.clkTrack({
            ElementType: "twist",
        });
    },
    handleLuckyEnd(event) {
        const { checked, options } = event.detail || {};
        this.setData(
            {
                dialogInfo: {
                    title: checked ? "恭喜获得" : "很遗憾未中奖",
                    subtitle: options.award_title,
                    icon: options.award_assigned_icon,
                    name: checked ? options.award_name : "",
                    button: checked ? "开心收下" : "再来一次",
                    checked,
                    show: true,
                },
            },
            () => {
                this.getMainInfo();
            }
        );
        this.popupTrack({
            popupName: checked ? "winners" : "nothing",
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
                        return item;
                    });
                }
                this.dialogRecordShow(recordList);
            })
            .catch(() => {
                this.dialogRecordShow();
            });
        this.clkTrack({
            ElementType: "record",
        });
    },
    // 中奖记录弹窗按钮
    tapRecordBtn(e) {
        const { action = {} } = e.currentTarget.dataset || {};
        const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action || {};
        util_action({ type, url, id, parentid });
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
    dialogClose() {
        this.setData({
            dialogInfo: {
                show: false,
            },
        });
    },
    tapLuckyRule() {
        this.setData({
            dialogRuleVisible: true,
        });
    },
    dialogRuleClose() {
        this.setData({
            dialogRuleVisible: false,
        });
    },
    originLogin(event) {
        const { name = "" } = event.currentTarget.dataset || {};
        app.originLogin({})
            .then(() => {
                this.dialogClose();
                this.pageInit(this.data.query);
                if (name) {
                    this.checkAssign(name)
                        .then(() => {
                            this.checkAwardTips(1);
                        })
                        .catch(() => {
                            this.checkAwardTips();
                        });
                }
            })
            .catch();
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
    openTrack() {
        const { title = "扭蛋机活动", origin } = this.data;
        app.kksaTrack("CommonPageOpen", {
            CurPage: title,
            TabModuleType: origin,
        });
    },
    popupTrack(value) {
        const options = {
            CurPage: this.data.title,
            TabModuleType: this.data.origin,
        };
        if (value) {
            Object.assign(options, value);
        }
        app.kksaTrack("CommonPopup", options);
    },
    clkTrack(value) {
        const options = {
            TabModuleType: this.data.origin,
            CurPage: this.data.title,
            ElementType: "",
            ElementShowTxt: "",
        };
        if (value) {
            Object.assign(options, value);
        }
        app.kksaTrack("CommonItemClk", options);
    },
};

const ConnectPage = connect(({ userInfo }) => {
    return {
        userInfo,
    };
})(page);

Page(ConnectPage);
