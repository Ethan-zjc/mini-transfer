/*
 * 漫底推荐
 */

import { util_request, util_action } from "../../util.js";

const app = getApp();
const global = app.globalData;
const { comRecImgs } = require("../../cdn.js");

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
        loading: false,
        navList: [],
        navActive: 0,
        navAction: {},
        visible: false,
        scrollLeft: 0,
        list: [],
        title: "",
        navScrollLeft: 0,
        homeTipVisible: false,
        comRecImgs,
    },
    attached() {
        this.getTips();
        this.getData({
            tag_id: "",
        });
    },
    methods: {
        getTips() {
            const pages = getCurrentPages();
            const length = pages.length;
            if (length <= 1 && this.data.tipShow) {
                this.setData({
                    homeTipVisible: true,
                });
            }
        },
        getRecommend(value) {
            const { channel, gender } = global;
            const { topicId, loading } = this.data;

            if (loading) {
                return false;
            }

            this.data.loading = true;

            return new Promise((resolve) => {
                util_request({
                    url: `/mini/v1/comic/${channel}/comic/recommend_v3`,
                    data: {
                        ...value,
                        topic_id: topicId,
                        gender: gender == null ? 0 : gender,
                    },
                })
                    .then((res) => {
                        const { code, data } = res;
                        this.data.loading = false;
                        if (code == 200 && data) {
                            resolve(data);
                        }
                    })
                    .catch(() => {
                        this.data.loading = false;
                    });
            });
        },
        getData(value) {
            this.getRecommend(value).then((data) => {
                const { recommend_list, title } = data;
                const tag_id = value.tag_id || "";
                const isFirst = tag_id === "";
                const findList =
                    recommend_list.find((item, index) => {
                        return isFirst ? index == 0 : item.tag_id == tag_id;
                    }) || {};
                const topics = findList.topics || [];
                const topicsFilter = topics.filter((item) => {
                    return !!item;
                });
                const list = topicsFilter.map((item) => {
                    const label = item.label || {};
                    const uuid = `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`;
                    return {
                        labelTop: label.left_top || "",
                        labelBottom: label.right_bottom || "",
                        action: item.action_protocol || {},
                        title: item.title || "",
                        subTitle: item.subtitle || "",
                        src: item.vertical_image_url || "",
                        width: 200,
                        height: 268,
                        uuid,
                    };
                });
                const options = {
                    navAction: findList.more_action,
                    scrollLeft: 0,
                    visible: true,
                    title,
                    list,
                };
                if (recommend_list.length < 1 || (isFirst && list.length < 1)) {
                    return false;
                }
                if (isFirst) {
                    const navList = recommend_list.map((item) => {
                        return {
                            id: item.tag_id,
                            title: item.tag_name,
                            recommend_type: item.recommend_type,
                            recommend_by: item.recommend_by,
                            action: item.more_action,
                        };
                    });
                    Object.assign(options, {
                        navList,
                        navActive: 0,
                    });
                }
                this.setData(options);
            });
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
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = this.data.navAction;
            let params = {};
            if (type == 10) {
                params = {
                    type: "feed",
                };
            }
            util_action({
                type,
                url,
                id,
                parentid,
                params,
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
                type: "推荐分类模块-引导按钮",
            };
            this.moduleTrack("ComicPageModuleClick", {
                bubble: true,
            });
        },
        tapNav(event) {
            const { dataset = {}, offsetLeft = 0, id = "" } = event.currentTarget;
            const { index, item } = dataset;
            const { screenWidth } = global.systemInfo || {};
            const { recommend_by = "", recommend_type = "", id: tag_id } = item;
            let left = offsetLeft - screenWidth / 2;
            this.getElementWH("#" + id).then((res) => {
                if (res) {
                    left += res.width / 2;
                }
                this.setData(
                    {
                        navActive: index,
                        navScrollLeft: left > 0 ? left : 0,
                    },
                    () => {
                        this.getData({
                            tag_id,
                            recommend_by,
                            recommend_type,
                        });
                    }
                );
            });
        },
        getElementWH(id) {
            let _query = this.createSelectorQuery();
            return new Promise((resolve) => {
                _query
                    .select(id)
                    .fields(
                        {
                            size: true,
                        },
                        (res) => {
                            resolve(res);
                            _query = null;
                        }
                    )
                    .exec();
            });
        },
        moduleTrack(event, value) {
            const TAG = "推荐分类模块";
            const { bubble = false, clkItem = "" } = value || {};
            const { comicTitle: ComicName, comicId: ComicID, topicId: TopicID, topicTitle: TopicName, chapterType: ChapterType, title: ModuleName } = this.data;
            const typeVal = bubble ? "-引导按钮" : "";
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
                options.ModelClkItem = `${TAG}-${clkItem}`;
            }
            app.kksaTrack(event, options);
        },
    },
});
