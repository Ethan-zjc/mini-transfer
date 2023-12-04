/**
 * 推荐页默认卡片
 */
import { util_action } from "../../../../util.js";

const app = getApp();
const computedBehavior = require("miniprogram-computed");
const { cdnIconsImgs } = require("../../../../cdn.js");

Component({
    behaviors: [computedBehavior],
    properties: {
        item: {
            type: Object,
            value: {},
        },
        index: {
            type: Number,
            value: 0,
        },
        idx: {
            type: Number,
            value: 0,
        },
        follow: {
            type: Boolean,
            value: false,
        },
        praise: {
            type: Object,
            value: {},
        },
        isLogin: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        cdnIconsImgs,
        canIUseGetUserProfile: wx.getUserProfile ? true : false,
    },
    methods: {
        handlerAction(e) {
            const { index, type, comictype, key = 0 } = e.currentTarget.dataset;
            const row = this.data.item;
            const tag = row.recommend_tag[key];
            const ary = {
                topic: {
                    type: 2,
                    id: row.topic_id,
                },
                comic: {
                    type: 3,
                    id: row.comic_id,
                },
            };
            const track = {
                index: this.data.index,
                idx: this.data.idx,
                item: this.data.item,
                type,
            };
            if (type == "tag") {
                const { target_web_url } = tag.action_type;
                // const path = "/pages/topic-list/topic-list";
                if (tag.type == 1035) {
                    // wx.navigateTo({
                    //     url: `${path}?type=search&q=${tag.title}&title=${tag.title}`
                    // });
                    util_action({
                        type: 10,
                        params: {
                            type: "search",
                            q: tag.title,
                            title: tag.title,
                        },
                    });
                } else if (!row.isRec) {
                    // wx.navigateTo({
                    //     url: `${path}?type=feed&recommend_title=${tag.title}&${target_web_url}`
                    // });
                    util_action({
                        type: 10,
                        url: target_web_url,
                        params: {
                            type: "feed",
                            recommend_title: tag.title,
                        },
                    });
                    Object.assign(track, {
                        type: "feed",
                    });
                }
            } else {
                util_action(ary[type]);
            }
            if (type == "comic") {
                track.comicType = comictype;
            }
            this.triggerEvent("feed", track);
        },
        handlerFollowTap(e) {
            // 应该取e绑定的id和state，这里先写死
            this.triggerEvent("follow", {
                id: this.data.item.topic_id,
                state: this.data.item.favourite,
                index: this.data.index,
                item: this.data.item,
            });
        },
        handlerPraiseTap(e) {
            // 应该取e绑定的id和state，这里先写死
            this.triggerEvent("praise", {
                id: this.data.item.comic_id,
                state: this.data.item.liked,
                index: this.data.index,
                item: this.data.item,
            });
        },
        originLogin(e) {
            app.originLogin(e.detail).then((res) => {
                this.triggerEvent("login");
            });
        },
        onImageLoad() {
            this.triggerEvent("imgload", {
                index: this.data.index,
                idx: this.data.idx,
            });
        },
    },
});
