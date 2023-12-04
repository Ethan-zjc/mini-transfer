const app = getApp();
const global = app.globalData;

const { getState, setState } = require('../../../store.js');

import { util_showToast } from '../../../util.js';

import { updateFollowStatus, postPlayReport } from './api.js';

Component({
    properties: {
        current: {
            type: Number,
            value: 0,
            observer() {
                this.initData();
            },
        },
        index: {
            type: Number,
            value: 0,
        },
        videoId: {
            type: String,
            value: '',
        },
        videoTitle: {
            type: String,
            value: '',
        },
        videoTotal: {
            type: Number,
            value: 0,
        },
        follows: {
            type: Object,
            value: {},
        },
        isTab: {
            type: Boolean,
            value: false,
        },
        cover: {
            type: String,
            value: 'cover',
        },
        origin: {
            type: String,
            value: '',
        },
        isRefresh: {
            type: Boolean,
            value: false,
            observer(val) {
                if (val) {
                    this.refreshData();
                }
            },
        },
        chapter: {
            type: Object,
            value: {},
            observer(val) {
                if (val) {
                    this.initData();
                }
            },
        },
        showGift: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        isFirst: true,
        iPhoneX: false,
        picHeight: 500,
        loading: true, // 加载中
        waiting: false, // 缓冲中$
        throttleTimer: null,
        payTimer: null,
        videoContext: null, // 播放器实例
        isPlay: false, // 是否在播放
        isShowDanmu: true, // 是否显示弹幕
        isClear: false, // 是否清屏
        sendValue: '', // 添加弹幕数据
        rate: 1, // 倍速 1、2
        isReport: true, // 是否进行上报
        danmuDur: 10, // 当前播放，弹幕请求间隔，单位秒
        danmuNum: 1, // 当前播放，弹幕请求索引，单位秒
        danmuList: [], // 当前播放，弹幕列表，单位秒
        currentTime: 0, // 当前播放，进度，单位秒
        duration: 0, //当前播放，总长度，单位秒
        isLoadedMeta: false, // 元数据是否加载完成
        playStamp: 0, // 开始播放时间戳
        isFirstPlay: false,
        loadFlag: false,
        throttleCount: 0,
        throttleMeta: null,
    },
    methods: {
        initData() {
            const { isTab } = this.properties;
            const { iPhoneX } = global;
            if (this.data.loadFlag) {
                return false;
            }
            this.data.loadFlag = true;
            this.data.isFirstPlay = true;
            this.data.playStamp = Date.now();
            this.setData(
                {
                    loading: true,
                    waiting: false,
                    rate: 1,
                    iPhoneX: iPhoneX && !isTab,
                },
                () => {
                    this.initVideo();
                    let timer = setTimeout(() => {
                        clearInterval(timer);
                        this.data.loadFlag = false;
                    }, 500);
                }
            );
        },
        // 初始化video
        initVideo() {
            const { index, current } = this.properties;
            if (current == index) {
                this.data.isFirst = false;
                this.data.isReport = true;
                this.trigger('load');
                this.checkPlay();
            } else {
                this.clearVideo();
                if (!this.data.loading) {
                    let timer = setTimeout(() => {
                        clearTimeout(timer);
                        this.setData({
                            loading: true,
                        });
                    }, 300);
                }
            }
        },
        // 刷新部分数据，场景：推荐页切换章节
        refreshData() {
            const { index, current } = this.properties;
            if (index != current) {
                return false;
            }
            this.setData({
                danmuList: [],
                currentTime: 0,
                duration: 0,
                isReport: true,
                isLoadedMeta: false,
            });
        },
        // 清除video对象
        clearVideo() {
            if (this.data.videoContext) {
                this.data.videoContext.pause();
                this.data.videoContext = null;
            }
        },
        // 控制video
        async setVideo(type, value) {
            await this.createVideo();
            if (type == 'play') {
                this.data.videoContext.play();
            } else if (type == 'pause') {
                this.data.videoContext.pause();
            } else if (type == 'stop') {
                this.data.videoContext.stop();
            } else if (type == 'playbackRate') {
                this.data.videoContext.playbackRate(value);
            } else if (type == 'danmu') {
                this.data.videoContext.sendDanmu(value);
            } else if (type == 'seek') {
                this.data.videoContext.seek(value);
            } else {
                console.warn('warn:video type undefined');
            }
        },
        // 创建video实例，延迟返回
        createVideo() {
            const { index } = this.properties;
            const { videoContext } = this.data;
            return new Promise((resolve) => {
                if (!videoContext) {
                    this.data.videoContext = wx.createVideoContext(`video_${index}`, this);
                    let timer = setTimeout(() => {
                        clearTimeout(timer);
                        resolve();
                    }, 100);
                } else {
                    resolve();
                }
            });
        },
        // 切换播放暂停
        clickVideo() {
            if (this.data.isPlay) {
                this.setVideo('pause');
                this.handleClkTrack('pause');
            } else {
                this.setVideo('pause');
                this.checkPlay();
                this.handleClkTrack('play');
            }
        },
        // 设置进度条
        setTimeUpdate(time, duration) {
            const { chapter, videoId } = this.properties;
            const { isReport } = this.data;
            const currentTime = parseInt(time);
            this.setData({
                loading: false,
                waiting: false,
                currentTime,
                duration: parseInt(duration),
            });
            if (currentTime >= 1 && isReport) {
                this.data.isReport = false;
                postPlayReport({
                    chapter_id: chapter.id,
                    album_id: videoId,
                    video_id: videoId,
                });
            }
        },
        // 设置播放进度
        setSeek(event) {
            const { value } = event.detail || {};
            this.setVideo('seek', value);
            this.handleClkTrack('seek');
        },
        // 检测当前播放
        checkPlay() {
            const { chapter } = this.properties;
            const { isLoadedMeta } = this.data;
            if (chapter.disabled) {
                this.setVideo('stop');
                this.setData({
                    loading: false,
                    isPlay: false,
                });
                this.handleThrottle(() => {
                    this.handleProcess();
                }, 2000);
            } else {
                if (isLoadedMeta) {
                    this.setVideo('play');
                }
            }
        },
        async handleTools(event) {
            const { type } = event.detail || {};
            if (type == 'group') {
                this.triggerEvent('onToolsAlbums');
            } else if (type == 'follow') {
                this.handleFollow();
            }
            this.handleClkTrack(type);
        },
        handleFollow() {
            const { videoId: id } = this.properties;
            const { follows } = getState();
            const curFollowStatus = follows[id];
            return updateFollowStatus({ id, status: curFollowStatus }).then(() => {
                follows[id] = !curFollowStatus;
                setState({ follows });
                if (follows[id]) {
                    util_showToast({
                        title: '关注成功',
                    });
                }
            });
        },
        // 处理付费弹窗
        handleProcess() {
            const { videoId, videoTitle, index, current, chapter } = this.properties;
            this.triggerEvent('onPay', {
                index,
                current,
                videoInfo: { id: videoId, title: videoTitle },
                chapter: chapter,
            });
        },
        handleThrottle(callback, time = 500) {
            if (!this.data.throttleTimer) {
                this.data.throttleTimer = setTimeout(() => {
                    clearTimeout(this.data.throttleTimer);
                    this.data.throttleTimer = null;
                }, time);
                callback && callback();
            }
        },
        onPlay(e) {
            this.trigger('play', e);
            this.setData({
                isPlay: true,
                loading: false,
                waiting: false,
            });
        },
        onPause(e) {
            this.trigger('pause', e);
            this.setData({
                isPlay: false,
            });
        },
        onEnded(e) {
            this.setData(
                {
                    isPlay: false,
                },
                () => {
                    this.trigger('ended', e);
                }
            );
        },
        onError(e) {
            this.trigger('error', e);
            this.setData({
                isPlay: false,
            });
        },
        onTimeUpdate(e) {
            const { currentTime, duration } = e.detail || {};
            this.setTimeUpdate(currentTime, duration);
        },
        onWaiting(e) {
            if (this.data.loading) {
                return false;
            }
            this.trigger('wait', e);
            this.handleThrottle(() => {
                this.setData({
                    waiting: true,
                });
            }, 200);
        },
        onProgress() {
            // this.trigger('progress', e);
        },
        onLoadedMetaData() {
            const { index, current } = this.properties;
            if (this.data.throttleMeta) {
                return false;
            }
            this.data.throttleMeta = setTimeout(() => {
                clearTimeout(this.data.throttleMeta);
                this.data.throttleMeta = null;
                this.setData({
                    isLoadedMeta: true,
                });
                if (index == current) {
                    this.checkPlay();
                }
            }, 20);
        },
        trigger(type) {
            const { index, current, videoId, videoTitle, chapter } = this.properties;
            this.triggerEvent('onChange', {
                type,
                index,
                videoId,
                videoTitle,
                current,
                albumsIndex: 0,
                albumsItem: chapter,
                albumsLen: 1,
            });
        },
        // 点击埋点
        handleClkTrack(type) {
            const { origin } = this.properties;
            const typeMap = {
                group: '选集',
                follow: '关注',
                play: '播放',
                pause: '暂停',
                seek: '进度条',
            };
            app.kksaTrack('ClickButton', {
                CurPage: origin,
                ButtonName: typeMap[type] || '',
            });
        },
    },
});
