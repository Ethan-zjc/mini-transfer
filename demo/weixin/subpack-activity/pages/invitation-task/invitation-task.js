const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

const store = require("../../../store.js");

import { util_prevPage, util_formatTime, util_transNum, util_action, util_showToast, util_feSuffix } from "../../../util.js";

import { getTeamInfo, getTeamId, postCaptain, postAssign } from "./api.js";

const images = {
    avatar: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/activity/invite/add_4eb1a9e.png",
    close: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/pay-fission/tab-btn_fbc3114.png",
};

const page = {
    data: {
        images,
        top: 42, // 返回按钮距离头部的位置
        height: 0, // 胶囊的高度
        dialog: {},

        isFirstLoad: true, // 是否冷启动
        isLogin: !!global.userId, // 是否登录
        isInvite: false, // 是否属于发起者
        isTimeLoad: true, // 是否倒计时刷新
        isTeamError: false, // teamID是否出错
        isAssistance: false, // 助力者是否已经助力

        loading: true, // 首次加载
        pageLoading: false, // 页面加载状态

        query: {}, // 地址传参
        path: "/subpack-activity/pages/invitation-task/invitation-task", // 当前路径
        activity_id: "", // 活动id
        captain_user_id: "", // 发起者userId
        captain_mini_id: "", // 发起者openId
        team_id: "", // 队伍id
        origin: 1, // 来源
        again: 0, // 是否重新组队, 0:否；1：是

        awardPool: "", // 领奖记录参数
        shareTitle: "", // 自定义分享
        shareImg: "", // 自定义分享
        bannerUrl: "", // 头图地址
        pageColor: "#fff", // 主色调
        topicsTitle: "", // 作品标题
        topicsList: [], // 作品列表
        ruleList: [], // 规则列表
        awardList: [], // 奖品列表
        awardLoading: false, // 奖励加载状态
        dialogInfo: {}, // 弹窗
    },
    async onLoad(options) {
        wx.hideShareMenu();
        const { name } = util_prevPage();
        if (!name) {
            await app.getOpenId();
        }
        this.pageInit(options);
    },
    onShow() {
        if (!this.data.isFirstLoad) {
            this.getTeamInfo();
        }
    },
    onHide() {
        this.data.isFirstLoad = false;
    },
    onPullDownRefresh() {
        this.getTeamInfo(() => {
            let time = setTimeout(() => {
                clearTimeout(time);
                wx.stopPullDownRefresh();
            }, 200);
        });
    },
    onShareAppMessage(event) {
        const dataset = event.target.dataset || {};
        const { isLogin, isInvite, activity_id, captain_user_id, captain_mini_id, team_id, path, shareTitle, shareImg } = this.data;
        const options = {
            activity_id,
            captain_user_id,
            captain_mini_id,
            team_id,
            origin: 3,
        };
        const formatShareUrl = util_feSuffix({
            src: shareImg,
            width: 500,
        });

        if (dataset.text) {
            this.clkTrack({
                type: 1,
                text: dataset.text,
            });
        }

        const query = this.formatQuery(options);
        const pageUrl = `${path}${query}`;
        return {
            title: shareTitle || "快来和我一起组队吧！",
            path: pageUrl,
            imageUrl: formatShareUrl || "",
        };
    },

    // 初始化
    async pageInit(options = {}) {
        const { activity_id = "", team_id = "", captain_user_id = "", captain_mini_id = "", origin = "", again = 0 } = options;

        this.data.query = options;
        this.data.activity_id = activity_id;
        this.data.team_id = team_id;
        this.data.captain_user_id = captain_user_id;
        this.data.captain_mini_id = captain_mini_id;
        this.data.origin = origin;
        this.data.again = again;

        const isInvite = !captain_mini_id || (captain_mini_id && captain_mini_id == global.openId);
        const rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : {};
        const rectHei = rect.height || 0;
        const rectTop = rect.top ? rect.top + 1 : 0;

        this.setData({
            isInvite,
            height: rectHei,
            top: rectTop,
        });

        // if (!isInvite) {
        // await this.postCaptain();
        // }

        this.getTeamInfo(() => {
            this.createTeamAuto();
            this.createAwardTips();
            this.openTrack();
            wx.showShareMenu();
            console.log(111, options, isInvite, team_id);
        });
    },
    // 返回上一页
    topNavigateBack() {
        const { name } = util_prevPage();
        if (!name) {
            wx.reLaunch({
                url: "/pages/find/find",
            });
        } else {
            wx.navigateBack({ delta: 1 });
        }
    },
    // 格式化主接口数据
    getTeamInfo(callback) {
        const { activity_id, team_id, captain_user_id, captain_mini_id, pageLoading } = this.data;

        if (pageLoading) {
            callback && callback();
            return false;
        }

        this.data.pageLoading = true;

        getTeamInfo({
            activity_id,
            team_id,
            captain_mini_id,
            captain_user_id,
        })
            .then((res) => {
                const { code, data = {}, message } = res;
                if (code == 200) {
                    const {
                        viva_card = {}, // 专题池
                        activity_rule = "", // 规则
                        award_info = {}, // 奖品
                        team_info = {}, // 组队
                        award_pool = "", // 领奖记录传参
                        share_title: shareTitle = "",
                        share_image_url: shareImg = "",
                        banner_url: bannerUrl = "",
                        background_color: pageColor = "#8547F0",
                    } = data;

                    const formatBannerUrl = util_feSuffix({
                        src: bannerUrl,
                        width: 750,
                    });

                    // 组队区域
                    const teamInfo = this.formatTeam(team_info);
                    // 专题区域
                    const { topicsTitle, topicsList, topicsPool } = this.formatTopics(viva_card);
                    // 规则区域
                    const ruleList = activity_rule.split("#") || [];
                    // 奖励区域
                    const awardList = this.formatAward(award_info, pageColor);

                    this.setData({
                        ...teamInfo,
                        loading: false,
                        isLogin: !!global.userId,
                        bannerUrl: formatBannerUrl,
                        awardPool: award_pool,
                        pageColor,
                        topicsTitle,
                        topicsList,
                        topicsPool,
                        ruleList,
                        awardList,
                        shareTitle,
                        shareImg,
                    });
                } else {
                    this.teamToast(message);
                }
                this.data.isFirstLoad = false;
                this.data.pageLoading = false;
                callback && callback();
            })
            .catch((error) => {
                this.data.isFirstLoad = false;
                this.data.pageLoading = false;
                this.teamToast(error.message || "fail");
                callback && callback();
            });
    },
    // 获取队伍id
    getTeamId() {
        return new Promise((resolve, reject) => {
            getTeamId({
                activity_id: this.data.activity_id,
            })
                .then((res) => {
                    const { code, data } = res;
                    if (code == 200) {
                        const id = data.team_id;
                        this.data.team_id = id;
                        resolve(id);
                    } else {
                        reject(res);
                    }
                })
                .catch((error) => {
                    reject(error);
                });
        });
    },
    // 给队长助力
    postCaptain() {
        return new Promise((resolve) => {
            postCaptain({
                team_id: this.data.team_id,
            })
                .then((res) => {
                    const { code, message } = res;
                    this.teamToast(code == 200 ? "助力成功" : message);
                    resolve();
                })
                .catch((error) => {
                    this.teamToast(error.message || "助力失败");
                    resolve();
                });
        });
    },
    // 自动创建队伍
    createTeamAuto() {
        const { teamStatus, isLogin, isInvite, again } = this.data;
        if (isInvite) {
            this.data.captain_mini_id = global.openId;
            if (isLogin) {
                this.data.captain_user_id = global.userId;
                if (teamStatus == 1 || (!!again && teamStatus != 2)) {
                    this.getTeamId()
                        .then(() => {
                            this.setData({
                                isTeamError: false,
                            });
                            this.getTeamInfo();
                        })
                        .catch((error) => {
                            this.setData({
                                isTeamError: true,
                            });
                            util_showToast({
                                title: error.message || "创建队伍失败",
                                duration: 3000,
                            });
                        });
                }
            }
        }
    },
    // 奖励弹窗提示
    createAwardTips() {
        const { awardList, isInvite } = this.data;
        const storageName = "invite:award";
        const row = awardList[0] || {};
        const { status, icon } = row;
        if (status == 2 && !wx.getStorageSync(storageName) && isInvite) {
            wx.setStorageSync(storageName, 1);
            this.dialogShow({
                title: "恭喜组队成功",
                // subtitle: "获得平台次元卡一张",
                icon,
            });
        }
    },
    teamToast(title) {
        util_showToast({
            title,
            duration: 3000,
        });
    },
    // 发起组队，创建teamId
    tapTroops(event) {
        const { activity_id, origin, path } = this.data;
        const { text } = event.currentTarget.dataset || {};
        const query = this.formatQuery({
            activity_id,
            origin,
            again: 1,
        });
        const pageUrl = `${path}${query}`;
        this.clkTrack({
            type: 1,
            text,
        });
        wx.reLaunch({
            url: pageUrl,
        });
    },
    // 格式化组队信息
    formatTeam(value) {
        const { expire_time: end_at = 0, id: team_id = "", status = 1, members = 1, users = [], invite_info = {} } = value;

        const { buttons = [] } = invite_info;

        const start_at = new Date().getTime();
        const teamTime = end_at - start_at;
        const defaultUser = {
            selected: true,
            nick_name: "待邀请",
            avatar_url: images["avatar"],
        };
        const teamUsers = [];
        for (let i = 0; i < members; i++) {
            if (users[i]) {
                teamUsers.push(users[i]);
            } else {
                teamUsers.push(JSON.parse(JSON.stringify(defaultUser)));
            }
        }

        let teamButtons = buttons.map((item) => {
            const fontColor = item.font_color || "";
            const bgColor = item.background_color || "";
            const style = `color:${fontColor};background-color:${bgColor};`;
            const borderStyle = `border: 4rpx solid ${fontColor};${style}`;
            item.style = style;
            item.borderStyle = borderStyle;
            return item;
        });

        //助力者数据修改
        let isAssistance = false;
        let userId = global.userId;
        if (!this.data.isInvite) {
            isAssistance = userId ? users.some((item) => item.id == userId) : false;
            if (!isAssistance) {
                const tanceRow = teamButtons[1] || {};
                if (tanceRow && tanceRow.text && tanceRow.type != 3) {
                    const tanceData = Object.assign({}, tanceRow, {
                        type: 1001, // 固定值
                        text: "帮他助力",
                    });
                    teamButtons = [tanceData];
                }
            }
        }

        const options = {
            teamStatus: status,
            teamTime,
            teamUsers,
            teamButtons,
            isAssistance,
        };

        if (!this.data.team_id) {
            options.team_id = team_id;
        }

        return options;
    },
    // 格式化专题
    formatTopics(value) {
        const { title = "作品专区", pool_name = "", topics: list = [] } = value;
        const topics = list.map((item) => {
            const label = item.labels || [];
            item.url = item.vertical_image_url || "";
            item.favText = item.favourite_text || "";
            item.title = item.title || "";
            item.subtitle = label.join(" ");
            item.action = item.action_protocol || {};
            return item;
        });
        return {
            topicsTitle: title,
            topicsList: topics,
            topicsPool: pool_name,
        };
    },
    // 格式化奖励列表
    formatAward(value, pageColor) {
        const { background_url: bg = "", awards: list = [] } = value;
        const formatBgUrl = util_feSuffix({
            src: bg,
            width: 598,
        });
        const rgb = this.hexToRgba(pageColor);
        const award = list.map((item) => {
            const end_at = item.expire_time || 0;
            const start_at = new Date().getTime();
            const button = item.button || {};
            const { text = "", font_color = "#fff", background_color = "#8547F0" } = button;
            const iconUrl = util_feSuffix({
                src: item.icon || "",
                width: 114,
            });
            item.bg = formatBgUrl;
            item.id = item.award_record_id || 0;
            item.title = item.rule || "";
            item.titleColor = item.rule_color || "#333333";
            item.icon = iconUrl;
            item.time = end_at - start_at;
            item.borderStyle = `border: 4rpx solid rgba(${rgb},0.2);`;
            item.buttonText = text;
            item.buttonStyle = `color:${font_color};background-color:${background_color}`;
            return item;
        });
        return award;
    },
    // 对象转字符串
    formatQuery(params, flag) {
        let string = "";
        for (let key in params) {
            string += `&${key}=${params[key]}`;
        }
        return flag ? string : string.replace(/^[&]/, "?");
    },
    // 专题调整
    topicsAction(event) {
        const { index } = event.currentTarget.dataset || {};
        const row = this.data.topicsList[index] || {};
        const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = row.action || {};
        util_action({ type, url, id, parentid });

        this.clkTrack({
            type: 3,
            title: this.data.topicsTitle,
            index,
        });

        const _state = store.getState();
        const pageTrigger = _state.pageTrigger;
        pageTrigger["find"] = {
            title: "畅读卡专区",
            module_type: 302,
            module_id: this.data.isInvite ? 1 : 0,
        };
        store.setState({ pageTrigger });
    },
    // 专题查看更多
    tapTopicsMore() {
        const { topicsTitle, topicsPool } = this.data;
        const prod = "https://h5.kuaikanmanhua.com";
        const stag = "https://mini.kkmh.com";
        const host = global.environment == "prod" ? prod : stag;
        const url = `${host}/act_202101_mini_topic_list.html?title=${topicsTitle}&pool_name=${topicsPool}`;
        util_action({
            type: 19,
            url,
        });
        this.clkTrack({
            type: 3,
            title: this.data.topicsTitle,
            text: "查看更多漫画",
        });
    },
    // 奖励按钮，领奖励
    tapAwardBtn(event) {
        const { index, title, id } = event.currentTarget.dataset || {};
        const row = this.data.awardList[index] || {};
        const { status = 1 } = row;

        if (status != 2) {
            return false;
        }

        // 领奖励
        if (this.data.awardLoading) {
            return false;
        }
        this.data.awardLoading = true;
        postAssign({
            award_record_id: id,
        })
            .then((res) => {
                let toast = res.code == 200 ? "燃力值领取成功" : res.message;
                this.data.awardLoading = false;
                this.teamToast(toast);
                if (res.code == 200) {
                    this.getTeamInfo();
                }
            })
            .catch((error) => {
                this.data.awardLoading = false;
                this.teamToast(error.message || "fail");
            });
        this.clkTrack({
            type: 2,
            title,
            text: "领取奖励",
        });
    },
    // 查看领奖记录
    tapAwardMore() {
        const prod = "https://h5.kuaikanmanhua.com";
        const stag = "https://mini.kkmh.com";
        const host = global.environment == "prod" ? prod : stag;
        const url = `${host}/pro/202203/mini_award_list/?activity_name=${this.data.awardPool}`;
        util_action({
            type: 18,
            url,
        });
    },
    // 手动助力
    tapAssistance() {
        this.postCaptain().then(() => {
            this.getTeamInfo();
        });
    },

    dialogShow(options = {}) {
        options.show = true;
        this.setData({
            dialogInfo: options,
        });
    },
    dialogClose() {
        this.setData({
            dialogInfo: {
                show: false,
            },
        });
    },
    timeEnd() {
        if (this.data.isTimeLoad) {
            this.data.isTimeLoad = false;
            this.getTeamInfo();
        }
    },
    originLogin() {
        const { query, path } = this.data;
        app.originLogin({})
            .then(() => {
                const params = this.formatQuery(query);
                const pageUrl = `${path}${params}`;
                wx.reLaunch({
                    url: pageUrl,
                });
            })
            .catch();
    },
    clkTrack({ type = 1, title = "", index = -1, text = "" }) {
        const { isInvite } = this.data;
        const typeMap = {
            1: "",
            2: "单行长条模块",
            3: "六图内容模块",
        };
        const buttonMap = {
            1: "组队按钮",
            2: "领取按钮",
            3: "底部按钮",
        };
        const CurPage = isInvite ? "组队活动页" : "助力活动页";
        const options = {
            CurPage,
            TabModuleTitle: title,
            TabModuleType: typeMap[type] || "",
        };
        if (text) {
            Object.assign(options, {
                ElementType: buttonMap[type] || "",
                ElementShowTxt: text,
            });
        }
        if (type == 3 && index >= 0) {
            const row = this.data.topicsList[index] || {};
            const actionTypeMap = {
                2: "漫画专题",
                3: "漫画章节",
                9: "漫画分类页",
                18: "hybrid跳转",
                19: "hybrid跳转",
                44: "会员中心",
                66: "native 专题排行榜",
                68: "漫画续读",
                2000: "小程序",
                2001: "小程序",
                2002: "小程序",
            };
            const { type, target_id: id = 0, target_web_url: url, parent_target_id: parentId = 0 } = row.action || {};

            // 点击内容类型
            options.ClkItemType = actionTypeMap[type] || "";

            let ContentID = "";
            let RelatedContentID = "";

            if ([2].includes(type)) {
                ContentID = String(id);
            }
            if ([68].includes(type)) {
                ContentID = String(parentId);
            }
            if ([18, 19, 2000, 2001, 2002, 2003, 2004].includes(type)) {
                ContentID = String(url);
            }
            if ([3].includes(type)) {
                RelatedContentID = String(id);
            }
            Object.assign(options, {
                ContentID,
                RelatedContentID,
            });
        }
        app.kksaTrack("CommonItemClk", options);
    },
    openTrack() {
        const { origin, isInvite } = this.data;
        const orginMap = {
            1: "首页轮播图_横向模块",
            2: "挂角",
            3: "分享卡",
        };
        const { name } = util_prevPage();
        app.kksaTrack("CommonPageOpen", {
            TabModuleType: orginMap[origin || 1],
            CurPage: isInvite ? "组队活动页" : "助力活动页",
            PrePage: name || "",
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
    // 色值转RGB
    hexToRgba(value) {
        let sColor = value && value.toLowerCase();
        const reg = /^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/;
        if (sColor && reg.test(sColor)) {
            if (sColor.length === 4) {
                let sColorNew = "#";
                for (let i = 1; i < 4; i += 1) {
                    sColorNew += sColor.slice(i, i + 1).concat(sColor.slice(i, i + 1));
                }
                sColor = sColorNew;
            }
            const sColorChange = [];
            for (let i = 1; i < 7; i += 2) {
                sColorChange.push(parseInt("0x" + sColor.slice(i, i + 2)));
            }
            return sColorChange.join(",");
        } else {
            return sColor;
        }
    },
};

const ConnectPage = connect(({ userInfo }) => {
    return {
        userInfo,
    };
})(page);

Page(ConnectPage);
