/* eslint-disable no-useless-escape */
import {
    util_request,
    util_action,
    util_showToast,
    util_transNum,
    util_multPage,
    util_prevPage,
    util_getActivityShare,
    util_returnShareContent,
    util_getCustomShare,
    util_notiOS,
    util_updateUserInfo,
    util_getAbTest,
    util_skipDirection,
    util_getElementWH,
    util_performanceTrack,
    util_showNotify,
    util_hideNotify,
    util_checkWallet,
    util_checkVipInfo,
} from '../../util.js';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const userInfoBehavior = require('../../behaviors/userInfo');
const followBehavior = require('../../behaviors/follow');
const praiseBehavior = require('../../behaviors/praise');
const barrage = require('../../behaviors/barrage');
const { comicImgs } = require('../../cdn.js');
let PageStartTimestamp = new Date().getTime();
// console.log("初次进入小程序数据等初始化，只冷启动执行一次", PageStartTimestamp)

const comicPage = {
    behaviors: [followBehavior, praiseBehavior, userInfoBehavior, barrage],
    data: {
        netTip: false,
        comicId: '',
        topicId: '',
        topicTit: '',
        oriPos: '', // 记录图片定位位置
        iPhoneX: false,
        onGetting: false, // 正在getData的标示
        scrollTop: 0, // 竖向滚动条位置
        scrollHeight: 0,
        scrollAnimation: false, // 定位到某个位置滚动动画过渡
        tapScreen: false, // 一定条件下点击全屏
        fullScreen: false, // 是否全屏（隐去操作栏）
        pageHeight: 0, // 安全区域高度
        imgList: [],
        userId: '', // 用户userId
        scrollTops: [], // 计算使用
        screenRpxRate: '',
        backDelta: false, // 是否返回上一页
        signingStatus: '', // 签约状态
        fromApp: false, // 本地是否存在app

        isExeFav: false,
        favTimer: null,
        showSuperFav: false,

        // 支付相关
        webview: '', // 会员开通页情况
        vipShow: false, // android会员弹窗显示
        vipType: '', // android会员弹窗类型
        vipProps: {}, // vip弹窗接口参数集合
        vipStatus: '', // 会员状态 1、普通付费 2、限免 3、提前看 4、固锁
        vipToast: '', // 会员显示
        autoPay: false, // 自动支付
        showPay: false, // 暂存弹窗打开状态
        payDialog: false, // 付费弹窗

        danmuHidden: false, // 是否显示弹幕
        initDanmu: false, // 是否开始初始化弹幕
        updateRemind: '', // 漫底更新内容

        // 阅读历史相关
        totalCount: 0, // 当前章节图片总数量
        historyForMy: [], // 存储相关历史供个人页使用
        historyForTopic: null, // 存储专题页所用历史记录
        historyForPost: [], // 进度上报
        comicImageList: [],

        // 埋点相关
        timestamp: 0, // 记录初始化时间戳
        maxReadCount: 0, // 最大阅读漫画数
        pageShow: false, // 曝光相关

        directoryShow: false, // 目录
        adVisible: false, // 是否显示广告

        // 补充
        showDialog: false,
        isShowRecommend: false,

        // 章节类型
        chapterType: '',
        posterPicture: '',
        images: {
            close: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/close_00499c9.png',
            popup: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/buykkb/popup_b0c5425.png',
        },
        showDirectPay: false,
        loadDirectPay: false,
        showGreenHands: false, // 是否显示新手福利内容
        redirect_url: '',
        dialog: { show: false },
        isShowBackTop: false, // 是否显示返回顶部按钮
        isShowClass: false, // 是否显示分类&推荐模块
        isShowTopBubble: false, // 是否显示添加桌面提醒
        remindShow: false, // 更新提示弹窗
        comicImgs,
        appletAction: null, // 免费小程序通用跳转
        isShowBulkPurchase: false, // 是否显示批量购买弹窗
        suspendAnimation: true, // 挂角动画
        isShowMessage: false, // 是否显示公众号订阅弹窗提示
        isBonusChapter: false,
    },
    watchUser(uid) {
        const { topicId, comicId, praised, likeCount } = this.data;
        if (uid) {
            this.checkFollow([topicId]);
            this.checkPraise({ list: [comicId] }, (list) => {
                this.setData({
                    praised: list[0].is_liked,
                    praiseNum: util_transNum(list[0].like_count),
                });
            });
        } else {
            this.setFollows(topicId, false);
            this.setData({
                praiseNum: praised ? (likeCount ? util_transNum(likeCount - 1) : '') : util_transNum(likeCount),
                praised: false,
            });
        }
    },
    async onLoad(e) {
        let { userInfo, wallet } = this.data,
            { name } = util_prevPage();

        // 性能数据采集部分
        const OnLoadStartTimestamp = new Date().getTime();
        this.data.OnLoadStartTimestamp = OnLoadStartTimestamp;

        // 非启动直达页面无需再次收集
        if (!name && !e.autobuy) {
            this.data.PageStartToPageLoadTime = OnLoadStartTimestamp - PageStartTimestamp;
            this.data.OnLaunchToPageLoadTime = OnLoadStartTimestamp - global.onLaunchStartTime || 0;
        }
        if (global.OnActionStartTimestamp) {
            this.data.OnActionToPageLoadTime = OnLoadStartTimestamp - global.OnActionStartTimestamp;
        }

        let { id, comicId, count = 0, autobuy = false, source = -1, origin = 1, parentId = '', terminal = '', jointid = '', track_code = '', bookmark = '', experiment_identity = '', redirect_url = '', dirmark = false, mq = '' } = e;

        // 判断是否存在来源页面
        if (!name && !Object.keys(global.systemInfo || {}).length) {
            await app.getSystemInfo();
        }
        const { scene, payfrom, systemInfo, iPhoneX, screenRpxRate, channel } = global;
        const { screenWidth, windowHeight, screenHeight, model } = systemInfo;
        redirect_url = redirect_url ? decodeURIComponent(decodeURIComponent(redirect_url)) : '';

        if (e.q) {
            // 添加统一二维码进入标识
            const str = decodeURIComponent(e.q),
                posterPicture = str.match(/poster_key=[0-9\_a-z]+/) || null,
                qrcodeSign = str.match(/qrcode=[0-9\_a-z]+/) || null;
            let shareId = str.match(/\?id=[0-9]+/);
            shareId = shareId === null ? '' : ((shareId[0] || '').split('=')[1] || 0) * 1;
            comicId = shareId;

            this.data.posterPicture = posterPicture === null ? '' : (posterPicture[0] || '').split('=')[1] || '';
            this.data.qrcodeSign = qrcodeSign === null ? '' : (qrcodeSign[0] || '').split('=')[1] || '';
        }
        global.adAge = e.mediumage || '';
        global.adGender = e.mediumgender || '';
        Object.assign(this.data, {
            mq,
            dirmark,
            autobuy,
            screenWidth,
            screenHeight,
            screenRpxRate,
            cacheFull: true,
            scrollTops: [],
            cacheCount: count * 1,
            parentId: parentId ? parentId * 1 : '',
            pageHeight: iPhoneX ? windowHeight - 34 : windowHeight,
            userId: userInfo ? userInfo.user.id : '', // 暂存用户id
            curWallet: wallet ? wallet : 0, // 暂存用户余额
        });

        this.setData({
            payfrom,
            iPhoneX,
            channel,
            track_code,
            source,
            terminal,
            webview: this.data.vipInfo,
            fromApp: scene == 1036 || scene == 1069, // 这些场景id可以认定本地存在app
            comicId: comicId * 1 || id * 1,
            ipxBottom: iPhoneX ? Math.ceil(34 * screenRpxRate) : 0,
            padBottom: iPhoneX ? Math.ceil(34 * screenRpxRate) + 98 : 98, // 底部操作栏
            miMode: !model ? '' : model.toLocaleLowerCase().includes('mi') ? 'miMode' : '',
            openContinuRead: global.openContinuRead, // 是否开启连续阅读
            redirect_url, // 返回webview（h5代金劵）页面，需要刷新的url
            showGreenHands: !!name,
        });

        // 进入清除活动页缓存
        const activityBack = wx.getStorageSync('activity:back') || false;
        if (activityBack) {
            wx.removeStorageSync('activity:back');
        }

        // 跳转上下章节将活动相关分享时种的相关缓存清除
        if (autobuy) {
            wx.removeStorageSync('activity:share');
        }

        // 存在续读标识拦截是否存在续读
        if (bookmark) {
            const res = await util_skipDirection({ topicId: bookmark });
            const { continueId } = res;
            if (continueId) {
                this.setData({ comicId: continueId });
            }
        }

        if (!name && !global.openId) {
            await app.getOpenId();
        }
        if (!name && !track_code) {
            // 上报埋点内容
            this.shareCardEnter({ scene, source, origin, terminal, jointid, experiment_identity });
        }
        if (!name) {
            await app.getAbTest();
        }

        this.pageInit({ initCatalog: e.list });

        // 检测右上角气泡
        this.handlerBubble();

        // 自定义导航部分
        util_getElementWH('#navigation').then((res) => {
            this.setData({
                navHeight: res.height,
            });
        });

        // 上报历史记录、是否阅读过等信息、暂不处理
        this.data.historyForMy = wx.getStorageSync('historyForMy') || [];
        this.data.historyForTopic = wx.getStorageSync('historyForTopic') || {};
        this.data.historyForPost = wx.getStorageSync('historyForPost') || [];
    },
    onShow() {
        // 行为解锁分享成功刷新页面操作
        if (this.data.shareBehavior && this.data.isUnlock) {
            util_showToast({
                title: `分享成功！漫画已解锁，限时免费${this.data.unlockMsg}天~`,
                duration: 3000,
            });
            this.data.showPay = false; // 解锁成功需将付费弹窗暂存状态清除掉
            this.data.shareBehavior = false;
            this.pageInit({ behavior: true });
            return;
        } else if (this.data.shareBehavior && !this.data.isUnlock) {
            // 解锁失败
            this.data.shareBehavior = false;
            util_showToast({
                title: '分享解锁失败，请重试',
                duration: 3000,
            });
        }

        // 重置阅读时长
        this.data.timestamp = new Date().getTime();

        this.setData({ pageShow: true });

        this.loginLaterDispose();

        app.getOpenId().then(() => {
            // 判断是否是从广告进入，如果是需要调用刷新性别，年龄接口
            this.updateInfo();
            // 相关活动分享
            this.onShowInit();
        });

        if (this.data.userInfo) {
            util_checkVipInfo(this); // 更新vip
            util_checkWallet(this); // 更新kkb
        }

        app.kksaTrack('VisitComicPage');
    },

    // 页面初次渲染完成时触发。一个页面只会调用一次，代表页面已经准备妥当，可以和视图层进行交互
    onReady() {
        let OnReadStartTimestamp = new Date().getTime();
        let OnLoadToPageReadyTime;
        let { OnLaunchToPageLoadTime, PageStartToPageLoadTime, OnLoadStartTimestamp, OnActionToPageLoadTime } = this.data;

        this.data.OnReadStartTimestamp = OnReadStartTimestamp;
        OnLoadToPageReadyTime = OnReadStartTimestamp - OnLoadStartTimestamp;

        const options = {
            OnLoadToPageReadyTime,
        };
        if (OnLaunchToPageLoadTime) {
            options.OnLaunchToPageLoadTime = OnLaunchToPageLoadTime;
        }
        if (PageStartToPageLoadTime) {
            options.PageStartToPageLoadTime = PageStartToPageLoadTime;
        }
        if (OnActionToPageLoadTime) {
            options.OnActionToPageLoadTime = OnActionToPageLoadTime;
        }

        util_performanceTrack('PerformanceReadyBase', {
            ...options,
            CurrentPageBase: 'comic',
        });

        // 收集后需要重置的数据，例如目前只收集详情页间的跳转，其他遗漏跳转详情页没有初始化时间，之前的时间还在保留
        global.OnActionStartTimestamp = 0;

        this.setData({ readyTime: true }); // 统一onReady时机，将不紧急的延后渲染处理
    },
    onShowInit() {
        // 获取当前页自定义分享内容
        const { comicId, track_code, source, terminal } = this.data;

        // 三期活动裂变相关弹窗相关, 在活动页返回当前页，不请求
        const { name } = util_prevPage(),
            origins = [1007, 2003, 2016, 1036];
        if (!name && origins.includes(global.scene) && this.data.track_code) {
            this.shareEnterTrack(source, terminal); // 活动分享卡片进入
        }
        const activityBack = wx.getStorageSync('activity:back') || false;
        if (track_code && !activityBack) {
            util_getActivityShare({
                id: 'Mp_anlimanhua_07',
                comicId,
                cb: () => {
                    if (track_code != global.activityTrackId) {
                        this.showActivityPopup();
                    }
                },
            });
        }
    },
    showActivityPopup() {
        const { track_code, comicId, userInfo, dialogShow } = this.data;
        util_request({
            url: `/v1/share/content/${global.channel}/page/pop`,
            data: {
                track_code,
                comic_id: comicId,
            },
        }).then((res) => {
            const { popup_title: title, popup_content: desc, button_content: btnText, button_url: url, button_type: type, popup: isShowPopup } = res.data || {};
            // 避免其他弹窗冲突
            if (isShowPopup && !dialogShow) {
                this.setData({
                    userInfo,
                    isShowPopup,
                    popupData: {
                        title,
                        desc,
                        url,
                        type,
                        button: btnText,
                    },
                });
            }
        });
    },

    // 新增折叠
    unfoldAll() {
        const { scrollTop, scrollHeight } = this.data;
        this.setData(
            {
                unfoldHeight: 0,
                showUnfoldAll: false,
            },
            () => {
                this.handleScroll({
                    detail: {
                        scrollTop,
                        scrollHeight,
                    },
                });
            }
        );
        this.comicModuleTrack('ComicPageModuleClick', {
            type: '展开阅读全文',
        });
    },

    // 理解为登录之后或者切换账户的处理
    loginLaterDispose() {
        const { webview, showVip, showPay, userInfo, userId, payfrom, topicId, comicId, topicTit, comicTit, vipStatus, isvip, wallet } = this.data;

        // 如果会员弹窗或付费弹窗
        if (showVip || showPay) {
            // 切换帐号（包括由未登录状态 ==> 已登录）
            if (userInfo && userId !== userInfo.user.id) {
                this.data.userId = userInfo.user.id;
                this.pageInit();
                return;
            }
            // 根据h5付费页面返回相关处理是否重新刷新页面
            if (webview != this.data.vipInfo) {
                this.pageInit();
                return;
            }
            if (showVip) {
                const vipProps = {
                        from: payfrom,
                        topic_id: topicId,
                        comic_id: comicId,
                    },
                    trackProps = {
                        isvip,
                        TopicName: topicTit,
                        ComicName: comicTit,
                        LatestBalance: wallet,
                    };
                this.setData({
                    userInfo,
                    vipProps,
                    fullScreen: false,
                    vipShow: true,
                    vipType: vipStatus,
                    trackProps,
                });
            }
            if (showPay) {
                this.setData({
                    topicId,
                    comicId,
                    topicTit,
                    comicTit,
                    vipStatus,
                    fullScreen: false,
                    payDialog: true,
                    showPay: false,
                });
            }
        }
    },
    onUnload() {
        // 已登录状态上报服务端阅读信息
        this.setTopicHistory();
        this.setMyHistory();
        this.reportedData();

        // 推荐打点、基础埋点
        this.onTrack('ReadComic');

        this.setData({ pageShow: false });

        // 离开页面，清空广告链接参数
        app.clearAdParam();

        // 如果是返回h5的代金劵页面
        let pages = getCurrentPages();
        let prevPage = pages[pages.length - 2]; // 上一个页面
        if (prevPage && prevPage.options.url && prevPage.options.url.includes('limit_free_mini')) {
            // 直接调用上一个页面的setData()方法，把数据存到上一个页面中去
            let backh5url = this.data.redirect_url;
            // 返回h5活动页面的上一个页面
            prevPage.setData({ redirect_url: backh5url });
        }
    },
    onHide() {
        this.setTopicHistory();
        this.setMyHistory();
        this.reportedData();

        // 推荐打点、基础埋点
        this.onTrack('ReadComic');

        this.setData({ pageShow: false });

        // 弹窗内容存在，暂存信息
        if (this.data.payDialog || this.data.vipShow) {
            this.setData({
                payDialog: false,
                vipShow: false,
                showPay: this.data.payDialog || false,
                showVip: this.data.vipShow || false,
            });
        }
    },
    shareClick() {
        this.clickTrack({ type: 5 });
        this.shareReport({ type: 1, btnclick: true }); // 按钮点击进入
    },
    shareCardEnter({ scene, source, origin, terminal, jointid, experiment_identity } = {}) {
        const origins = [1007, 2003, 2016, 1036];
        // 点击分享卡片进入,判断场景值是否为app进入
        if (origins.includes(scene)) {
            this.shareReport({
                origin,
                source,
                share: true,
                type: 1,
                fromapp: scene == 1036 || !terminal,
                terminal,
                jointid,
                experiment_identity,
            });
        }

        // 扫描分享海报进入
        if ([1012, 1013].includes(scene)) {
            this.trackPoster({
                source,
                type: 1,
                fromapp: true,
                terminal,
                experiment_identity,
            });
        }
    },
    onShareAppMessage(e) {
        // 微信只有分享好友，shareTarget默认为3
        const { channel } = global;
        const { from, shareTarget = 3, target } = e;
        const { topicId, comicId, topicTit } = this.data;
        const origin = from == 'menu' ? 2 : 1;
        const title = `好看哭！《${topicTit}》这个漫画太优秀了！`;
        this.shareReport({
            type: 1,
            trigger: true,
            origin,
            source: shareTarget,
        }); // 选择渠道进入
        const params = {
            id: comicId,
            source: shareTarget,
            origin: origin,
            terminal: channel,
            jointid: `${topicId}-${comicId}`,
        };
        if (global.sySign) {
            params.locate = global.sySign;
        }

        // 活动弹窗区分、种个缓存服务端使用
        wx.setStorageSync('activity:share', true);

        // 行为解锁
        if (target && target.dataset && target.dataset.jumptype == 3 && target.dataset.sign) {
            this.data.shareBehavior = true;
            this.shareUnlock({ sign: target.dataset.sign });
        }

        // 分享上报数据组
        app.kksaTrack('Share', {
            ShareContentType: 1,
            SubjectID: `${topicId}-${comicId}`,
        });

        // 自定义分享内容/分享时上报
        return util_returnShareContent({ title, page: 'comic', params, shareTarget });
    },

    // 分享即时解锁
    shareUnlock({ sign = '' } = {}) {
        const { topicId, comicId } = this.data;
        util_request({
            method: 'post',
            host: 'pay',
            url: '/v1/payactivity/behavoir_task/comic_auth_buy_share',
            data: {
                topic_id: topicId,
                comic_id: comicId,
                source: 1,
                share_free_sign: sign,
            },
        })
            .then((res) => {
                const { freeComicOrderModel } = res.data;
                // 3:购买成功 0:参数异常 1:重复购买 2:购买失败
                const day = 24 * 60 * 60 * 1000;
                const time = freeComicOrderModel.expiredTime - new Date().getTime();
                this.data.isUnlock = true;
                this.data.unlockMsg = Math.ceil((time > 0 ? time : 0) / day); // 下发毫秒转化向上取整
            })
            .catch(() => {
                this.data.isUnlock = false;
            });
    },

    // share: 从分享卡片进入小程序标识别
    // trigger: 选择分享平台标识
    // type: 1详情页，2专题页
    // fromapp: app分享标识
    // origin: 按钮分享、三个点分享
    // source: 分享到哪个平台
    // terminal: 来源终端
    shareReport({ share = false, trigger = false, type = 1, fromapp = false, origin = '', source = -1, jointid = '', btnclick = false, terminal = 'wechat', experiment_identity = '' } = {}) {
        let eventName;
        const { channel } = global;
        const { topicId, comicId } = this.data;
        const data = {
            SourcePlatform: channel,
            ShareContentType: type,
            ButtonLocation: fromapp ? 0 : origin ? origin : 1, // 漫画底部分享， 来源如果是app，为未知0, 分享卡片过来在参数中拿
            SubjectID: fromapp ? `0-${comicId}` : share ? jointid : `${topicId}-${comicId}`,
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
    // 活动分享卡片进入
    shareEnterTrack(source, terminal) {
        const track = {
            SourcePlatform: global.channel,
            ShareTerminal: global.scene == 1036 || !terminal ? 'APP' : terminal,
            ShareContentType: 3,
            ButtonLocation: 0,
            Source: source * 1,
            SubjectID: '安利漫画领奖励',
            IsLogin: !!this.data.userInfo,
        };
        app.kksaTrack('OpenShareMiniprogram', track);
    },

    // 分享海报埋点上报
    trackPoster({ type = 1, fromapp = false, source = -1, terminal = 'wechat', experiment_identity = '' }) {
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

    // 分享弹窗按钮点击
    dialogTap() {},
    pageInit({ behavior = false, initCatalog = '' } = {}) {
        wx.showNavigationBarLoading();
        this.getComicDetail({ behavior, initCatalog });
        this.watchNetwork({ behavior });
    },

    tapDialogButton(e) {
        this.setData({
            dialogShow: false,
        });
        if (this.data.vipToast) {
            // IOS 操作
            const data = e.detail || {};
            const { isiOS } = app.globalData;
            if (isiOS) {
                if (data.index == 1) {
                    // 点击的索引是1说明是第二个按钮-查看更多
                    wx.switchTab({ url: '/pages/find/find' });
                } else {
                    // 说明是点击取消 返回上一页
                    wx.redirectTo({ url: `/pages/topic/topic?id=${this.data.topicId}` });
                }
            } else {
                // 执行会员开通的操作
                this.goVipOpen();
            }
            return false;
        }
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

    // 网络监听
    watchNetwork() {
        wx.getNetworkType({
            success: (res) => {
                // 返回网络类型, 有效值：
                // wifi/2g/3g/4g/unknown(Android下不常见的网络类型)/none(无网络)
                const networkType = res.networkType;
                if (networkType == 'none') {
                    this.setData({
                        dialogShow: true,
                        backDelta: true,
                        dialogContent: '网络有些问题，请检查网络连接~',
                        dialogButton: [{ text: '我知道了' }],
                    });
                } else {
                    // this.getComicDetail({ behavior });
                    if (networkType !== 'wifi') {
                        util_showToast({
                            title: '正在使用移动流量',
                            duration: 2000,
                            position: {
                                bottom: '40%',
                            },
                        });
                    }
                }
            },
        });
        wx.onNetworkStatusChange((res) => {
            // 网络是否链接
            if (res.isConnected) {
                if (res.networkType !== 'wifi') {
                    util_showToast({
                        title: '正在使用移动流量',
                        duration: 2000,
                        position: {
                            bottom: '40%',
                        },
                    });
                }
            } else {
                util_showToast({
                    title: '网络有些问题，请检查网络连接~',
                    duration: 2000,
                });
            }
        });
    },

    // 获取comic页面详情
    getComicDetail({ behavior = false, initCatalog = '' } = {}) {
        const { onGetting, comicId, parentId, autobuy, count, dirmark, mq } = this.data;
        if (onGetting) {
            return;
        }

        this.setData({ onGetting: true });
        util_request({
            url: `/mini/v1/comic/${global.channel}/comic/detail`,
            host: 'api',
            data: {
                topic_id: parentId ? parentId : '',
                comic_id: comicId ? comicId : '',
            },
        })
            .then((res) => {
                util_performanceTrack('MainInterface', {
                    CurrentPageBase: 'comic',
                    MainInterfaceTime: new Date().getTime() - global.mainInterfaceStartTimestamp || 0,
                    MainInterfaceUrl: `/mini/v1/comic/${global.channel}/comic/detail`,
                });

                const { code, data } = res;
                if (code === 200) {
                    const {
                            vip_user: isvip,
                            comic_basic_info: comicInfo,
                            topic_basic_info: topicInfo,
                            comic_image_list: imageList,
                            next_comic_id: nextComicId,
                            previous_comic_id: preComicId,
                            is_danmu_hidden: danmuHidden,
                            temporary_vip_user: temporaryVip,
                            toast_text: toastText, // 新手福利toast文案提示
                            comic_auth: comicAuth,
                            content: comicContent = [],
                            show_authorization_pop: showAuthorization = false,
                            config: comicConfig = {},
                            applet_action: appletAction = null,
                        } = data,
                        { id: topicId, title: topicTit, is_free: topicFree, comic_count: comicCount, vertical_image_url: verticalUrl, is_favourite: followed, update_remind: updateRemind, signing_status: signingStatus, cover_image_url: coverUrl } = topicInfo,
                        { id: comicId, is_liked: praised, like_count: praiseNum, title: comicTit, comic_property_code: comicProperty } = comicInfo,
                        { body_fold_switch: unfoldAb = true } = comicConfig,
                        dataObj = {};

                    // 图片列表数据
                    let top = 0;
                    let imgList = imageList.map((item, index) => {
                        let height = (item.height * 750) / item.width;
                        let imgObj = {
                            id: `pic_${comicId}_${index}`,
                            src: item.image_url,
                            height: Math.round(height / this.data.screenRpxRate) - 1 + 'px',
                            numHeight: height,
                            top: top,
                            loaded: false, // 是否加载完成
                            key: item.key,
                        };
                        top += height / this.data.screenRpxRate; // 计算每张图片距离顶部位置
                        return imgObj;
                    });

                    // 前置先展示图片
                    this.setData({ imgList, isBonusChapter: comicProperty && comicProperty == 6 });

                    // 计算当前章节类型
                    const chapterLen = comicContent.length;
                    const chapterIndex = comicContent.findIndex((child) => {
                        return child.comic_id == comicId;
                    });
                    const isChapterFirst = chapterIndex === 0;
                    const isChapterLast = chapterIndex === chapterLen - 1;
                    const chapterType = isChapterFirst ? '首话' : isChapterLast ? '最新话' : '中间话';

                    // 行为解锁成功埋点上报
                    if (behavior) {
                        app.kksaTrack('Consume', {
                            TriggerButton: '分享漫画解锁',
                            ActivityName: '分享漫画解锁',
                            TopicName: topicTit,
                            TriggerPage: 'ComicPage',
                            AdPaid: 0,
                        });
                    }

                    const pages = getCurrentPages();
                    if (pages.length && pages[pages.length - 1].route.includes('comic')) {
                        wx.setNavigationBarTitle({
                            title: comicInfo.title,
                        });
                    }
                    wx.hideNavigationBarLoading();
                    this.setFollows(topicId, followed);

                    // isPay: 章节不是免费的且不能看
                    const isPay = !comicInfo.is_free && !comicInfo.can_view;

                    // 暂存信息、将只需要暂存和需要set的区分开，减少一次set数据压力
                    Object.assign(this.data, {
                        isPay,
                        isvip,
                        topicId,
                        comicId,
                        topicTit,
                        comicCount,
                        verticalUrl,
                        // prevPay: false, // 无用删除
                        // nextPay: false, // 无用删除
                        signingStatus,
                        temporaryVip,
                        toastText,
                        showAuthorization,
                        topicFree,
                        isFree: comicInfo.is_free,
                        currentPrice: comicInfo.selling_price || 0, // 当前章节价格
                        ulockReason: comicInfo.reason && comicInfo.reason == 11 ? '畅读卡解锁' : 0, // 解锁原因
                    });
                    const { name } = util_prevPage();
                    Object.assign(dataObj, {
                        topicId,
                        // imgList,
                        followed,
                        danmuHidden,
                        comicId,
                        comicTit,
                        praised,
                        onGetting: false,
                        likeCount: praiseNum,
                        praiseNum: util_transNum(praiseNum),
                        totalCount: imgList.length,
                        lastId: preComicId || '',
                        nextId: nextComicId || '',
                        updateRemind,
                        comicImageList: imageList,
                        topicTit,
                        chapterType,
                        coverUrl,
                        appletAction,
                        unfoldHeight: unfoldAb && !count && !name && !autobuy && !dirmark && imgList.length > 5 ? Math.floor(imgList[5].top) + 'px' : 0,
                        showUnfoldAll: unfoldAb && !count && !name && !autobuy && !dirmark && imgList.length > 5,
                        directoryShow: initCatalog && initCatalog == 1,
                        isShowMessage: !!mq,
                    });

                    const params = {
                        dataObj,
                        topicInfo,
                        comicInfo,
                        comicAuth,
                    };

                    // autobuy翻页自动购买场景、需要付费且翻页的才走这部分
                    if (isPay && autobuy) {
                        // 查询付费信息 接口回调、不确定是否需要、根据回调判断是否可以自动购买、kkb支付等
                        const { id: comicId, title: comicTit } = comicInfo;
                        // 自动购买逻辑
                        this.requestPayInfo()
                            .then((payInfo) => {
                                let { autoPay, kk_currency_balance: wallet } = payInfo;
                                wallet = wallet < 0 ? 0 : wallet;
                                const listItem = payInfo.batch_purchase_list[0];
                                const encrypt = listItem.comicbuy_encrypt_str;
                                const prize = listItem.price_info.selling_kk_currency;
                                if (autoPay && wallet >= prize) {
                                    // 购买
                                    this.data.autoPay = true;
                                    this.requestPaid({
                                        comicId,
                                        encrypt,
                                        report: {
                                            comic_name: comicTit,
                                            current_price: prize,
                                            auto_paid: 1,
                                        },
                                    })
                                        .then((data) => {
                                            util_showToast({
                                                title: data.auto_pay_time > 0 ? '买好啦，请愉快食用！' : '自动购买，可在钱包设置',
                                                duration: 1500,
                                            });
                                            this.data.onGetting = false;
                                            this.getComicDetail();
                                        })
                                        .catch(() => {
                                            this.setDataLater(params);
                                        });
                                } else {
                                    this.setDataLater(params);
                                }
                            })
                            .catch(() => {
                                this.setDataLater(params);
                            });
                    } else {
                        this.setDataLater(params);
                    }

                    // 记录该专题下新手福利toast展示
                    // 存储格式  'topicId': 'uid_time'
                    let curBenifit = wx.getStorageSync('benifitStore') || {};
                    const id = this.data.topicId;
                    const today = this.getToday(); // 当天
                    const uid = this.data.userId;
                    const f = `${uid}_${today}`;
                    // toastText有值时
                    if (this.data.toastText) {
                        // 判断缓存中是否存在该专题，并且比较存储的时机，如果存储时间超过1天(自然天)，更新存储时间，如果不存在该专题，存入缓存
                        // 存在专题时
                        if (Object.prototype.hasOwnProperty.call(curBenifit, id)) {
                            const time = curBenifit[id];
                            // 不是当天弹出
                            if (f !== time) {
                                util_showToast({
                                    title: this.data.toastText,
                                    duration: 3000,
                                });
                                curBenifit[id] = f;
                            }
                            // 不存在专题时，弹出
                        } else {
                            util_showToast({
                                title: this.data.toastText,
                                duration: 3000,
                            });
                            curBenifit[id] = f;
                        }
                        // 存在更新时间，不存在则存入

                        wx.setStorageSync('benifitStore', curBenifit);
                    }

                    // 拉取自定义分享内容
                    util_getCustomShare({ page: 'comic', id: comicId, cb: () => {} });
                }
            })
            .catch((e) => {
                if (e) {
                    this.setData({
                        dialogShow: true,
                        backDelta: true,
                        dialogTitle: [10550, 10551].includes(e.code) ? e.message : '',
                        dialogContent: [10550, 10551].includes(e.code) ? '先去看看其他漫画吧' : e.message || '当前章节未找到',
                        dialogButton: [{ text: '我知道了' }],
                    });
                }
            });
    },

    // 获取时间
    getToday() {
        const date = new Date();
        const y = date.getFullYear();
        const m = this.filterZero(date.getMonth() + 1);
        const d = this.filterZero(date.getDate());
        return `${y}${m}${d}`;
    },

    filterZero(val) {
        return val < 10 ? `0${val}` : val;
    },

    // set数据后的一些处理
    setDataLater({ dataObj, topicInfo, comicInfo, comicAuth } = {}) {
        // 判断是否冻结kkb 0正常 1冻结
        if (comicAuth && comicAuth.status == 1) {
            this.setData({
                kkbLocked: true,
                lockedContent: comicAuth.toast || '您的账号已被冻结，冻结期间无法阅读付费漫画，请联系客服处理~',
                lockedButton: [{ text: '我知道了' }],
            });
        }

        const { isvip, isPay, showVip, showDialog, payfrom, userInfo, temporaryVip } = this.data;
        const { id: topicId, title: topicTit } = topicInfo,
            { reason, id: comicId, title: comicTit, can_view: canView } = comicInfo;
        this.setData(dataObj, async () => {
            // 下一话、漫底实验
            this.comicAbtest();
            // 是会员专享章节的一些处理、章节不能读，看是哪种弹窗
            let status;
            if (!canView) {
                const { code, data } = await this.vipAndroidGuide();
                if (code === 200) {
                    status = data.pop_ups[0];
                    this.setData({ vipStatus: status });
                }
            }
            if (comicInfo.vip_exclusive) {
                // 非会员用户
                let vipToast = '';
                if (!isvip) {
                    vipToast = '本章节内容仅限会员可以阅读';
                } else if (reason && [103, 104].includes(reason)) {
                    vipToast = temporaryVip ? '您当前的身份是"体验会员", 开通正式会员后可享受全部会员权益' : '开通正式会员后可继续阅读本章节';
                }
                if (vipToast) {
                    wx.setNavigationBarTitle({
                        title: comicTit,
                    });
                    // android显示底部弹窗、ios提示弹窗
                    const { isiOS } = app.globalData;
                    if (isiOS) {
                        this.setData({
                            vipToast,
                            dialogShow: true,
                            dialogContent: '本章节仅限会员可以阅读，由于相关规范，iOS暂不支持支付', // vipToast,
                            dialogButton: [{ text: '取消' }, { text: '查看更多' }], // [{ text: `开通${temporaryVip ? "正式" : ""}会员` }]
                        });
                    } else {
                        await this.kkbBalance();
                        const vipProps = {
                                from: payfrom,
                                topic_id: topicId,
                                comic_id: comicId,
                            },
                            trackProps = {
                                isvip,
                                TopicName: topicTit,
                                ComicName: comicTit,
                                LatestBalance: this.data.wallet,
                            };
                        // 针对提前看需要判断图片是否满一屏，不满一屏幕直接展示
                        let immediate = false;
                        if (status == 3) {
                            const { pageHeight, imgList } = this.data;
                            immediate = imgList.some((item) => item.top > pageHeight);
                        }
                        this.setData({
                            vipToast,
                            userInfo,
                            fullScreen: false,
                            vipShow: !!(status == 4 || (status == 3 && (showVip || !immediate))),
                            vipType: status,
                            vipProps,
                            trackProps,
                        });
                    }
                    return;
                }
            }

            // 防止跳章节
            this.data.onTurning = true;
            setTimeout(() => {
                this.data.onTurning = false;
            }, 500);

            // 根据专题相应参数带过来
            const { cacheCount } = this.data;
            if (cacheCount) {
                // 可以更加精确确定如果是到最后一张图片，直接定位到最下面
                this.setData({
                    oriPos: `pic_${comicId}_${cacheCount >= 1 ? cacheCount - 1 : cacheCount}`,
                });
            } else {
                this.setData({
                    scrollTop: 1,
                });
            }

            // 付费章节的处理
            if (isPay && !showDialog) {
                // await this.kkbBalance()
                this.setData({
                    topicId,
                    comicId,
                    topicTit,
                    comicTit,
                    vipStatus: status,
                    fullScreen: false,
                    payDialog: true,
                });
            } else {
                if (this.data.payDialog) {
                    this.setData({
                        payDialog: false,
                    });
                }
            }

            // 什么时候初始化弹幕、没有会员弹窗、没有付费弹窗
            const { payDialog, dialogShow, vipShow, followed } = this.data;
            if (!payDialog && !dialogShow && !vipShow) {
                this.setData({
                    initDanmu: true,
                    fullScreen: !!followed,
                    adVisible: true,
                });
            }

            // 自动关注
            const favourite = global.favourite || [];
            if (userInfo) {
                if (favourite.includes(topicId) && !this.data.follows[topicId]) {
                    global.favourite = [];
                    this.followClick();
                }
            } else {
                global.favourite = [];
            }
        });
    },

    // 存在弹窗的情况调kkb剩余的接口
    async kkbBalance() {
        if (!this.data.userInfo) {
            this.setWallet(0);
        } else {
            await util_checkWallet(this);
        }
    },

    // android会员弹窗引导判断
    vipAndroidGuide() {
        const { topicId, comicId, autobuy } = this.data;
        return util_request({
            method: 'post',
            host: 'pay',
            url: '/v2/comicbuy/comic_pop_ups_h5',
            data: {
                topic_id: topicId,
                comic_id: comicId,
                source: autobuy ? 2 : 3, // 漫画购买来源，2表示上一篇下一篇，3表示漫画列表页
            },
        });
    },
    onUnlocking(e) {
        const { state, type, toast = {} } = e.detail;
        const { follows, topicId } = this.data;
        if (toast && toast.show) {
            util_showToast({
                title: toast.message,
                duration: 2000,
            });
        }
        this.setData({
            payDialog: !state,
            showDialog: type == 'adv' && state,
        });
        if (state) {
            if (!follows[topicId]) {
                this.handleFollow(topicId, false, () => {
                    this.pageInit();
                });
            } else {
                this.pageInit();
            }
        }
    },

    // 图片list组件回调
    loadCallback(e) {
        e = e.detail;
        const { type } = e.currentTarget.dataset;
        if (type == 'error') {
            this.picLoadError(e);
        } else if (type == 'success') {
            this.picLoadInfo(e);
        }
    },

    // 图片加载情况
    picLoadInfo(e) {
        const { index } = e.currentTarget.dataset;
        const name = `imgList[${index}].loaded`;
        const { cacheCount = 0, OnLoadStartTimestamp, OnReadStartTimestamp } = this.data;
        if ((!cacheCount && index == 2) || (cacheCount && cacheCount == index)) {
            const ImageLoadTime = new Date().getTime();
            const OnLoadToImageLoadTime = ImageLoadTime - OnLoadStartTimestamp;
            const OnReadyToImageLoadTime = ImageLoadTime - OnReadStartTimestamp;
            util_performanceTrack('PerformanceImageBase', {
                OnLoadToImageLoadTime,
                OnReadyToImageLoadTime,
                CurrentPageBase: 'comic',
            });
        }
        this.setData({
            [name]: true,
        });
    },
    picLoadError(e) {
        const { index, src } = e.currentTarget.dataset;
        const { errMsg } = e.detail,
            { cacheCount = 0, topicTit, comicId, comicTit } = this.data;
        if (cacheCount == index) {
            app.kksaTrack('ImageError', {
                TriggerPage: 'ComicPage',
                TopicName: topicTit || '',
                ComicName: comicTit || '',
                ComicID: comicId || '',
                ImageUrl: src,
                Time: new Date().getTime(),
                ErrorInfo: errMsg || '',
            });
        }
    },

    // 开通会员弹窗
    goVipOpen() {
        // ios才会有这个步骤，直接判断来源页面关闭当前页面
        util_notiOS()
            .then(() => {})
            .catch(() => {
                const { name } = util_prevPage();
                if (name) {
                    wx.navigateBack({ delta: 1 });
                } else {
                    // 返回推荐首页
                    wx.reLaunch({ url: '/pages/feed/feed' });
                }
            });
    },

    // 查询付费信息 接口回调
    requestPayInfo() {
        return new Promise((resolve, reject) => {
            const { topicId, payfrom, comicId } = this.data;
            util_request({
                method: 'post',
                host: 'pay',
                url: '/v2/comicbuy/comic_price_info_h5',
                data: {
                    topic_id: topicId,
                    comic_id: comicId,
                    from: payfrom,
                },
            })
                .then((res) => {
                    resolve(res.data);
                })
                .catch(() => {
                    reject();
                });
        });
    },

    // 支付kkb 接口回调
    requestPaid({ comicId, encrypt, report }) {
        return new Promise((resolve, reject) => {
            const { autoPay, payfrom, follows, topicId } = this.data;
            util_request({
                method: 'post',
                host: 'pay',
                url: '/v2/comicbuy/encrypt_buy_h5',
                data: {
                    comicbuy_encrypt_str: encrypt,
                    auto_pay: autoPay,
                    source: report.auto_paid ? 2 : 3,
                    from: payfrom,
                    target_id: comicId,
                    cps: global.cps,
                    app_id: global.appId, // 来源appId
                    scene: global.scene, // 来源场景
                },
            })
                .then((res) => {
                    // 存储已购买章节，回到列表时更新状态
                    const data = res.data;
                    if (!follows[topicId]) {
                        this.handleFollow(topicId, false, () => {
                            resolve(data);
                        });
                    } else {
                        resolve(data);
                    }
                })
                .catch(() => {
                    this.setData({
                        showDialog: true,
                    });
                    reject();
                });
        });
    },

    // 阅读进度100%触发，只触发一次
    readComplete() {
        const { vipStatus, showAuthorization } = this.data;

        // 会员提前看弹出
        if (vipStatus && vipStatus == 3) {
            this.vipPropsShow();
        }

        // 作品更新提醒弹出
        if (showAuthorization) {
            this.remindTrigger();
        }
    },
    async vipPropsShow() {
        await this.kkbBalance();
        this.data.valveHandle = true;
        const { payfrom, topicId, topicTit, comicId, comicTit, userInfo, wallet, isvip, vipStatus } = this.data;
        const vipProps = {
                from: payfrom,
                topic_id: topicId,
                comic_id: comicId,
            },
            trackProps = {
                isvip,
                TopicName: topicTit,
                ComicName: comicTit,
                LatestBalance: wallet,
            };
        this.setData({
            userInfo,
            fullScreen: false,
            vipShow: true,
            vipType: vipStatus,
            vipProps,
            trackProps,
        });
    },

    // scroll-view滚动监听
    async handleScroll(e) {
        this.onScrollForBarrage(e);
        const { scrollTop, scrollHeight } = e.detail;
        const { fullScreen, cacheFull, pageHeight, imgList, showUnfoldAll, isExeFav, payDialog } = this.data;

        // 初始化的时候，第一次动画动作不执行
        if (this.data.cacheCount) {
            this.data.cacheCount = 0;
        }
        if (!this.data.cacheCount && this.data.scrollTop != 1) {
            this.triggerPageScroll(); // 挂角动画处理
        }

        // 当前图片数 (当前滚动条 + 屏幕安全区域高度)
        let maxLen = showUnfoldAll ? 6 : imgList.length;
        let readHeight = scrollTop + pageHeight;
        let readCount = imgList.findIndex((item) => item.top > readHeight);
        let read_count = readCount >= 0 ? readCount : maxLen;
        let readProgress = read_count / maxLen;

        if (!cacheFull) {
            if (readProgress < 1) {
                if (!fullScreen && scrollTop >= 50) {
                    this.data.unFull = false;
                    this.data.inputSable = false;
                    this.setData({
                        unusable: false,
                        fullScreen: true,
                        isShowBackTop: false,
                    });
                }
            } else {
                if (!this.data.unFull) {
                    this.data.unFull = true;
                    this.setData({
                        fullScreen: false,
                        tapScreen: false,
                        isShowBackTop: true,
                    });
                }

                const len = imgList.length - 1;
                const viewH = imgList[len].top + imgList[len].numHeight;
                if (scrollTop > viewH - 320 && !this.data.inputSable) {
                    this.data.inputSable = true;
                    this.setData({
                        unusable: true,
                    });
                } else if (scrollTop < viewH - 320 && this.data.unusable) {
                    this.data.inputSable = false;
                    this.setData({
                        unusable: false,
                    });
                }
            }
        }

        // 阅读进度85%触发引导关注弹窗
        if (readProgress >= 0.85 && !showUnfoldAll && !isExeFav && !payDialog) {
            this.data.isExeFav = true;
            this.favTrigger();
        }

        // 实时更新缓存的data数据、上下翻页时使用
        Object.assign(this.data, {
            scrollTop,
            scrollHeight,
            cacheFull: false,
            readProgress,
        });

        this.computeMaxTime(scrollTop);
    },

    // 距离顶部多少触发事件
    scrolltoupper() {
        this.setData({
            fullScreen: false,
            isShowBackTop: false,
        });
    },

    // 存储相应高度和时间，只做存储不计算、等使用`时再拿到最大值和相应的时间
    computeMaxTime(scrollTop) {
        const { scrollTops } = this.data;
        scrollTops.push({
            scrollTop,
            time: new Date().getTime(),
        });
    },

    // scroll-view内的点击
    handleTapScroll(e) {
        // 弹幕菜单隐藏
        if (this.data.barrageMenuShown) {
            this.hideBarrageMenu();
            return;
        }
        // 弹幕开关快捷键
        if (this.data.tapForShortcut) {
            return;
        }
        // 当前阅读进度超过100%，不收起工具栏
        if (this.data.readProgress >= 1) {
            return;
        }
        const { navHeight, scrollTop, fullScreen, pageHeight, scrollHeight } = this.data;

        // 条漫 - 先通过点击区域判断用户操作目的
        if (fullScreen) {
            let touchY = e.detail.y,
                oneIn3 = pageHeight / 3, // 滚动区域的三分之一高
                twoIn3 = oneIn3 * 2;

            if (touchY < oneIn3) {
                // 上翻页
                let target = scrollTop - twoIn3;
                this.pageChange(target < 0 ? 0 : target);
            } else if (touchY > twoIn3) {
                // 下翻页
                let target = scrollTop + twoIn3,
                    maxTop = scrollHeight - pageHeight + 50; // 50是防止未知错误增加的额外高度
                this.pageChange(target > maxTop ? maxTop : target);
            } else {
                // 全屏切换
                this.setData({
                    tapScreen: !!(scrollTop - 10 > navHeight),
                    fullScreen: false,
                });
            }
        } else {
            this.setData({
                fullScreen: true,
            });
        }
    },
    pageChange(top) {
        this.setData(
            {
                scrollAnimation: true,
            },
            () => {
                this.setData(
                    {
                        scrollTop: top,
                    },
                    () => {
                        this.setData({
                            scrollAnimation: false,
                        });
                    }
                );
            }
        );
    },

    // 关注点赞、全集、上下篇翻页处理
    actionTopic(e) {
        const { id } = e.currentTarget.dataset;
        wx.redirectTo({
            url: `/pages/topic/topic?id=${id}&tab=1`,
        });
    },
    directory() {
        const { directoryShow, initDanmu } = this.data;
        this.clickTrack({ type: 2 });
        this.setData({
            initDanmu: !initDanmu,
            directoryShow: !directoryShow,
        });
        this.jumpTrack(1);
    },
    directoryTap(e) {
        // 目录组件回调
        const { type } = e.detail,
            { directoryShow, initDanmu } = this.data;
        if (type) {
            this.setData({
                initDanmu: !initDanmu,
                directoryShow: !directoryShow,
            });
        }
    },
    // 点击目录一键购买 显示一键购买弹窗
    buyTapEvent(e) {
        const { type } = e.detail;
        if (type) {
            this.setData({ isShowBulkPurchase: true, directoryShow: false });
        } else {
            const { parentId = '', comicId } = this.data;
            wx.redirectTo({
                url: `/pages/comic/comic?id=${comicId}&parentId=${parentId}&list=1`,
            });
        }
    },
    // 关闭一键购买弹窗
    closeBulkPurchase(e) {
        let { isRefresh } = e.detail;
        if (isRefresh) {
            this.pageInit();
        }
        this.setData({ isShowBulkPurchase: false });
    },

    // 回到首页/专题页
    goHomeFun() {
        const pages = getCurrentPages();
        const length = pages.length;
        global.backBubbleData = {
            page: 'ComicPage',
            show: length <= 1,
            type: '左下角引导',
        };
        global.backSource = 'ComicPage';
        this.clickTrack({ type: 6 });
        wx.switchTab({
            url: '/pages/find/find',
        });
    },
    goTopicFun() {
        this.clickTrack({ type: 7 });
        wx.redirectTo({
            url: `/pages/topic/topic?id=${this.data.topicId}`,
        });
        this.jumpTrack(2);
    },
    goBackTop() {
        this.pageChange(0);
    },

    jumpTrack(value) {
        const typeMap = {
            1: '目录',
            2: '详情',
        };
        const { comicTit: ComicName, comicId: ComicID } = this.data;
        app.kksaTrack('MiniClk', {
            TriggerPage: 'ComicPage',
            ButtonName: typeMap[value],
            ComicID,
            ComicName,
        });
    },

    // 跳转到下一章涉及是否付费等
    jumpComic(e) {
        const { id, disabled, type, tools } = e.currentTarget.dataset;
        if (disabled) {
            if (type == 'next') {
                util_showToast({
                    title: '没有下一话啦～',
                    position: { bottom: '40%' },
                });
            } else {
                util_showToast({
                    title: '没有上一话啦～',
                    position: { bottom: '40%' },
                });
            }
            return;
        }
        if (this.data.onGetting || this.data.onTurning) {
            return;
        }

        if (type == 'next') {
            const btnType = tools ? '工具栏按钮' : '漫底按钮';
            this.comicModuleTrack('ComicPageModuleClick', {
                type: `下一话-${btnType}`,
            });
        }

        this.clickTrack({ type: type == 'next' ? 3 : 1 });

        this.setMyHistory(); // 存储个人中心页历史
        this.setTopicHistory(); // 专题页历史

        global.OnActionStartTimestamp = new Date().getTime();
        wx.redirectTo({
            url: `comic?id=${id}&autobuy=true`,
        });
    },
    skipSwatch() {
        const { comicId } = this.data;
        wx.redirectTo({
            url: `/pages/comicnew/comicnew?id=${comicId}&autobuy=true`,
        });
    },

    // 点赞/取消点赞
    praiseClick() {
        const { comicId: id, praised: state } = this.data;
        this.handlePraise(
            {
                id,
                state,
            },
            ({ count, state }) => {
                // 更新视图
                this.setData({
                    praised: state,
                    praiseNum: util_transNum(count),
                });
                this.onTrack('Like', {
                    Action: state ? '点赞' : '取消点赞',
                });
            }
        );
    },

    // 漫底comic-bottom操作回调
    bottomCallback(e) {
        e = e.detail;
        const { type } = e.currentTarget.dataset;
        if (type == 'unfold') {
            this.unfoldAll();
        } else if (type == 'upraise') {
            this.praiseClick();
        } else if (type == 'ufollow') {
            this.followClick();
        } else if (type == 'npraise' || type == 'nfollow') {
            this.originLogin(e);
        } else if (type == 'share') {
            this.shareClick();
        } else if (type == 'next' || type == 'prev') {
            this.jumpComic(e);
        } else if (type == 'appletAction') {
            this.handleOpenFreeProgram();
        } else if (type == 'carton') {
            this.readComplete();
        } else if (type == 'freeReport') {
            // 打开免费小程序曝光埋点
            this.comicModuleTrack('ComicPageModuleEXP', {
                type: '免费看漫画导流卡片',
            });
        }
    },

    // 工具栏操作回调
    toolsCallback(e) {
        e = e.detail;
        const { type } = e.currentTarget.dataset;
        if (type == 'login') {
            this.followClick();
        } else if (type == 'nologin') {
            this.originLogin(e);
        } else if (type == 'next' || type == 'prev') {
            this.jumpComic(e);
        } else if (type == 'cata') {
            this.directory();
        } else if (type == 'detail') {
            this.goTopicFun();
        }
    },

    // 关注/取关
    followClick() {
        const { showSuperFav, topicId: id } = this.data;
        this.handleFollow(id, false, (res) => {
            this.onTrack(res ? 'FavTopic' : 'RemoveFavTopic');
        });
        if (showSuperFav) {
            this.closeFav();
        }
    },

    // 存储专题页所用存储数据
    setTopicHistory() {
        let { userInfo, comicId, topicId, scrollTop, pageHeight, imgList, payDialog, vipToast, historyForTopic = {}, isBonusChapter = false } = this.data;
        if (!topicId) return;
        const topicObj = historyForTopic ? historyForTopic[topicId] : {};
        this.data.guided = topicObj ? topicObj.guided : false;

        let readList = topicObj && topicObj.readList ? topicObj.readList : [];
        let readHeight,
            readCount,
            readObj = {};
        readHeight = scrollTop + pageHeight;
        readCount = imgList.findIndex((item) => item.top > readHeight);

        // 需要增加一步判断，图片不够一屏，那就是当前所有图片
        readObj = {
            id: comicId,
            read_count: readCount >= 0 ? readCount : imgList.length,
            has_read: true,
            continue_read_comic: !isBonusChapter,
        };

        const comicIndex = readList.findIndex((item) => item.id == comicId);

        // 非第一次存储清除掉之前的
        if (comicIndex >= 0) {
            readList.splice(comicIndex, 1);
        }

        // 每次push前需要将之前的续读进行初始化
        if (!isBonusChapter) {
            readList.forEach((item) => {
                item.continue_read_comic = false;
            });
        }
        readList.push(readObj);

        // 彩蛋章节的已读标识需要存储
        const lastAry = readList.filter((item) => item.continue_read_comic);
        const lastId = lastAry.length ? lastAry[0].id : 0;
        historyForTopic[topicId] = {
            readList: readList,
            lastId: lastId,
            // guided: this.data.guided
        };

        // 没有权限不存储历史
        if (!userInfo && !payDialog && !vipToast) {
            wx.setStorage({
                key: 'historyForTopic',
                data: historyForTopic,
            });
        }
    },

    // 个人页阅读历史使用封装存储、阅读历史页使用、根据登录情况
    setMyHistory() {
        const { imgList, topicId, topicTit, comicId, comicTit, comicCount, userInfo, scrollTop, pageHeight, verticalUrl, payDialog, vipToast, historyForMy = [], historyForTopic = {}, isBonusChapter = false } = this.data;
        if (topicId && !userInfo) {
            let readHeight, readCount;
            // 根据是否登录存储本地、已登录不存储本地
            // 未获取当前专题的阅读历史
            // 阅读的图片数
            readHeight = scrollTop + pageHeight;
            readCount = imgList.findIndex((item) => item.top > readHeight);

            // 未登录获取本地存储 historyForMy = [], 查看是否重复
            let continue_read_comic = {
                id: comicId,
                title: comicTit,
                read_count: readCount >= 0 ? readCount : imgList.length,
            };
            let historyObj = {
                id: topicId,
                title: topicTit,
                vertical_image_url: verticalUrl,
                comics_count: comicCount,
                continue_read_comic,
                read_count: historyForTopic[topicId] && historyForTopic[topicId].readList.length ? historyForTopic[topicId].readList.length : 1,
            };

            // 查询historyForMy是否已经存在、存在更新
            const exitIndex = historyForMy.findIndex((item) => item.id == topicId);
            if (exitIndex >= 0) {
                historyForMy.splice(exitIndex, 1);
            }
            historyForMy.unshift(historyObj);

            // 彩蛋章节续读本地不存储
            if (!global.userId && !payDialog && !vipToast && !isBonusChapter) {
                wx.setStorage({
                    key: 'historyForMy',
                    data: historyForMy,
                });
            }
        }
    },

    // 阅读进度上报、或本地存储、根据登录情况
    reportedData() {
        let maxTime,
            maxScrollTop = 0,
            readCount,
            maxReadCount,
            readHeight,
            maxReadHeight,
            array = new Map();
        const { userInfo, imgList, topicId, comicId, totalCount, scrollTop, scrollTops, pageHeight, historyForPost, channel, payDialog, vipToast } = this.data;

        // 先找到最大的scrollTop、可能存在多个相同的最大scrollTop、来回滚动导致
        // maxScrollTop = Math.max.apply(null, scrollTops.map(item => item.scrollTop));

        // 使用正常循环/减少耗时/防止apply方法堆栈溢出
        const scrolls = scrollTops.map((item) => item.scrollTop);
        let len = scrolls.length;
        if (len) {
            for (let i = 0; i < len; i++) {
                if (scrolls[i] > maxScrollTop) {
                    maxScrollTop = scrolls[i];
                }
            }
        }

        // 根据最大maxScrollTop获取相应数组
        array = scrollTops.filter((item) => item.scrollTop == maxScrollTop);

        // 获取数组中的最大时间，经过相同的位置，新的时间会覆盖之前的最大时间
        maxTime = Math.max.apply(
            null,
            array.map((item) => item.time)
        );

        // 根据滚动最大滚动和当前滚动条位置计算退出当前是第几张图片、阅读的最大图片数量
        // 最大图片数 (最大滚动条 + 屏幕安全区域高度)  imgList 的top计算
        // 当前图片数 (当前滚动条 + 屏幕安全区域高度)
        readHeight = scrollTop + pageHeight;
        maxReadHeight = maxScrollTop + pageHeight;

        readCount = imgList.findIndex((item) => item.top > readHeight);
        maxReadCount = imgList.findIndex((item) => item.top > maxReadHeight);

        const data = {
            topic_id: topicId,
            comic_id: comicId,
            max_read_count_time: maxTime,
            read_count: readCount >= 0 ? readCount : imgList.length,
            max_read_count: maxReadCount >= 0 ? maxReadCount : imgList.length,
            read_time: new Date().getTime(), // 退出详情页\即触发上报时机(翻页／退出)
            total_count: totalCount,
        };

        this.data.maxReadCount = data.max_read_count;

        // 不同专题的章节id是否一致是否需要判断专题id
        // const topicIndex = historyForPost.findIndex(item => item.topic_id == topicId)
        const comicIndex = historyForPost.findIndex((item) => item.comic_id == comicId);
        // 认为存在相同的存储历史、需要更新最新的
        if (comicIndex >= 0) {
            historyForPost.splice(comicIndex, 1);
        }
        historyForPost.unshift(data); // 最新阅读的放在最前面

        //  console.log(data);
        if (!userInfo && !payDialog && !vipToast) {
            wx.setStorage({
                key: 'historyForPost',
                data: historyForPost,
            });
        }

        // 已登陆未登录都上报、无权限不上报（存在付费弹窗、存在会员弹窗都认为无权限）
        if (!payDialog && !vipToast) {
            global.historyPosting = true;
            util_request({
                method: 'post',
                url: `/mini/v1/comic/${channel}/comic/report_view`,
                data: { view_rate: JSON.stringify([data]) },
            })
                .then(() => {
                    global.historyPosting = false;
                    if (global.historyCallback) {
                        global.historyCallback();
                        global.historyCallback = null;
                    }
                })
                .catch(() => {
                    // 上报失败再次存储
                    wx.setStorage({
                        key: 'historyForPost',
                        data: historyForPost,
                    });
                });
        }
    },
    hideBottomTools() {
        this.setData({ fullScreen: true });
    },
    // 点赞、关注、离开漫画埋点上报
    onTrack(event, params) {
        const { comicTit: ComicName, comicId: ComicID, topicId: TopicID, topicTit: TopicName, signingStatus, barrageStatus, maxReadCount, totalCount, topicFree, isFree = true, recMap } = this.data;

        // 停留时长
        const date = new Date().getTime();
        const stayDuration = date - this.data.timestamp;

        // 弹幕是否开启
        const barrage = barrageStatus === -1 ? 0 : barrageStatus;
        const BulletScreenSet = !barrage ? '关闭' : '开启';

        // 是否付费作品
        const IsPaidComic = !isFree ? 1 : 0;

        // 是否付费专题
        const IsPaidTopic = !topicFree ? 1 : 0;

        // 签约状态
        const WorksSigningState = signingStatus || '';

        // 阅读进度
        const readCount = maxReadCount / totalCount;
        const ReadPer = readCount > 0 ? readCount.toFixed(2) : 0;

        // 页面来源
        const multPage = util_multPage(this.data.pageTrigger);
        let { SrcPageLevel1, SrcPageLevel2, SrcPageLevel3, TriggerPage, CurPage } = multPage;

        const moduleTypeMap = {
            0: '',
            1: '头部轮播图',
            2: '二级入口',
            3: '四图类型',
            4: '六图类型',
            5: '排行榜模块',
            6: '',
            7: '',
            8: '追更模块',
            9: '分类模块',
            10: '四图异形模块',
            11: '标签模块',
            12: '新作预约横滑模块',
            200: '专题页选集',
            201: '专题页目录',
            202: '专题页推荐',
            203: '专题页阅读按钮',
            301: '新手三天福利',
            302: '六图内容模块',
        };

        // 模块信息
        const findTrigger = this.data.pageTrigger.find || {};
        const { title, module_type = 0, module_id = '' } = findTrigger;
        const SourceModule = title || '';
        const TabModuleID = String(module_id);
        const TabModuleText = moduleTypeMap[module_type];
        let TabModuleType = '';
        if (TriggerPage == 'RecommendPage') {
            TabModuleType = '漫画大图卡片';
        } else {
            TabModuleType = TabModuleText;
        }
        if (module_type == 302) {
            TriggerPage = module_id == 1 ? '组队活动页' : '助力活动页';
        }

        let options = {
            ComicID,
            ComicName,
            TopicID,
            TopicName,
        };

        if (event == 'ReadComic') {
            Object.assign(options, {
                stayDuration,
                BulletScreenSet,
                IsPaidComic,
                IsPaidTopic,
                WorksSigningState,
                ReadPer,
                SourceModule,
                TabModuleType,
                TabModuleID,
                SrcPageLevel1,
                SrcPageLevel2,
                SrcPageLevel3,
                TriggerPage,
                IfTopic: false,
                // 畅读卡活动添加埋点 - 20210201
                CurrentPrice: this.data.currentPrice,
                UnlockReason: this.data.ulockReason,
                MembershipClassify: this.data.isvip ? 1 : 0,
            });
            app.kksaTrack(
                event,
                Object.assign({}, options, {
                    ...recMap,
                })
            );
            const read_duration_list = [];
            read_duration_list.push({
                topic_id: TopicID,
                comic_id: ComicID,
                start_time: this.data.timestamp,
                duration: parseInt(stayDuration / 1000),
            });
            this.data.userInfo && this.uploadDuration({ read_duration_list });
        } else if (event == 'FavTopic' || event == 'RemoveFavTopic') {
            Object.assign(options, {
                IsPaidComic,
                NickName: '',
                AuthorID: '',
                Category: '',
                SrcPageLevel1,
                SrcPageLevel2,
                SrcPageLevel3,
                TriggerPage: CurPage,
            });
            app.kksaTrack(
                event,
                Object.assign({}, options, {
                    ...recMap,
                })
            ); // 上报神策埋点

            // 如果是取消关注 则不进行后续的数据组上报
            if (event == 'RemoveFavTopic') {
                return;
            }
        } else if (event == 'Like') {
            Object.assign(options, {
                LikeObject: '漫画',
                TriggerPage: CurPage,
                ...params,
            });

            // 神策点赞/取消点赞上报
            app.kksaTrack(
                event,
                Object.assign({}, options, {
                    ...recMap,
                })
            );
        }
    },

    uploadDuration({ upload_id = new Date().getTime(), type = 0, source = 1, now = new Date().getTime(), read_duration_list = '' } = {}) {
        util_request({
            method: 'post',
            host: 'api',
            url: '/v1/checkin/api/read_duration/upload',
            data: {
                upload_id,
                type,
                source,
                now,
                read_duration_list: JSON.stringify(read_duration_list),
            },
        });
    },

    // 右上角气泡初始化
    handlerBubble() {
        const count = wx.getStorageSync('newStartCount') || 0;
        const FirstOpen = count == 1;
        const bubbleStatus = wx.getStorageSync('bubbleStatus') || 0;

        if (FirstOpen && !bubbleStatus) {
            this.showNotify({
                title: '添加到我的小程序',
                onClose: () => {
                    wx.setStorage({
                        key: 'bubbleStatus',
                        data: 1,
                    });
                },
            });
        }
    },
    // 更新性别年龄数据
    updateInfo() {
        if (global.adGender || global.adAge) {
            util_updateUserInfo({
                gender: global.adGender,
                medium_age: global.adAge,
                request_type: 3,
            });
        }
    },
    // 静默登录
    originLogin(e) {
        const { topicId, showSuperFav } = this.data;
        if (topicId) {
            const favourite = global.favourite || [];
            favourite.push(topicId);
            if (showSuperFav) {
                this.closeFav();
            }
        }
        app.originLogin(e.detail).then(() => {
            let comicId = this.data.comicId;
            wx.redirectTo({
                url: `/pages/${global.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${comicId}&comicId=${comicId}`,
            });
        });
    },
    onclose() {
        const pages = getCurrentPages(); // 页面栈
        if (pages.length == 1) {
            // 没其它页面栈,跳转到首页
            wx.switchTab({
                url: '/pages/find/find',
            });
        } else {
            // 有其它页面栈,返回上一页
            wx.navigateBack({ delta: 1 });
        }
    },
    // 充值礼包直接支付
    directPay(e) {
        let { good_id, activity_name, activity_id, banner_type_name, extraList } = e.detail;
        this.setData(
            {
                showDirectPay: false,
                loadDirectPay: false,
                isPayed: false,
                extraList,
                activity_name,
                activity_id,
                banner_type_name,
                giftPayGoodId: good_id,
            },
            () => {
                this.setData({
                    loadDirectPay: true,
                    showDirectPay: true,
                });
            }
        );
    },
    // 刷新数据
    reloadPage() {
        this.setData({
            payDialog: false,
        });
        this.pageInit();
    },
    // 清空wallet
    clearWallet() {
        this.setWallet(0);
    },
    // 调用支付接口是否成功
    paysucc() {
        const { follows, topicId } = this.data;
        util_showToast({
            title: '领取成功，快去享用吧！领取的书籍在【我的钱包-已购书籍】中查看',
            duration: 3000,
        });
        if (!follows[topicId]) {
            this.handleFollow(topicId, false);
        }
        this.setData({
            payDialog: false, // 禁止显示付费弹窗内容
            paysucc: true,
            isShowTopBubble: !this.data.guideTaskBubble,
        });
        this.showNotify({
            title: '点击 … 添加到桌面 漫画随时畅读',
        });
    },

    // 代金劵领取自动刷新回调, 可以根据type区分
    pageRefreshBack() {
        this.setData(
            {
                payDialog: false,
            },
            () => {
                this.setData({
                    payDialog: true,
                });
            }
        );
    },

    // 漫画页优化按钮点击埋点
    clickTrack({ type = 3 } = {}) {
        const types = {
            1: '上一篇',
            2: '目录',
            3: '下一篇',
            5: '分享',
            6: '首页悬浮按钮',
            7: '详情页悬浮按钮',
        };
        app.kksaTrack('ReadPageClk', {
            TopicName: this.data.topicTit || this.data.topicTitle,
            ButtonName: types[type],
        });
    },

    // 新手福利漫画页占位none
    isHiddenFn(e) {
        e = e || {};
        this.setData({ showGreenHands: false });
        const detail = e.detail || {};
        if (detail.code == 600001) {
            this.setData({ isNovice: true }); // 当前专题没有在新手福利专题池中,调用自动领取阅读币
        }
    },

    // 关闭领取成功后的新手弹窗
    noviceDialogclose() {
        let comicId = this.data.comicId;
        wx.redirectTo({
            url: `/pages/${global.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${comicId}&comicId=${comicId}`,
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

    // 模块点击上报埋点
    comicModuleTrack(event, value) {
        const { type: ModuleType, title: ModuleName = '', clk: ModelClkItem = '' } = value;
        const { comicTit: ComicName, comicId: ComicID, topicId: TopicID, topicTit: TopicName, chapterType: ChapterType } = this.data;
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
    async comicAbtest() {
        await app.getGender();
        const pages = getCurrentPages();
        const length = pages.length;

        util_getAbTest().then((value) => {
            const isGuess = value.includes('s_WXpursuit_a');
            const abComment = value.includes('s_WXcomment_a');
            let isShowGuess = false;
            if (isGuess && length == 1) {
                isShowGuess = true;
            }
            this.setData({
                isShowClass: true,
                isShowGuess,
                abComment,
            });
        });
    },
    // 关闭顶部弹窗事件
    closeBubble() {
        this.setData({
            isShowTopBubble: false,
        });
    },

    // 作品更新提醒触发
    remindTrigger() {
        this.setData({
            remindShow: true,
        });
        if (this.data.showSuperFav) {
            this.closeFav();
        }
    },
    remindClose() {
        this.setData({
            remindShow: false,
        });
    },

    // 跳转到免费小程序
    handleOpenFreeProgram() {
        const { appletAction } = this.data;
        const { type, target_id: id } = appletAction;
        this.comicModuleTrack('ComicPageModuleClick', {
            type: '免费看漫画导流卡片',
        });
        util_action({
            type,
            id,
            url: `/pages/find/find`,
        });
    },

    // 引导任务基础（20210531）优先级最高
    guideStatusFun(e) {
        const { status } = e.detail;
        if (status) {
            // 关闭其他影响气泡
            this.setData({
                guideTaskBubble: true,
                isShowTopBubble: false,
            });
            util_hideNotify();
        }
    },

    // 调用顶部提示条，因引导任务影响，暂时先嵌套一层判断条件
    showNotify(options) {
        if (!this.data.guideTaskBubble) {
            util_showNotify(options);
        }
    },

    // 新增漫评相关回调
    checkMore() {
        this.setData({
            showComemnt: true,
        });
    },
    closeHalf() {
        this.setData({
            showComemnt: false,
        });
    },
    favTrigger() {
        const { topicId, follows } = this.data;
        if (!this.data.userInfo || !follows[topicId]) {
            const STORAGE_FAV = 'comic:fav';
            const comicFavMap = wx.getStorageSync(STORAGE_FAV) || [];
            if (!comicFavMap.includes(topicId)) {
                comicFavMap.unshift(topicId);
                wx.setStorage({
                    key: STORAGE_FAV,
                    data: comicFavMap.slice(0, 10),
                });
                this.setData(
                    {
                        showSuperFav: true,
                    },
                    () => {
                        this.data.favTimer = setTimeout(() => {
                            clearTimeout(this.data.favTimer);
                            this.setData({
                                showSuperFav: false,
                            });
                        }, 3000);
                    }
                );
            }
        }
    },
    closeFav() {
        clearTimeout(this.data.favTimer);
        this.setData({
            showSuperFav: false,
        });
    },

    // 页面滚动挂角动画处理
    triggerPageScroll() {
        const { suspendAnimation } = this.data;
        if (suspendAnimation) {
            this.setData(
                {
                    suspendAnimation: false,
                },
                () => {
                    let timer = setTimeout(() => {
                        clearTimeout(timer);
                        timer = null;
                        this.setData({
                            suspendAnimation: true,
                        });
                    }, 4000);
                }
            );
        }
    },
};

const ConnectPage = connect(
    ({ userInfo, wallet, follows, vipInfo, pageTrigger, recMap }) => {
        return {
            userInfo,
            wallet,
            follows,
            vipInfo,
            pageTrigger,
            recMap,
        };
    },
    (setState, _state) => ({
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
)(comicPage);

Page(ConnectPage);
