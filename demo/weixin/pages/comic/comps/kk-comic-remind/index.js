/**
 * 作品更新提醒弹窗
 * **/

const app = getApp();
const global = app.globalData;

import { util_request, util_showToast, util_sendNotifyApi, util_requestSubscribeMessage } from "../../../../util.js";

Component({
    properties: {
        chapterType: {
            type: String,
            value: "",
        },
        topicId: {
            type: [Number, String],
            value: 0,
        },
        topicTitle: {
            type: String,
            value: "",
        },
        comicId: {
            type: [Number, String],
            value: 0,
        },
        comicTitle: {
            type: String,
            value: "",
        },
        coverUrl: {
            type: String,
            value: "",
        },
    },
    attached() {
        this.comicModuleTrack("ComicPageModuleEXP", {
            type: "订阅消息-引导弹窗",
        });
    },
    methods: {
        remindClose() {
            this.triggerEvent("remindClose");
        },
        // 作品更新提醒暂不开启
        remindNot() {
            const { channel, openId } = global;
            this.remindClose();
            util_request({
                method: "post",
                url: `/mini/v1/comic/${channel}/comic/authorization_refused/notify`,
                data: {
                    open_id: openId,
                },
            });
            this.comicModuleTrack("ComicPageModuleClick", {
                type: "订阅消息-引导弹窗",
                clk: "订阅消息-暂不开启",
            });
        },
        // 作品更新提醒开启
        async remindOpen() {
            const REMIND_ID = "n9l67QQksMWX4ysU6gUoZV01lMgIlPfcp7-AT1ubqgU";
            const NEW_TOPIC = "xHEFeN8aQ0hCpoxYTCQterRthzwQ3PuyquFyw-7Gn48";
            const HOT_TOPIC = "F4p9S7Sl2DvrUUdZgE94rVpryf5E-HdeteOePtoLSj0";
            const tmplIds = [REMIND_ID, NEW_TOPIC, HOT_TOPIC];
            const topicMessage = await util_requestSubscribeMessage({
                tmplIds,
            });
            const ids = tmplIds.filter((id) => {
                return topicMessage[id] && topicMessage[id] === "accept";
            });
            if (ids.length) {
                util_sendNotifyApi({ ids });
            } else {
                util_showToast({
                    title: "开启失败，请稍后再试",
                });
            }
            this.remindClose();
            this.comicModuleTrack("ComicPageModuleClick", {
                type: "订阅消息-引导弹窗",
                clk: "订阅消息-确定开启",
            });
        },
        // 模块点击上报埋点
        comicModuleTrack(event, value) {
            const { type: ModuleType, title: ModuleName = "", clk: ModelClkItem = "" } = value;
            const { comicTitle: ComicName, comicId: ComicID, topicId: TopicID, topicTitle: TopicName, chapterType: ChapterType } = this.data;
            const options = {
                ChapterType,
                ComicID,
                ComicName,
                TopicID,
                TopicName,
                ModuleType,
                ModuleName,
            };
            if (ModelClkItem) {
                options.ModelClkItem = ModelClkItem;
            }
            app.kksaTrack(event, options);
        },
    },
});
