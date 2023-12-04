const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

import { util_showToast, util_feSuffix, util_action, util_checkWallet, util_checkVipInfo } from '../../../util.js';

import { getDetailList, getChargeSuccess } from './api.js';

const userInfoBehavior = require('../../../behaviors/userInfo');

const page = {
    behaviors: [userInfoBehavior],
    data: {
        isFirst: true,
        loading: true,
        parentId: '',
        toast: {},
        notifyOptions: {},
        videoList: [],
        videoPreData: [],
        videoPreIndex: 0,
        current: 0,
        duration: 0,
        maxDuration: 280,
        pageSize: 3,
        nextSeason: 0,
        seasonList: [],
        isPreEnd: false,
        isPreLoad: true,
        isEnd: false,
        isShowAlbums: false,
        isLogin: false,
        isLoading: false,

        isShowPay: false,
        isShowVip: false,
        isShowTips: false,
        isFromVip: false,
        isfirst: true,
        pageName: '漫剧播放页',
        pagePath: '/subpack-video/pages/chapters/chapters',

        // 当前章节数据
        videoInfo: {},
        chapterId: 0,
        chapterTitle: '',

        showLogin: false,
        showPay: false,
        dialogTip: {
            show: false,
            title: '',
            content: '',
            buttons: [
                {
                    text: '我知道了',
                    type: 'confirm',
                },
            ],
        },
        sucData: {
            kkb: 0,
            title: '',
            vipDays: 0,
            bannerData: {},
        },
        showVipPop: false,
    },
    watchUser() {
        if (!this.data.isFirst) {
            this.setData({
                isShowAlbums: false,
                isShowVip: false,
            });
            this.refreshData();
        }
    },
    async onLoad(options) {
        await app.getOpenId();
        this.initData(options);
    },
    async onShow() {
        await app.getOpenId();
        this.checkWallet();
        this.checkVip();
        app.kksaTrack('CommonPageOpen', {
            CurPage: this.data.pageName,
        });
        this.data.isFirst = false;
    },
    initData(options = {}) {
        const { id: targetId = '', parentId: videoId = '' } = options || {};
        this.data.parentId = videoId;
        this.data.chapterId = targetId;
        if (!videoId) {
            util_showToast({
                title: '参数异常',
            });
        } else {
            this.refreshData();
        }
    },
    async refreshData() {
        const { chapterId, parentId } = this.data;
        this.setData({
            videoList: [],
            duration: 0,
            current: 0,
        });
        this.data.seasonList = [];
        this.data.isPreEnd = false;
        this.data.isPreLoad = true;
        this.data.isEnd = false;
        this.data.isFromVip = false;
        await this.getMainInfo({
            album_id: parentId,
            chapter_id: chapterId,
        });
        this.data.isPreEnd = true;
        this.data.isFirst = false;
        this.setCurrentData();
    },
    onShareAppMessage() {
        const { chapterId, videoInfo = {}, pagePath } = this.data;
        const { id: videoId, title } = videoInfo;
        return {
            title: `强烈推荐！跟我一起看《${title}》~`,
            path: `${pagePath}?id=${chapterId}&parentId=${videoId}`,
        };
    },
    onShareTimeline() {
        const { chapterId, videoInfo = {} } = this.data;
        const { id: videoId, title } = videoInfo;
        return {
            title: `强烈推荐！跟我一起看《${title}》~`,
            query: `id=${chapterId}&parentId=${videoId}`,
        };
    },
    // 请求数据
    getMainInfo(options) {
        // eslint-disable-next-line no-async-promise-executor
        return new Promise(async (resolve, reject) => {
            if (this.data.isLoading) {
                reject();
            } else {
                this.data.isLoading = true;
                try {
                    const { code, data = {} } = await getDetailList(options);
                    this.data.isLoading = false;
                    if (code != 200 || (data.posts || []).length < 1) {
                        reject();
                    } else {
                        if (options.is_season) {
                            this.formatListSeason(data, options, resolve);
                        } else {
                            this.formatListData(data, options, resolve);
                        }
                    }
                } catch (e) {
                    this.data.isLoading = false;
                    reject(e);
                }
            }
        });
    },
    formatListSeason(parent, options, resolve) {
        const { season } = options;
        const { posts = [] } = parent;
        let videoList = posts.map((item) => {
            return this.formatDetail(item);
        });
        const seasonList = this.data.seasonList.map((item) => {
            if (item.season == season) {
                item.focus = true;
            } else {
                item.focus = false;
            }
            return item;
        });
        this.getSeason(seasonList);
        this.setData(
            {
                videoList: [...this.data.videoList, ...videoList],
            },
            () => {
                resolve();
            }
        );
    },
    formatListData(parent, options, resolve) {
        const { posts = [], comic_video: comicVideo = {}, season_list: seasonList = [] } = parent;
        const { chapter_id: chapterId } = options;
        const id = comicVideo.id || '';
        const follow = comicVideo.favourite || false;
        const historyId = comicVideo.continue_play_post_id || '';
        const videoInfo = this.formatVideo(comicVideo);
        let targetCurrent = -1;
        let historyCurrent = 0;
        let videoList = posts.map((item, index) => {
            const chapter = this.formatDetail(item);
            if (chapter.id == chapterId) {
                targetCurrent = index;
            }
            if (chapter.id == historyId) {
                historyCurrent = index;
            }
            return chapter;
        });
        if (this.data.isPreLoad) {
            const activeIndex = targetCurrent >= 0 ? targetCurrent : historyCurrent;
            const row = videoList[activeIndex];
            this.data.videoPreData = videoList;
            this.data.videoPreIndex = activeIndex;
            videoList = [row];
        }
        this.data.seasonList = seasonList;
        this.setFollows(id, follow);
        this.getSeason(seasonList);
        this.setData(
            {
                videoInfo,
                videoList: [...this.data.videoList, ...videoList],
            },
            () => {
                resolve();
            }
        );
    },
    getSeason(seasonList) {
        const len = seasonList.length;
        const findIndex = seasonList.findIndex((item) => item.focus);
        const nextIndex = findIndex + 1;
        const isEnd = nextIndex > len - 1 ? true : false;
        const nextSeason = isEnd ? 0 : seasonList[nextIndex].season;
        this.data.isEnd = isEnd;
        this.data.nextSeason = nextSeason;
    },
    // 格式化合集数据
    formatVideo(data = {}) {
        const id = data.id || '';
        const title = data.title;
        const imgUrl = data.pic || '';
        const count = data.post_count || 0;
        const pic = util_feSuffix({ src: imgUrl, width: 500, quality: false });
        return { id, title, count, pic };
    },
    // 格式化章节数据
    formatDetail(item) {
        const id = item.id || '';
        const pic = item.image_url || '';
        const userAuth = item.user_read_auth || {};
        const chapterAuth = item.post_auth || {};
        const priceInfo = {
            readAuth: userAuth.can_read || false,
            isVip: chapterAuth.vip_exclusive || false,
            isBuy: userAuth.buy || false,
        };
        const disabled = !priceInfo.readAuth;
        const uuid = `${Date.now().toString(36)}_${id}_${Math.random().toString(36)}`;
        return {
            uuid,
            id: String(id),
            url: item.video_url || '',
            title: item.title || '',
            short: item.serial_number || 1,
            pic: util_feSuffix({ src: pic, width: 500, quality: false }),
            liked: false,
            likeCount: 0,
            shareCount: 0,
            disabled,
            priceInfo,
        };
    },
    // 设置当前章节数据
    setCurrentData() {
        const { videoList, current, maxDuration } = this.data;
        const item = videoList[current] || {};
        this.setData({
            chapterId: item.id,
            chapterTitle: item.title,
            duration: maxDuration,
        });
    },
    // 滑屏动画结束回调
    handleFinish(event) {
        const { current } = event.detail || {};
        this.setData(
            {
                current,
            },
            () => {
                this.setCurrentData();
                this.handleLoadMore();
            }
        );
    },
    // 加载下一季
    handleLoadMore() {
        const { videoList, isEnd, isPreLoad, parentId, nextSeason, current } = this.data;
        if (current == videoList.length - 1 && !isEnd && !isPreLoad) {
            this.getMainInfo({
                album_id: parentId,
                season: nextSeason,
                is_season: true,
            });
        }
    },
    // 播放回调
    async handleVideoChange(event) {
        const detail = event.detail || {};
        const { type, current, albumsItem } = detail;
        const { isPreEnd, isPreLoad, videoList, videoPreData, videoPreIndex } = this.data;
        if (type == 'ended') {
            const nextCurrent = current + 1;
            // 自动切换下一话
            if (nextCurrent < videoList.length) {
                this.setData({
                    current: nextCurrent,
                    isShowAlbums: false,
                });
                this.setCurrentData();
            }
        }
        // 首次加载1条数据后，开始播放 or 未解锁状态下，拉取更多数据
        if (isPreEnd && isPreLoad && (type == 'play' || (type == 'load' && albumsItem.disabled))) {
            const list = videoPreData.slice(videoPreIndex + 1);
            this.setData(
                {
                    videoList: [...this.data.videoList, ...list],
                },
                () => {
                    this.data.isPreLoad = false;
                    this.handleLoadMore();
                }
            );
        }
    },
    // 付费相关回调
    async handleVideoPay(event) {
        const { chapter } = event.detail || {};
        const { priceInfo } = chapter;
        if (priceInfo.isVip) {
            this.setData({
                isShowVip: true,
            });
        } else {
            if (!app.globalData.userId) {
                wx.navigateTo({ url: '/pages/login/login' });
            } else {
                let timer = setTimeout(() => {
                    clearTimeout(timer);
                    this.setData({
                        isShowPay: true,
                    });
                }, 100);
            }
        }
    },
    // 显示合集
    handleToolsAlbums() {
        this.setData({
            isShowAlbums: true,
        });
    },
    // 关闭合集
    handleAlbumsClose() {
        this.setData({
            isShowAlbums: false,
        });
    },
    // 切换合集
    handleAlbumsChange(event) {
        const { albumsItem } = event.detail || {};
        const { videoList } = this.data;
        const id = albumsItem.id;
        const title = albumsItem.title;
        const findIndex = videoList.findIndex((item) => item.id == id);
        if (findIndex > -1) {
            this.setData({
                current: findIndex,
            });
            this.setCurrentData();
        } else {
            this.setData({
                chapterId: id,
                chapterTitle: title,
            });
            this.refreshData();
        }
    },
    handlePaySuccess() {
        this.setData({
            isShowPay: false,
            isShowAlbums: false,
            isShowVip: false,
        });
        this.refreshData();
    },
    async vipPaySuccess(e) {
        this.setData({
            isShowPay: false,
            isShowAlbums: false,
            isShowVip: false,
        });

        const { orderId = 0, vipResult = null } = e.detail;
        if (orderId) {
            const sucData = {};
            if (vipResult) {
                sucData.title = vipResult.title || '';
                sucData.kkb = vipResult.kkb_giving || '';
                sucData.vipDays = vipResult.days_giving || '';
            }

            // 显示充值成功弹窗推荐
            const res = await getChargeSuccess({ order_id: orderId });
            let { code, data } = res;
            if (code === 200) {
                let charge_success_info = data.charge_success_info || [];
                charge_success_info = charge_success_info.filter((i) => i.type === 1)[0] || {};
                let benefits = charge_success_info.benefits || [];
                benefits = benefits.filter((i) => i.award_type === 22)[0] || {};

                sucData.bannerData = {
                    content: benefits.content || '',
                    content_arr: benefits.content ? benefits.content.split('#') : [],
                    button_text: benefits.button_text || '',
                    action_target: benefits.action_target || null,
                    award_type: benefits.award_type || 0,
                };

                this.setData({
                    sucData,
                    showVipPop: true,
                });
            }
        }
    },
    closePopup() {
        this.setData({
            showVipPop: false,
        });
        this.refreshData();
    },
    handlePayClose() {
        this.setData({
            isShowPay: false,
        });
    },
    handlePayCallback(event) {
        const { type } = event.detail || {};
        if (type) {
            this.handlePaySuccess();
        } else {
            this.handlePayClose();
        }
    },
    tapPopupVip(event) {
        const { type } = event.detail;
        const isCanPay = !global.isiOS || !!global.iosIsShowPay;
        let buttonName = '确认';
        if (type == 'confirm') {
            if (isCanPay) {
                this.data.isFromVip = true;
                util_action({
                    type: 44,
                });
            } else {
                this.setData({
                    isShowVip: false,
                    isShowTips: true,
                });
            }
        } else if (type == 'weaken') {
            this.setData({
                isShowVip: false,
            });
            buttonName = '取消';
        }
        app.kksaTrack('ClickButton', {
            CurPage: this.data.pageName,
            ButtonName: `弹窗购买vip${buttonName}`,
        });
    },
    tapPopupTips() {
        this.setData({
            isShowTips: false,
        });
    },
    handleVipPopClose() {
        this.setData({
            isShowVip: false,
        });
    },

    checkWallet() {
        if (!this.data.userInfo) {
            this.setWallet(0);
        } else {
            util_checkWallet(this);
        }
    },
    checkVip() {
        if (!this.data.userInfo || this.data.isFirst) {
            return false;
        }

        util_checkVipInfo(this, () => {
            this.setData({
                isShowAlbums: false,
                isShowVip: false,
            });
            this.refreshData();
        });
    },
    tapBack() {
        app.kksaTrack('ClickButton', {
            CurPage: this.data.pageName,
            ButtonName: '返回',
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, wallet, vipInfo }) => {
        return {
            wallet,
            userInfo,
            follows,
            vipInfo,
        };
    },
    (setState, _state) => ({
        setWallet(newVal) {
            setState({
                wallet: newVal,
            });
        },
        setFollows(id, newVal) {
            const follows = _state.follows;
            follows[id] = newVal;
            setState({ follows });
        },
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
