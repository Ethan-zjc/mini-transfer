import { util_action, util_transNum } from "../../util.js";

const app = getApp();
const { connect } = app.Store;
const api = require("./api");
const { classImgs } = require("../../cdn.js");

const page = {
    data: {
        // motto: '展示computed能力，以及scss的mixin能力(超出指定行ellipse)',
        hasUserInfo: false,
        scrollTop: 0, // 吸顶组件需要的:滚动多少需要吸顶显示
        setScroll: false, // 设置滚动条位置
        isLoading: true, // 吸顶组件需要的:是否触发上滑加载
        isMounting: false, // 是否展示占位符
        showMountingTagList: false, // 是否显示吸顶内的TagList列表
        tagData: {
            page: 1, // 页码，默认1
            size: 18, // 请求数量，默认10
            tagId: 0, // 分类id
            tagName: "全部", // 分类id 对应的titel
            tagTitle: "全部", // 完整title
            gender: 0, // 男女版  [0-女版 1-男版 2-未知/老版本]
            updateStatus: 0, // 更新状态  [0-全部 1-连载中 2-完结]
            updateStatusName: "全部", // 更新状态对应的名称
            payStatus: 0, // 付费状态 [0-全部 1-免费 2-付费 3-抢先看]
            payStatusName: "全部", // 付费状态对应的名称
            sort: 1, // 排序 [1-推荐 2-人气值 3-新上架 4-关注数]
            sortName: "推荐", // 排序对应的名称
            favFilter: 0, // 是否过滤已关注，默认0 [0-否 1-是]
            region: 1, // 区域选项 [1：全部，2：国漫，3：韩漫，4：日漫]
            regionName: "全部",
        },
        tagList: null, // 分类列表
        total: 0, // 总条数
        totalPage: 1, // 总页码
        topicList: null, // 展示的数据
        top: 0, // 滚动条卷去的高度

        // 控制收起展开状态
        isRetract: false, // 收起->falase  展示->true
        classImgs,
    },
    onLoad(options) {
        let id = options.id ? options.id : 0;
        let tagData = this.data.tagData;
        tagData.tagId = id;
        let payStatus = options.payStatus ? options.payStatus : 0;
        payStatus = isNaN(Number(payStatus)) ? 0 : payStatus;
        tagData.payStatus = payStatus <= 3 ? payStatus : 3;
        if (tagData.payStatus == 0) {
            tagData.payStatusName = "全部";
        } else if (tagData.payStatus == 1) {
            tagData.payStatusName = "免费";
        } else if (tagData.payStatus == 2) {
            tagData.payStatusName = "付费";
        } else if (tagData.payStatus == 3) {
            tagData.payStatusName = "抢先看";
        }
        // 连载选项
        let updateStatus = options.updateStatus ? options.updateStatus : 0;
        updateStatus = isNaN(Number(updateStatus)) ? 0 : updateStatus;
        tagData.updateStatus = updateStatus <= 2 ? updateStatus : 2;
        if (tagData.updateStatus == 0) {
            tagData.updateStatusName = "全部";
        } else if (tagData.updateStatus == 1) {
            tagData.updateStatusName = "连载中";
        } else if (tagData.updateStatus == 2) {
            tagData.updateStatusName = "已完结";
        }
        // 推荐选项
        let sort = options.sort ? options.sort : 1;
        sort = isNaN(Number(sort)) ? 1 : sort;
        tagData.sort = sort <= 3 ? sort : 3;
        if (tagData.sort == 1) {
            tagData.sortName = "推荐";
        } else if (tagData.sort == 2) {
            tagData.sortName = "最火热";
        } else if (tagData.sort == 3) {
            tagData.sortName = "新上架";
        }
        this.setData(
            {
                tagData,
            },
            () => {
                this.trackVisitTag(); // 上报神策 访问发现页分类埋点

                this.getData();
            }
        );
    },
    // 格式化数字 为xx万/xx亿  @num:类型num   返回:格式后的字符串
    initNum(num) {
        num = num ? num : 0;
        let srtNum = num + "";
        let len = srtNum.length; // 位数(长度)
        let str;
        if (len <= 5) {
            str = srtNum;
        } else if (len > 5 && len < 9) {
            str = srtNum.slice(0, len - 4) + "万";
        } else {
            str = srtNum.slice(0, len - 8) + "." + srtNum.slice(len - 8, len - 8 + 2) + "亿";
        }
        return str;
    },

    // 页面被用户分享时执行
    onShareAppMessage() {
        let sign = getApp().globalData.sySign;
        return {
            path: `/pages/class/class${sign ? "?locate=kksy_" + sign : ""}`,
        };
    },

    // 获取页面数据
    getData(clear) {
        let tagData = this.data.tagData;
        tagData.gender = app.globalData.gender == null ? 0 : app.globalData.gender; //
        // 参数 查看页面目录下api.js文件
        api.getMultiFilter(tagData)
            .then((res) => {
                this.setData({
                    isLoading: true, // 设置可以可以加载
                });
                let { code, message, hits, total } = res;
                let { topicCategories, topicMessageList } = hits;

                if (code != 200) {
                    return false;
                }

                // 设置页码
                tagData.page = tagData.page + 1;
                this.setData(
                    {
                        tagData, // 修改需要加载的页码
                    },
                    () => {
                        this.setTrigger();
                    }
                );

                if (!this.data.tagList) {
                    let tagList = [];
                    topicCategories = topicCategories ? topicCategories : [];
                    topicCategories.forEach((item, index) => {
                        let titles = item.title ? item.title : "";
                        let margin = false;
                        if ((index + 1) % 7 == 0) {
                            margin = true;
                        }
                        let data = {
                            ...item,
                            titles: titles.slice(0, 3),
                            margin: margin,
                        };
                        tagList.push(data);
                    });
                    this.setData({
                        tagList: tagList, // 分类列表
                    });
                }

                // popularity
                topicMessageList.forEach((item) => {
                    // 处理在追人数
                    item.popularityName = util_transNum(item.favourite_count); // 最热的情况

                    item.uuid = `${Date.now().toString(36)}_${item.card_type}_${Math.random().toString(36)}`;
                });
                let dataTopicList = this.data.topicList ? this.data.topicList : [];
                if (clear) {
                    // 清空数据
                    dataTopicList = [];
                }
                this.setData({
                    total: total, // 设置总条数
                    // tagList:tagList,//分类列表
                    topicList: [...dataTopicList, ...topicMessageList], // 页面展示的数据
                    totalPage: Math.ceil(total / this.data.tagData.size), // 设置页面可加载的次数(总页码)
                });

                // 获取展示吸顶的时机
                let time = setTimeout(() => {
                    clearTimeout(time);
                    if (this.data.scrollTop) {
                        return false;
                    }
                    this.setScrollTop(); // 设置 滚动条到多少的位置开始吸顶操作
                }, 300);
            })
            .catch((err) => {
                this.setData({
                    isLoading: true, // 设置可以可以加载
                });
            });
    },

    // 设置 滚动条到多少的位置开始吸顶操作
    setScrollTop() {
        const query = wx.createSelectorQuery();
        const _this = this;
        query
            .selectAll("#screen-lists")
            .boundingClientRect(function (res) {
                res = res ? res : {};
                res = res[0] ? res[0] : {};
                // let top = res.top ? res.top :0;
                let top = res.height ? res.height : 0;
                top = top ? top - 80 / app.globalData.screenRpxRate : 0;
                _this.setData({
                    scrollTop: top, // 滚动多少需要吸顶显示
                });
            })
            .exec();
    },

    // 点击内容去的收起箭头事件(收起筛选列表事件)
    middlePutAwayTap() {
        let isRetract = this.data.isRetract;
        isRetract = !isRetract;
        this.setData(
            {
                isRetract,
            },
            () => {
                this.setScrollTop(); // 设置 滚动条到多少的位置开始吸顶操作
            }
        );
    },

    // 吸顶内的展开箭头点击事件(展开筛选列表事件)
    spreadOutTap() {
        if (this.data.showMountingTagList) {
            // 防止重复点击
            return false;
        }
        this.setData({ showMountingTagList: true });
    },

    // 吸顶内的收起箭头点击事件(展开筛选列表事件)
    topPutAwayTap() {
        this.setData({ showMountingTagList: false });
    },

    // 点击tag(分类)事件
    tagItemTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let tagData = this.data.tagData;
        tagData.page = 1;
        tagData.tagName = dataset.name; // 存储名称
        if (tagData.tagId == dataset.id) {
            return false;
        }
        tagData.tagId = dataset.id; // 保存id
        tagData.tagTitle = dataset.title; // 保存完整title

        if (this.data.top != 0) {
            // 滚动条有变动的情况
            this.setData({ tagData, setScroll: true }, () => {
                // 是否这是滚动条位置 setScroll:true->是 false->不是
                this.setData({ setScroll: false });
            });
        } else {
            // 滚动条没有滚动的过
            this.setData({ tagData });
        }

        this.trackVisitTag(); // 上报神策 访问发现页分类埋点

        this.getData(true); // 重新获取数据渲染

        this.setTrigger();
    },

    // 点击筛选区域(地区)状态
    regionStatusTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let tagData = this.data.tagData;
        tagData.page = 1;
        tagData.regionName = dataset.name; // 存储名称
        tagData.region = dataset.id; // 保存id
        if (this.data.top != 0) {
            // 滚动条有变动的情况
            this.setData({ tagData, setScroll: true }, () => {
                // 是否这是滚动条位置 setScroll:true->是 false->不是
                this.setData({ setScroll: false });
            });
        } else {
            // 滚动条没有滚动的过
            this.setData({ tagData });
        }
        this.getData(true); // 重新获取数据渲染
    },

    // 点击筛选付费状态
    payStatusTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let tagData = this.data.tagData;
        tagData.page = 1;
        tagData.payStatusName = dataset.name; // 存储名称
        tagData.payStatus = dataset.id; // 保存id
        if (this.data.top != 0) {
            // 滚动条有变动的情况
            this.setData({ tagData, setScroll: true }, () => {
                // 是否这是滚动条位置 setScroll:true->是 false->不是
                this.setData({ setScroll: false });
            });
        } else {
            // 滚动条没有滚动的过
            this.setData({ tagData });
        }
        this.getData(true); // 重新获取数据渲染
    },

    // 点击更新状态(连载状态)
    serializeStatusTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let tagData = this.data.tagData;
        tagData.page = 1;
        tagData.updateStatusName = dataset.name; // 存储名称
        tagData.updateStatus = dataset.id; // 保存id
        if (this.data.top != 0) {
            // 滚动条有变动的情况
            this.setData({ tagData, setScroll: true }, () => {
                // 是否这是滚动条位置 setScroll:true->是 false->不是
                this.setData({ setScroll: false });
            });
        } else {
            // 滚动条没有滚动的过
            this.setData({ tagData });
        }
        this.getData(true); // 重新获取数据渲染
    },

    // 点击筛选推荐
    recommendStatusTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let tagData = this.data.tagData;
        tagData.page = 1;
        tagData.sort = dataset.id; // 保存id
        tagData.sortName = dataset.name; // 存储名称

        if (this.data.top != 0) {
            // 滚动条有变动的情况
            this.setData({ tagData, setScroll: true }, () => {
                // 是否这是滚动条位置 setScroll:true->是 false->不是
                this.setData({ setScroll: false });
            });
        } else {
            // 滚动条没有滚动的过
            this.setData({ tagData });
        }
        this.getData(true); // 重新获取数据渲染
    },

    // 点击筛选关注专题
    filterFollowTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let tagData = this.data.tagData;
        tagData.page = 1;
        tagData.favFilter = dataset.id; // 保存id
        this.setData({
            tagData,
        });
        this.getData(true); // 重新获取数据渲染
    },

    // 点击专题列表的某一个事件
    listItemTap(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        let { id, title, count } = dataset;

        if (!count) {
            util_action({ type: 2, id, params: { source: "class", title } });
        } else {
            util_action({ type: 68, id: "", parentid: id });
        }
    },

    // 下拉加载函数
    upSlipLoadingFn(event) {
        let page = this.data.tagData.page;
        let totalPage = this.data.totalPage;
        // this.setData({
        //     isMounting:event.detail.isMounting,
        //     top:event.detail.top, //滚动条卷去的高度
        //     showMountingTagList:false
        // });
        if (this.data.scrollTop <= event.detail.top) {
            if (this.data.showMountingTagList) {
                this.setData({
                    isMounting: event.detail.isMounting,
                    top: event.detail.top, // 滚动条卷去的高度
                    showMountingTagList: false,
                });
            }
        }

        if (page > totalPage) {
            // 说明没有加载的数据了
            return false;
        }

        let isLoading = this.data.isLoading; // 自定义的是否可以下拉加载
        if (event.detail.loading && isLoading) {
            // 不可以加载
            this.setData({
                isLoading: false, // 不可以加载
            });
            this.getData(false);
        }
    },

    // 设置全局active变量
    setTrigger() {
        this.setPageTrigger("class", {
            ...this.data.tagData,
        });
    },

    // 上报神策埋点 - 访问发现分类页类别
    trackVisitTag() {
        const data = {
            CategoryPage: this.data.tagData.tagName, // 类别页名称  恋爱 古风...
        };
        const page = this.data.pageTrigger;
        const { comic = {} } = page;
        // 详情页漫底分类
        if (comic && comic.module_type == 1) {
            data.TabModuleType = "漫底分类模块";
        }
        app.kksaTrack("VisitSubFindCat", data);
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
