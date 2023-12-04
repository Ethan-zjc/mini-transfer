/*
 * 漫底分类和推荐
 */

import { util_request, util_action } from "../../util.js";

const app = getApp();
const global = app.globalData;

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
    },
    data: {
        observer: null,
        guessTitle: "",
        guessList: [],
        visible: false,
    },
    detached() {
        // this.clearObserver();
    },
    attached() {
        this.init();
    },
    methods: {
        init() {
            const { channel, gender } = global;
            util_request({
                url: `/mini/v1/comic/${channel}/comic/recommend_guess`,
                data: {
                    gender: gender == null ? 0 : gender,
                },
            }).then((res) => {
                const { code, data = {} } = res;

                if (code != 200) {
                    return;
                }

                const { title: guessTitle = "", topic_list: guessList = [] } = data;

                if (!guessList.length) {
                    return;
                }

                this.setData(
                    {
                        guessTitle,
                        guessList,
                        visible: true,
                    },
                    () => {
                        // setTimeout(() => {
                        //     this.createObserver();
                        // }, 200);
                    }
                );
            });
        },
        tapAction(event) {
            const { dataset = {} } = event.currentTarget;
            const { action = {} } = dataset;
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
            util_action({ type, id, url, parentid });
            this.moduleTrack("ComicPageModuleClick");
        },
        createObserver() {
            this.clearObserver();
            this.data.observer = wx.createIntersectionObserver(this, {
                thresholds: [0.3],
            });
            this.data.observer.relativeToViewport().observe(".observe-guess", (res) => {
                const ratio = res.intersectionRatio || 0;
                if (ratio > 0) {
                    this.moduleTrack("ComicPageModuleEXP");
                }
            });
        },
        clearObserver() {
            if (this.data.observer) {
                this.data.observer.disconnect();
            }
        },
        moduleTrack(event) {
            const { comicTitle: ComicName, comicId: ComicID, topicId: TopicID, topicTitle: TopicName, chapterType: ChapterType, guessTitle: ModuleName } = this.data;
            const options = {
                ModuleType: "专属追更模块",
                ChapterType,
                ComicID,
                ComicName,
                TopicID,
                TopicName,
                ModuleName,
            };
            if (event.indexOf("Click") > -1) {
                options.ModelClkItem = "";
            }
            app.kksaTrack(event, options);
        },
    },
});
