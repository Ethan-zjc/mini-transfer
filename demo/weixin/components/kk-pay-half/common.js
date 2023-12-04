import { util_action, util_logout, util_prevPage } from "../../util.js";

const app = getApp();

// 返回上一页能力
const clickNavigateBackFun = ({ topicId = "" } = {}) => {
    let pages = getCurrentPages(); // 页面栈
    if (pages.length <= 1) {
        // 没其它页面栈,跳转到专题页
        wx.redirectTo({
            url: `/pages/topic/topic?id=${topicId}`,
        });
    } else {
        // 有其它页面栈,返回上一页
        const { name } = util_prevPage();
        if (name == "find" || name == "feed") {
            wx.redirectTo({
                url: `/pages/topic/topic?id=${topicId}&list=1`,
            });
        } else {
            wx.navigateBack({ delta: 1 });
        }
    }
};

// 定向限免跳转会员开通页
// 在head、定向限免、底部强提示中均有使用
const jumpVipFun = ({ event = {}, params = {} } = {}) => {
    let { type, id, url, btntype, actname, jumptype, btnname, goodid } = event;
    let { activityId, activity_name, topicId, comicId, VIPDiscountName, text1, text2 } = params; // 新增
    let limitFree = {
        isLimitFree: true,
        activity_name: !btntype ? actname : activity_name,
        topic_id: topicId,
        comic_id: comicId,
        good_id: goodid,
    };
    if (!btntype) {
        app.kksaTrack("ClickPayPopup", {
            ButtonName: btnname || "底部强提示按钮",
            NoticeType: btnname || "底部强提示按钮",
            activityName: btnname,
            PUWID: activityId, // 弹窗id
        });
        if (jumptype != 2) {
            limitFree = {};
        }
    } else {
        app.kksaTrack("ClickPayPopup", {
            NoticeType: "定向限免",
            ButtonName: btntype ? text1.join("") + text2.join("") : "会员开通BTN",
            activityName: activity_name,
            PUWID: activityId, // 弹窗id
        });
    }
    util_action({
        type: type,
        id: id,
        url: url,
        params: { type: 2, VIPDiscountName: VIPDiscountName, limitFree: JSON.stringify(limitFree) },
    });
};

export { jumpVipFun, clickNavigateBackFun };
