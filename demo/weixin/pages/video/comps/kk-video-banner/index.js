import { util_action } from "../../../../util.js";

const app = getApp();
const global = app.globalData;

Component({
    options: {
        addGlobalClass: true,
        pureDataPattern: /^_/,
    },
    properties: {
        params: {
            type: Object,
            value: {},
        },
        origin: {
            type: String,
            value: "",
        },
    },
    data: {
        current: 0,
        activeIndex: 0,
        muted: true,
        videoContexts: [],
        videoLoading: true,
        videoList: [],
        picTimer: null,
        videoTimer: null,
        videoAutoTimer: null,
        isShowMedia: true,
        loadingMap: {},
        loadingVideo: true,
    },
    attached() {
        this.initData();
    },
    methods: {
        initData() {
            const { params = {} } = this.properties;
            const { banner_list: bannerList = [] } = params;
            const loadingMap = {};
            const list = bannerList.map((item, index) => {
                const type = item.image_type || 2;
                const isVideo = type == 4;
                const picUrl = isVideo ? item.preview_image_url : item.image;
                const videoUrl = isVideo ? item.image : "";
                loadingMap[index] = true;
                return {
                    id: item.id || 0,
                    title: item.title || "",
                    subtitle: item.sub_title || "",
                    action: item.action_type || {},
                    type,
                    isVideo,
                    picUrl,
                    videoUrl,
                };
            });
            this.setData(
                {
                    loadingMap,
                    videoList: list,
                    muted: true,
                    current: 0,
                    activeIndex: 0,
                },
                () => {
                    this.initVideoContext();
                }
            );
        },
        initVideoContext() {
            const videoContexts = [];
            this.data.videoList.forEach((item, index) => {
                videoContexts.push(wx.createVideoContext(`video_${index}`, this));
            });
            this.data.videoContexts = videoContexts;
            this.changeSwiper({
                detail: {
                    current: 0,
                },
            });
        },
        changeSwiper(e) {
            const { current } = e.detail;
            const { videoList, videoContexts } = this.data;
            const videoLength = videoContexts.length;
            const row = videoList[current] || {};
            this.setData({
                activeIndex: current,
                isShowMedia: row.isVideo,
            });
            const preVideoContext = videoContexts[current === 0 ? videoLength - 1 : current - 1];
            const nextVideoContext = videoContexts[current === videoLength - 1 ? 0 : current + 1];
            preVideoContext && preVideoContext.pause();
            nextVideoContext && nextVideoContext.pause();

            this.handleClearTimer();

            let timer = setTimeout(() => {
                clearTimeout(timer);
                this.handleLoadUpdate();
            }, 500);

            if (row.isVideo) {
                this.handleVideoSlide();
            } else {
                this.handlePicSlide();
            }
        },
        onPlay: function onPlay(e) {
            this.handleClearTimer();
            this.trigger(e, "play");
        },
        onPause: function onPause(e) {
            this.trigger(e, "pause");
        },
        onEnded: function onEnded(e) {
            this.handleNextSlide();
            this.trigger(e, "ended");
        },
        onError: function onError(e) {
            this.trigger(e, "error");
        },
        onTimeUpdate: function onTimeUpdate(e) {
            this.setData({
                loadingVideo: false,
            });
            this.trigger(e, "timeupdate");
        },
        onWaiting: function onWaiting(e) {
            this.trigger(e, "wait");
        },
        onProgress: function onProgress(e) {
            this.trigger(e, "progress");
        },
        onLoadedMetaData: function onLoadedMetaData(e) {
            this.trigger(e, "loadedmetadata");
        },
        trigger: function trigger(e, type, rest = {}) {
            this.triggerEvent(type, { ...rest });
        },
        handleMuted() {
            this.setData({
                muted: !this.data.muted,
            });
        },
        handleClearTimer() {
            if (this.data.videoTimer) {
                clearTimeout(this.data.videoTimer);
                this.data.videoTimer = null;
            }
            if (this.data.picTimer) {
                clearTimeout(this.data.picTimer);
                this.data.picTimer = null;
            }
            if (this.data.videoAutoTimer) {
                clearTimeout(this.data.videoAutoTimer);
                this.data.videoAutoTimer = null;
            }
        },
        handleLoadUpdate(value = -1) {
            const loadingMap = {};
            this.data.videoList.map((item, index) => {
                loadingMap[index] = index != value;
            });
            this.setData({
                loadingMap,
            });
        },
        handleVideoSlide() {
            const { activeIndex, videoContexts } = this.data;
            this.data.videoAutoTimer = setTimeout(() => {
                clearTimeout(this.data.videoAutoTimer);
                this.handleLoadUpdate(activeIndex);
                this.setData({
                    loadingVideo: true,
                });
                this.data.videoTimer = setTimeout(() => {
                    clearTimeout(this.data.videoTimer);
                    this.data.videoTimer = null;
                    this.handleNextSlide();
                }, 5000);
                const timer = setTimeout(() => {
                    clearTimeout(timer);
                    const videoContext = videoContexts[activeIndex];
                    videoContext && videoContext.play();
                }, 500);
            }, 2000);
        },
        handlePicSlide() {
            this.data.picTimer = setTimeout(() => {
                clearTimeout(this.data.picTimer);
                this.data.picTimer = null;
                this.handleNextSlide();
            }, 3000);
        },
        handleNextSlide() {
            const { videoList, activeIndex } = this.data;
            const len = videoList.length;
            const maxLen = len - 1;
            const nextCurrent = activeIndex + 1 > maxLen ? 0 : activeIndex + 1;
            if (len <= 1) {
                return false;
            }
            this.setData({
                current: nextCurrent,
            });
        },
        handleTap(e) {
            const { index } = e.currentTarget.dataset;
            const { action = {} } = this.data.videoList[index] || {};
            const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
            app.kksaTrack("CarouselClk", {
                CurPage: this.data.origin,
                TriggerOrderNumber: index,
                IsLoginStatus: !!global.userId,
            });
            util_action({ type, id, url, parentid });
        },
    },
});
