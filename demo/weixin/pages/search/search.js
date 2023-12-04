import { util_request, util_action, util_transNum, util_arrayArrange, util_multPage, util_skipDirection } from '../../util.js';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const userInfoBehavior = require('../../behaviors/userInfo');
const followBehavior = require('../../behaviors/follow');
const { globalImgs, searchImgs } = require('../../cdn.js');

const page = {
    behaviors: [followBehavior, userInfoBehavior],
    data: {
        value: '', // 搜索内容
        hitsList: [], // 搜索提示
        hotsList: [], // 热门列表
        searchHis: [], // 本地搜索历史
        resultList: [], // 搜索结果列表
        onGetting: false, // 列表正在获取
        listOver: false, // 列表没有更多
        searching: false, // 正在输入
        guide: true, // 是否自动填入热搜词引导
        holder: '', // placeholder
        following: false, // 正在执行关注动作
        eventCache: {},

        isShowEmpty: false, // 是否显示空提示
        isRec: false, // 是否搜索无结果推荐
        recSince: 0, // 搜索无结果数据翻页
        recSize: 10, // 搜索无结果数据翻页
        scrollTop: 0, // 搜索列表滚动定位

        pageSize: 10,
        pageHot: 1,
        totalHot: 0,
        pageSearch: 1,
        totalSearch: 0,
        timeout: {},
        recordTimer: null,
        hotSince: 0,
        historyListAll: [],
        historyMaxNum: 6,
        historyMoreShow: false,
        historyMoreFlag: false,
        globalImgs,
        searchImgs,
    },
    watchUser(uid) {
        if (uid && this.data.resultList.length > 0) {
            const topicList = this.data.resultList.map((item) => item.id);
            this.checkFollow(topicList);
        }
    },
    onLoad(options) {
        if (options.searchWord) {
            this.setData({
                holder: options.searchWord,
            });
        }
        if (options['val']) {
            this.setData({
                value: options['val'],
            });
            this.search();
            this.data.guide = false;
        }

        // 获取搜索历史
        this.getHisList();

        // 获取热门搜索
        this.getHotList();
    },
    onShow() {
        this.pageTrack('exp');
    },
    // 上报相关
    pageTrack(type, params) {
        const multPage = util_multPage();
        const { TriggerPage } = multPage;
        const eventMap = {
            exp: 'SearchPageExp',
            search: 'Search',
            clk: 'SearchResultClk',
            open: 'CommonPageOpen',
        };
        const event = eventMap[type];
        const options = {
            TriggerPage,
        };

        if (type != 'exp') {
            options.SearchKeyword = this.data.value;
        }

        if (params) {
            Object.assign(options, params);
        }

        if (event) {
            app.kksaTrack(event, options);
        }
    },
    // options => more : 搜索更多
    search(options) {
        const value = this.data.value || this.data.holder;
        if (!value || this.data.onGetting) {
            return false;
        }
        const initData = {
            onGetting: true,
            isRec: false,
            isShowEmpty: false,
        };
        if (options !== 'more') {
            this.data.pageSearch = 1;
            Object.assign(initData, {
                scrollTop: this.data.scrollTop ? 0 : 1,
            });
        }
        this.setData(initData);
        util_request({
            host: 'search',
            url: '/search/mini/topic/title_and_author',
            data: {
                q: value,
                size: this.data.pageSize,
                page: this.data.pageSearch,
            },
        }).then((res) => {
            const { hits = [], total = 0 } = res;
            const followMap = {};
            const ary = hits.map((item) => {
                const category = item.category || [];
                const comic_video = item.related_comic_video || {};
                followMap[item.topic_id] = item.favourite;
                return {
                    id: item.topic_id,
                    title: item.title,
                    img: item.vertical_image_url,
                    category: category.slice(0, 5),
                    author: item.author_name,
                    fav: item.favourite,
                    comics_count: item.comics_count,
                    praise: util_transNum(item.likes_count),
                    comment: util_transNum(item.comments_count),
                    ...(Object.keys(comic_video).length ? { comic_video } : null),
                };
            });
            // 总页码
            const pageTotal = Math.ceil(total / this.data.pageSize);

            // 总列表项
            const list = options == 'more' ? this.data.resultList.concat(ary) : ary;

            // 底部加载状态
            const finish = list.length == 0 ? false : this.data.pageSearch >= pageTotal;

            if (options == 'more') {
                this.data.timeout = setTimeout(() => {
                    this.setData({
                        onGetting: false,
                    });
                }, 500);
            } else {
                this.setData({
                    onGetting: false,
                });
                this.addHistory(value);
            }

            this.data.totalSearch = total;

            this.setData(
                {
                    searching: false,
                    resultList: list,
                    listOver: finish,
                    value,
                },
                () => {
                    this.setBatchFollows(followMap);
                }
            );

            if (list.length == 0) {
                this.pageTrack('open', {
                    CurPage: 'SearchNoResult',
                });
                this.getRecommend();
            }
        });
    },

    // 无结果推荐
    getRecommend(type = '') {
        const { value, holder, recSince, recSize } = this.data;
        this.data.onGetting = true;
        util_request({
            host: 'search',
            url: '/search/recommend/v1/topic',
            data: {
                uuid: `${Date.now().toString(36)}_search_${Math.random().toString(36)}`,
                gender: global.gender,
                since: recSince,
                size: recSize,
                q: value || holder,
            },
        })
            .then((res) => {
                const { code, data = {} } = res;
                this.data.onGetting = false;
                if (code != 200) {
                    if (!type) {
                        this.setData({
                            isShowEmpty: true,
                        });
                    }
                    return false;
                }
                const { hit = [], total = 0, since = 0 } = data;
                const followMap = {};
                const list = hit.map((item) => {
                    const category = item.category || [];
                    followMap[item.id] = item.is_favourite;
                    return {
                        id: item.id,
                        title: item.title,
                        img: item.vertical_image_url,
                        category: category.slice(0, 2),
                        author: '',
                        fav: item.is_favourite,
                        comics_count: item.comics_count,
                        praise: util_transNum(item.likes_count),
                        comment: util_transNum(item.comments_count),
                    };
                });
                this.data.totalSearch = total;
                this.data.recSince = since;
                this.setData(
                    {
                        isRec: true,
                        searching: false,
                        resultList: type == 'more' ? this.data.resultList.concat(list) : list,
                        listOver: list.length < recSize || since == -1,
                    },
                    () => {
                        this.setBatchFollows(followMap);
                    }
                );
            })
            .catch(() => {
                this.data.onGetting = false;
                if (!type) {
                    this.setData({
                        isShowEmpty: true,
                    });
                }
            });
    },

    // 手动输入搜索
    searchConfirm() {
        this.search();
        this.pageTrack('search', {
            SearchSrc: 3,
        });
    },

    // 搜索更多
    loadMore() {
        if (!this.data.onGetting) {
            if (this.data.isRec) {
                if (this.data.recSince > -1) {
                    this.getRecommend('more');
                } else {
                    this.setData({
                        listOver: true,
                    });
                }
            } else {
                if (this.data.pageSearch < Math.ceil(this.data.totalSearch / this.data.pageSize)) {
                    this.data.pageSearch += 1;
                    this.search('more');
                } else {
                    this.setData({
                        listOver: true,
                    });
                }
            }
        }
    },

    // 热门搜索信息
    getHotList() {
        util_request({
            host: 'search',
            url: '/search/mini/hot_word_v2',
            data: {
                since: this.data.hotSince,
            },
        }).then((res) => {
            const { since, hot_word = [] } = res.data || {};
            this.setData({
                hotsList: hot_word,
            });
            this.data.hotSince = since || 0;
            this.data.guide = false;
        });
    },

    // 刷新热门搜索信息
    hotExchange() {
        const hotSince = this.data.hotSince;
        if (hotSince >= 0) {
            this.getHotList();
        }
    },

    // 监听输入动作
    handleInput(event) {
        const val = event.detail.value;
        if (val) {
            this.setData({
                value: val,
            });
            this.debounce(val);
        } else {
            // 输入框有焦点 && 内容为空 => 显示缓存记录
            this.clearValue();
        }
    },
    handleSuggest(val) {
        util_request({
            host: 'search',
            url: '/search/mini/suggest',
            data: { q: val },
        }).then((res) => {
            this.setData({
                hitsList: res.hits,
                // value: val,
                searching: true,
            });
        });
    },
    // 防抖
    debounce(val) {
        if (this.data.recordTimer !== null) {
            clearTimeout(this.data.recordTimer);
        }
        this.data.recordTimer = setTimeout(() => {
            this.handleSuggest(val);
        }, 200);
    },

    // 点击搜索历史
    clickHistory(event) {
        const params = event.currentTarget.dataset;
        this.addHistory(params.value);
        this.setData({ value: params.value });
        this.search();
        this.pageTrack('search', {
            SearchSrc: 2,
        });
    },
    clickHistoryMore() {
        this.data.historyMoreFlag = true;
        this.setData({
            searchHis: this.data.historyListAll,
            historyMoreShow: false,
        });
    },
    getHisList(val) {
        const { historyMaxNum, historyMoreFlag: flag } = this.data;
        const list = val ? val : wx.getStorageSync('searchHis') || [];
        const len = list.length;
        const cutNum = flag ? len : historyMaxNum;
        const visible = flag ? false : len > historyMaxNum;
        this.data.historyListAll = list;
        this.setData({
            searchHis: list.slice(0, cutNum),
            historyMoreShow: visible,
        });
    },
    // 添加搜索历史
    addHistory(val) {
        if (val) {
            let list = this.data.historyListAll;
            list.unshift(val);
            list = util_arrayArrange(list);
            list = list.slice(0, 10);
            wx.setStorageSync('searchHis', list);
            this.getHisList(list);
        }
    },

    // 清空搜索历史
    clearHistory() {
        this.data.historyListAll = [];
        this.data.historyMoreFlag = false;
        this.setData({ searchHis: [], historyMoreShow: false });
        wx.setStorageSync('searchHis', []);
    },

    // 点击弹窗空白
    clearValue() {
        this.setData({
            hitsList: [],
            value: '',
        });
    },

    // 关注
    handleFav(e) {
        const { id, index } = e.currentTarget.dataset;
        const multPage = util_multPage();
        const { CurPage } = multPage;
        this.handleFollow(id, false, () => {
            const row = this.data.resultList[index];
            const trackData = {
                ...multPage,
                TopicID: row.id,
                TopicName: row.title,
                NickName: row.author,
                AuthorID: '',
                Category: '',
                TriggerPage: CurPage,
            };
            app.kksaTrack('FavTopic', trackData); // 上报神策
        });
    },
    // 搜索结果跳转
    jumpList(event) {
        const { id, title, index, type } = event.currentTarget.dataset;
        if (type === 'video') {
            return;
        }
        this.jumpTopic(event);
        if (this.data.isRec) {
            app.kksaTrack('CommonItemClk', {
                PrePage: '搜索无结果页面',
                TopicName: title,
                TopicID: id + '',
            });
        } else {
            this.pageTrack('clk', {
                SearchOrderNumber: index + 1,
                SearchItemID: id + '',
                SearchItemName: title,
            });
        }
    },
    // 热搜跳转
    jumpHot(event) {
        const { tit, action = {} } = event.currentTarget.dataset;
        const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
        this.addHistory(tit);
        this.pageTrack('search', {
            SearchSrc: 1,
            SearchKeyword: tit,
        });

        if (type == 68) {
            util_skipDirection({
                topicId: parentid,
            }).then((res) => {
                if (res.continueId) {
                    util_action({
                        type: 3,
                        id: res.continueId,
                        params: {
                            count: res.readCount,
                        },
                    });
                } else {
                    util_action({ type, id, url, parentid });
                }
            });
        } else {
            util_action({ type, id, url, parentid });
        }
    },
    // sug跳转
    jumpSug(event) {
        const { tit } = event.currentTarget.dataset;
        this.jumpTopic(event);
        this.pageTrack('search', {
            SearchSrc: 4,
            SearchKeyword: tit,
        });
    },
    // 跳转专题
    jumpTopic(event) {
        const { id, tit, count } = event.currentTarget.dataset;
        this.addHistory(tit);

        if (!count) {
            util_action({ type: 2, id: id });
        } else {
            util_action({ type: 68, parentid: id });
        }
    },

    // 跳转详情
    jumpComic(event) {
        const params = event.currentTarget.dataset;
        this.addHistory(params.tit);
        util_action({
            type: 3,
            id: params.id,
        });
    },
    // 跳转有漫剧类型的漫画
    jumpWatchComic(event) {
        const multPage = util_multPage();
        const { CurPage } = multPage;
        const { id, title } = event.currentTarget.dataset;
        this.jumpTopic(event);
        app.kksaTrack('ClickButton', {
            ButtonName: '观看漫画',
            CurPage,
            ComicID: id,
            ComicName: title,
        });
    },
    // 跳转漫剧
    jumpVideo(event) {
        const multPage = util_multPage();
        const { CurPage } = multPage;
        const { id, title } = event.currentTarget.dataset;
        util_action({ type: 2009, parentid: id });
        app.kksaTrack('ClickButton', {
            ButtonName: '观看漫剧',
            CurPage,
            VideoPostName: title,
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, follows }) => {
        return { userInfo, follows };
    },
    (setState, _state) => ({
        setFollows(id, newVal) {
            const follows = _state.follows;
            follows[id] = newVal;
            setState({ follows });
        },
        setBatchFollows(newVal) {
            const follows = _state.follows;
            setState({
                follows: Object.assign(follows, newVal),
            });
        },
    })
)(page);

Page(ConnectPage);
