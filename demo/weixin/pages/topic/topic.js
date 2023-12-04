/* eslint-disable no-useless-escape */
/* eslint-disable sonarjs/no-gratuitous-expressions */
/* eslint-disable no-console */
import { util_request, util_action, util_showToast, util_prevPage, util_returnShareContent, util_feSuffix, util_transNum, util_multPage, util_getCustomShare, util_checkWallet, util_checkVipInfo } from '../../util.js';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const userInfoBehavior = require('../../behaviors/userInfo');
const followBehavior = require('../../behaviors/follow');
const praiseBehavior = require('../../behaviors/praise');
const { topicImgs, cdnIconsImgs } = require('../../cdn.js');

const page = {
    behaviors: [followBehavior, praiseBehavior, userInfoBehavior],
    data: {
        link: null,
        topicBanner: null,
        sort: true, // 默认正序
        source: 0,
        banner: '',
        topicId: '',
        scrollTop: 0,
        isFull: false,
        iPhoneX: false,
        showBody: true,
        isUnfold: false,
        followed: false, // 当前专题是否已关注
        loading: false,
        backDelta: false,
        bodyOpacity: 0,
        comicList: [], // 专题章节列表
        topicInfo: {}, // 专题的所有信息
        historyList: [], // 暂存阅读列表数据
        screenRpxRate: '',
        dialogContent: '',
        dialogShow: false,
        isLogin: false,
        posterPicture: '',
        firstImgList: [],
        nextComicId: '',
        scrollLeft: 0,
        continueObj: {},
        topicImgs,
        cdnIconsImgs,
        isShowBulkPurchase: false, // 是否显示批量购买弹窗
    },
    watchUser(uid) {
        const { topicId } = this.data;
        if (uid) {
            this.checkFollow([topicId]);
            this.setData({
                isLogin: !!uid,
            });
        } else {
            // 重新拉取漫评数据，重置专题关注
            this.setFollows(topicId, false);
        }
    },
    async onLoad(e) {
        const { scene } = global,
            { name } = util_prevPage();
        let { id, topicId, source = -1, origin = 1, terminal = 'wechat', experiment_identity = '' } = e;
        if (e.q) {
            // 添加统一二维码进入标识
            const str = decodeURIComponent(e.q),
                posterPicture = str.match(/poster_key=[0-9\_a-z]+/) || null,
                qrcodeSign = str.match(/qrcode=[0-9\_a-z]+/) || null;
            let shareId = str.match(/\?id=[0-9]+/);
            shareId = shareId === null ? '' : ((shareId[0] || '').split('=')[1] || 0) * 1;
            topicId = shareId;

            this.data.posterPicture = posterPicture === null ? '' : (posterPicture[0] || '').split('=')[1] || '';
            this.data.qrcodeSign = qrcodeSign === null ? '' : (qrcodeSign[0] || '').split('=')[1] || '';
        }
        this.data.topicId = topicId * 1 || id * 1; // 前置赋值，避免onshow中使用topicId时无值

        // 判断是否存在来源页面
        if (!name && !Object.keys(global.systemInfo || {}).length) {
            await app.getSystemInfo();
        }
        const { iPhoneX, screenRpxRate, channel, systemInfo } = app.globalData;
        const topicObj = {
            iPhoneX,
            channel,
            isIpx: iPhoneX ? 'isIpx' : '',
            topicId: topicId * 1 || id * 1,
            ipxBottom: iPhoneX ? Math.ceil(34 * screenRpxRate) : 0,
            pageHeight: iPhoneX ? systemInfo.windowHeight - 34 : systemInfo.windowHeight,
        };
        this.setData(topicObj);

        // 上报埋点内容
        if (!name) {
            this.shareCardEnter({ scene, source, origin, terminal, experiment_identity });
        }
        if (!name && !global.openId) {
            await app.getOpenId();
        }
        this.judgeOrigin();
        this.pageInit(e.list);
    },

    // 判断来源
    judgeOrigin() {
        const { name } = util_prevPage();
        const originPages = {
            my: 1,
        };
        this.data.source = (name && originPages[name]) || 0;
    },

    // 前台显示，触发 onShow方法。
    onShow() {
        const { historyPosting } = app.globalData;
        this.setData({
            isLogin: !!global.userId,
        });
        if (historyPosting) {
            app.globalData.historyCallback = () => {
                this.getReadStorage();
            };
        } else {
            this.getReadStorage();
        }

        // qq存在返回专题页title丢失问题
        const { topicTit, isWechat, topicId } = this.data;
        if (topicTit && !isWechat) {
            wx.setNavigationBarTitle({
                title: topicTit,
            });
        }

        if (this.data.userInfo) {
            util_checkVipInfo(this); // 更新vip
            util_checkWallet(this); // 更新kkb
        }

        // 获取当前页自定义分享内容
        util_getCustomShare({ page: 'topic', id: topicId });

        this.getBannerInfo();
    },
    getReadStorage() {
        // 获取续读comicId
        const { userInfo } = this.data;
        if (!this.data.comicList.length) {
            return;
        }
        if (userInfo) {
            this.pageInit();
        } else {
            this.checkHasRead();
        }
    },
    checkHasRead() {
        // 检查是否存在阅读
        let topicHistory = wx.getStorageSync('historyForTopic') || {};
        const obj = topicHistory[this.data.topicId] || {};
        if (obj) {
            const { comicList } = this.data;

            let index;
            if (obj.lastId) {
                index = comicList.findIndex((item) => item.id == obj.lastId);
            }

            this.setData(
                {
                    historyList:
                        (obj.readList &&
                            obj.readList.map((item) => ({
                                id: item.id,
                                read_count: item.read_count || 0,
                            }))) ||
                        [],
                    continueId: obj.lastId ? comicList[index].id : comicList[0].id,
                    continueTitle: obj.lastId ? comicList[index].title : comicList[0].title,
                },
                () => {
                    // 新版本选集定位
                    this.newTopicLocation(true);
                }
            );
        }
    },
    checkStorageComicId() {
        let topicHistory = wx.getStorageSync('historyForTopic') || {};
        const obj = topicHistory[this.data.topicId] || {};
        return obj.lastId || '';
    },
    pullOriginRead() {
        // 已登陆拉取阅读历史
        const { topicId, channel } = this.data;
        util_request({
            url: `/mini/v1/comic/${channel}/topic/read_record`,
            data: {
                topic_id: topicId,
            },
        })
            .then((res) => {
                const { comic_records } = res.data,
                    { comicList } = this.data;
                const continueId = comic_records.filter((item) => item.continue_read_comic).length ? comic_records.filter((item) => item.continue_read_comic)[0].id : '';

                let index;
                if (continueId) {
                    index = comicList.findIndex((item) => item.id == continueId);
                }
                this.setData({
                    historyList:
                        comic_records
                            .filter((item) => !!item.has_read)
                            .map((item) => ({
                                id: item.id,
                                read_count: item.read_count || 0,
                            })) || [],
                    continueId: continueId ? comicList[index].id : comicList[0].id,
                    continueTitle: continueId ? comicList[index].title : comicList[0].title,
                });
            })
            .catch(() => {});
    },
    shareCardEnter({ scene, source, origin, terminal, experiment_identity } = {}) {
        const origins = [1007, 2003, 2016, 1036];
        // 点击分享卡片进入,判断场景值是否为app进入
        if (origins.includes(scene)) {
            this.shareReport({
                origin,
                source,
                share: true,
                type: 2,
                fromapp: scene == 1036,
                terminal,
                experiment_identity,
            });
        }

        // 扫描分享海报进入
        if ([1012, 1013].includes(scene)) {
            this.trackPoster({
                source,
                type: 2,
                fromapp: true,
                terminal,
                experiment_identity,
            });
        }
    },
    onShareAppMessage(e) {
        // 微信只有分享好友，shareTarget默认为3
        const { channel } = global;
        const { from, shareTarget = 3 } = e;
        const { topicId, topicTit } = this.data;
        const origin = from == 'menu' ? 2 : 1;
        const title = `好看哭！《${topicTit}》这个漫画太优秀了！`;
        this.shareReport({
            type: 2,
            trigger: true,
            origin,
            source: shareTarget,
        });

        const params = {
            id: topicId,
            source: shareTarget,
            origin: origin,
            terminal: channel,
        };
        if (global.sySign) {
            params.locate = global.sySign;
        }

        // 分享上报数据组
        app.kksaTrack('Share', {
            ShareContentType: 2,
            SubjectID: topicId,
        });

        // 自定义分享内容
        return util_returnShareContent({ title, page: 'topic', params, shareTarget });
    },

    // share: 从分享卡片进入小程序标识别
    // trigger: 选择分享平台标识
    // type: 1详情页，2专题页
    // fromapp: app分享标识
    // origin: 按钮分享、三个点分享
    // source: 分享到哪个平台
    // terminal: 来源终端
    shareReport({ share = false, trigger = false, type = 1, fromapp = false, origin = '', source = -1, btnclick = false, terminal = 'wechart', experiment_identity = '' } = {}) {
        let eventName;
        const { channel } = global;
        const { topicId, comicId } = this.data;
        const data = {
            SourcePlatform: channel,
            ShareContentType: type,
            ButtonLocation: fromapp ? 0 : origin ? origin : 1, // 漫画底部分享， 来源如果是app，为未知0, 分享卡片过来在参数中拿
            SubjectID: type == 1 ? comicId : type == 2 ? topicId : 0,
        };

        // 判断分享卡片进入
        if (share) {
            eventName = 'OpenShareMiniprogram';
            data.Source = fromapp ? -1 : source;
            data.ShareTerminal = fromapp ? 'APP' : terminal;
            data.Sharetest = experiment_identity; // 实验标识
        }
        // 选择渠道
        if (trigger) {
            eventName = 'ShareChannelSelection';
            data.Source = fromapp ? -1 : source;
        }
        if (btnclick) {
            eventName = 'ClickShareButton';
        }
        app.kksaTrack(eventName, data);
    },

    // 分享海报埋点上报
    trackPoster({ type = 2, fromapp = false, source = -1, terminal = 'wechat', experiment_identity = '' }) {
        const { channel } = global;
        const { topicId, comicId, posterPicture, qrcodeSign, userInfo } = this.data;
        const data = {
            SourcePlatform: channel,
            ShareContentType: type,
            ButtonLocation: 0,
            SubjectID: type == 1 ? comicId : type == 2 ? topicId : 0,
            Source: fromapp ? -1 : source,
            ShareTerminal: fromapp ? 'APP' : terminal,
            Sharetest: experiment_identity, // 实验标识
            PosterPicture: posterPicture,
            IsLogin: !!userInfo,
            QRcode: qrcodeSign,
        };
        app.kksaTrack('OpenShareMiniprogram', data);
    },

    // 初始化页面数据
    pageInit(showDictionary) {
        const { sort, topicId, channel, source, userInfo } = this.data;
        if (this.data.loading) {
            return;
        }

        this.data.loading = true;
        wx.showNavigationBarLoading();
        const data = {
            topic_id: topicId,
            sort: sort ? 'asc' : 'desc',
            page_source: source,
        };
        if (!userInfo) {
            data.base_comic_id = this.checkStorageComicId() || '';
        }
        util_request({
            url: `/mini/v1/comic/${channel}/topic/detail`,
            data: data,
        })
            .then((res) => {
                const { vip_user: isvip, comic_list: comics, topic_info: topic, buy_button: buyButton = {}, first_comic: firstComic = {}, activity_banner: linkInfos, temporary_vip_user: isTempVip = false, continue_read_comic: continueObj = {}, selections } = res.data;
                this.data.isvip = isvip || isTempVip;
                this.data.loading = false;
                topic.title !== this.data.topicTit && wx.setNavigationBarTitle({ title: topic.title });
                wx.hideNavigationBarLoading();

                // 处理续读内容
                Object.assign(this.data, { comicList: comics });

                // 新版新增
                if (this.data.userInfo) {
                    this.setData({
                        continueId: continueObj.id || firstComic.id,
                        continueTitle: continueObj.title || firstComic.title,
                    });
                } else {
                    this.getReadStorage();
                }

                // 处理专题相关信息展示
                let topicObj = {
                    continueObj,
                    showDiscount: !!buyButton.text,
                    isBatchBuy: !!buyButton.text && !global.isiOS,
                    topicTit: topic.title,
                    nextComicId: comics.length >= 2 ? comics[1].id : '',
                    banner: util_feSuffix({ src: topic.cover_image_url, width: 640 }),
                    updateInfo: `${topic.update_status}  ${topic.update_day}`,
                    topicInfo: {
                        intro: topic.description,
                        count: topic.comic_count,
                        updateTime: topic.update_day,
                        authors: topic.related_author.length ? topic.related_author : topic.user ? [].concat(topic.user) : [],
                        author: topic.related_author.length ? topic.related_author.map((item) => item.nickname).join('、') : topic.user.nickname,
                        nickName: topic.user.nickname,
                        authorId: topic.user.id,
                        tags: topic.category,
                        hotnum: util_transNum(topic.view_count), // 热度
                        popular: util_transNum(topic.popularity), // 人气
                        comment: util_transNum(topic.comment_count), // 评论
                        follow: util_transNum(topic.favourite_count), // 关注
                    },
                };

                Object.assign(topicObj, {
                    hasNext: selections.has_next,
                    hasPrevious: selections.has_previous,
                    anthologyList: selections.selections_comic_list.map((item) => ({
                        id: item.id,
                        key: item.id,
                        title: item.title,
                        imgUrl: item.cover_image_url,
                        clock: ((this.data.userInfo && !this.data.historyList.length && continueObj.id) || (!this.data.userInfo && this.data.historyList.length)) && item.id == this.data.continueId,
                        forbidden: !item.is_free || item.vip_exclusive,
                        forbiddenType: item.can_view ? 'lock-off' : 'lock-on',
                        readed: this.data.userInfo ? item.has_read : this.data.historyList.map((item) => item.id).includes(item.id) ? 'readed' : '',
                    })),
                    directoryShow: comics.length > 0 && showDictionary == 1, // 默认展示目录
                });

                if (linkInfos) {
                    // 活动相关数据
                    const action = linkInfos.action_type;
                    topicObj.link = {
                        icon: linkInfos.image_url,
                        text: linkInfos.title_front,
                        btn: linkInfos.title_back,
                        type: action.type,
                        targetId: action.target_id,
                        targetUrl: action.target_web_url || action.hybrid_url || '',
                    };
                }

                this.setFollows(topicId, topic.is_favourite);
                this.setData(topicObj, () => {
                    // 页面显示埋点
                    this.readTopicTrack({ topic, isvip, isTempVip });

                    // 新版本选集定位
                    this.newTopicLocation();
                });
            })
            .catch((e) => {
                // 接口502问题、一些场景返回的问题、这部分待确实是否统一拦截、目前拦截器提示这部分注释掉了
                // 10552: 没有找到这部漫画
                console.log('502进到这里了, 需要拦截');
                this.data.loading = false;
                if (e) {
                    const aryCodes = [10550, 10551, 10554, 10555];
                    this.setData({
                        dialogShow: true,
                        backDelta: [10550, 10551, 10552, 10554, 10555].includes(e.code),
                        dialogTitle: aryCodes.includes(e.code) ? e.message : '',
                        dialogContent: aryCodes.includes(e.code) ? '先去看看其他漫画吧～' : e.message || '找不到当前专题',
                    });
                }
            });
    },
    getBannerInfo() {
        util_request({
            url: '/v1/applet/banner/get',
            data: {
                topic_id: this.data.topicId,
            },
        }).then((res) => {
            const data = res.data || null;
            let bannerInfo = null;
            if (data) {
                bannerInfo = {
                    action_type: JSON.parse(data.action_type),
                    image_url: data.image_url,
                    bannnerName: data.title || '',
                };
                app.kksaTrack('CarouselExposure', {
                    CurPage: 'TopicPage',
                    cps: global.cps,
                    SourcePlatform: global.channel,
                    IsLoginStatus: !!global.userId,
                    BannnerName: bannerInfo.bannnerName,
                    uid: global.userId,
                });
            }
            this.setData({
                topicBanner: bannerInfo,
            });
        });
    },
    goTopicBanner() {
        util_action({ type: this.data.topicBanner.action_type.type, url: this.data.topicBanner.action_type.target_web_url });
        app.kksaTrack('CarouselClk', {
            CurPage: 'TopicPage',
            cps: global.cps,
            SourcePlatform: global.channel,
            IsLoginStatus: !!global.userId,
            BannnerName: this.data.topicBanner.bannnerName,
            uid: global.userId,
        });
    },
    newTopicLocation(sign) {
        // 定位续读
        const { screenRpxRate } = global;
        const { anthologyList, continueId, historyList, userInfo } = this.data;

        if (anthologyList && continueId) {
            const index = anthologyList.findIndex((item) => item.id == continueId);
            if (index >= 0) {
                this.setData(
                    {
                        scrollLeft: 0,
                    },
                    () => {
                        this.setData({
                            scrollLeft: index ? Math.ceil(336 / screenRpxRate) * index : 0,
                        });
                    }
                );
                if (sign) {
                    // 未登录续读状态变化
                    const condition = (userInfo && !historyList.length) || (!userInfo && historyList.length);
                    const historyListIds = historyList.map((item) => item.id);
                    this.setData({
                        anthologyList: anthologyList.map((item, ind) => ({
                            ...Object.assign(item, { clock: condition && index == ind, readed: condition && (index == ind || item.readed || historyListIds.includes(item.id)) }),
                        })),
                    });
                }
            }
        }
    },
    tapDialogButton() {
        this.setData({
            dialogShow: false,
        });
        const { name } = util_prevPage();
        if (this.data.backDelta) {
            if (name) {
                wx.navigateBack({ delta: 1 });
            } else {
                // 返回推荐首页
                wx.reLaunch({ url: '/pages/feed/feed' });
            }
        }
    },
    toggleCotent(event) {
        // 展开/关闭漫评
        let params = event.currentTarget.dataset;
        let show = this.data.comment['list'][params.index].showAll;
        let key = `comment.list[${params.index}].showAll`;
        this.setData({
            [key]: !show,
        });
    },
    followClick() {
        // 点击关注按钮处理
        const { topicId: id, topicTit, topicInfo, recMap } = this.data;
        // this.handleFollow(id)
        const multPage = util_multPage(this.data.pageTrigger);
        const { CurPage } = multPage;
        this.handleFollow(id, false, (res) => {
            const trackData = {
                ...multPage,
                TopicID: id,
                TopicName: topicTit,
                Category: topicInfo.tags.join(','),
                NickName: topicInfo.nickName || '',
                AuthorID: topicInfo.authorId || '',
                TriggerPage: CurPage,
            };
            // 关注埋点
            if (res) {
                this.trackEvent('关注');
                // 上报数据组
                app.kksaTrack(
                    'FavTopic',
                    Object.assign({}, trackData, {
                        ...recMap,
                    })
                ); // 上报神策
            } else {
                // 取消关注埋点
                this.trackEvent('取消关注');
                app.kksaTrack('RemoveFavTopic', trackData); // 上报神策
            }
        });
    },

    // 活动链接
    goActivity() {
        const { topicId: TopicID = 0, topicTit: TopicName = '', link = {} } = this.data;
        const { type, targetId, targetUrl, text } = link;
        this.trackEvent('专题页营销文案');
        util_action({ type, id: targetId, url: targetUrl });
        app.kksaTrack('SalelocateClk', {
            TriggerPage: 'TopicPage',
            TopicID,
            TopicName,
            BtnName: text,
        });
    },
    toggleBody() {
        // body简介展示
        if (this.data.isUnfold) {
            return;
        }
        this.setData({
            showBody: !this.data.showBody,
        });
    },
    directory() {
        // 目录开关
        if (this.data.comicList.length <= 0) {
            util_showToast({
                title: '当前漫画暂未上架，敬请期待',
            });
            return;
        }
        const { directoryShow } = this.data;
        this.trackEvent('目录');
        this.setData({
            directoryShow: !directoryShow,
        });
    },
    directoryTap(e) {
        // 目录组件回调
        const { type } = e.detail,
            { directoryShow } = this.data;
        if (type == 2) {
            this.setPageTrigger('find', {
                module_type: 201,
            });
        }
        if (type) {
            this.setData({
                directoryShow: !directoryShow,
            });
        }
    },

    batchBuy(e) {
        this.oneKeyKksaReport(1);

        // 执行静默登录相关
        app.originLogin(e.detail).then(() => {
            wx.redirectTo({
                url: `/pages/topic/topic?id=${this.data.topicId}`,
            });
        });
    },
    oneKeyBuy() {
        this.setData({ isShowBulkPurchase: true, preposition: true });
    },

    // 一键购买曝光/点击埋点
    oneKeyKksaReport(behavior) {
        const { topicId, topicTit } = this.data;
        const multPage = util_multPage();
        const { TriggerPage: PrePage } = multPage;
        const data = {
            PrePage,
            CurPage: 'TopicPage',
            ClkltemType: '专题页入口',
            ContentName: topicTit,
            ContentID: topicId,
            TabModuleTitle: '整本购',
        };
        app.kksaTrack(behavior ? 'CommonItemClk' : 'CommonItemImp', data);
    },

    // 点击目录一键购买 显示一键购买弹窗
    buyTapEvent(e) {
        const { type } = e.detail;
        if (type) {
            this.setData({ isShowBulkPurchase: true, preposition: false });
        } else {
            // 重新打开页面,自动拉起目录
            wx.redirectTo({
                url: `/pages/topic/topic?id=${this.data.topicId}&list=1`,
            });
        }
    },
    // 关闭一键购买弹窗
    closeBulkPurchase(e) {
        let { isRefresh, type } = e.detail;
        if (isRefresh) {
            // 刷新数据
            this.setData({ directoryShow: false, isShowBulkPurchase: false });
            this.pageInit(type);
            return false;
        }
        this.setData({ isShowBulkPurchase: false });
    },
    actionComic(e) {
        // 跳转详情页
        if (this.data.comicList.length <= 0) {
            util_showToast({
                title: '当前漫画暂未上架，敬请期待',
            });
            return;
        }

        let { historyList, directoryShow } = this.data,
            { id, next } = e.currentTarget.dataset,
            read = false;

        if (!id) {
            return;
        }
        read = historyList.length && historyList.findIndex((item) => item.id == id) >= 0;
        const count = read ? historyList.find((item) => item.id == id).read_count : 0;

        if (directoryShow) {
            this.setData({
                directoryShow: !directoryShow,
            });
        }
        if (next) {
            this.trackEvent('下一页');
        } else {
            this.setPageTrigger('find', {
                module_type: 203,
            });
            this.trackEvent('阅读');
        }
        util_action({ type: 3, id, params: { count } });
    },

    // 点击章节跳转
    anthologyAction(e) {
        const { id } = e.currentTarget.dataset;
        this.setPageTrigger('find', {
            module_type: 200,
        });
        util_action({ type: 3, id });
    },

    // 页面显示埋点
    readTopicTrack(options) {
        const { isvip, isTempVip, topic } = options;
        const { id: TopicID, title: TopicName, signing_status: WorksSigningState = '', self_upload: SelfUpload = false } = topic;
        // 会员身份
        const MembershipClassify = isvip || isTempVip ? 1 : 0; // 修改会员身份 1为会员 0为非会员
        // 页面来源
        const multPage = util_multPage(this.data.pageTrigger);
        const { TriggerPage } = multPage;
        app.kksaTrack('ReadTopic', {
            WorksSigningState,
            SelfUpload,
            TopicID,
            TopicName,
            TriggerPage,
            MembershipClassify,
        });
    },

    // 静默登录
    originLogin(e) {
        app.originLogin(e.detail).then(() => {
            this.setData({
                isLogin: true,
            });
            this.pageInit();
        });
    },

    // dialog 对话框显示
    showDialog() {
        this.setData({
            dialog: {
                show: true,
                title: '登录成功',
                content: '授权手机号登录，可以同步其他平台的漫画阅读历史',
                // contentTwo: '我们不会泄露您的任何隐私',
                // contentThree: '《隐私协议》',
                button: [{ text: '拒绝' }],
            },
        });
    },
    hideDialog() {
        this.setData({
            dialog: {
                show: false,
            },
        });
    },
    onDialogButtontapEvent(e) {
        app.onDialogButtontapEvent(e);
    },
    onDiallogGetPhoneNumberEvent(e) {
        app.onDiallogGetPhoneNumberEvent(e);
    },

    // 埋点内容
    trackEvent(name) {
        const options = {
            ButtonName: name,
        };
        app.kksaTrack('TopicPageClk', options);
    },

    // 底部推荐回调
    onRecommend() {
        this.setPageTrigger('find', {
            module_type: 202,
        });
    },

    // 付费弹窗关闭回调
    async topicPayFinish() {
        await util_checkWallet(this);
    },

    // 点击关闭按钮回调
    closeDiscounts() {
        this.setData({
            showDiscount: false,
        });
    },

    // 余额充足/不足购买成功后回调
    topicApiRefresh() {
        this.topicPayFinish();
        this.closeDiscounts();
        this.pageInit();
    },
    async loginSuccessCb() {
        this.closeDiscounts();
        await this.topicPayFinish();
        this.pageInit();
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, pageTrigger, recMap, wallet, vipInfo }) => {
        return {
            userInfo,
            follows,
            pageTrigger,
            recMap,
            wallet,
            vipInfo,
        };
    },
    (setState, _state) => ({
        setPageTrigger(page, newVal) {
            const pageTrigger = _state.pageTrigger;
            pageTrigger[page] = newVal;
            setState({ pageTrigger });
        },
        setFollows(id, newVal) {
            const follows = _state.follows;
            follows[id] = newVal;
            setState({ follows });
        },
        setWallet(newVal) {
            setState({
                wallet: newVal,
            });
        },
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
