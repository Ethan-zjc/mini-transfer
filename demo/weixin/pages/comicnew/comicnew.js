/**
 * 更新数据多种场景 1: 初始化，2: 加载更多数据 3: 上翻页更新章节状态 4:下翻页更新章节状态 5: 更新当前章节长列表数据
 * wx.redirectTo 销毁页面、重新加载页面，自定义导航会重新加载闪一下，考虑跳转还是在当前页面做一些处理
 * 关于点击跳转章节导航再次加载闪动的问题，可以设置为跳转章节进入默认设置全屏
 */
import { util_request, util_showToast, util_transNum, util_feedTrack, util_multPage, util_prevPage, util_getElementWH, util_returnShareContent, util_getCustomShare, util_checkWallet, util_notiOS, util_showNotify, util_skipDirection, util_updateUserInfo } from '../../util.js';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const userInfoBehavior = require('../../behaviors/userInfo');
const followBehavior = require('../../behaviors/follow');
const praiseBehavior = require('../../behaviors/praise');
const barrage = require('../../behaviors/barrage-recycle');
const createRecycleContext = require('miniprogram-recycle-view');
const { comicImgs } = require('../../cdn.js');
let couponTime = null; // 代金劵领取倒计时
let listItemContainer = null; // 页面广告监听,在页面关闭时销毁

