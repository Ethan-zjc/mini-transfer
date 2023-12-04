import { getHomePage, postUpgrade } from "../../api";
import { util_showToast } from "../../../../../util.js";
const app = getApp();
const global = app.globalData;
const { cultivateImgs } = require("../../../../../cdn.js");

Component({
    properties: {
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
        currentTaskId: 0, // 当前任务id
        currentLevel: 0, // 当前所处等级
        levelInfo: [], // 等级信息
        firstJoin: false, // 是否第一次参与
        leveScore: 0,
        levelConsumeScore: 0,
        scoreBalance: 0,
        status: 0,
        finishRequiredScore: 0,
        fissionText: "",

        isShowTaskText: false,
        taskText: "",

        showLoginSuccessPop: false, // 是否显示登录成功弹窗
        showTreasurePop: false, // 是否显示奖励弹窗
        showWelcomePop: false, // 是否显示欢迎弹窗

        currentAwardList: [], // 当前奖励列表
        treasureTextData: {}, // 宝藏文案数据
        loginAwardList: [], // 登录奖励列表数据
        loginAwardTitle: "", // 登录星球名称

        animation: null,
        animationData: null,
    },

    lifetimes: {
        attached() {
            const animation = wx.createAnimation();
            this.setData({ animation });
        },
    },

    pageLifetimes: {
        show() {
            this.init();
        },
    },

    methods: {
        init() {
            getHomePage({ activity_name: this.data.activityName })
                .then((res) => {
                    const { data } = res;

                    let {
                        current_level: currentLevel = 0,
                        end_at: endAt = 1669798260000,
                        finish_required_score: finishRequiredScore = 100,
                        first_join: firstJoin = false,
                        image_info: imageInfo = {},
                        leve_score: leveScore = 100, // 本级共需要燃料
                        level_consume_score: levelConsumeScore = 0,
                        score_balance: scoreBalance = 0, // score_balance
                        start_at: startAt = 1662022260000,
                        status = 0, // 0:未参加， 1：已参加，2：全部完成
                        target_info = {},
                        words_info = {},
                    } = data;

                    const levelInfo = (data.level_info || []).map((item, index) => {
                        return {
                            num: item.num || index,
                            title: item.title || "",
                            icon: item.icon || "",
                            rank: item.rank || 0,
                            firstAwardIndex: item.first_award_index || 0,
                            firstAwardStatus: item.first_award_status || 0,
                            firstAwards: item.first_awards.map((i) => ({ ...i, firstAwardIndex: item.first_award_index || 0 })) || [],
                            normalAwards: item.normal_awards || [],
                            userAwards: item.normal_awards || [],
                            getStatus: item.get_status || 0,
                            taskActivityId: item.task_activity_id || 0,

                            treasureButtonText: `${item.title || ""}宝藏>`,
                            type: "planet",
                        };
                    });

                    // 组装星球数据
                    levelInfo.splice(currentLevel, 0, {
                        icon: cultivateImgs["rocket"],
                        type: "rocket",
                    });
                    const currentTaskId = (levelInfo[currentLevel + 1] || {}).taskActivityId || 0;

                    // 是否弹出活动欢迎弹窗
                    if (!firstJoin) {
                        // cultivate
                        let haveShown = wx.getStorageSync("cultivate:haveShownWelcome");
                        if (!haveShown) {
                            wx.setStorageSync("cultivate:haveShownWelcome", true);
                            this.openWelcome();
                        }
                    }

                    if (!this.data.userInfo) {
                        this.showTaskText({
                            text: `登录成功后 +${words_info.part_in_score}燃料`,
                        });
                    } else if (this.data.taskText.includes("登录成功后")) {
                        this.hideTaskText();
                    }

                    this.setData({
                        currentTaskId,
                        currentLevel,
                        levelInfo,
                        firstJoin,
                        leveScore,
                        levelConsumeScore,
                        scoreBalance,
                        status,
                        finishRequiredScore,
                        fissionText: words_info.fission_text,
                    });

                    this.triggerEvent("inited", { currentTaskId });
                })
                .catch((err) => {
                    util_showToast({
                        title: err.message,
                    });
                });
        },

        showTaskText({ text = "", duration } = {}) {
            this.setData({
                taskText: text,
                isShowTaskText: true,
            });

            if (duration) {
                let time = setTimeout(() => {
                    clearTimeout(time);
                    this.hideTaskText();
                }, duration);
            }
        },

        hideTaskText() {
            this.setData({
                taskText: "",
                isShowTaskText: false,
            });
        },

        addEnergy() {
            this.kksa("CommonItemClk", {
                ElementType: "首页任务区加注燃料",
                ElementShowTxt: "首页任务区加注燃料",
            });

            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }

            if (!this.data.scoreBalance) return false;
            postUpgrade({ activity_name: this.data.activityName })
                .then((res) => {
                    console.log(res);
                    const { data } = res;

                    if (data.upgrade) {
                        const { currentLevel, levelInfo } = this.data;
                        const levelAwards = data.level_awards;
                        const upgradeLevel = data.current_level;
                        const loginAwardList = [];
                        const loginAwardTitle = levelAwards[levelAwards.length - 1].level_title;
                        levelAwards.forEach((item) => {
                            const levelData = levelInfo.find((i) => i.title === item.level_title);
                            if (item.first_award && item.rank < levelData.firstAwardIndex) {
                                loginAwardList.push(...levelData.firstAwards);
                            } else {
                                loginAwardList.push(...levelData.normalAwards);
                            }
                        });

                        if (loginAwardList.length) {
                            this.openLoginSuccess();
                            this.setData({
                                loginAwardList,
                                loginAwardTitle,
                            });
                        }
                    }

                    this.init();
                })
                .catch((err) => {
                    util_showToast({
                        title: err.message,
                    });
                });
        },

        onShare() {
            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }
            this.kksa("CommonItemClk", {
                ElementType: "首页任务区金刚位",
                ElementShowTxt: "首页任务区助力组队",
            });
            wx.navigateTo({
                url: `/subpack-activity/pages/invitation-task/invitation-task?activity_id=421810748189769810`,
            });
        },

        go() {
            this.start(4);
        },

        start(targetLevel) {
            const { currentLevel, animation, levelInfo } = this.data;
            if (targetLevel > levelInfo.length - 1) targetLevel = levelInfo.length - 1;

            const positions = [
                [
                    { top: 275, left: 260 },
                    { top: 190, left: 200 },
                ],
                [{ top: 105, left: 30 }],
                [{ top: 20, left: 230 }],
                [{ top: -90, left: 50 }],
            ];

            const steps = positions.slice(currentLevel, targetLevel).flat(2);

            steps.forEach((item) => {
                const { left, top } = item;
                animation.left(left).top(top).step();
            });

            this.setData({ animationData: animation.export() });
            setTimeout(() => {
                this.setData({
                    animationData: null,
                });
                this.init();
            }, steps.length * 400);
        },

        // 点击获取能量按钮
        clickPower() {
            this.kksa("CommonItemClk", {
                ElementType: "首页任务区任务按钮",
                ElementShowTxt: "首页任务区获取能量",
            });

            wx.pageScrollTo({
                scrollTop: 800, // 滚动到的位置（距离顶部 px）
                duration: 100, //滚动所需时间 如果不需要滚动过渡动画，设为0（ms）
            });
        },

        // 打开登录成功弹窗
        openLoginSuccess() {
            this.setData(
                {
                    showLoginSuccessPop: true,
                },
                () => {
                    this.kksa("CommonPopup", {
                        popupName: "登录星球成功获奖",
                    });
                }
            );
        },

        // 关闭登录成功弹窗
        closeLoginSuccess() {
            this.kksa("CommonItemClk", {
                ElementType: "首页弹窗按钮",
                ElementShowTxt: "首页获奖弹窗收下宝藏",
            });
            this.setData({
                showLoginSuccessPop: false,
            });
        },

        // 打开宝藏弹窗
        openTreasure(e) {
            const { index, tracktype } = e.currentTarget.dataset;
            const { currentLevel, levelInfo } = this.data;
            const levelData = levelInfo[index];
            if (levelData.type === "rocket") return false;

            const firstAwards = levelData.firstAwards || [];
            const normalAwards = levelData.normalAwards || [];
            const userAwards = levelData.userAwards;

            let currentAwardList = [];
            let treasureTextData = {};

            if (index > currentLevel) {
                // 未领取的奖励
                const firstAwardStatus = levelData.firstAwardStatus;
                currentAwardList = firstAwardStatus ? [...firstAwards, ...normalAwards] : normalAwards;
                treasureTextData = {
                    title: `${levelData.title}星球宝藏`,
                    desc: `登陆${levelData.title}后即可获得`,
                };
                if (levelData.firstAwardStatus) treasureTextData.desc = `前${levelData.firstAwardIndex}名登录星球将有超级大奖`;
            } else {
                // 已经领取的奖励
                const { firstAwardStatus, rank, firstAwardIndex } = levelData;
                if (firstAwardStatus && rank < firstAwardIndex) {
                    currentAwardList = firstAwards;
                } else {
                    currentAwardList = userAwards;
                }

                treasureTextData = {
                    title: `${levelData.title}星球宝藏`,
                    desc: `被您发掘的宝藏`,
                };
            }

            if (tracktype == 1) {
                this.kksa("CommonItemClk", {
                    ElementType: "首页飞行区星球",
                    ElementShowTxt: "首页飞行区星球",
                });
            } else if (tracktype == 2) {
                this.kksa("CommonItemClk", {
                    ElementType: "首页成长区提示",
                    ElementShowTxt: "首页成长区提示",
                });
            }

            this.setData(
                {
                    showTreasurePop: true,
                    treasureTextData,
                    currentAwardList,
                },
                () => {
                    this.kksa("CommonPopup", {
                        popupName: "查看宝藏",
                    });
                }
            );
        },

        // 关闭宝藏弹窗
        closeTreasure() {
            this.kksa("CommonItemClk", {
                ElementType: "首页弹窗按钮",
                ElementShowTxt: "首页宝藏弹窗继续启程",
            });
            this.setData({
                showTreasurePop: false,
            });
        },

        // 打开欢迎弹窗
        openWelcome() {
            this.setData(
                {
                    showWelcomePop: true,
                },
                () => {
                    this.kksa("CommonPopup", {
                        popupName: "首次赠送",
                    });
                }
            );
        },

        // 关闭欢迎弹窗
        closeWelcome() {
            this.kksa("CommonItemClk", {
                ElementType: "首页弹窗按钮",
                ElementShowTxt: "首页启程弹窗开启旅程",
            });

            if (!this.data.userInfo) wx.navigateTo({ url: "/pages/login/login" });

            this.setData({
                showWelcomePop: false,
            });
        },
        // 打开宝藏
        turnToTreasure() {
            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }
            this.kksa("CommonItemClk", {
                ElementType: "首页记录区",
                ElementShowTxt: "首页记录区我的宝藏",
            });
            const host = global.onRelease ? "https://h5.kuaikanmanhua.com" : "https://mini.kkmh.com";
            const url = `${host}/pro/202209/mini_cultivate/?type=2&activity_name=${this.data.activityName}`;
            wx.navigateTo({
                url: `/pages/webview/webview?url=${encodeURIComponent(url)}&type=protocol`,
            });
        },

        // 打开成长记录
        turnToRecord() {
            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }
            this.kksa("CommonItemClk", {
                ElementType: "首页记录区",
                ElementShowTxt: "首页记录区成长记录",
            });
            const host = global.onRelease ? "https://h5.kuaikanmanhua.com" : "https://mini.kkmh.com";
            const url = `${host}/pro/202209/mini_cultivate/?type=1&activity_name=${this.data.activityName}`;
            wx.navigateTo({
                url: `/pages/webview/webview?url=${encodeURIComponent(url)}&type=protocol`,
            });
        },

        // 打开新手攻略
        turnToStrategy() {
            if (!this.data.userInfo) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }
            this.kksa("CommonItemClk", {
                ElementType: "首页记录区",
                ElementShowTxt: "首页记录区攻略",
            });
            const host = global.onRelease ? "https://h5.kuaikanmanhua.com" : "https://mini.kkmh.com";
            const url = `${host}/pro/202209/mini_cultivate/?type=0&activity_name=${this.data.activityName}`;
            wx.navigateTo({
                url: `/pages/webview/webview?url=${encodeURIComponent(url)}&type=protocol`,
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
