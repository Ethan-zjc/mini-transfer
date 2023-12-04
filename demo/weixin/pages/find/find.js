import IntersectionObserver from '../../common/js/intersection.js';
import { util_action, util_showToast, util_updateUserInfo, util_multPage, util_skipDirection, util_feSuffix, util_performanceTrack, util_showNotify, util_hideNotify, util_handleBubble } from '../../util.js';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const api = require('./api'); // api 请求
const reddotBehavior = require('../../behaviors/reddot');
const followBehavior = require('../../behaviors/follow');

const page = {
    behaviors: [followBehavior, reddotBehavior],
    data: {
        interval: 40000,
        duration: 500,
        carouselData: {}, // 轮播图数据
        subnavData: {}, // 二级导航数据
        findPageList: [[]], // 发现页数据
        rankingNav: { id: 0, title: '', index: 0 }, // 排行榜导航选中的数据
        user: null,
        coldBoot: 1, // 是否冷启动 ，0：非冷启动，1 ：冷启动

        observerList: [], // 已曝光模块索引
        hashList: [], // 当前曝光模块缓存
        hashTimer: null, // 当前曝光模块定时器

        pageShow: false, // 当前页面显示状态
        bannerState: false, // 轮播图曝光记录

        changeIndex: 0, // 点击换一换的模块索引

        // 新手福利bubble展示内容
        bubbleText: '',

        recordUserInfo: null, // 缓存记录用户信息, 为了对吧Store中存储的用户信息,如果发生了变化,刷新数据
        isTaskRedPoints: false, // 是否显示任务tab的小红点
        callUpLoginNum: 0, // 调起登录页的次数 callUpLoginNum=0没有跳转过登录页 callUpLoginNum==1 说明跳转了一次登录页 callUpLoginNum>1跳转登录页后未登录返回的状态
        actionType: 0, // 跳转类型id(为了记录是否点击的是任务tab)
        images: {
            boyIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/boy-icon_3f1f8fa.png',
            girlIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/girl-icon_d6d5516.png',
            titlebgIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/titlebg-icon_048f8ad.png',
            taskIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/task_f5450aa.png',
            classIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/class_9d557c9.png',
            rankIcon: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/rank_a9bd857.png',
        },
        moduleTypeMap: {
            0: '',
            1: '头部轮播图',
            2: '二级入口',
            3: '四图类型',
            4: '六图类型',
            5: '排行榜模块',
            6: '',
            7: '单图模块',
            8: '追更模块',
            9: '分类模块',
            10: '四图异形模块',
            11: '标签模块',
            12: '新作预约横滑模块',
        },
        classifyNav: { id: 0, title: '', index: 0, cssName: 't-0' }, // 分类导航选中的数据
        classifyFirst: [], // 分类第一张背景图
        // 新增信息
        minFindPages: 1, // 请求的数据页码
        count: 5, // 请求数据的模块条数
        isObtainData: true, // 是否可以请求数据
        isShowLoad: true, // 是否显示加载load
        topicId: '',
        resourceStage: {}, // 异形banner数据
        clickAssign: false, // 是否点击领取
        isVipCallback: null,
        isShowFree: false,
        isLoadFree: true,
        showMode: false, // 是否展示整本限免
        isShowtip: false, // 是否展示头部用户引导提示
        isLoadAd: true,
        isShowAd: true,
        topGuideText: '添加到我的小程序，首页下拉可直接进入',
        textElement: `<div class="normal-size">添加到我的小程序，首页下拉可直接进入</div>`,
        enterType: 3, // 新手福利的入口类型 0:不显示,完全不执行  1:banner  2:挂件展示  3:隐藏显示(请求接口)
        isShowListWelfare: false, // 是否展示专题列表福利模块
        isShowLadderWelfare: false, // 是否显示阶梯领取福利模块 (1.新手每日登录领取福利模块  2.老用户领取阶梯领取阅读币模块)
        suspendAnimation: true, // 挂角动画
    },

    onHome(cb = () => {}) {
        // 判断是否是从广告进入，如果是需要调用刷新性别，年龄接口
        if (global.adGender || global.adAge) {
            util_updateUserInfo({
                gender: global.adGender,
                medium_age: global.adAge,
                request_type: 3,
            })
                .then(() => {
                    this.getDiscoveryList(cb); // 获取数据
                })
                .catch(() => {
                    this.getDiscoveryList(cb); // 获取数据
                });
        } else {
            this.getDiscoveryList(cb); // 获取数据
        }
    },

    // 页面创建时执行
    onLoad(options) {
        app.getOpenId().then(() => {
            app.getGender().then(() => {
                this.onHome();
            });
        });

        setTimeout(() => {
            const { redirect_id } = options;
            if (redirect_id) {
                util_action({ type: 3, id: redirect_id });
            }
        }, 500);

        let userInfo = this.data.userInfo ? this.data.userInfo : { user: {} }; // 用户信息
        this.data.recordUserInfo = userInfo.user; // 缓存记录用户信息, 为了对吧Store中存储的用户信息,如果发生了变化,刷新数据
    },

    // 页面出现在前台时执行
    onShow() {
        this.data.pageShow = true;
        this.setPageTrigger('find', null);
        this.setPageTrigger('comic', null);
        this.setRecMap({});
        this.visitFindPage();

        // 检测用户信息是否有变化 S
        let recordUserInfo = this.data.recordUserInfo ? this.data.recordUserInfo : {};
        let { user } = this.data.userInfo ? this.data.userInfo : { user: {} }; // 用户信息
        let use1 = JSON.stringify(recordUserInfo); // json 后的 缓存记录用户信息
        let use2 = JSON.stringify(user); // json Store中存储的用户信息

        // 用户信息变化了/或切换性别
        if (use1 != use2 || (global.refreshPage && global.refreshPage.findPage)) {
            if (global.refreshPage && global.refreshPage.findPage) {
                global.refreshPage.findPage = false;
            }
            this.refreshData();
        }

        // 检测是否需要跳转到 任务页 S
        let { callUpLoginNum, actionType } = this.data;
        if (callUpLoginNum >= 1 && actionType == 2001) {
            this.data.callUpLoginNum = 0;
            this.data.actionType = 0;
            if (this.data.userInfo) {
                util_action({ type: 2001, id: 0, url: '', params: { source: 'find' } });
            }
        }
        // 检测是否需要跳转到 任务页 E

        // 是否显示引导气泡
        this.guidePop();
    },

    // 页面onReady
    onReady() {
        this.setData({ readyTime: true });
    },

    // 页面从前台变为后台时执行
    onHide() {
        this.data.pageShow = false;
        this.setData({
            bubbleText: '',
        });
        // 离开页面，清空广告链接参数
        app.clearAdParam();
    },

    // 访问发现页埋点
    visitFindPage() {
        const bubble = global.backBubbleData || {};
        if (bubble.page || global.enterPostPage) {
            // 返回首页按钮关联埋点
            app.kksaTrack('VisitFindPage', {
                TriggerPage: bubble.page,
                IfLead: bubble.show,
                TabModuleType: bubble.type,
            });
            global.backBubbleData = {};
            global.enterPostPage = false;
        } else {
            app.kksaTrack('VisitFindPage');
        }
    },

    // 显示引导气泡
    guidePop() {
        app.getGuidePop()
            .then((res) => {
                let { data } = res;
                let { behaviorSwitch, behaviorTipInternal } = data; // 引导提示开关/引导提示频次
                let isShowtip = this.data.isShowtip; // 是否展示用户引导提示
                let guideDiffTime = 0; // 显示用户引导提示的时间差
                // 展示提示开关开启
                if (behaviorSwitch) {
                    isShowtip = true;
                    if (!wx.getStorageSync('showGuideStart')) {
                        wx.setStorageSync('showGuideStart', new Date().getTime());
                    } else {
                        // 如果点击了关闭
                        if (wx.getStorageSync('closeGuide')) {
                            guideDiffTime = new Date().getTime() - wx.getStorageSync('showGuideStart');
                            // 显示时间超过了设置频次，重新显示提示
                            if (guideDiffTime > behaviorTipInternal) {
                                wx.setStorageSync('showGuideStart', new Date().getTime());
                                wx.setStorageSync('closeGuide', false);
                            } else {
                                isShowtip = false;
                            }
                        }
                    }
                } else {
                    isShowtip = false;
                }

                const { guideTaskBubble, topGuideText } = this.data;
                this.setData({
                    isShowtip: guideTaskBubble ? false : isShowtip,
                });
                if (!guideTaskBubble && isShowtip) {
                    app.kksaTrack('GuidePopPv', {
                        Name: topGuideText,
                    });
                    util_showNotify({
                        title: topGuideText,
                        onClose: () => {
                            this.closeGuideTip();
                        },
                    });
                }
            })
            .catch(() => {
                // console.log(error);
            });
    },

    // 用户引导关闭
    closeGuideTip() {
        this.setData({
            isShowtip: false,
        });
        wx.setStorageSync('closeGuide', true);
        // 关闭埋点
        app.kksaTrack('GuidePopClk', {
            ButtonName: '关闭',
            SourcePlatform: global.channel,
        });
    },

    // 检测 用户信息变化后,刷新数据
    refreshData() {
        // 接口调用结束的回调函数（调用成功、失败都会执行）
        let { user } = this.data.userInfo ? this.data.userInfo : { user: {} }; // 用户信息
        this.data.minFindPages = 1; // 重置请求页码
        this.data.recordUserInfo = user; // 记录数据

        wx.pageScrollTo({
            scrollTop: 0, // 滚动到页面的目标位置，单位 px
            duration: 0, // 滚动动画的时长，单位 ms
            fail: () => {},
            success: () => {},
        });
        this.onHome(); // 重新拉去数据

        // 初始化曝光数据索引
        this.data.observerList = [];
    },

    // 页面销毁时执行
    onUnload() {
        this.setData({
            bubbleText: '',
        });
    },

    // 触发下拉刷新时执行
    onPullDownRefresh() {
        this.data.minFindPages = 1;
        this.setData({
            enterType: 0, // 隐藏新手福利入口
            isShowAd: false,
        });
        // 初始化曝光数据索引
        this.data.observerList = [];

        // 初始化会员限免标识
        this.data.isLoadFree = true;

        this.data.isLoadAd = true;

        // 加载数据
        this.getDiscoveryList(() => {
            wx.stopPullDownRefresh();
            this.setData({
                bannerState: true,
                enterType: 3,
                isShowAd: true,
            });
        });
    },

    // 页面触底时执行
    onReachBottom() {
        this.onHome(() => {
            this.handlerObserver();
        });
    },

    // 页面被用户分享时执行
    onShareAppMessage() {},

    // 监听曝光
    handlerObserver() {
        if (this.ob) {
            this.ob.disconnect();
        }
        this.ob = new IntersectionObserver({
            selector: '.find-observer',
            observeAll: true,
            context: this,
            threshold: 0.1,
            onEach: (res) => {
                const { idx, key } = res.dataset || {};
                return `${idx}-${key}`;
            },
            onFinal: (args) => {
                if (!args) {
                    return;
                }
                args.forEach((item) => {
                    if (!this.data.observerList.includes(item)) {
                        this.data.observerList.push(item);
                        this.handleViewList(item);
                    }
                });
            },
        });
        this.ob.connect();
    },
    handlerFeedRecMap(listwrapindex, index, idx) {
        const { findPageList, classifyNav } = this.data;
        const module = findPageList[listwrapindex][index] || {};
        const moduleType = module.module_type || 0;
        const value = moduleType == 9 ? module.banner_list[classifyNav.index] : module;
        const list = value.banner_children || value.banner_list || [];
        const row = list[idx] || {};
        const recMap = row.rec_map || {};
        this.setRecMap(recMap);
    },
    // 推荐数据点击上报
    handlerFeedClick(module_type, listwrapindex, index, idx) {
        const multPage = util_multPage();
        const { TriggerPage: PrePage } = multPage;
        const row = this.data.findPageList[listwrapindex][index] || {};
        let list = row.banner_list || [];
        let itemName = row.title;

        if (module_type == 5) {
            const { index } = this.data.rankingNav;
            const children = row.banner_list[index];
            list = children.banner_children;
        }

        if (module_type == 9) {
            const { index } = this.data.classifyNav;
            const children = row.banner_list[index];
            list = children.banner_children;
            itemName = children.title;
        }
        const data = this.getFindTrackData(list[idx]);
        const tracking = {
            ...data,
            ...multPage,
            ItemName: itemName,
            ItemPos: index + 1,
            PrePage,
            InItemPos: idx + 1,
        };
        app.kksaTrack('ItemClk', tracking);
    },

    // 推荐数据曝光上报
    handlerFeedTrack(event, options) {
        let tracking = [];
        const multPage = util_multPage();
        const { TriggerPage: PrePage } = multPage;
        options.forEach((item, index) => {
            let ind1 = parseInt(item.split('-')[0]);
            let ind2 = parseInt(item.split('-')[1]);
            const checkInd1 = typeof ind1 == 'number' && ind1 >= 0;
            const checkInd2 = typeof ind2 == 'number' && ind2 >= 0;
            if (checkInd1 && checkInd2) {
                const row = this.data.findPageList[ind1][ind2] || {};
                const module_type = row.module_type || 0;
                if ([3, 4, 5, 8, 9, 10, 12].includes(module_type)) {
                    let list = row.banner_list;
                    let itemName = row.title;
                    const def = {
                        ItemPos: index + 1,
                    };
                    if (module_type == 5) {
                        const { index } = this.data.rankingNav;
                        const children = row.banner_list[index];
                        list = children.banner_children;
                    }
                    if (module_type == 9) {
                        const { index } = this.data.classifyNav;
                        const children = row.banner_list[index];
                        list = children.banner_children;
                        itemName = children.title;
                    }
                    list.map((value, key) => {
                        const data = this.getFindTrackData(value);
                        const params = {
                            ...def,
                            ...data,
                            ...multPage,
                            ItemName: itemName,
                            PrePage,
                            InItemPos: key + 1,
                        };
                        tracking.push(params);
                    });
                }
            }
        });
        app.kksaTrack(event, tracking);
    },
    getFindTrackData(value) {
        const { action_type, title, id, rec_map: recMap } = value;
        const { type } = action_type;
        const ItemType = [2, 68].includes(type) ? '专题' : type == 3 ? '漫画' : '';
        const ItemId = [2, 68].includes(type) ? 'TopicID' : 'ComicID';
        const ItemTitle = [2, 68].includes(type) ? 'TopicName' : 'ComicName';
        return {
            CurPage: 'FindPage',
            MembershipClassify: '',
            ItemType,
            [ItemId]: id,
            [ItemTitle]: title,
            ...recMap,
        };
    },
    // 神策曝光埋点
    handlerViewTrack(event, value) {
        const { moduleTypeMap } = this.data;
        value.map((item) => {
            let ind1 = parseInt(item.split('-')[0]);
            let ind2 = parseInt(item.split('-')[1]);
            const checkInd1 = typeof ind1 == 'number' && ind1 >= 0;
            const checkInd2 = typeof ind2 == 'number' && ind2 >= 0;
            if (checkInd1 && checkInd2) {
                let row = this.data.findPageList[ind1][ind2] || {};
                if (!row) {
                    return;
                }
                const type = row ? row.module_type || 0 : 0;
                let moduleName = row.title || '';

                if (type == 5) {
                    const { index } = this.data.rankingNav;
                    row = row.banner_list[index];
                }
                if (type == 9) {
                    const { index } = this.data.classifyNav;
                    row = row.banner_list[index];
                    moduleName = row.title;
                }
                const isRec = row.rec_topic || false;
                const recName = row.rec_name || [];

                let moduleIndex = 0;
                this.data.findPageList.forEach((module, index) => {
                    moduleIndex += index < ind1 ? this.data.findPageList[index].length : ind2 + 1;
                });

                if ([12].includes(type)) {
                    app.kksaTrack('CommonItemImp', {
                        SourcePlatform: global.channel,
                        TabModuleType: moduleTypeMap[type] || '',
                        CurPage: 'FindPage',
                        TabModuleTitle: moduleName,
                        ContentName: '',
                        ContentID: '',
                    });
                }

                app.kksaTrack(event, {
                    TabModulePos: moduleIndex,
                    TabModuleID: String(row.module_id || ''),
                    TabModuleType: moduleTypeMap[type] || '',
                    ModuleName: moduleName,
                    IsManualRecTopic: isRec,
                    ManualRecTopicName: isRec ? recName.join() : '',
                });
            }
        });
    },

    // 曝光上报防抖
    handleViewList(index) {
        if (this.data.hashTimer) {
            clearTimeout(this.data.hashTimer);
        }
        this.data.hashList.push(index);
        this.data.hashTimer = setTimeout(() => {
            const data = JSON.stringify(this.data.hashList);
            this.handlerFeedTrack('ItemImp', JSON.parse(data));
            this.handlerViewTrack('UserDefinedTabFindPageModuleExp', JSON.parse(data));
            this.data.hashList = [];
        }, 500);
    },

    // 新版公共点击/曝光埋点（暂时只有轮播图&二级入口&新作预约模块）
    commonItemTrack(value) {
        if (!value) {
            return false;
        }
        const {
            event = 'CommonItemImp', // 上报类型，曝光/点击
            moduleType = 1, // 模块类型
            action = {}, // 通用跳转对象
            assignedData = {}, // 额外上报属性
        } = value;
        const { moduleTypeMap } = this.data;
        const actionTypeMap = {
            2: '漫画专题',
            3: '漫画章节',
            9: '漫画分类页',
            18: 'hybrid跳转',
            19: 'hybrid跳转',
            44: '会员中心',
            66: 'native 专题排行榜',
            68: '漫画续读',
            2000: '小程序',
            2001: '小程序',
            2002: '小程序',
        };
        const { type, target_id: id, target_web_url: url, parent_target_id: parentId } = action;

        // 点击内容类型
        const ClkItemType = actionTypeMap[type] || '';

        // 来源模块类型
        const TabModuleType = moduleTypeMap[moduleType] || '';

        let ContentID = '';
        let RelatedContentID = '';

        if ([2].includes(type)) {
            ContentID = String(id);
        }
        if ([68].includes(type)) {
            ContentID = String(parentId);
        }
        if ([18, 19, 2000, 2001, 2002, 2003, 2004].includes(type)) {
            ContentID = String(url);
        }
        if ([3].includes(type)) {
            RelatedContentID = String(id);
        }

        const options = {
            CurPage: 'FindPage',
            PrePage: '',
            TabModuleType,
            ClkItemType,
            ContentID,
            RelatedContentID,
        };
        Object.assign(options, assignedData);
        app.kksaTrack(event, options);
    },
    // 轮播图曝光
    bannerImp(e) {
        const dataset = e.detail || {};
        const { current = 0 } = dataset;
        const { carouselData, bannerState } = this.data;
        const { module_type: moduleType, banner_list } = carouselData;
        const row = banner_list[current] || {};
        const action = row.action_type;
        if (bannerState) {
            this.setData({
                bannerState: false,
            });
        }
        this.commonItemTrack({
            event: 'CommonItemImp',
            moduleType,
            action,
        });
    },
    // 二级入口曝光埋点
    subnavImp() {
        const { subnavData } = this.data;
        const { banner_list = [], module_type: moduleType } = subnavData;
        banner_list.map((item) => {
            this.commonItemTrack({
                event: 'CommonItemImp',
                moduleType,
                action: item.action_type,
            });
        });
    },
    // 轮播图、二级入口点击事件，新版埋点
    clickItemTrack(e) {
        let dataset = e.currentTarget.dataset || {}; // 数据集合
        if (!Object.keys(dataset).length) {
            dataset = e.detail;
        }
        const { moduletype: moduleType, childindex: childIndex = 0, listwrapindex, index } = dataset;
        const { carouselData, subnavData, findPageList } = this.data;
        let childRow = {};
        const assignedData = {};
        if (moduleType == 1) {
            const list = carouselData.banner_list || [];
            childRow = list[childIndex] || {};
        } else if (moduleType == 2) {
            const list = subnavData.banner_list || [];
            childRow = list[childIndex] || {};
        } else if (moduleType == 12) {
            const list = findPageList[listwrapindex][index].banner_list || [];
            childRow = list[childIndex] || {};
            assignedData.ContentName = childRow.title;
            assignedData.TabModuleTitle = findPageList[listwrapindex][index].title || '';
        }
        const action = childRow.action_type;
        this.commonItemTrack({
            event: 'CommonItemClk',
            moduleType,
            action,
            assignedData,
        });
    },

    // 点击封面/换一换/查看更多上报埋点
    clickItemKksa(e) {
        let dataset = e.currentTarget.dataset || {}; // 数据集合
        if (!Object.keys(dataset).length) {
            dataset = e.detail;
        }
        let {
            moduletype, // 模块类型
            moduleid, // 模块id
            modulemame, // 模块标题
            objecttype, // 点击内容类型
            objectid, // 点击内容id
            buttoname, // 按钮名称
            rectopic = false,
            recname = [],
        } = dataset;

        // 分类模块
        if (moduletype == 9) {
            modulemame = this.data.classifyNav.title || '';
        }

        let { moduleTypeMap } = this.data;
        let ObjectType = objecttype == 2 ? '专题' : objecttype == 3 ? '漫画' : objecttype;
        let kksaData = {
            ModuleID: moduleid, // 模块ID	String	基础
            ModuleName: modulemame, // 模块名称String	今日更新，经典必看
            ObjectType, // 点击内容类型	String	专题、漫画
            ObjectId: objectid, // 点击内容id	专题id、漫画id
            ButtonName: buttoname || '', // 按钮名称
            IsManualRecTopic: rectopic,
            ManualRecTopicName: rectopic ? recname.join() : '',
            TabModuleType: moduleTypeMap[moduletype] || '',
        };
        app.kksaTrack('UserDefinedTabFindPageClk', kksaData);
    },

    // 点击二级导航(分类/排行榜)/轮播图item点击事件
    subnavTap(event) {
        // 组件透传的参数，在detail中取
        let dataset = event.currentTarget.dataset || {}; // 数据集合
        if (!Object.keys(dataset).length) {
            dataset = event.detail;
        }
        if ([1, 2, 12].includes(dataset.moduletype)) {
            // 新版，上报埋点
            this.clickItemTrack(event);
        } else {
            // 老版，上报埋点，不包括轮播图&二级入口
            this.clickItemKksa(event);
        }

        // 跳转类型是18的情况 优先使用target_web_url 后者 hybrid_url
        let { type, id, parentid, name, url, index, idx, listwrapindex } = dataset; // 9分类 | 66 排行榜
        url = url ? url : '';
        url = url.replace(/(^\s*)|(\s*$)/g, '');
        // 静默登录跳转页面
        if (type === 2002 && dataset.originlogin) {
            wx.reLaunch({
                url: url,
            });
            return false;
        }

        if (type === 2002 && !this.data.userInfo) {
            return false;
        }

        // 2001 说明是任务入口
        if (type == 2001) {
            if (!this.data.userInfo) {
                // 跳转登录页
                this.data.callUpLoginNum = this.data.callUpLoginNum + 1;
                this.data.actionType = type;
                wx.navigateTo({ url: '/pages/login/login?source=find' }); // 跳转登录
            } else {
                util_action({ type, id, url, params: { source: name } });
            }
            // 上报增长数据埋点(新手任务埋点)
            app.kksaTrack('ClickTaskRelated', {
                SourcePlatform: global.channel, // 来源平台 微信、QQ、百度小程序
                TaskTime: '', // 任务时间(第几天的任务)
                ButtonName: 'rkclick', // 按钮名称
                TaskName: '', // 任务名称
                TaskState: '', // 任务状态
                TaskRewardContent: '', // 奖励内容
            });
        } else if (type == 2000) {
            // 跳转活动页
            app.kksaTrack('ClickTaskRelated', {
                SourcePlatform: global.channel, // 来源平台 微信、QQ、百度小程序
                ButtonName: 'flclick', // 按钮名称
            });

            util_action({ type: type, id: id, url: url });
        } else {
            // 这里需要加一个专题页校验跳转
            if (type == 2) {
                util_skipDirection({ topicId: id }).then((res) => {
                    if (res.continueId) {
                        // 跳转详情页
                        util_action({ type: 3, id: res.continueId, params: { source: name, count: res.readCount } });
                    } else {
                        // 跳转专题页
                        util_action({ type, id, params: { source: name } });
                    }
                });
            } else if (type === 2005) {
                util_action({ type, id, parentid, url: `/pages/find/find`, params: { source: name } });
            } else {
                util_action({ type, id, parentid, url, params: { source: name } });
            }
        }

        // 轮播图module_type=1   二级导航module_type=2,轮播图和二级导航数据是单独的
        if (name == 'find-carousel' || name == 'find-nav') {
            return false;
        }

        // 推荐数据点击上报
        const row = this.data.findPageList[listwrapindex][index];
        if (row && row.module_type) {
            let title = row.title;

            if (row.module_type == 9) {
                const { index } = this.data.classifyNav;
                const children = row.banner_list[index];
                title = children.title;
            }

            // 设置全局模块触发信息
            this.setPageTrigger('find', {
                title,
                module_type: row.module_type,
                module_id: row.module_id,
            });

            if ([3, 4, 5, 8, 9, 10, 12].includes(row.module_type)) {
                this.handlerFeedClick(row.module_type, listwrapindex, index, idx);
                // 设置全局模块推荐map信息
                this.handlerFeedRecMap(listwrapindex, index, idx);
            }
        }
    },

    // 排行导航切换事件
    rankingNavtap(event) {
        // let dataset = event.currentTarget.dataset;// 数据集合
        let dataset = event.detail || {}; // 数据集合
        let { id, idx, title, index, key } = dataset; // id:nav的id title:nav的标题 index:nav在数据中index

        if (index == this.data.rankingNav.index) {
            return false;
        }

        this.setData(
            {
                rankingNav: { id, title, index },
            },
            () => {
                this.handleViewList(`${idx}-${key}`);
            }
        );
    },

    // 排行导航查看更多按钮事件
    rankingMoreTap(event) {
        // let dataset = event.currentTarget.dataset;// 数据集合
        let dataset = event.detail || {}; // 数据集合
        let { type } = dataset;
        type = type ? type : 66;

        // 点击埋点 S
        this.clickItemKksa(event);

        // 映射榜单
        const reflection = {
            9: 9, // 人气女榜映射总榜人气9
            32: 9, // 人气男榜映射总榜人气9
            23: 23, // 加料男女榜映射总榜加料23
            33: 2, // 新作男榜映射总榜新作2
            34: 2, // 新作女榜映射总榜新作2
        };
        util_action({ type: type, id: reflection[Number(this.data.rankingNav.id)] || 0, params: { source: 'find' } });
    },

    // 点击四图/六图模块的查看更多按钮
    topicBottomMoreTap(event) {
        let dataset = event.detail;
        let { id, title, cardtype, moduletype } = dataset;
        let { title: classifyTag } = this.data.classifyNav;
        let tag = moduletype == 9 ? classifyTag : '';
        title = moduletype == 9 ? tag : title;

        this.clickItemKksa(event);
        util_action({
            type: 10,
            url: `type=find&module_id=${id}&card_type=${cardtype}&title=${title}&subtitle=${tag}`,
        });
    },

    // 分类切换事件
    classifyNavtap(event) {
        // let dataset = event.currentTarget.dataset;
        let dataset = event.detail;
        let { id, idx, title, index, key } = dataset;
        let cssName = `t-${index % 5}`;

        if (index == this.data.classifyNav.index) {
            return false;
        }

        this.setData(
            {
                classifyNav: { id, title, index, cssName },
            },
            () => {
                this.handleViewList(`${idx}-${key}`);
            }
        );
    },

    // 换一换获取topicBottomexchangeTap 状态  防止重复点击
    changeTaPStorage(callback) {
        if (callback && typeof callback == 'function') {
            // callback = callback;
        } else {
            callback = () => {};
        }
        const fn = () => {
            wx.setStorage({
                key: 'topicBottomexchangeTap', // 四图六图点击换一换按钮使用的数据  控制是否请求接口
                data: 'true',
            });
        };
        wx.getStorage({
            key: 'topicBottomexchangeTap',
            success: (res) => {
                if (res.data == 'false') {
                    // false 说明是在加载中
                    return false;
                }
                wx.setStorage({
                    key: 'topicBottomexchangeTap', // 四图六图点击换一换按钮使用的数据  控制是否请求接口
                    data: 'false',
                });
                callback(fn);
            },
            fail: () => {
                wx.setStorage({
                    key: 'topicBottomexchangeTap', // 四图六图点击换一换按钮使用的数据  控制是否请求接口
                    data: 'false',
                });
                callback(fn);
            },
        });
    },
    // 分类换一换
    topicBottomClassifyTap(event) {
        let dataset = event.detail;
        let { id, index, cardtype, listwrapindex } = dataset;
        let { channel, gender } = app.globalData;

        const { findPageList = [], classifyNav = {} } = this.data;

        const { index: navIndex, title: navTitle } = classifyNav;

        const row = findPageList[listwrapindex][index];
        const childList = row.banner_list || [];
        const childRow = childList[navIndex] || {};
        const sendDat = {
            channel,
            module_id: id,
            filter_ids: childRow.filter_ids || '[]',
            card_type: cardtype,
            gender: gender,
            subtitle: navTitle,
        };

        this.setData({ changeIndex: index });
        this.clickItemKksa(event);

        this.changeTaPStorage((fn) => {
            api.getDiscoveryModuleChange(sendDat)
                .then((res) => {
                    if (fn && typeof fn == 'function') {
                        fn();
                    }
                    const { data = {} } = res;
                    const { module_info: item = {} } = data;
                    const options = this.initBannerList(item.banner_list);
                    row.banner_list = childList.map((children, newIndex) => {
                        if (newIndex == navIndex) {
                            return {
                                ...children,
                                filter_ids: item.filter_ids || '[]',
                                banner_children: options.list.slice(0, 6),
                            };
                        } else {
                            return children;
                        }
                    });
                    this.setData(
                        {
                            [`findPageList[${listwrapindex}][${index}]`]: row,
                        },
                        () => {
                            this.handleViewList(`${listwrapindex}-${index}`);
                        }
                    );
                })
                .catch((err) => {
                    if (fn && typeof fn == 'function') {
                        // 设置可以请求数据
                        fn();
                    }
                    util_showToast({
                        title: err.message ? err.message : '网络状态不好,请重试~',
                        type: 'error',
                        mask: true,
                        duration: 3000,
                    });
                });
        });
    },

    // 点击四图/六图模块的换一换按钮
    topicBottomexchangeTap(event) {
        let dataset = event.detail; // 数据集合
        let { id, index, filter, cardtype, listwrapindex } = dataset;
        let { channel, gender } = app.globalData;
        let sendDat = {
            channel,
            module_id: id,
            filter_ids: filter,
            card_type: cardtype,
            gender: gender,
        };
        this.setData({ changeIndex: index }); // 点击换一换的模块索引
        this.clickItemKksa(event);
        this.changeTaPStorage((fn) => {
            api.getDiscoveryModuleChange(sendDat)
                .then((res) => {
                    let { code, data, message } = res;
                    if (fn && typeof fn == 'function') {
                        // 设置可以请求数据
                        fn();
                    }
                    if (code != 200) {
                        util_showToast({
                            title: message,
                            type: 'error',
                            mask: true,
                            duration: 3000,
                        });
                        return false;
                    }
                    data = data ? data : {};
                    let item = data.module_info ? data.module_info : {};
                    item.num = item.banner_list.length; // 添加模块的数量(自定义)
                    item.module_id = item.module_id ? item.module_id : 0; // 模块id
                    item.module_type = item.module_type ? item.module_type : 0; // 展示的样式类型
                    item.card_type = item.card_type ? item.card_type : '';
                    item.title = item.title ? item.title : ''; // 模块标题
                    item.show_more = item.show_more ? item.show_more : false; // 是否显示换一换
                    item.filter_ids = item.filter_ids ? item.filter_ids : '[]'; // 换一换要过滤发专题id
                    item.filters = JSON.stringify(item.filter_ids); // 换一换要过滤发专题id json串
                    item.button = item.button ? item.button : {}; // 要展示的按钮信息
                    item.banner_list = item.banner_list ? item.banner_list : []; // 当前模块的数据列表
                    item.uuid = `${Date.now().toString(36)}_${item.card_type}_${Math.random().toString(36)}`;

                    const options = this.initBannerList(item.banner_list);
                    item.rec_topic = options.rec_topic;
                    item.rec_name = options.rec_name;
                    item.banner_list = options.list;

                    // 竖版4图模块
                    if (item.module_type == 10) {
                        const imageWidth = item.required_image_width || 343;
                        const imageHeight = item.required_image_height || 435;
                        const imageBaseSize = 343;
                        const imageBaseHei = (imageHeight * imageBaseSize) / imageWidth;
                        item.image_width = imageBaseSize;
                        item.image_height = Math.ceil(imageBaseHei);
                    }

                    let findPageList = this.data.findPageList[listwrapindex];
                    let ary = findPageList[index].filter_ids;
                    let filterIds = ary ? ary : '[]';
                    filterIds = JSON.parse(filterIds);
                    if ((filterIds && filterIds.length >= 12) || item.filter_ids === '[]') {
                        // item.filter_ids = item.filter_ids;
                    } else {
                        let ids = [...filterIds, ...JSON.parse(item.filter_ids)];
                        item.filter_ids = JSON.stringify(ids);
                    }

                    this.setData(
                        {
                            [`findPageList[${listwrapindex}][${index}]`]: item,
                        },
                        () => {
                            this.handleViewList(`${listwrapindex}-${index}`);
                        }
                    );
                })
                .catch((err) => {
                    if (fn && typeof fn == 'function') {
                        // 设置可以请求数据
                        fn();
                    }
                    util_showToast({
                        title: err.message ? err.message : '网络状态不好,请重试~',
                        type: 'error',
                        mask: true,
                        duration: 3000,
                    });
                });
        });
    },

    // 统一处理，格式化模块子列表数据banner_list/banner_children
    // 返回对象，list => 列表数据，rec_name => 埋点上报所有名称，rec_topic => 埋点上报付费相关
    initBannerList(value) {
        const options = {
            rec_topic: false,
            rec_name: [],
            first_image: '',
            list: value || [],
        };
        options.list.forEach((obj, index) => {
            obj.image_type = obj.image_type ? obj.image_type : 0;
            obj.id = obj.id ? obj.id : 0;
            obj.action_type = obj.action_type ? obj.action_type : {};
            obj.action_type.type = obj.action_type.type ? obj.action_type.type : 13;
            obj.action_type.target_id = obj.action_type.target_id ? obj.action_type.target_id : 0;
            obj.src = obj.image ? obj.image : '';
            obj.title = obj.title ? obj.title : '';
            obj.bottom = obj.right_bottom ? obj.right_bottom : '';
            obj.des = obj.sub_title ? obj.sub_title : '';
            obj.uuid = `${Date.now().toString(36)}_${obj.id}_${Math.random().toString(36)}`;
            obj.rec_topic = !!(obj.rec_topic_type && obj.rec_topic_type == 1);
            obj.rec_name = [obj.title];
            obj.rec_map = obj.rec_data_report_map || {};
            if (index == 0) {
                options.first_image = obj.src;
            }
            if (obj.rec_topic) {
                options.rec_topic = true;
                options.rec_name.push(obj.title);
            }
        });
        return options;
    },

    // 格式化页面数据
    initPageData(pageList) {
        // image_type:1->gif动图 / 2->静态图 / 3->webp 动图(该类型不会下发)
        // module_type:1->轮播图 / 2->二级入口 / 3->横图4图模块 / 4->竖图6图模块 / 5->排行榜模块
        // card_type:banner-轮播图 / classicMustSee-经典必看 / updateToday-今日更新 / book-书单
        // 字段含义:info_list.module_id-模块id / banner_list[x].id-元素id/action_type&target_id-跳转目标id
        // show_more 是否显示换一换/查看更多
        pageList = pageList ? pageList : []; // 保证数据存在
        let carouselData = {},
            subnavData = {},
            findPageList = [],
            resourceStage = {};
        pageList.forEach((item) => {
            item.num = item.banner_list.length; // 添加模块的数量(自定义)
            item.module_id = item.module_id ? item.module_id : 0; // 模块id
            item.module_type = item.module_type ? item.module_type : 0; // 展示的样式类型
            item.card_type = item.card_type ? item.card_type : ''; // banner/classicMustSee/ updateToday/book/''
            item.title = item.title ? item.title : ''; // 模块标题
            item.show_more = item.show_more ? item.show_more : false; // 是否显示换一换
            item.filter_ids = item.filter_ids ? item.filter_ids : []; // 换一换要过滤发专题id
            item.filters = JSON.stringify(item.filter_ids); // 换一换要过滤发专题id json串
            item.button = item.button ? item.button : {}; // 要展示的按钮信息
            item.banner_list = item.banner_list ? item.banner_list : []; // 当前模块的数据列表
            item.uuid = `${Date.now().toString(36)}_${item.card_type}_${Math.random().toString(36)}`;

            const listMap = this.initBannerList(item.banner_list);
            item.rec_topic = listMap.rec_topic;
            item.rec_name = listMap.rec_name;
            item.banner_list = listMap.list;

            // 轮播图数据 S
            if (item.module_type == 1) {
                // 添加模拟数据
                let filterList = [];
                if (global.isiOS) {
                    // ios端过滤掉百度合作活动入口
                    filterList = item.banner_list.filter((item) => !item.action_type.target_web_url || (item.action_type.target_web_url && !item.action_type.target_web_url.includes('/act/unit_member')));
                }
                item.banner_list = global.isiOS ? filterList.slice(0, 6) : item.banner_list.slice(0, 6); // 截取数据 保证不超出
                carouselData = item;
            }

            // 二级入口 S
            if (item.module_type == 2) {
                item.banner_list = item.banner_list.slice(0, 4); // 截取数据 保证不超出

                // 显示任务tab入口上报(增长->显示任务入口上报)
                if (item.banner_list.length > 3) {
                    const optionsTrack = {
                        SourcePlatform: global.channel, // 来源平台
                        ShowType: item.banner_list[3].action_type.type == 2001 ? 'rkshow' : 'flshow',
                    };
                    if (item.banner_list[3].action_type.type == 2001) {
                        optionsTrack.TaskName = '';
                    }
                    app.kksaTrack('ShowTaskRelated', optionsTrack);
                }
                subnavData = item;
            }

            // 单图模块
            if (item.module_type == 7) {
                item.banner_list = item.banner_list.map((child) => {
                    child.url = util_feSuffix({ src: child.image, width: 718 });
                    return child;
                });
                findPageList.push(item);
            }

            // 横图4图模块 S
            if (item.module_type == 3) {
                item.banner_list = item.banner_list.slice(0, 4); // 截取数据
                findPageList.push(item);
            }

            // 竖版4图模块
            if (item.module_type == 10) {
                const imageWidth = item.required_image_width || 343;
                const imageHeight = item.required_image_height || 435;
                const imageBaseSize = 343;
                const imageBaseHei = (imageHeight * imageBaseSize) / imageWidth;
                item.image_width = imageBaseSize;
                item.image_height = Math.ceil(imageBaseHei);
                item.banner_list = item.banner_list.slice(0, 4); // 截取数据
                findPageList.push(item);
            }

            // 竖图6图模块 S
            if (item.module_type == 4) {
                item.banner_list = item.banner_list.slice(0, 6); // 截取数据
                findPageList.push(item);
            }

            // 排行榜模块 S
            if (item.module_type == 5) {
                item.banner_list = item.banner_list.slice(0, 3); // 截取数据
                item.banner_list.forEach((item, index) => {
                    if (index === 0) {
                        let navData = {
                            id: item.id,
                            title: item.title || '',
                            index,
                        };
                        this.setData({
                            rankingNav: navData,
                        });
                    }
                    const options = this.initBannerList(item.banner_children);
                    item.rec_topic = options.rec_topic;
                    item.rec_name = options.rec_name;
                    item.banner_children = options.list;
                });
                findPageList.push(item);
            }

            // 猜你喜欢
            if (item.module_type == 8) {
                item.banner_list = item.banner_list.slice(0, 20); // 最多20个
                findPageList.push(item);
            }

            // 标签模块
            // if (item.module_type == 11) {
            //     // item.banner_list = item.banner_list.slice(0, 15);
            //     findPageList.push(item);
            // }

            // 分类模块
            if (item.module_type == 9) {
                const classifyFirst = [];
                item.banner_list.forEach((item, index) => {
                    if (index === 0) {
                        this.setData({
                            classifyNav: {
                                id: item.id,
                                title: item.title,
                                index,
                                cssName: 't-0',
                            },
                        });
                    }
                    const options = this.initBannerList(item.banner_children);
                    item.rec_topic = options.rec_topic;
                    item.rec_name = options.rec_name;
                    item.banner_children = options.list.slice(0, 6);
                    classifyFirst.push(options.first_image);
                });
                this.setData({
                    classifyFirst,
                });
                findPageList.push(item);
            }

            // 新作预约模块
            if (item.module_type == 12) {
                item.banner_list.forEach((item) => {
                    this.setFollows(item.id, item.favourite);
                });
                findPageList.push(item);
            }

            // 广告模块
            if (findPageList.length >= 2 && this.data.minFindPages <= 2 && this.data.isLoadAd) {
                this.data.isLoadAd = false;
                findPageList.push({
                    module_type: 'ad',
                });
            }

            // 会员限免模块，固定在推荐模块下面
            // if ( (item.module_type == 4 && item.title == "为你推荐") || item.module_type == 9) {
            //     if (this.data.isLoadFree) {
            //         this.data.isLoadFree = false;
            //         findPageList.push({
            //             module_type: 'free'
            //         })
            //     }
            // }
        });

        if (this.data.minFindPages == 1 || this.data.minFindPages == 2) {
            this.setData(
                {
                    carouselData, // 轮播图数据
                    subnavData, // 二级导航数据
                    findPageList: [findPageList], // 发现页数据
                    resourceStage, // 异形banner
                    isShowFree: true,
                },
                () => {
                    this.data.observerTimer = setTimeout(() => {
                        this.handlerObserver();
                    }, 500);

                    // 异形banner曝光埋点
                    if (resourceStage.banner_list && resourceStage.banner_list.length > 0) {
                        let id = resourceStage.banner_list[0].id;
                        app.kksaTrack('SpecialBannerExposure', {
                            SourcePlatform: global.channel,
                            BannerID: String(id),
                        });
                    }
                }
            );
        } else {
            findPageList = [...this.data.findPageList, findPageList];
            this.setData({
                findPageList,
                isShowFree: true,
            });
        }
    },
    // 是否冷启动 ，0：非冷启动，1 ：冷启动
    getDiscoveryList(callback) {
        if (this.data.minFindPages == 0) {
            return false; // 说明没有数据了
        }
        if (!this.data.isObtainData) {
            // true->可以请求 false->不可以请求
            return false; // 说明没有数据了
        }
        this.data.isObtainData = false; // 防止重复请求
        let { channel, gender } = getApp().globalData;
        let { coldBoot, minFindPages, count } = this.data;
        let send = {
            channel,
            gender: gender == null ? 0 : gender,
            cold_boot: coldBoot,
            ad_topic_id: global.adTopicId,
            page: minFindPages, // 请求的数据页码
            count, // 请求数据的模块条数
        };
        this.data.coldBoot = 0; // 启动状态改为非冷启动
        api.getDiscoveryList(send)
            .then((res) => {
                // 发现页接口耗时
                util_performanceTrack('MainInterface', {
                    CurrentPageBase: 'find',
                    MainInterfaceTime: new Date().getTime() - global.mainInterfaceStartTimestamp || 0,
                    MainInterfaceUrl: `/mini/v1/comic/${global.channel}/discovery/list`,
                });

                this.data.isObtainData = true; // 防止重复请求
                let { code, data, message } = res;
                if (code != 200) {
                    util_showToast({
                        title: message,
                        type: 'error',
                        mask: true,
                        duration: 3000,
                    });
                    return false;
                }
                this.data.minFindPages = this.data.minFindPages + 1;

                let { infos } = data;
                infos = infos ? infos : []; // 保证列表存在
                if (infos.length <= 0 && this.data.minFindPages > 1) {
                    // 空数组的情况下说明没有数据了
                    this.data.minFindPages = 0;
                    this.setData({ isShowLoad: false });
                    return false;
                }
                this.setData({ isShowLoad: true });
                this.initPageData(infos); // 格式化数据

                // home数据请求完成后执行的订阅消息授权回调
                global.homeIniting = false;
                if (global.homeInitCallback && channel == 'qq') {
                    global.homeInitCallback();
                    global.homeInitCallback = null;
                }

                if (callback && typeof callback == 'function') {
                    callback();
                }
            })
            .catch(() => {
                if (callback && typeof callback == 'function') {
                    callback();
                }
            });
    },

    // 标签选择回调
    labelCallback() {
        this.refreshData();
    },
    welfareCallback() {
        this.onPullDownRefresh();
    },
    welfareFinish() {
        // 调用订阅弹窗
        // this.popupSubscribe();
    },

    // 静默登录 dialog 对话框显示
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

    // 静默登录 隐藏对话框
    hideDialog() {
        this.setData({
            dialog: {
                show: false,
            },
        });
    },

    // 静默登录 隐藏对话框
    onDialogButtontapEvent(e) {
        app.onDialogButtontapEvent(e);
    },
    onDiallogGetPhoneNumberEvent(e) {
        app.onDiallogGetPhoneNumberEvent(e);
    },

    // 单图模块跳转
    bannerJump(e) {
        const { action, bannerid } = e.currentTarget.dataset;
        const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
        util_action({ type, id, url, parentid });
        app.kksaTrack('SpecialBannerClk', {
            BannerID: String(bannerid),
        });
    },

    // 更新新手福利领取成功需要展示的bubble内容
    getHandsBubble(e) {
        const detail = e.detail;
        if (detail.bubble) {
            this.setData({
                bubbleText: detail.bubble,
                isShowLadderWelfare: false,
                isShowListWelfare: false,
            });
        } else {
            this.setData({
                isShowLadderWelfare: false,
                isShowListWelfare: false,
            });
        }
    },

    // 新手福利隐藏回调
    greenIsHiddenFn(value) {
        const { code } = value.detail;

        // 是否显示阶梯领取福利模块 (1.新手每日登录领取福利模块  2.老用户领取阶梯领取阅读币模块)
        let isShowLadderWelfare = true;

        // 是否显示新手福利-专题列表模块
        let isShowListWelfare = false;

        // 如果新手福利模块是列表展示形式，则不显示其他福利模块
        if (code == 500218) {
            isShowLadderWelfare = false;
            isShowListWelfare = true;
        } else {
            util_handleBubble();
        }
        this.setData({
            isShowLadderWelfare,
            isShowListWelfare,
        });
    },

    // 引导任务基础（20210531）优先级最高
    guideStatusFun(e) {
        const { status } = e.detail;
        if (status) {
            // 关闭其他影响气泡
            this.setData({
                guideTaskBubble: true,
                isShowtip: false,
                bubbleText: '',
            });
            util_hideNotify();
        }
    },

    // 页面滚动监听
    onPageScroll() {
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
                    }, 1000);
                }
            );
        }
    },

    handleFollowed(e) {
        let dataset = e.currentTarget.dataset || {}; // 数据集合
        if (!Object.keys(dataset).length) {
            dataset = e.detail;
        }
        const { id, moduletype: moduleType, childindex: childIndex = 0, listwrapindex, index } = dataset;
        let { cb } = e.detail;

        const { findPageList } = this.data;

        this.handleFollow(id, false, (res) => {
            let childRow = {};
            const list = findPageList[listwrapindex][index].banner_list || [];
            childRow = list[childIndex] || {};
            const action = childRow.action_type;
            const assignedData = {
                ContentName: childRow.title,
                TabModuleTitle: findPageList[listwrapindex][index].title || '',
                ElementType: '关注按钮',
                ElementShowTxt: res ? '关注' : '已关注',
            };
            this.commonItemTrack({
                event: 'CommonItemClk',
                moduleType,
                action,
                assignedData,
            });
            cb && cb();
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, vipInfo, recMap, follows }) => {
        return {
            userInfo,
            vipInfo,
            recMap,
            follows,
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
        setPageTrigger(page, newVal) {
            const pageTrigger = _state.pageTrigger;
            pageTrigger[page] = newVal;
            setState({ pageTrigger });
        },
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
        setRecMap(newVal) {
            setState({
                recMap: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