const comicPage = {
    behaviors: [followBehavior, praiseBehavior, userInfoBehavior, barrage],
    data: {
        picTop: 0, // 每张图片距离顶部的高度
        initIndex: 0, // 初始化定位阅读进度图片索引
        initTiming: 1, // 记录当前页面数据的加载时机，跟init对应
        navHeight: 65, // 自定义导航栏高度
        scrollTop: 0, // 默认滚动高度
        timestamp: 0, // 记录初始化时间戳
        maxReadCount: 0, // 最大阅读漫画数
        fullScreen: true, // 是否全屏
        tapScreen: false, // 一定条件下点击全屏

        comicId: '', // 当前章节id
        comicTitle: '', // 当前章节标题
        pageNextId: '', // 翻页下一章节id
        scrollTops: [], // 记录已滚动区域点
        allImglists: [], // 记录所有拉取的数据
        loadComicIds: [], // 已加载过章节id列表集合

        scrollY: false, // 允许垂直滚动
        initDanmu: true, // 是否开始初始化弹幕
        exitData: false, // 是否存在图片数据
        directoryShow: false, // 目录是否显示
        guideReadShow: false, // 续读引导显示

        imgListForBarrage: [], // 弹幕的图片数据
        listItemContainer: null, // 页面广告监听,在页面关闭时销毁
        scrollAnimation: false, // 页面滚动动画

        historyForMy: [], // 存储相关历史供个人页使用
        historyForPost: [], // 阅读进度上报数据
        historyForTopic: null, // 存储专题页所用历史记录

        littleComicIds: [], // 存储章节图片少于等于三张的集合
        yetReportComicIds: [], // 存储少于或等于三张的章节上包过历史和打点的集合

        onShowOnceCallback: null, // 第一次onLoad加载存在异步，处理onShow
        showDirectPay: false, // 充值礼包 默认支付组件是否显示
        loadDirectPay: false, // 充值礼包 默认支付组件是否加载
        activity_name: '', // 活动名称
        showBackBubble: true, // 顶部提示条是否显示，组件默认显示
        comicImgs,

        pageShow: false, // 曝光相关
        chapterType: '', // 章节类型
        isBonusChapter: false,
        suspendAnimation: true, // 挂角动画
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
        const { userInfo, wallet } = this.data,
            { name } = util_prevPage();
        let { id, comicId, count = 0, autobuy = false, fullScreen = true, source = -1, origin = 1, parentId = '', terminal = 'wechat', jointid = '', track_code = '', bookmark = '', experiment_identity = '' } = e;

        // 判断是否存在来源页面
        if (!name && !Object.keys(global.systemInfo || {}).length) {
            await app.getSystemInfo();
        }
        const { scene, systemInfo, iPhoneX, screenRpxRate } = global;
        const { screenWidth, windowWidth, screenHeight, model } = systemInfo;
        const { height } = await util_getElementWH('#navigation'); // 获取导航实际高度

        Object.assign(this.data, {
            source,
            terminal,
            autobuy,
            track_code,
            screenWidth,
            screenHeight,
            screenRpxRate,
            cacheFull: true,
            scrollTops: [],
            cacheCount: count * 1,
            parentId: parentId ? parentId * 1 : '',
            webview: this.data.vipInfo, // 暂存会员开通情况
            userId: userInfo ? userInfo.user.id : '', // 暂存用户id
            curWallet: wallet ? wallet : 0, // 暂存用户余额
        });

        this.setData({
            fullScreen,
            navHeight: height,
            viewHeight: screenHeight, // 滚动容器实际高度
            comicId: comicId * 1 || id * 1,
            openContinuRead: global.openContinuRead, // 是否开启连续阅读
            viewWidth: Math.min(...[screenWidth, windowWidth]), // 视图实际宽度
            ipxBottom: iPhoneX ? Math.ceil(34 * screenRpxRate) : 0,
            padBottom: iPhoneX ? Math.ceil(34 * screenRpxRate) + 98 : 98, // 底部操作栏
            miMode: !model ? '' : model.toLocaleLowerCase().includes('mi') ? 'miMode' : '',
        });

        // 跳转上下章节将活动相关分享时种的相关缓存清除
        if (autobuy) {
            wx.removeStorageSync('activity:share');
        }

        this.createRecycle();

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
        this.initPageView({ init: 1 });

        // 存在异步处理，onshow中一些值拿不到
        if (this.data.onShowOnceCallback) {
            this.data.onShowOnceCallback();
            this.data.onShowOnceCallback = true;
        }
    },
    onShow() {
        this.setData({ pageShow: true });
        if (!this.data.onShowOnceCallback) {
            this.data.onShowOnceCallback = () => {
                this.showFun();
            };
        } else {
            this.showFun();
        }
    },
    onReady() {
        this.setData({ readyTime: true });
    },
    showFun() {
        // 重置阅读时长
        Object.assign(this.data, {
            timestamp: new Date().getTime(),
        });

        app.getOpenId().then(() => {
            // 判断是否是从广告进入，如果是需要调用刷新性别，年龄接口
            this.updateInfo();
        });

        // 行为解锁分享成功刷新页面操作
        if (this.data.shareBehavior && this.data.isUnlock) {
            util_showToast({
                title: `分享成功！漫画已解锁，限时免费${this.data.unlockMsg}天~`,
                duration: 3000,
            });
            this.data.cacheShowPay = false; // 解锁成功需将付费弹窗暂存状态清除掉
            this.data.shareBehavior = false;
            this.initPageView({ init: 1, behavior: true });
            return;
        } else if (this.data.shareBehavior && !this.data.isUnlock) {
            // 解锁失败
            this.data.shareBehavior = false;
            util_showToast({
                title: '分享解锁失败，请重试',
                duration: 3000,
            });
        }

        this.loginLaterDispose(); // 登录之后切换账号处理
    },
    onUnload() {
        this.setData({ pageShow: false });
        // 阅读历史上报
        this.updateHistoryCache([1, 2, 3]);
        // 推荐打点、基础埋点
        this.onTrack('ReadComic');

        app.clearAdParam(); // 离开页面，清空广告链接参数
        this.destoryMointor(); // 离开页面销毁广告监听
        // this.ctx.destroy(); // 销毁长列表、预防详情页间的nav跳转，长列表没有销毁id冲突
        // 如果是返回h5的代金劵页面
        let pages = getCurrentPages();
        let prevPage = pages[pages.length - 2]; // 上一个页面
        if (prevPage && prevPage.options.url && prevPage.options.url.includes('limit_free_mini')) {
            // 直接调用上一个页面的setData()方法，把数据存到上一个页面中去
            let backh5url = this.data.redirect_url;
            // 返回h5活动页面的上一个页面
            prevPage.setData({ redirect_url: backh5url });
        }
        // 清空领取代金券倒计时
        if (couponTime) {
            clearInterval(couponTime);
        }
    },
    onHide() {
        this.setData({ pageShow: false });
        // 阅读历史上报
        this.updateHistoryCache([1, 2, 3]);
        // 推荐打点、基础埋点
        this.onTrack('ReadComic');

        // 弹窗内容存在，暂存信息
        if (this.data.payDialog || this.data.vipShow) {
            this.setData({
                payDialog: false,
                vipShow: false,
                cacheShowPay: this.data.payDialog || false,
                cacheShowVip: this.data.vipShow || false,
            });
        }
        this.destoryMointor(); // 离开页面销毁广告监听
        // this.ctx.destroy(); // 销毁长列表、预防详情页间的nav跳转，长列表没有销毁id冲突
    },
    loginLaterDispose() {
        const { webview, cacheShowVip, cacheShowPay, userInfo, userId, topicId, comicId, topicTitle, comicTitle, payInfo, vipStatus, isvip, wallet, curWallet } = this.data;

        // 如果会员弹窗或付费弹窗
        if (cacheShowVip || cacheShowPay) {
            if (userInfo && userId !== userInfo.user.id) {
                // 用户是否发生改变、专题页是否需要重新拉取
                this.data.userId = userInfo.user.id;
                this.initPageView({ init: 1 });
                return;
            }

            // 根据h5付费页面返回相关处理是否重新刷新页面
            if (webview != this.data.vipInfo) {
                this.data.webview = this.data.vipInfo;
                this.initPageView({ init: 1 });
                return;
            }

            // 付费会员弹窗显示
            if (cacheShowVip) {
                const vipProps = {
                        from: global.payfrom,
                        topic_id: topicId,
                        comic_id: comicId,
                    },
                    trackProps = {
                        isvip,
                        TopicName: topicTitle,
                        ComicName: comicTitle,
                        LatestBalance: wallet,
                    };
                this.setData(
                    {
                        userInfo,
                        vipProps,
                        trackProps,
                        vipShow: true,
                        scrollY: false,
                        fullScreen: false,
                        initDanmu: false,
                        vipType: vipStatus,
                    },
                    () => {
                        this.setData({ scrollY: true });
                    }
                );
            }
            if (cacheShowPay) {
                this.setData(
                    {
                        vipStatus,
                        scrollY: false,
                        payDialog: true,
                        fullScreen: false,
                        initDanmu: false,
                        cacheShowPay: false,
                        topicId,
                        topicTitle,
                        comicId,
                        comicTitle,
                        payInfo: wallet && curWallet != wallet ? {} : payInfo,
                    },
                    () => {
                        this.setData({ scrollY: true });
                    }
                );
            }
        }
    },
    createRecycle(cb) {
        this.ctx = createRecycleContext({
            id: 'comic-recycle-list',
            dataKey: 'imgList',
            page: this,
            itemSize: this.recycleItemSize,
        });
        cb && cb();
    },
    recycleItemSize(item) {
        const { viewWidth } = this.data;
        return {
            width: viewWidth,
            height: item.height,
        };
    },

    // 销毁监听器
    destoryMointor() {
        try {
            if (listItemContainer) {
                listItemContainer.disconnect();
            }
        } catch (error) {
            // console.log(error);
        }
    },

    // 查询当前阅读缓存数据
    queryHistoryCache() {
        this.data.historyForMy = wx.getStorageSync('historyForMy') || [];
        this.data.historyForPost = wx.getStorageSync('historyForPost') || [];
        this.data.historyForTopic = wx.getStorageSync('historyForTopic') || {};
    },

    // 上报更新阅读历史、根据传入数组决定执行那几个上报 [1,2,3] 1：上报专题页 2: 上报书架页 3: 上报服务端， 未传都执行
    updateHistoryCache(arry) {
        this.queryHistoryCache();
        const mapSetHisFun = (type) => {
            let setFuns = {
                1: () => {
                    return this.setTopicHistory();
                },
                2: () => {
                    return this.setMyHistory();
                },
                3: () => {
                    return this.reportedData();
                },
            };
            return setFuns[type]();
        };
        (!arry ? [1, 2, 3] : arry).map((item) => {
            mapSetHisFun(item);
        });
    },

    // 初始化页面相关
    initPageView({ init = 1, behavior = false } = {}) {
        this.watchNetwork({ init, behavior });
    },
    getPageData({ init = 1, behavior = false } = {}) {
        const { onGetting } = this.data;
        if (onGetting) {
            return;
        }

        this.data.onGetting = true;
        this.pageDataApi({ init, behavior });
    },
    pageDataApi({ init = 1, behavior = false } = {}) {
        const { comicId, parentId, pageNextId } = this.data;
        const comic_id = init == 2 || init == 4 ? pageNextId : comicId || '';
        util_request({
            url: `/mini/v1/comic/${global.channel}/comic/detail`,
            host: 'api',
            data: {
                topic_id: parentId ? parentId : '',
                comic_id: comic_id ? comic_id : '',
            },
        })
            .then((res) => {
                const { data } = res;
                const {
                        vip_user: isvip,
                        comic_basic_info: comicInfo,
                        topic_basic_info: topicInfo,
                        comic_image_list: imageList,
                        next_comic_id: nextComicId,
                        previous_comic_id: preComicId,
                        is_danmu_hidden: danmuHidden,
                        temporary_vip_user: temporaryVip,
                        comic_auth: comicAuth,
                        content: comicContent = [],
                    } = data,
                    { id: topicId, title: topicTitle, comic_count: comicCount, vertical_image_url: verticalUrl, is_favourite: followed, update_remind: updateRemind, signing_status: signingStatus } = topicInfo,
                    { reason, id: comicId, is_liked: praised, like_count: praiseNum, title: comicTitle, comic_property_code: comicProperty } = comicInfo;

                // 图片列表数据
                // let top = 0
                let imgList = imageList.map((item, index) => {
                    let height = (item.height * 750) / item.width;
                    let imgObj = {
                        id: `pic_${comicId}_${index}`,
                        src: item.image_url,
                        picIndex: index + 1,
                        height: Math.round(height / this.data.screenRpxRate) - 1,
                        top: this.data.picTop,
                        realWidth: item.width,
                        key: item.key,
                        topicId,
                        comicId,
                        comicTitle,
                        topicTitle,
                        comicCount, // 当前专题所对应的章节数
                        verticalUrl,
                        praised,
                        praiseNum,
                        followed,
                        signingStatus,
                        totalCount: imageList.length, // 当前章节所对应图片数
                        sign: 'picture', // 添加集中标识 ad: 广告, blank: 空白占位, picture: 图片, handle: 每个章节底部固定操作位
                    };
                    this.data.picTop = this.data.picTop + Math.round(height / this.data.screenRpxRate); // 计算每张图片距离顶部位置
                    return imgObj;
                });

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
                        TopicName: topicTitle,
                        TriggerPage: 'ComicPage',
                        AdPaid: 0,
                    });
                }

                // 数据存储分两个维度，1: 暂存的数据对象 2:set的数据对象
                const tsDataObj = {
                    currentPrice: comicInfo.selling_price || 0, // 当前章节价格
                    ulockReason: comicInfo.reason && comicInfo.reason == 11 ? '畅读卡解锁' : 0, // 解锁原因
                };
                const setDataObj = {
                    // 需要更改页面状态
                    praised,
                    praiseNum: praiseNum ? util_transNum(praiseNum) : '',
                    comicId,
                    comicTitle,
                    topicId,
                    topicTitle,
                    prevId: preComicId || '',
                    nextId: nextComicId || '',
                    isFree: comicInfo.is_free,
                    updateRemind,
                    signingStatus,
                    followed,
                    danmuHidden,
                    chapterType,
                    isBonusChapter: comicProperty && comicProperty == 6,
                };

                this.data.initTiming = init; // 记录当前数据加载的时机

                setTimeout(() => {
                    this.data.onGetting = false; // 预防一次拉取多个章节
                }, 200);

                Object.assign(this.data, tsDataObj);
                // 判断是否冻结kkb 0正常 1冻结
                if (comicAuth && comicAuth.status == 1) {
                    this.setData({
                        kkbLocked: true,
                        lockedContent: comicAuth.toast || '您的账号已被冻结，冻结期间无法阅读付费漫画，请联系客服处理~',
                        lockedButton: [{ text: '我知道了' }],
                    });
                }

                // 状态显示视图数据对象
                const params = {
                    isvip,
                    reason,
                    temporaryVip,
                    canView: comicInfo.can_view,
                    vipExclusive: comicInfo.vip_exclusive,
                    isPay: !comicInfo.is_free && !comicInfo.can_view,
                };

                if (init == 1 || init == 2 || init == 5) {
                    // push一个广告位, 一个固定操作栏
                    const common = {
                        src: '',
                        picIndex: imageList.length,
                        top: this.data.picTop, // this.data.navHeight,
                        realWidth: 375,
                        topicId,
                        comicId,
                        comicTitle,
                        topicTitle,
                        comicCount, // 当前专题所对应的章节数
                        verticalUrl,
                        praised,
                        praiseNum,
                        followed,
                        signingStatus,
                        totalCount: imageList.length, // 当前章节所对应图片数
                    };

                    const fixPos = [
                        {
                            ...common,
                            id: `pic_${comicId}_handle`,
                            height: !updateRemind ? Math.ceil(180 / global.screenRpxRate) : Math.ceil(308 / global.screenRpxRate), // 可能会影响整个页面高度计算
                            key: `handle_${comicId}`,
                            sign: 'handle',
                        },
                        {
                            ...common,
                            id: `pic_${comicId}_ad`,
                            height: Math.ceil(582 / global.screenRpxRate),
                            key: `ad_${comicId}`,
                            sign: 'ad',
                        },
                        {
                            ...common,
                            id: `pic_${comicId}_recom`,
                            height: Math.ceil(534 / global.screenRpxRate),
                            key: `recom_${comicId}`,
                            sign: 'recom',
                        },
                    ];

                    let { allImglists } = this.data,
                        startUpdateInd = 0;
                    imgList = imgList.concat(fixPos);
                    if (init == 5) {
                        // 5为更新长列表当前章节
                        this.data.isFree = comicInfo.is_free; // 用于埋点
                        startUpdateInd = allImglists.findIndex((item) => item.comicId == comicId);
                        this.data.allImglists = allImglists.slice(0, startUpdateInd).concat(imgList);
                    } else {
                        this.data.allImglists = allImglists.concat(imgList);
                    }

                    this.setData({
                        imgListForBarrage: this.data.allImglists,
                    });

                    this.handleRecycle(init, imgList, startUpdateInd);

                    if (init == 1) {
                        // 将初始化的章节id放入已加载数组中
                        if (!this.data.loadComicIds.includes(comicId)) {
                            this.data.loadComicIds.push(comicId);
                        }
                        this.setFollows(topicId, followed);
                        this.setData({ exitData: !!imgList.length, ...setDataObj, fullScreen: this.data.autobuy }, () => {
                            // 初始化时后需要根据状态判断是否调用相关弹窗
                            if (params.isPay && this.data.autobuy) {
                                // console.log('自动付费的内容');
                                this.autoBuyFun(params);
                            } else {
                                this.accordStatusView(params);
                            }
                        });
                    } else if (init == 2) {
                        // 兼容某个章节少于三张图片自动加载下一话然后更新nextId
                        this.data.nextId = nextComicId || '';
                        if (imgList.filter((item) => item.sign == 'picture').length <= 3) {
                            // 此时章节作为已读章节上报,先做记录
                            this.data.littleComicIds.push(comicId);
                        }
                    }
                }

                if (init == 3 || init == 4) {
                    // 3、上翻页更新 4、下翻页更新
                    this.setFollows(topicId, followed);
                    this.setData({ exitData: !!imgList.length, ...setDataObj }, () => {
                        // 自动购买部分
                        if (params.isPay && this.data.autobuy) {
                            // console.log('自动付费的内容');
                            this.autoBuyFun(params);
                        } else {
                            // 只执行弹窗等一些状态相关的内容, 需要将暂存数据更改，然后再调取弹窗方法
                            this.accordStatusView(params);
                        }
                    });
                }

                // 只在刚进入初始化一次
                if (init == 1) {
                    util_getCustomShare({ page: 'comic', id: comicId, cb: () => {} });
                }
            })
            .catch((err) => {
                // console.log('这里对报错进行兼容性处理', err);
                if (err) {
                    this.setData({
                        dialogShow: true,
                        backDelta: true,
                        dialogContent: err.message || '当前章节未找到',
                        dialogButton: [{ text: '我知道了' }],
                    });
                }
            });
    },

    // 自动购买的一些处理
    autoBuyFun(params) {
        const { comicId, comicTitle } = this.data;
        // 自动购买逻辑
        this.requestPayInfo()
            .then((payInfo) => {
                let { autoPay, kk_currency_balance: wallet } = payInfo;
                this.data.payInfo = payInfo;
                wallet = wallet < 0 ? 0 : wallet;
                const listItem = payInfo.batch_purchase_list[0];
                const encrypt = listItem.comicbuy_encrypt_str;
                const prize = listItem.price_info.selling_kk_currency;
                if (autoPay && wallet >= prize) {
                    // console.log('可以自动购买');
                    this.data.autoPay = true;
                    this.requestPaid({
                        comicId,
                        encrypt,
                        report: {
                            comic_name: comicTitle,
                            current_price: prize,
                            auto_paid: 1,
                        },
                    })
                        .then((data) => {
                            // console.log('重新获取章节数据');
                            util_showToast({
                                title: data.auto_pay_time > 0 ? '买好啦，请愉快食用！' : '自动购买，可在钱包设置',
                                duration: 1500,
                            });
                            this.data.payInfo = {};
                            this.data.onGetting = false;

                            // 自动购买成功，重新拉取当前章节数据, 需要更新长列表数据了
                            this.getPageData({ init: 5 });
                        })
                        .catch(() => {
                            this.accordStatusView(params);
                        });
                } else {
                    // console.log('是付费章节，不自动购买，或kk币不够');
                    this.accordStatusView(params);
                }
            })
            .catch(() => {
                this.accordStatusView(params);
            });
    },

    // 查询付费信息 接口回调
    requestPayInfo() {
        return new Promise((resolve, reject) => {
            const { topicId, comicId } = this.data;
            util_request({
                method: 'post',
                host: 'pay',
                url: '/v2/comicbuy/comic_price_info_h5',
                data: {
                    topic_id: topicId,
                    comic_id: comicId,
                    from: global.payfrom,
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
            const { autoPay } = this.data;
            util_request({
                method: 'post',
                host: 'pay',
                url: '/v2/comicbuy/encrypt_buy_h5',
                data: {
                    comicbuy_encrypt_str: encrypt,
                    auto_pay: autoPay,
                    source: report.auto_paid ? 2 : 3,
                    from: global.payfrom,
                    target_id: comicId,
                    cps: global.cps,
                    app_id: global.appId, // 来源appId
                    scene: global.scene, // 来源场景
                },
            })
                .then((res) => {
                    // 存储已购买章节，回到列表时更新状态
                    const data = res.data;
                    resolve(data);
                })
                .catch(() => {
                    this.setData({
                        showDialog: true,
                    });
                    reject();
                });
        });
    },

    // 处理不同状态视图显示(弹窗、会员...)
    // 先把各个弹窗和其他需要阐参数整理处理
    async accordStatusView(params) {
        const { isiOS } = global;
        const { isvip, reason, isPay, canView, temporaryVip, vipExclusive } = params;
        const { topicId, comicId, comicTitle, topicTitle, showDialog } = this.data;

        let status = '',
            vipToast = '';
        if (!canView) {
            const { code, data } = await this.vipAndroidGuide();
            if (code === 200) {
                status = data.pop_ups[0]; // 3: 提前看 4: 定向限免
                this.data.vipStatus = status;
            }
        }

        // 会员专享的一些处理
        if (vipExclusive) {
            // 会员专享章节
            if (!isvip) {
                vipToast = '本章节内容仅限会员可以阅读';
            } else if (reason && [103, 104].includes(reason)) {
                vipToast = temporaryVip ? '您当前的身份是"体验会员", 开通正式会员后可享受全部会员权益' : '开通正式会员后可继续阅读本章节';
            }
            if (!vipToast) {
                return;
            }
            if (isiOS) {
                this.setData({
                    vipToast,
                    dialogShow: true,
                    dialogContent: vipToast,
                    dialogButton: [{ text: `开通${temporaryVip ? '正式' : ''}会员` }],
                });
                return;
            } else {
                // console.log('android要展示会员专享弹窗了');
                // 针对提前看需要判断图片是否满一屏，不满一屏幕直接展示
                let immediate = false;
                if (status == 3) {
                    const { viewHeight, allImglists } = this.data;
                    const filterArray = allImglists.filter((item) => item.comicId == comicId && item.sign == 'picture');
                    immediate = filterArray.some((item) => item.top > viewHeight);
                    // console.log(immediate, '不立刻显示弹窗');
                }
                this.showAheadFun({ type: 1, status, immediate });
            }
        }

        // 付费弹窗的显示、isPay是否付费章节
        // 需要传入payInfo（支付信息或者不传)
        // vipStatus 会员限免标识
        if (isPay && !showDialog) {
            this.setData({
                payInfo: {},
                scrollY: false,
                payDialog: true,
                fullScreen: false,
                initDanmu: false,
                vipStatus: status,
                topicId,
                topicTitle,
                comicId,
                comicTitle,
            });
        }
    },
    vipAndroidGuide() {
        // android会员弹窗引导判断
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
    async kkbBalance() {
        // 存在弹窗的情况调kkb剩余的接口
        if (!this.data.userInfo) {
            this.setWallet(0);
        } else {
            await util_checkWallet(this);
        }
    },

    handleRecycle(init, list, updateInd) {
        if (init == 5) {
            this.ctx.update(updateInd, list, () => {
                this.setData({ scrollY: true });
            });
        } else {
            this.ctx.append(list, () => {
                this.setData({ scrollY: true });
                if (this.data.initTiming == 1) {
                    const { cacheCount } = this.data;
                    if (cacheCount) {
                        this.setData({
                            initIndex: cacheCount,
                        });
                    } else {
                        this.setData({ scrollTop: 1 });
                    }
                }
            });
        }
    },

    // 页面滚动
    handleScroll(e) {
        this.onScrollForBarrage(e);
        const { scrollTop, scrollHeight, deltaY } = e.detail;
        const { fullScreen, cacheFull, viewHeight } = this.data;

        // 初始化的时候，第一次动画动作不执行
        if (this.data.cacheCount) {
            this.data.cacheCount = 0;
        }
        if (!this.data.cacheCount && this.data.scrollTop != 1) {
            this.triggerPageScroll(); // 挂角动画处理
        }

        // 避免重复set数据\临界值再定
        if (!fullScreen) {
            if (scrollTop >= 60 && !cacheFull) {
                this.setData({ fullScreen: true });
            }
        } else {
            if (scrollTop < 50) {
                if (deltaY < 0) {
                    return;
                }
                this.setData({ fullScreen: false, tapScreen: false, cacheFull: false });
            }
        }
        // console.log(1111, e, scrollTop, scrollHeight)
        Object.assign(this.data, { scrollTop, scrollHeight, cacheFull: false });

        // 滚动中记录信息
        this.computeMaxTime(scrollTop);

        // 滚动中更新当前页面相关信息暂定deltaY>=0 向顶部滑（回滚）<0向底部滑（更多）
        this.scrollUpdateInfo({ dirction: !!(deltaY >= 0) });

        if (scrollHeight - scrollTop < viewHeight * 1.8) {
            // 阀值调大，预防ipad触底情况
            this.handleReachBottom();
        }

        // 判断距离底部多远时拉起会员提前看弹窗，底部距离固定
        if (this.data.valveHandle) {
            return;
        }
        this.showAheadLook(scrollTop, scrollHeight);
    },
    showAheadLook(scrollTop, scrollHeight) {
        const { aheadLook } = this.data;
        if (aheadLook && aheadLook.show && scrollHeight - scrollTop < this.data.viewHeight * 2) {
            // 这个判断要在加载下一话之前，不然scrollHeight变化了
            // 可视区域出现提前看章节最后一张图片时显示
            const { allImglists } = this.data;
            const filterArray = allImglists.filter((item) => item.comicId == aheadLook.id && item.sign == 'picture');
            const viewArray = this.ctx.getViewportItems();
            const lastObj = filterArray.pop();

            if (viewArray.find((item) => item.id === lastObj.id) !== -1) {
                this.data.valveHandle = true;
                this.setData({ scrollY: false });
                this.showAheadFun({ type: 2, status: 3 });
            }
        }
    },
    async showAheadFun({ type = 1, status = '', immediate = false } = {}) {
        await this.kkbBalance();
        const { payfrom } = global;
        const { topicId, topicTitle, comicId, comicTitle, userInfo, wallet, isvip, cacheShowVip } = this.data;
        const vipProps = {
                from: payfrom,
                topic_id: topicId,
                comic_id: comicId,
            },
            trackProps = {
                isvip,
                TopicName: topicTitle,
                ComicName: comicTitle,
                LatestBalance: wallet,
            },
            data = {
                userInfo,
                vipShow: true,
                vipType: status,
                vipProps,
                trackProps,
            };

        if (type == 1) {
            data.vipShow = !!(status == 4 || (status == 3 && (cacheShowVip || !immediate)));
            data.aheadLook = {
                // 提前看弹窗未显示标识，滚动到一定位置再显示
                show: status == 3 && !cacheShowVip && immediate,
                id: comicId,
            };
        }
        data.fullScreen = false; // data.vipShow // 是否全屏跟弹窗是否显示绑定

        this.setData(data, () => {
            if (type == 2) {
                this.setData({
                    aheadLook: {},
                    scrollY: true,
                });
            }
        });
    },
    computeMaxTime(scrollTop) {
        const { scrollTops } = this.data;
        scrollTops.push({
            scrollTop,
            time: new Date().getTime(),
        });
    },
    scrollUpdateInfo({ dirction = true } = {}) {
        // 更新当前页面章节信息 章节id、章节标题、弹窗等处理
        this.updateComicInfo({ dirction }); // 更新专题信息
    },
    updateComicInfo({ dirction = true } = {}) {
        // 初始化章节例如：comic_id: 977, comic_title: 第1话下 珏皇子
        const { comicTitle } = this.data;
        const viewArray = this.ctx.getViewportItems(); // 当前视图区域内容数组
        const filterArray = Array.from(new Set(viewArray.map((item) => item.comicId)));
        const adview = viewArray.find((item) => item.sign == 'recom') || {};

        // 广告部分加载、销毁优化
        this.getAdShow(viewArray);
        if (!filterArray.length || this.data.onGetting) {
            return;
        }
        let updateInfo = {};
        if (filterArray.length && filterArray.length != 1) {
            if (!dirction || adview.comicTitle == comicTitle) {
                return;
            }
            updateInfo = {
                comicId: adview.comicId,
                comicTitle: adview.comicTitle,
            };
            this.setData({ comicTitle: adview.comicTitle });
        } else {
            if (dirction || viewArray[0].comicTitle == comicTitle) {
                return;
            }
            this.data.comicTitle = viewArray[0].comicTitle;
            updateInfo = {
                comicId: viewArray[0].comicId,
                comicTitle: viewArray[0].comicTitle,
            };
            if (adview.comicTitle) {
                this.setData({ comicTitle: adview.comicTitle });
            }
        }

        Object.assign(this.data, updateInfo);
        // 专题章节变更，且传递进来回滚标识，重新拉取上一章节状态处理弹窗等
        if (dirction) {
            // console.log('执行了向下滑动回滚，触发了拉取上一章节状态');
            this.getPageData({ init: 3 });
        } else {
            // console.log('执行了向上滑动加载更多，触发了拉取下一章节状态');
            // 处理章节图片少漏报的历史和打点
            // littleComicIds, yetReportComicIds
            const { comicId, littleComicIds, yetReportComicIds } = this.data;
            if (littleComicIds.includes(comicId) && !yetReportComicIds.includes(comicId)) {
                this.updateHistoryCache([1, 2, 3]);
                this.onTrack('ReadComic');
                this.data.yetReportComicIds.push(comicId);
            }
            this.getPageData({ init: 4 });
        }
    },
    getAdShow(viewArray) {
        try {
            wx.createSelectorQuery()
                .select('#item-ad-view')
                .boundingClientRect()
                .exec((res) => {
                    if (res[0]) {
                        let { windowHeight = 667 } = global.systemInfo;
                        let showNum = 0.5; // 超过屏幕的数量，目前这个设置是上下0.5屏，如果某个章节只有一张图片，回滚会出现闪动
                        listItemContainer = this.createIntersectionObserver();
                        listItemContainer
                            .relativeToViewport({
                                top: showNum * windowHeight,
                                bottom: showNum * windowHeight,
                            })
                            .observe('#item-ad-view', (res) => {
                                let { intersectionRatio } = res;
                                if (intersectionRatio === 0) {
                                    if (!this.data.rangeCache) {
                                        return;
                                    }
                                    this.data.rangeCache = false;
                                    this.setData({
                                        showAdView: false,
                                    });
                                } else {
                                    if (this.data.rangeCache) {
                                        return;
                                    }
                                    this.data.rangeCache = true;
                                    this.setData({
                                        showAdView: true,
                                    });
                                }
                            });
                    } else {
                        this.destoryMointor();
                    }
                });
        } catch (error) {
            const adview = viewArray.find((item) => item.sign == 'ad') || {};
            if (adview.comicId) {
                if (this.data.showAdView) {
                    return;
                }
                // 广告重新初始化
                this.setData({
                    showAdView: true,
                });
            } else {
                if (!this.data.showAdView) {
                    return;
                }
                this.setData({
                    showAdView: false,
                });
            }
        }
    },
    adError() {
        this.setData({
            showAdView: false,
        });
    },
    firstGuideFunc() {
        // 引导相关、暂时不用
        if (wx.getStorageSync('guide:continueRead')) {
            wx.setStorageSync('guide:continueRead', false);
            this.setData({ scrollY: false });
            this.setData(
                {
                    guideReadShow: true,
                },
                () => {
                    setTimeout(() => {
                        this.setData({
                            scrollY: true,
                            guideReadShow: false,
                        });
                    }, 1500);
                }
            );
        }
        this.handleReachBottom();
    },
    handleReachBottom() {
        if (this.data.onGetting || this.data.initGetting) {
            return;
        }
        const { nextId, loadComicIds } = this.data;
        if (nextId && !loadComicIds.includes(nextId)) {
            Object.assign(this.data, {
                autobuy: true,
                pageNextId: nextId,
            }); // 此时只是需要下一章节的id，不能更改暂存的comicId
            this.data.loadComicIds.push(nextId);
            // 避免拉取的下一话和当前话相同
            // if (nextId == comicId) return

            // 加载下一话前上报\提高准确性跟加载下一页时机大致对应（目前是两屏幕）
            this.updateHistoryCache([1, 2, 3]);
            // 推荐打点、基础埋点
            this.onTrack('ReadComic');
            // 隐藏顶部提示条
            this.setData({
                showBackBubble: false,
            });
            this.getPageData({ init: 2 });
        } else {
            // 处理刚进入就是最后一章节
            this.data.initGetting = true;
            util_showToast({
                title: '已读到当前漫画最后一章节',
                duration: 2000,
            });
        }
    },

    getStorageBarrageStatus() {
        const { userId } = getApp().globalData;
        const key = userId ? `uid:${userId}:barrage:status:new` : 'barrage:status:new';
        return wx.getStorageSync(key);
    },
    pageChange(top) {
        this.setData(
            {
                scrollAnimation: true,
            },
            () => {
                this.setData({
                    scrollTop: top,
                });
                // 隐藏弹幕层处理tap滚动不流畅
                wx.nextTick(() => {
                    if (this.getStorageBarrageStatus() == 1) {
                        this.setData({ barrageStatus: 0 });
                        clearTimeout(this._changeBarrageStatusTimer);
                        this._changeBarrageStatusTimer = setTimeout(() => {
                            this.setData({ barrageStatus: 1 });
                        }, 1000);
                    }
                });
            }
        );
    },
    // 页面内点击
    handleTap(e) {
        if (this.data.barrageMenuShown) {
            return this.hideBarrageMenu();
        }
        const { scrollTop, fullScreen, scrollHeight, viewHeight, navHeight } = this.data;

        // 通过点击区域判断用户操作目的
        if (fullScreen) {
            let touchY = e.detail.y,
                oneIn3 = viewHeight / 3, // 滚动区域的三分之一高
                twoIn3 = oneIn3 * 2;

            if (touchY < oneIn3) {
                // 上翻页
                let target = scrollTop - twoIn3;
                this.pageChange(target < 0 ? 0 : target);
            } else if (touchY > twoIn3) {
                // 下翻页
                let target = scrollTop + twoIn3,
                    maxTop = scrollHeight - viewHeight + 50; // 50是防止未知错误增加的额外高度

                this.pageChange(target > maxTop ? maxTop : target);
            } else {
                // 全屏切换
                this.setData({
                    tapScreen: !!(scrollTop > navHeight),
                    fullScreen: false,
                });
            }
        } else {
            this.setData({
                fullScreen: true,
            });
        }
    },

    // 回到首页/专题页
    goHomeFun() {
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
    },
    goBackTop() {
        this.pageChange(0);
    },

    // 章节跳转
    jumpComic(e) {
        const { id, disabled, type } = e.currentTarget.dataset;
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
        if (this.data.onGetting) {
            return;
        }
        this.clickTrack({ type: type == 'next' ? 3 : 1 });

        // 跳章节前存储阅读历史
        this.updateHistoryCache([1, 2]);
        wx.redirectTo({
            // 新打开页面默认全屏、默认自动购买支付
            url: `/pages/${global.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${id}&autobuy=true&fullScreen=true`,
        });
    },
    skipSwatch() {
        const { comicId } = this.data;
        wx.redirectTo({
            url: `/pages/comic/comic?id=${comicId}&autobuy=true`,
        });
    },

    // 组件相关（目录组件）
    directory() {
        const { directoryShow, initDanmu } = this.data;
        this.clickTrack({ type: 2 });
        this.setData({
            initDanmu: !initDanmu,
            directoryShow: !directoryShow,
        });
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

    // 点赞/取消点赞
    praiseClick() {
        const viewArray = this.ctx.getViewportItems();
        const view = viewArray.filter((item) => item.sign == 'handle');
        const id = view && view.length ? view[0].comicId : this.data.comicId;
        const state = this.data.praised;
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
        if (type == 'upraise') {
            this.praiseClick();
        } else if (type == 'ufollow') {
            this.followClick();
        } else if (type == 'npraise' || type == 'nfollow') {
            this.originLogin(e);
        } else if (type == 'share') {
            this.shareClick();
        } else if (type == 'next' || type == 'prev') {
            this.jumpComic(e);
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
        const { topicId: id } = this.data;
        this.handleFollow(id, false, (res) => {
            this.onTrack(res ? 'FavTopic' : 'RemoveFavTopic');
        });
    },

    // 点赞、关注、离开漫画埋点上报
    onTrack(event, params) {
        const { barrageStatus, isFree = true, recMap } = this.data;
        const viewArray = this.ctx.getViewportItems();
        const { comicTitle: ComicName, comicId: ComicID, topicId: TopicID, topicTitle: TopicName, signingStatus } = viewArray.filter((item) => item.sign == 'handle')[0] || {};

        // 停留时长
        const date = new Date().getTime();
        const stayDuration = date - this.data.timestamp;

        // 弹幕是否开启
        const barrage = barrageStatus === -1 ? 0 : barrageStatus;
        const BulletScreenSet = !barrage ? '关闭' : '开启';

        // 是否付费作品
        const IsPaidComic = !isFree ? 1 : 0;

        // 签约状态
        const WorksSigningState = signingStatus || '';

        // 阅读进度
        // const readCount = maxReadCount / totalCount;
        // const ReadPer = readCount > 0 ? readCount.toFixed(2) : 0;

        // 页面来源
        const multPage = util_multPage(this.data.pageTrigger);
        const { SrcPageLevel1, SrcPageLevel2, SrcPageLevel3, TriggerPage, CurPage } = multPage;

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
            200: '专题页选集',
            201: '专题页目录',
            202: '专题页推荐',
            203: '专题页阅读按钮',
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
        } else if (TriggerPage == 'TopicPage') {
            TabModuleType = TabModuleText;
        } else {
            TabModuleType = TabModuleText;
        }

        let options = {
            ComicID,
            ComicName,
            TopicID,
            TopicName,
        };

        // 最新阅读进度计算
        const newRead = this.handlerRead();
        const newReadCount = newRead.max_read_count / newRead.total_count;
        const newReadPer = newReadCount > 0 ? newReadCount.toFixed(2) : 0;

        if (event == 'ReadComic') {
            Object.assign(options, {
                stayDuration,
                BulletScreenSet,
                IsPaidComic,
                WorksSigningState,
                ReadPer: newReadPer,
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
            app.kksaTrack(event, options);
            const read_duration_list = [];
            read_duration_list.push({
                topic_id: TopicID,
                comic_id: ComicID,
                start_time: this.data.timestamp,
                duration: stayDuration,
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
            app.kksaTrack(event, options); // 上报神策埋点

            // 如果是取消关注埋点 无需上报数据组
            if (event == 'RemoveFavTopic') {
                return;
            }
        } else if (event == 'Like') {
            Object.assign(options, {
                LikeObject: '漫画',
                TriggerPage: CurPage,
                ...params,
            });

            // 神策上报 点赞/取消点赞
            app.kksaTrack(event, options);
        }
        util_feedTrack(
            event,
            Object.assign({}, options, {
                ...recMap,
            })
        ); // 上报数据组埋点
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

    handlerRead() {
        let maxTime,
            maxScrollTop = 0,
            maxReadObj,
            curComicList,
            array = new Map();
        const { comicId, scrollTops, allImglists, viewHeight } = this.data;
        // 拿到视图对象
        const viewArray = this.ctx.getViewportItems();
        if (!viewArray.length) {
            return;
        }
        const filterArray = viewArray.filter((item) => item.comicId == comicId);
        const obj = filterArray[filterArray.length - 1];

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

        // 当前章节,根据最大scrollTop获取当前最大阅读图片
        curComicList = allImglists.filter((item) => item.comicId == comicId);
        maxReadObj = curComicList.find((item) => item.top >= maxScrollTop + viewHeight) || {};

        return {
            topic_id: obj.topicId,
            comic_id: obj.comicId,
            max_read_count_time: maxTime,
            read_count: obj.picIndex, // 停留位置是第几张图片
            max_read_count: maxReadObj.picIndex ? maxReadObj.picIndex : obj.totalCount, // 最大阅读图片数
            read_time: new Date().getTime(), // 退出详情页\即触发上报时机(翻页／退出)
            total_count: obj.totalCount,
        };
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

    // 优化处理相关
    watchNetwork({ init = 1, behavior = false } = {}) {
        // 网络监听
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
                    this.getPageData({ init, behavior });
                    if (networkType !== 'wifi') {
                        util_showToast({
                            title: '您当前正在使用流量阅读呢',
                            duration: 2000,
                        });
                    }
                }
            },
        });
        wx.onNetworkStatusChange((res) => {
            if (res.isConnected) {
                // 网络是否链接
                if (res.networkType !== 'wifi') {
                    util_showToast({
                        title: '您当前正在使用流量阅读呢',
                        duration: 2000,
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

    // 弹窗回调处理
    tapDialogButton() {
        this.setData({
            dialogShow: false,
        });
        if (this.data.vipToast) {
            // 执行会员开通的操作
            this.goVipOpen();
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
    onUnlocking(e) {
        // console.log('onUnlocking--父级接收解锁状态', e);
        const { state, type, toast = {} } = e.detail;
        if (toast && toast.show) {
            util_showToast({
                title: toast.message,
                duration: 2000,
            });
        }
        this.setData({
            payDialog: !state,
            initDanmu: state,
            showDialog: type == 'adv' && state,
        });
        if (state) {
            // 相应付费成功、弹窗消失、更新状态
            this.getPageData({ init: 5 });
        }
    },

    hideBottomTools() {
        this.setData({ fullScreen: true });
    },

    // 分享相关内容（页面分享 & 分享卡片进入上报 & 自定义分享内容 & 活动上报）
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
        const { topicId, comicId, topicTitle } = this.data;
        const origin = from == 'menu' ? 2 : 1;
        const title = `好看哭！《${topicTitle}》这个漫画太优秀了！`;
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

        // 活动弹窗区分、种个缓存服务端使用
        wx.setStorageSync('activity:share', true);

        // 行为解锁
        if (target && target.dataset && target.dataset.jumptype == 3 && target.dataset.sign) {
            // console.log('测试ios分享解锁');
            this.data.shareBehavior = true;
            this.shareUnlock({ sign: target.dataset.sign });
        }

        // 分享上报数据组
        util_feedTrack('Share', {
            ShareContentType: 1,
            SubjectID: `${topicId}-${comicId}`,
        });

        // 自定义分享内容/分享时上报
        return util_returnShareContent({ title, page: 'comicnew', params, shareTarget });
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
                // console.log('分享解锁成功', res);
                const { freeComicOrderModel } = res.data;
                // 3:购买成功 0:参数异常 1:重复购买 2:购买失败
                const day = 24 * 60 * 60 * 1000;
                const time = freeComicOrderModel.expiredTime - new Date().getTime();
                this.data.isUnlock = true;
                this.data.unlockMsg = Math.ceil((time > 0 ? time : 0) / day); // 下发毫秒转化向上取整
                // console.log('天数', this.data.unlockMsg);
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
    shareEnterTrack(source, terminal) {
        // 活动分享卡片进入
        // console.log(global.scene, terminal, '分享卡片进入');
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

    // 阅读历史相关处理
    returnReportObj() {
        let obj = {};
        const { comicId, userInfo } = this.data;
        if (comicId && !userInfo) {
            const viewArray = this.ctx.getViewportItems();
            if (viewArray.length) {
                const filterArray = viewArray.filter((item) => item.comicId == comicId);
                obj = filterArray[filterArray.length - 1];
            }
        }
        return obj;
    },
    setMyHistory() {
        // 存储用于书架页使用
        // console.log('执行了上报书架页所用历史2', this.ctx.getViewportItems());
        // topicId, topicTitle, comicId, comicTitle, comicCount, verticalUrl
        // 上报三个时间点 1、点击翻章节之前 2、拉取下一章数据之前（是否需要禁止滚动，存储完成再滚动，不然可视区域内容变化，滚动惯性） 3、关闭页面
        // 如果容器内容存在两个章节，按照id规则处理和上报
        // 存储为当前章节id所对应的信息
        const obj = this.returnReportObj();
        if (!obj.comicId) {
            return;
        }

        let { historyForMy, historyForTopic, payDialog, vipToast, isBonusChapter = false } = this.data;
        let continue_read_comic = {
            id: obj.comicId,
            title: obj.comicTitle,
            read_count: obj.picIndex,
        };
        let historyObj = {
            id: obj.topicId,
            title: obj.topicTitle,
            vertical_image_url: obj.verticalUrl,
            comics_count: obj.comicCount, // 专题章节数
            continue_read_comic,
            read_count: historyForTopic[obj.topicId] && historyForTopic[obj.topicId].readList.length ? historyForTopic[obj.topicId].readList.length : 1, // 已阅读章节，默认一个章节
        };

        // 查询historyForMy是否已经存在、存在更新
        const exitIndex = historyForMy.findIndex((item) => item.id == obj.topicId);
        if (exitIndex >= 0) {
            historyForMy.splice(exitIndex, 1);
        }
        historyForMy.unshift(historyObj);

        // console.log(historyForMy, '存储的书架页阅读历史');
        // 弹窗存在时不存储
        if (!payDialog && !vipToast && !isBonusChapter) {
            wx.setStorage({
                key: 'historyForMy',
                data: historyForMy,
            });
        }
    },
    setTopicHistory() {
        // 存储用于专题页使用
        // console.log('执行了上报专题页所用历史1');
        const obj = this.returnReportObj() || {};
        if (!obj.comicId) {
            return;
        }

        let { historyForTopic, payDialog, vipToast, isBonusChapter = false } = this.data;
        let topicObj = historyForTopic ? historyForTopic[obj.topicId] : {};
        let readList = topicObj && topicObj.readList ? topicObj.readList : [];
        let readObj = {
            id: obj.comicId,
            read_count: obj.picIndex,
            has_read: true,
            continue_read_comic: !isBonusChapter,
        };

        // 非第一次存储清除掉之前的
        const exitIndex = readList.findIndex((item) => item.id == obj.comicId);
        if (exitIndex >= 0) {
            readList.splice(exitIndex, 1);
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
        historyForTopic[obj.topicId] = {
            readList: readList,
            lastId: lastId, // obj.comicId,
        };

        // console.log(historyForTopic, '存储的专题页阅读历史');
        if (!payDialog && !vipToast) {
            wx.setStorage({
                key: 'historyForTopic',
                data: historyForTopic,
            });
        }
    },
    reportedData() {
        // 登录直接上报服务端使用、未登录存本地
        let maxTime,
            maxScrollTop = 0,
            maxReadObj,
            curComicList,
            array = new Map();
        const { userInfo, comicId, scrollTops, historyForPost, allImglists, viewHeight, payDialog, vipToast } = this.data;

        // 拿到视图对象
        const viewArray = this.ctx.getViewportItems();
        if (!viewArray.length) {
            return;
        }
        const filterArray = viewArray.filter((item) => item.comicId == comicId);
        const obj = filterArray[filterArray.length - 1];

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

        // 当前章节,根据最大scrollTop获取当前最大阅读图片
        curComicList = allImglists.filter((item) => item.comicId == comicId);
        maxReadObj = curComicList.find((item) => item.top >= maxScrollTop + viewHeight) || {};

        const data = {
            topic_id: obj.topicId,
            comic_id: obj.comicId,
            max_read_count_time: maxTime,
            read_count: obj.picIndex, // 停留位置是第几张图片
            max_read_count: maxReadObj.picIndex ? maxReadObj.picIndex : obj.totalCount, // 最大阅读图片数
            read_time: new Date().getTime(), // 退出详情页\即触发上报时机(翻页／退出)
            total_count: obj.totalCount,
        };
        this.data.maxReadCount = data.max_read_count;

        // 存在相同的记录更新数据（章节id相同，此时更新数据）
        const comicIndex = historyForPost.findIndex((item) => item.comic_id == obj.comicId);
        // 认为存在相同的存储历史、需要更新最新的
        if (comicIndex >= 0) {
            historyForPost.splice(comicIndex, 1);
        }
        historyForPost.unshift(data); // 最新阅读的放在最前面

        // console.log(historyForPost, '存储的上报服务端阅读历史&本地存储');
        // 这部分上报数据登录上报，未登录本地存储，所以都要计算，无法过滤

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
                url: `/mini/v1/comic/${global.channel}/comic/report_view`,
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
    // 静默登录
    originLogin(e) {
        app.originLogin(e.detail).then(() => {
            let comicId = this.data.comicId;
            wx.redirectTo({
                url: `/pages/${global.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${comicId}&comicId=${comicId}`,
            });
        });
    },
    stopPop() {
        // console.log('stop');
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
    // 充值礼包直接支付
    directPay(e) {
        let { good_id, activity_name, banner_type_name } = e.detail;
        this.setData(
            {
                showDirectPay: false,
                loadDirectPay: false,
                isPayed: false,
                activity_name,
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
        // 相应付费成功、弹窗消失、更新状态
        this.getPageData({ init: 1 });
    },
    // 清空wallet
    clearWallet() {
        this.setWallet(0);
    },

    // 调用顶部提示条，因引导任务影响，暂时先嵌套一层判断条件
    showNotify(options) {
        if (!this.data.guideTaskBubble) {
            util_showNotify(options);
        }
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
    })
)(comicPage);

Page(ConnectPage);
