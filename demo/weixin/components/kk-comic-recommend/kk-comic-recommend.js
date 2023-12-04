/*
 * 漫底推荐
 */

const app = getApp();
const global = app.globalData;
const { comRecImgs } = require("../../cdn.js");

import { util_request, util_feSuffix, util_action } from "../../util.js";

Component({
    properties: {
        tipShow: {
            type: Boolean,
            value: false,
        },
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
        border: {
            type: Boolean,
            value: true,
        },
    },
    data: {
        observer: null,
        visible: false,
        list: [],
        cardType: 1,
        cardId: 1,
        recType: 1,
        recBy: "",
        title: "",
        isView: false,
        homeTipVisible: false,
        timer: null,
        comRecImgs,
    },
    attached() {
        this.init();
    },
    methods: {
        init() {
            const { channel, gender } = global;
            const { topicId: topic_id, comicId: comic_id } = this.data;
            util_request({
                url: `/mini/v1/comic/${channel}/comic/recommend`,
                data: {
                    topic_id,
                    comic_id,
                    gender: gender == null ? 0 : gender,
                },
            }).then((res) => {
                const { code, data } = res;
                if (code == 200 && data) {
                    this.getData(data);
                }
            });
        },
        getData(value) {
            const { card_type: cardType = 1, card_id: cardId = 1, recommend_list: recList = [], recommend_type: recType = "", recommend_by: recBy = "", title = "" } = value;
            const typeMap = {
                1: [218, 290],
                2: [218, 290],
                3: [290, 386],
            };
            const size = typeMap[cardType];
            const list = recList.map((item, index) => {
                const label = item.label || {};
                const idx = index + 1;
                const src = item.image_url || "";
                const width = size[0];
                const height = size[1];
                return {
                    sort: idx < 10 ? `0${idx}` : String(idx),
                    labelTop: label.left_top || "",
                    labelBottom: label.right_bottom || "",
                    recTrack: item.rec_data_report_map || {},
                    action: item.action_protocol || {},
                    title: item.title || "",
                    subTitle: item.sub_title || "",
                    computedSrc: util_feSuffix({ src, width, quality: false }),
                    isShowTips: false,
                    src,
                    width,
                    height,
                };
            });
            const pages = getCurrentPages();
            const length = pages.length;
            const tipShow = length <= 1 && this.data.tipShow;

            if (list.length < 3) {
                return false;
            }

            this.setData(
                {
                    homeTipVisible: tipShow,
                    visible: true,
                    list,
                    cardType,
                    cardId,
                    recType,
                    recBy,
                    title,
                },
                () => {
                    // setTimeout(() => {
                    //     this.createObserver()
                    // }, 500);
                }
            );
        },
        tapTopic(event) {
            const { dataset = {} } = event.currentTarget;
            const { index } = dataset;
            const row = this.data.list[index];
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = row.action;
            util_action({ type, id, url, parentid });
            this.triggerEvent("onRecommend", {
                type: 1,
            });
            this.moduleTrack("ComicPageModuleClick", {
                clkItem: "内容",
            });
        },
        tapMore() {
            const { cardType, cardId, recType, recBy, title } = this.data;
            let query = `type=comic&id=${cardId}&title=${title}`;
            if (cardType != 3) {
                query = this.formatStr({
                    type: "feed",
                    title,
                    recommend_title: title,
                    recommend_type: recType,
                    recommend_by: recBy,
                });
            }
            wx.navigateTo({
                url: `/pages/topic-list/topic-list?${query}`,
            });
            this.triggerEvent("onRecommend", {
                type: 0,
            });
            this.moduleTrack("ComicPageModuleClick", {
                clkItem: "更多",
            });
        },
        tapTip() {
            wx.switchTab({
                url: "/pages/find/find",
            });
            global.backBubbleData = {
                page: "ComicPage",
                show: true,
                type: "漫画推荐-引导按钮",
            };
            this.moduleTrack("ComicPageModuleClick", {
                bubble: true,
            });
        },
        createObserver() {
            if (this.data.observer) {
                this.data.observer.disconnect();
            }
            this.data.observer = wx.createIntersectionObserver(this, {
                thresholds: [0, 0.7],
            });
            this.data.observer.relativeToViewport().observe(".observe-comic-recommend", (res) => {
                const ratio = res.intersectionRatio || 0;
                if (ratio > 0) {
                    if (!this.data.isView) {
                        if (this.data.timer) {
                            clearTimeout(this.data.timer);
                        }
                        this.data.isView = true;
                        this.data.timer = setTimeout(() => {
                            this.moduleTrack("ComicPageModuleEXP");
                        }, 500);
                    }
                    if (ratio > 0.7 && this.data.homeTipVisible) {
                        this.moduleTrack("ComicPageModuleEXP", {
                            bubble: true,
                        });
                    }
                } else {
                    this.data.isView = false;
                }
            });
        },
        moduleTrack(event, value) {
            const TAG = "漫画推荐-";
            const { bubble = false, clkItem = "" } = value || {};
            const { comicTitle: ComicName, comicId: ComicID, topicId: TopicID, topicTitle: TopicName, chapterType: ChapterType, title: ModuleName, cardType } = this.data;
            const typeMap = {
                1: "普通",
                2: "榜单",
                3: "精品",
            };
            const typeName = typeMap[cardType] || "";
            const typeVal = bubble ? "引导按钮" : typeName;
            const options = {
                ModuleType: `${TAG}${typeVal}`,
                ChapterType,
                ComicID,
                ComicName,
                TopicID,
                TopicName,
                ModuleName,
            };

            if (clkItem) {
                options.ModelClkItem = `${TAG}${clkItem}`;
            }
            app.kksaTrack(event, options);
        },
        formatStr(value) {
            const ary = [];
            for (let i in value) {
                ary.push(`${i}=${value[i]}`);
            }
            return ary.join("&");
        },
        onImageLoad(value) {
            const { index = 0 } = value.detail;
            const temp = `list[${index}].isShowTips`;
            this.setData({
                [temp]: true,
            });
        },
    },
});
