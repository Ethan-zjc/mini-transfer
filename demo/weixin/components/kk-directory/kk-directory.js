const app = getApp();
const global = getApp().globalData;
const { comDireImgs } = require('../../cdn.js');

import { util_request, util_action, util_formatTime, util_multPage } from '../../util.js';

Component({
    properties: {
        directoryShow: {
            // 是否显示vip弹窗
            type: Boolean,
            value: false,
        },
        comicId: {
            type: Number,
        },
        topicId: {
            type: Number,
        },
        comicTitle: {
            type: String,
            value: '',
        },
        topicTitle: {
            type: String,
            value: '',
        },
        userInfo: {
            type: Object,
            value: null,
        },
        page: {
            type: String,
            value: 'comic',
        },
        isBonusChapter: {
            type: Boolean,
            value: false,
        },
        isExperiment: {
            // 是否为连续阅读实验组，暂时屏蔽整本购买
            type: Boolean,
            value: false,
        },
    },

    // 组件内部数据
    data: {
        oriPos: '', // 记录定位位置
        padBottom: 0,
        scrollTop: 0,
        scrollY: true,
        finished: false,
        initMore: true, // 初始化后是否有更多数据
        upperMore: true, // 触顶是否有更多数据
        lowerMore: true, // 触低是否有更多数据
        listAry: [], // 初始化默认数组
        pageSize: 20,
        totalPage: '',
        currentPage: '',
        historyList: [],
        upperLoading: false, // 触顶loading
        lowerLoading: false, // 触底loading
        stopScrollEvt: false,
        basePage: '', // 初始化时页面值
        upperPage: '', // 滑动后当前展示最小页码值
        lowerPage: '', // 滑动后当前展示最大页码值
        sort: 'asc',
        comDireImgs,
        activeId: -1,
        tabs: [],
        bonusList: [],
        bsort: true, // 彩蛋正倒序
        tsort: true, // 正文正倒序
        quarterCount: {},
        isEmpty: false,
        tabPos: '', // tab定位
    },

    // 监听数据变化
    observers: {
        async directoryShow(val) {
            if (val) {
                // 存储原始id
                this.data.originalId = this.data.comicId;

                // 重置数据
                Object.assign(this.data, { totalPage: '', upperMore: true, lowerMore: true });
                this.setData({
                    listAry: [],
                    oriPos: '',
                });
                await this.getReadStorage();
                // 将当前话作为已读, 在数组中push当前章节id
                if (this.data.page == 'comic') {
                    const { historyList, comicId } = this.data;
                    if (!historyList.map((item) => item.id).includes(comicId)) {
                        this.data.historyList.push({
                            id: comicId,
                            read_count: 0,
                        });
                    }
                }
                this.getList({ onFirst: true });
            }
        },
    },
    attached() {
        const { iPhoneX, screenRpxRate } = global;
        const padBottom = iPhoneX ? Math.ceil(34 * screenRpxRate) + 98 : 98;
        this.setData({
            iPhoneX,
            padBottom,
            screenRpxRate,
        });
    },

    // 组件的方法，包括事件响应函数和任意的自定义方法，关于事件响应函数的使用
    methods: {
        // 第二个参数是否为彩蛋列表格式化，彩蛋列表没有续读标记
        formatList(list, isBonus) {
            return list.map((item, index) => ({
                id: `pic_${item.id}_${index}`,
                key: item.id,
                tit: item.title,
                imgUrl: item.cover_image_url,
                clock: isBonus ? false : item.id == this.data.continueId,
                time: parseInt(util_formatTime(item.created_at, 'yyyy')) < parseInt(util_formatTime(new Date().getTime(), 'yyyy')) ? util_formatTime(item.created_at, 'yyyy-MM-dd') : util_formatTime(item.created_at, 'MM-dd'),
                forbidden: !item.is_free || item.vip_exclusive,
                forbiddenType: item.can_view ? 'unlock' : 'locked',
                readed: this.data.historyList.map((item) => item.id).includes(item.id) ? 'readed' : '',
                label: item.label_info
                    ? {
                          ...item.label_info,
                          style: `background: -webkit-linear-gradient(left, ${item.label_info.background_color}, ${item.label_info.background_gradual_color}); color: ${item.label_info.text_color};padding: 4rpx 10rpx;`,
                      }
                    : '',
            }));
        },

        // 处理tabs排序和定位
        tabsSort({ tabs, location, onFirst } = {}) {
            // 查看是否存在分季
            const { bonusList = [], tsort = true } = this.data;
            let newTabs = tabs.map((item) => ({
                seasonIndex: item.season_index,
                title: item.title,
                focus: item.focus,
                key: `tab${item.season_index}`,
            }));

            if (newTabs.length) {
                // 查询当前正序，倒序，用哪个排序值，先用正文
                if (!tsort) {
                    newTabs = [...newTabs].reverse();
                }
            } else {
                newTabs.push({
                    seasonIndex: -1,
                    title: '漫画选集',
                    focus: true,
                    key: 'tab-1',
                });
            }
            if (bonusList.length) {
                newTabs.push({
                    seasonIndex: -2,
                    title: '彩蛋',
                    focus: false,
                    key: 'tab-2',
                });
            }

            // 初始化，章节是彩蛋，且是漫画详情页打开目录，此时服务端下发焦点在季度上面，需要定位到彩蛋tab上面
            if (onFirst && this.data.isBonusChapter) {
                newTabs.forEach((item) => {
                    item.focus = item.seasonIndex == -2;
                });
            }
            const focusIndex = newTabs.findIndex((item) => item.focus);
            this.setData({ tabs: newTabs, activeId: newTabs[focusIndex > -1 ? focusIndex : 0].seasonIndex }, () => {
                // tab定位
                if (location != 'click') {
                    this.setData({
                        tabPos: `tab${this.data.activeId}`,
                    });
                }
            });
        },
        getBaseComicId({ action = 1, baseId = '', onFirst = false, location = '' } = {}) {
            let baseComicId = 0;
            const { comicId } = this.properties;
            const { continueId = 0 } = this.data;
            if (onFirst) {
                // 漫画页拉起是当前章节id，专题页拉起是续读id或0
                baseComicId = comicId || 0;
            } else {
                if (action == 1) {
                    if (location == 'top' || location == 'click') {
                        // 排序
                        baseComicId = 0;
                    } else {
                        // 当前
                        baseComicId = continueId || 0;
                    }
                } else if (action == 2 || action == 3) {
                    // 翻页
                    baseComicId = baseId || 0;
                } else {
                    // tab点击, 回到顶部
                    baseComicId = 0;
                }
            }
            return baseComicId;
        },
        getList({ action = 1, baseId = '', onFirst = false, location = '' } = {}) {
            const { channel } = global,
                { sort, topicId, pageSize, totalPage, activeId } = this.data;
            const baseComicId = this.getBaseComicId({ action, baseId, onFirst, location });
            const data = {
                sort,
                action,
                comic_id: baseComicId,
                page_size: pageSize,
                topic_id: topicId,
            };
            if (activeId && activeId != -1 && activeId != -2) {
                data.season_index = Number(activeId);
            }
            Object.assign(this.data, {
                action,
                stopScrollEvt: true,
            });
            this.setData({ isEmpty: false });
            this.loading(action, true);
            util_request({
                url: `/mini/v1/comic/${channel}/topic/catalog`,
                data,
            }).then((res) => {
                const { total_page, current_page, topic_basic_info, buy_button: buyButton = {}, comic_list: comicList, trailer_comic_list = [], season_info = [] } = res.data,
                    { comic_count: comicCount, catalog_update_remind: updateRemind, trailer_sub_title: trailerSubTitle } = topic_basic_info,
                    { text: buyText = '' } = buyButton;

                if (onFirst && trailer_comic_list.length) {
                    this.data.bonusList = this.formatList(trailer_comic_list, true);
                }

                // 处理tab展示
                this.tabsSort({ tabs: season_info, location, onFirst });

                // 存储当前季度章节数量
                const quarterCount = {};
                this.data.tabs.forEach((item) => {
                    if (item.seasonIndex == -1 || item.seasonIndex == -2) {
                        quarterCount[item.seasonIndex] = item.seasonIndex == -2 ? trailer_comic_list.length : comicCount;
                    } else {
                        quarterCount[item.seasonIndex] = season_info.filter((item1) => item1.season_index == item.seasonIndex)[0].comic_count || 0;
                    }
                });
                this.data.quarterCount = quarterCount;
                this.data.trailerSubTitle = trailerSubTitle;

                // 处理彩蛋章节详情页拉起目录定位
                if (onFirst && this.properties.isBonusChapter) {
                    this.setData({
                        updateRemind: trailerSubTitle,
                        buyText: global.isiOS ? '' : buyText,
                        lowerLoading: false,
                    });
                    this.toggleTab(
                        {
                            currentTarget: {
                                dataset: {
                                    id: -2,
                                    init: true,
                                },
                            },
                        },
                        () => {
                            // 定位滚动到彩蛋章节
                            const oriIndex = this.data.bonusList.findIndex((item) => item.key == this.properties.comicId);
                            this.setData({
                                oriPos: oriIndex > -1 ? this.data.bonusList[oriIndex].id : `pic_${this.properties.comicId}_0`,
                            });
                        }
                    );
                    return;
                }

                // 第一次需要根据total_page, current_page, 拆分二维数组，并保留数据
                if ((!totalPage || action == 4 || action == 1) && total_page && total_page > 0) {
                    Object.assign(this.data, {
                        totalPage: total_page,
                        basePage: current_page,
                        upperPage: current_page,
                        lowerPage: current_page,
                    });
                    Array.from(new Array(total_page).keys()).forEach(() => {
                        // 拆分为二维数组
                        this.data.listAry.push([]);
                    });
                }

                // 更新当前页码、需要判断当前是否还可翻页
                const { basePage, upperPage, lowerPage } = this.data;
                if (action != 1 && action != 4) {
                    if (action == 2) {
                        Object.assign(this.data, {
                            upperPage: upperPage > 0 && comicList.length ? upperPage - 1 : upperPage,
                        });
                    } else if (action == 3) {
                        Object.assign(this.data, {
                            lowerPage: comicList.length ? lowerPage + 1 : lowerPage,
                        });
                    }
                } else {
                    // 设置是否展示没有数据
                    if (!comicList.length) {
                        this.setData({ isEmpty: true });
                    }
                    if (!basePage) {
                        this.data.upperMore = false;
                        this.setData(
                            {
                                upperLoading: false,
                            },
                            () => {
                                if (comicList.length < pageSize) {
                                    this.setData({
                                        lowerMore: false,
                                    });
                                }
                            }
                        );
                    }
                }

                // 没有更多数据了不再执行请求
                const actions = {
                    1: 'initMore',
                    2: 'upperMore',
                    3: 'lowerMore',
                    4: 'initMore',
                };
                if (comicList.length < pageSize) {
                    this.setData({
                        [`${actions[action]}`]: false,
                    });
                    // this.data[actions[action]] = false
                }
                const list = this.formatList(comicList);
                if (!list.length) {
                    if (this.data.scrollY) {
                        this.setData({
                            scrollY: true,
                        });
                    }
                    this.data.stopScrollEvt = false;
                    this.loading(action, false);
                    return;
                }

                // 初始化一页的数据，一页的条数不固定
                const page = action == 1 || action == 4 ? this.data.basePage : action == 2 ? this.data.upperPage : this.data.lowerPage;
                this.setData(
                    {
                        [`listAry[${page}]`]: list,
                        updateRemind,
                        comicCount: quarterCount[this.data.activeId],
                        buyText: global.isiOS ? '' : buyText,
                    },
                    () => {
                        // 一键购买曝光埋点
                        if (buyText && onFirst) {
                            this.oneKeyKksaReport(0);
                        }
                        const { action } = this.data;
                        this.data.stopScrollEvt = false;

                        // 第一次才定位
                        this.setData({
                            scrollY: true,
                            [`${action == 2 ? 'upperLoading' : 'lowerLoading'}`]: false,
                        });

                        // 涉及初次定位，及触顶qq存在闪动问题另种思路解决
                        if (action == 3) {
                            return;
                        } else {
                            const arryList = [].concat.apply([], this.data.listAry).filter((item) => !!item); // this.data.listAry.flat()
                            const curId = action == 2 ? baseId : this.data.continueId || 0;
                            let index = arryList.findIndex((item) => item.key == curId);
                            if (action == 1 || action == 4) {
                                // 初次加载将续读章节定位在中间位置
                                index = index > 3 ? index - 2 : index;
                            }
                            // 若无arrayList 则无需进行下一步
                            if (!arryList.length || index == -1) {
                                return;
                            }
                            const id = arryList[index].key;

                            // 执行定位
                            this.setData({
                                oriPos: `pic_${id}_${action == 1 ? index : action == 4 ? (location == 'top' ? 0 : index) : 0}`,
                            });
                        }
                    }
                );
            });
        },
        loading(action, bool) {
            this.setData({
                [`${action == 2 ? 'upperLoading' : 'lowerLoading'}`]: bool,
            });
        },
        onScroll(e) {
            // 滚动监听
            const { scrollTop, scrollHeight } = e.detail;
            const { listAry, initMore, upperMore, lowerMore, upperPage, stopScrollEvt, screenRpxRate } = this.data;
            if (!initMore || stopScrollEvt) {
                return;
            }

            const arry = [].concat.apply([], listAry).filter((item) => !!item); // listAry.flat() // 二维展成一维数组
            if (arry.length) {
                if (scrollTop < 70) {
                    if (!upperMore || !upperPage) {
                        return;
                    } // 触顶没有更多数据
                    this.setData({ scrollY: false }); // 触顶立刻将滚动卡死，等数据加载完成可再滚动
                    this.getList({ action: 2, baseId: arry[0].key });
                } else if (scrollHeight - scrollTop < 928 / screenRpxRate) {
                    if (!lowerMore) {
                        return;
                    } // 触低没有更多数据、是否设置提示
                    this.getList({ action: 3, baseId: arry.slice(-1)[0].key });
                }
            }
        },
        updateList(e) {
            // 事件监听，存在不触发情况，暂时不使用
            const { type } = e,
                { listAry, initMore, upperMore, lowerMore, upperPage, stopScrollEvt } = this.data;
            if (!initMore || stopScrollEvt) {
                return;
            }

            const arry = listAry.flat(); // 二维展成一维数组
            if (type == 'scrolltoupper') {
                if (!upperMore || !upperPage) {
                    return;
                } // 触顶没有更多数据
                this.setData({ scrollY: false }); // 触顶立刻将滚动卡死，等数据加载完成可再滚动
                this.getList({ action: 2, baseId: arry[0].key });
            } else if (type == 'scrolltolower') {
                if (!lowerMore) {
                    return;
                } // 触低没有更多数据、是否设置提示
                this.getList({ action: 3, baseId: arry.slice(-1)[0].key });
            }
        },
        eventTap(e) {
            const { type, id } = e.currentTarget.dataset;
            if (type == 2) {
                this.direClickReport('漫画列表项');
                this.actionComic(id);
                return;
            }
            if (type == 1) {
                this.triggerEvent('directoryTap', { type }, { bubbles: true, composed: true });
            }
        },
        // 跳转详情页
        actionComic(id) {
            // 加个参数、当前章节已阅读图片数、已登录从远程返回拿到、未登录从缓存中拿
            let { historyList, page } = this.data,
                read = false;
            read = historyList.length && historyList.findIndex((item) => item.id == id) >= 0;
            const count = read ? historyList.find((item) => item.id == id).read_count : 0;

            if (page == 'topic') {
                this.triggerEvent('directoryTap', { type: 2 });
                util_action({ type: 3, id, params: { count } });
            } else {
                this.triggerEvent('directoryTap', { type: 2 });
                wx.redirectTo({
                    url: `/pages/${global.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${id}&count=${count}&fullScreen=true&dirmark=true`,
                });
            }
        },
        actionTopic() {
            const { topicId } = this.data;
            wx.redirectTo({
                url: `/pages/topic/topic?id=${topicId}`,
            });
        },

        // 处理阅读历史相关的数据，只第一次显示拉取
        async getReadStorage() {
            const { userInfo } = this.data;
            if (userInfo) {
                await this.pullOriginRead();
            } else {
                this.checkHasRead();
            }
        },
        // 检查是否存在阅读
        checkHasRead() {
            let topicHistory = wx.getStorageSync('historyForTopic') || {};
            const obj = topicHistory[this.data.topicId];
            if (obj) {
                this.data.historyList = obj.readList.map((item) => ({
                    id: item.id,
                    read_count: item.read_count || 0,
                }));
                this.data.continueId = obj.lastId;
            }
        },
        // 已登陆拉取阅读历史
        pullOriginRead() {
            return new Promise((resolve, reject) => {
                const { topicId } = this.data,
                    { channel } = global;
                util_request({
                    url: `/mini/v1/comic/${channel}/topic/read_record`,
                    data: {
                        topic_id: topicId,
                    },
                })
                    .then((res) => {
                        const { comic_records } = res.data;
                        this.data.historyList = comic_records
                            .filter((item) => !!item.has_read)
                            .map((item) => ({
                                id: item.id,
                                read_count: item.read_count || 0,
                            }));
                        this.data.continueId = comic_records.filter((item) => item.continue_read_comic).length ? comic_records.filter((item) => item.continue_read_comic)[0].id : '';
                        resolve();
                    })
                    .catch(() => {
                        reject();
                    });
            });
        },

        // 目录排序
        sortFunc(e) {
            const { sort } = e.currentTarget.dataset,
                { upperLoading, lowerLoading, activeId, bonusList = [] } = this.data;

            // 如果点击未变更，不重新刷新数据
            if (sort == this.data.sort) {
                return;
            }

            // 数据还在加载中避免快速切换
            if (upperLoading || lowerLoading) {
                return;
            }

            this.direClickReport('排序按钮');

            if (activeId == -2) {
                // 彩蛋tab正序、倒序
                this.data.bsort = sort == 'asc';
                this.setData({
                    sort,
                    listAry: [this.data.bsort ? bonusList : [...bonusList].reverse()],
                    initMore: true,
                    lowerMore: false,
                    upperMore: false,
                    stopScrollEvt: false,
                });
                return;
            }

            const options = {
                sort,
                listAry: [],
                initMore: true,
                lowerMore: true,
                upperMore: true,
                stopScrollEvt: false,
            };
            this.data.tsort = sort == 'asc';
            this.setData(options, () => {
                this.getList();
            });
        },

        // behavior为click,代表点击行为
        commonReset(type, behavior) {
            this.setData(
                {
                    sort: this.data.tsort ? 'asc' : 'desc',
                    listAry: [],
                    initMore: true,
                    lowerMore: true,
                    upperMore: true,
                    stopScrollEvt: false,
                },
                () => {
                    this.getList({ action: type == 'top' ? 4 : 1, baseId: type == 'top' ? 0 : '', location: behavior || type });
                }
            );
        },

        // 更改目录排序状态
        changeStatus(e) {
            const { type } = e.currentTarget.dataset;
            const { upperLoading, lowerLoading, activeId, bonusList = [] } = this.data;

            // 数据还在加载中避免快速切换
            if (upperLoading || lowerLoading) {
                return;
            }

            this.direClickReport(type == 'top' ? '顶部按钮' : '定位按钮');

            // 彩蛋回到顶部
            if (activeId == -2 && type == 'top') {
                const len = bonusList.length;
                this.setData(
                    {
                        oriPos: len ? (this.data.bsort ? bonusList[0].id : bonusList[len - 1].id) : '',
                    },
                    () => {
                        this.setData({
                            oriPos: '',
                        });
                    }
                );
                return;
            }

            this.commonReset(type);
        },

        // 一键购买
        oneKeyBuy() {
            this.oneKeyKksaReport(1);
            if (global.userId) {
                // 直接拉起弹窗等操作，或者回调
                this.triggerEvent('buyTapEvent', { type: 1 });
            } else {
                // 执行静默登录相关
                app.originLogin().then(() => {
                    // 可以刷新下目录数据、如果静默登录默认是三方的账号
                    this.triggerEvent('buyTapEvent', { type: 0 });
                });
            }
        },

        // 一键购买曝光/点击埋点
        oneKeyKksaReport(behavior) {
            const { topicId, comicId, topicTitle, comicTitle } = this.data;
            const multPage = util_multPage();
            const { TriggerPage: PrePage } = multPage;
            const data = {
                PrePage,
                CurPage: 'TopicPage',
                ClkltemType: '目录页模块',
                ContentName: topicTitle,
                ContentID: topicId,
                TabModuleTitle: '一键购买',
            };
            if (this.data.page == 'comic') {
                data.CurPage = 'ComicPage';
                data.RelatedContentName = comicTitle;
                data.RelatedContentID = comicId;
            }
            app.kksaTrack(behavior ? 'CommonItemClk' : 'CommonItemImp', data);
        },

        // 目录优化改版
        toggleTab(e, cb) {
            const { id = -1, init = false } = e.currentTarget.dataset;
            if (!init && id == this.data.activeId) {
                return;
            }
            this.setData({
                activeId: id,
            });

            // 彩蛋列表不做请求
            if (id == -2) {
                this.direClickReport('彩蛋tab');
                const { bsort = false, bonusList = [], quarterCount = {}, trailerSubTitle = '' } = this.data;
                this.setData(
                    {
                        sort: bsort ? 'asc' : 'desc',
                        listAry: [bsort ? bonusList : [...bonusList].reverse()],
                        isEmpty: false,
                        initMore: true,
                        lowerMore: false,
                        upperMore: false,
                        stopScrollEvt: false,
                        updateRemind: trailerSubTitle,
                        comicCount: quarterCount[id],
                    },
                    () => {
                        cb && cb();
                    }
                );
                return;
            }

            this.direClickReport('分季tab');
            this.commonReset('top', 'click');
        },

        // 目录点击埋点
        direClickReport(name) {
            const data = {
                CurPage: this.properties.page == 'comic' ? '漫画详情页' : '漫画专题页',
                popupName: '目录页半屏弹窗',
                ButtonName: name,
            };
            app.kksaTrack('ClickButton', data);
        },
    },
});
