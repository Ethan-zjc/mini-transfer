/**
 * 专题关注
 * @param id {String} 这一条点赞对象的id
 * @param state {Boolean} 当前的状态，是否关注（发起请求前）
 * @param list {Array} 仅id数组，举例：['123', '124', '125']
 */
import { util_request, util_showToast, util_requestSubscribeMessage, util_sendNotifyApi, util_logManager } from "../util.js";

const app = getApp();
const global = app.globalData;
const channel = global.channel;

module.exports = app.onBehaviors({
    methods: {
        handleFollow(id, notoast, callback) {
            const state = this.data.follows[id] || false;
            util_request({
                url: `/mini/v1/comic/${channel}/favourite/topic${state ? "/cancel" : ""}`,
                method: "post",
                data: {
                    topic_id: id,
                },
            })
                .then(() => {
                    const newState = !state;
                    this.setFollows(id, newState);
                    if (newState && !notoast) {
                        util_showToast({
                            title: "关注成功",
                            type: "success",
                        });
                    } else {
                        util_showToast({
                            title: "取关成功",
                            type: "success",
                        });
                    }

                    // 订阅消息
                    if (newState) {
                        app.getSubMessage().then((messageList) => {
                            const tempTypes = [1, 2, 3]; // 1-作品更新推送 2-新作上架推送 3-作品上热门推送
                            const tempGroup = messageList.filter((item) => {
                                return tempTypes.includes(item.type);
                            });
                            if (tempGroup.length) {
                                const tmplIds = tempGroup.map((item) => item.id);
                                util_requestSubscribeMessage({
                                    tmplIds,
                                })
                                    .then((res) => {
                                        let AuthorizationResult = 0;
                                        const ids = tempGroup.filter((item) => {
                                            const id = item.id;
                                            return res[id] && res[id] === "accept";
                                        });
                                        if (ids.length) {
                                            AuthorizationResult = 1;
                                            util_sendNotifyApi({ ids });
                                        }
                                        app.kksaTrack("TriggerAuthorization", {
                                            AuthorizationResult,
                                            TriggerTiming: "关注漫画",
                                        });
                                        app.kksaTrack("MiniNotification", {
                                            MiniNotificationStatus: AuthorizationResult,
                                        });
                                    })
                                    .catch((error) => {
                                        const { errMsg: ErrorMsg, errCode: ErrorCode } = error;
                                        util_logManager({
                                            LogType: "message",
                                            ErrorCode,
                                            ErrorMsg,
                                        });
                                    });
                            } else {
                                console.log("subscribe: tempID error");
                            }
                        });
                    }
                    if (callback) {
                        callback(newState);
                    }
                })
                .catch((e) => {
                    console.log(e);
                });
        },
        checkFollow(list, callback) {
            let topic_ids = list.filter((id) => !!id);
            if (!topic_ids.length) {
                return;
            }
            topic_ids = topic_ids.join(",");
            util_request({
                url: `/mini/v1/comic/${channel}/favourite/check_status`,
                data: { topic_ids },
            }).then((res) => {
                const newList = res.data.info_list;
                newList.forEach((item) => {
                    this.setFollows(item.topic_id, item.favourite);
                });
                if (callback) {
                    callback();
                }
            });
        },
    },
});
