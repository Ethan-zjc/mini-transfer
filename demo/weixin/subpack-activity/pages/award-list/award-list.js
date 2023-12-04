// subpack-activity/pages/award-list.js
const app = getApp();
const { connect } = app.Store;

import { util_action } from "../../../util";
import { getRecordApi, getRedeemCodeApi } from "./api";

const page = {
    data: {
        activityNames: "", // 活动名称
        recordList: [], // 获奖记录列表

        prizeData: null, // 点击的奖品信息
    },

    onLoad(options) {
        const { activityNames = "" } = options;
        this.data.activityNames = activityNames;
    },

    onShow() {
        this.initData();
        app.kksaTrack("CommonPageOpen", {
            CurPage: "23Q1抽奖活动-我的奖品（原生）",
        });
    },

    initData() {
        // Promise.resolve(require("./mock").default); // getRecordApi({ activity_name: this.data.activityNames })
        const getRecordPromise = getRecordApi({ activity_name: this.data.activityNames });
        getRecordPromise.then((res) => {
            const { list = [] } = res.data;
            const recordList = list.filter((item) => {
                if (item.award_type === 12) item.award_title += "兑换码";
                return item.award_type !== 10000;
            });

            this.setData({
                recordList,
            });
        });
    },

    clickUse(e) {
        const { index } = e.currentTarget.dataset;

        app.kksaTrack("ClickButton", {
            CurPage: "23Q1抽奖活动-我的奖品（原生）",
            ButtonName: "我的奖品-去使用（原生）",
        });

        const prizeItem = this.data.recordList[index];

        if (prizeItem.award_type === 12) {
            // 兑换码
            getRedeemCodeApi(prizeItem.activity_name, prizeItem.order_id)
                .then((res) => {
                    const { data = {} } = res;
                    const { code = "" } = data;
                    const { words_info: wordsInfo } = prizeItem;
                    this.setData(
                        {
                            prizeData: {
                                title: `${prizeItem.award_title}`,
                                exchange: code,
                                intr: wordsInfo.desc,
                            },
                        },
                        () => {
                            app.kksaTrack("PopupShow", {
                                CurPage: "23Q1抽奖活动-我的奖品（原生）",
                                popupName: "三方兑换码弹窗",
                            });
                        }
                    );
                })
                .catch((e) => e);

            return false;
        }

        if (prizeItem.award_type === 2 && prizeItem.words_info.wx_mini_appid) {
            const { wx_mini_appid, wx_mini_url } = prizeItem.words_info;

            wx.navigateToMiniProgram({
                appId: wx_mini_appid,
                path: wx_mini_url,
            });
            return false;
        }

        const target_info = prizeItem.target_info || {};
        let action = target_info.award_assign_target || null;
        if (!action) {
            action = this.getActionFromPrize(prizeItem.award_type, prizeItem.award_target_url);
        }
        util_action(action);
    },

    onExchangeClose() {
        this.setData({
            prizeData: null,
        });
    },

    getActionFromPrize(prizeType, url) {
        let type = 0;
        switch (prizeType) {
            // VIP
            case 1:
                type = 44;
                break;
            // 实体奖
            case 2:
                type = 2004;
                break;
            // KKB、代金券
            case 5:
            case 7:
                type = 5;
                break;
            // 活动阅读券 & 会员阅读券  -> 跳转钱包页
            case 31:
            case 43:
                type = 5;
                break;
            default:
                type = 2004;
        }
        return {
            type,
            target_web_url: url,
            target_id: 0,
        };
    },
};

const ConnectPage = connect(({ userInfo }) => {
    return {
        userInfo,
    };
})(page);

Page(ConnectPage);
