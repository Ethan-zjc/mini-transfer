import { util_action } from "../../util.js";

const app = getApp();
const { connect } = app.Store;
const api = require("./api");
const { rankImgs } = require("../../cdn.js");

let setDataTime;

const page = {
    data: {
        sys: {
            // 设备信息
            brand: "", // 品牌
            model: "", // 型号
            windowHeight: 0, // 屏幕可使用搞
            pixelRatio: 0, // 设备像素比
        },
        rankTopHeight: 0, // 头图高度
        leftNavHeight: 0, // 左侧导航栏的高度 使用px单位
        navIsFixed: false, // 导航条是否使用固定定位

        // 当前选中的排行数据
        navActive: {
            id: 0, // 和rank_id一样
            title: "", // 排行标题
            main_color: "", // 排行主题色
            image_url: "", // 排行封面背景图
            next_update_date: "", // 更新时间
            channel: app.globalData.channel, // 渠道
            rank_id: 0, // 请求排行的id
            need_ranks: true, // 是否需要排行标题列表
            since: 0, // 请求的页码   -1代表没有下一页，首次传0
            limit: 20, // 每页数据
        },

        // 排行榜导航数据
        rankNavList: [],

        // 专题列表数据
        topicList: [],
        rankImgs,
    },

    // 页面创建时执行
    onLoad(options) {
        let id = options.id ? options.id : 0;
        let navActive = this.data.navActive;
        navActive.rank_id = id;
        navActive.id = id;

        this.setData({ navActive }, () => {
            this.getData(); // 获取数据
        });
    },

    // 页面首次渲染完毕时执行
    onReady() {
        // 获取设备信息并且获取头图高度和设置左侧导航的高度
        this.getSys();
    },

    // 页面被用户分享时执行
    onShareAppMessage() {
        let sign = getApp().globalData.sySign;
        return {
            path: `/pages/rank/rank${sign ? "?locate=kksy_" + sign : ""}`,
        };
    },

    // 页面滚动时执行
    onPageScroll(event) {
        let {
            sys, // 获取设备信息
            rankTopHeight, // 头图的高度
        } = this.data;
        let { scrollTop } = event; // 获取滚动卷去的高度
        let top;
        if (scrollTop > rankTopHeight) {
            this.setData({
                navIsFixed: true, // 导航使用固定定位
                leftNavHeight: sys.windowHeight, // 可用屏幕的高度 使用px单位
            });
            return false;
        }

        top = rankTopHeight - scrollTop;
        top = top <= 0 ? 0 : top; // 最小值只能是0

        if (setDataTime) {
            // setDataTime全局变量
            return false; // 防止修改频率过高
        }
        setDataTime = setTimeout(() => {
            // 防止卡顿
            clearTimeout(setDataTime);
            setDataTime = null;
            // 设置左侧导航栏的高度 f
            this.setData({
                navIsFixed: false, // 导航不使用固定定位
                leftNavHeight: sys.windowHeight - top, // 不是满屏幕高度 使用px单位
            });
        }, 1);
    },

    // 指定页面距离底部的距离(默认50px) 上滑加载
    // eslint-disable-next-line no-dupe-keys
    onReachBottom() {
        let since = this.data.navActive.since;
        if (since == -1) {
            // 没有数据的情况
            return false;
        }
        this.getData(false);
    },

    // 获取数据 type: 是否清空存储的专题列表数据,默认不清除   可选值type:false不清除/true清除
    getData(type = false) {
        /* channel:"wechat"-渠道	rank_id:0-请求排行的id need_ranks:true-是否需要排行标题列表 since:1-请求的页码  limit:20-每页数据*/
        let { channel, rank_id, need_ranks, since, limit } = this.data.navActive;
        if (since == -1) {
            // -1代表没有下一页，首次传0
            return false;
        }
        api.getRankList({ channel, rank_id, need_ranks, since, limit })
            .then((res) => {
                // console.log(res);
                let { code, message, data } = res;
                if (code != 200) {
                    return false;
                }

                let { topics, default_rank, ranks, since } = data;
                default_rank = default_rank ? default_rank : 0; // 保证默认排行id存在
                // rank_id = rank_id==0 ? default_rank : rank_id;//保证id存在
                // 确保需要排行榜标题列表 S
                if (need_ranks) {
                    ranks = ranks ? ranks : []; // 保证存在

                    ranks.forEach((item) => {
                        item.id = item.id ? item.id : 0; // 排行id
                        item.title = item.title ? item.title : ""; // 排行标题
                        item.main_color = item.main_color ? item.main_color : "#2A303D"; // 排行主题颜色
                        item.image_url = item.image_url ? item.image_url : ""; // 排行封面背景图
                        item.next_update_date = item.next_update_date ? item.next_update_date : ""; // 排行下次更新时间
                        item.uuid = `${Date.now().toString(36)}_${item.card_type}_${Math.random().toString(36)}`;
                    });
                    // 存储排行榜标题列表

                    // 设置默认选中的排行榜 S
                    let rankIdArr = ranks.filter((item) => item.id == rank_id);
                    let defaultRankArr = ranks.filter((item) => item.id == default_rank);
                    let ranksData = {};
                    if (rankIdArr.length > 0) {
                        ranksData = rankIdArr[0] ? rankIdArr[0] : {}; // 传入的id数据
                    } else {
                        ranksData = defaultRankArr[0] ? defaultRankArr[0] : {}; // 默认的id数据
                    }
                    let navActive = this.data.navActive;
                    navActive.id = ranksData.id;
                    navActive.title = ranksData.title;
                    navActive.main_color = ranksData.main_color;
                    navActive.image_url = ranksData.image_url;
                    navActive.next_update_date = ranksData.next_update_date;
                    navActive.need_ranks = false;
                    navActive.rank_id = ranksData.id;
                    navActive.since = since;
                    // 设置默认选中的排行榜 E

                    this.setData({ rankNavList: ranks, navActive }, () => {
                        this.trackVisitNav(); // 上报神策 排行版页访问

                        this.setTrigger();
                    }); // 存储选中的排行信息和排行列表
                }
                // 确保需要排行榜标题列表 E

                // 格式专题列表信息 S
                topics = topics ? topics : []; // 保证专题列表存在
                topics.forEach((item) => {
                    item.id = item.id ? item.id : 0;
                    item.title = item.title ? item.title : "";
                    item.image_url = item.image_url ? item.image_url : "";
                    item.right_bottom = item.right_bottom ? item.right_bottom : "";
                    item.description = item.description ? item.description : "";
                    item.category = item.category ? item.category : [];
                    item.rank_icon = item.rank_icon ? item.rank_icon : "";
                    item.rank_message = item.rank_message ? item.rank_message : 0;
                });
                let topicList = [];
                if (type) {
                    // 清除之前存储的数据
                    topicList = [...topics];
                } else {
                    // 不清除
                    topicList = [...this.data.topicList, ...topics]; // 合并数据
                }
                let navActive = this.data.navActive;
                navActive.need_ranks = false; // 下次请求不要,排行标题列表
                navActive.since = since; // 存储是否还有页码
                this.setData({
                    navActive,
                    topicList,
                });
                // 格式专题列表信息 E
            })
            .catch((err) => {
                return false;
            });
    },

    // 获取设备信息
    getSys() {
        wx.getSystemInfo({
            success: (res) => {
                this.setData(
                    {
                        sys: { ...res },
                    },
                    () => {
                        const query = wx.createSelectorQuery();
                        query
                            .selectAll("#rank-top-title")
                            .boundingClientRect((res) => {
                                // res.top // #the-id 节点的上边界坐标（相对于显示区域）
                                res = res ? res : {};
                                res = res[0] ? res[0] : {};
                                let height = res.height ? res.height : 0;
                                let sys = this.data.sys; // 获取设备信息
                                this.setData({
                                    rankTopHeight: height, // 头图的高度
                                    leftNavHeight: sys.windowHeight - height, // 设置导航条的高度 使用px单位
                                });
                            })
                            .exec();
                    }
                );
            },
        });
    },

    // 点击排行nav 切换数据
    rankNavTap(event) {
        // "id": 1,
        // "title": "排行榜",
        // "main_color": "red",
        // "image_url": "",
        // "next_update_date": "下次出榜时间：1月12日17:00"
        //	rank_id:0, //请求排行的id
        //  need_ranks:true, //是否需要排行标题列表
        //  since:0 ,//请求的页码   -1代表没有下一页，首次传0
        //  limit:20 //每页数据
        let dataset = event.currentTarget.dataset; // 数据集合
        let { id, title, maincolor, url, updatetime } = dataset;
        let navActive = this.data.navActive;
        if (navActive.id == id) {
            return false; // 防止重复点击请求
        }
        navActive.id = id;
        navActive.title = title;
        navActive.main_color = maincolor;
        navActive.image_url = url;
        navActive.next_update_date = updatetime;
        navActive.since = 0;
        navActive.rank_id = id;
        this.setData({ navActive }, () => {
            this.trackVisitNav(); // 上报神策 排行版页访问
            // 重新获取数据
            this.getData(true);
            wx.pageScrollTo({
                scrollTop: 0,
                duration: 0,
            });
            this.setTrigger();
        });
    },

    // 排行榜专题列表-item点击事件
    topicItemsTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let { id } = dataset;
        util_action({ type: 68, id: "", parentid: id });
    },
    // 设置全局active变量
    setTrigger() {
        this.setPageTrigger("rank", {
            ...this.data.navActive,
        });
    },

    // 上报神策埋点 - 排行版类别访问
    trackVisitNav() {
        const data = {
            SourcePlatform: app.globalData.channel, // 来源平台
            ContentName: this.data.navActive.title, // 榜单名称  少男榜、少女榜、口碑榜
        };
        app.kksaTrack("RankingPagePV", data);
    },
};

const ConnectPage = connect(
    ({ userInfo, pageTrigger }) => {
        return {
            userInfo,
            pageTrigger,
        };
    },
    (setState, _state) => ({
        setPageTrigger(page, newVal) {
            const pageTrigger = _state.pageTrigger;
            pageTrigger[page] = newVal;
            setState({ pageTrigger });
        },
    })
)(page);

Page(ConnectPage);
