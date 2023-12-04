import { getHomePage } from "./api.js";

import IntersectionObserver from "../../common/js/intersection.js";

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const { globalImgs } = require("../../cdn.js");

const page = {
    data: {
        globalImgs,
        moduleTypeMap: {
            1: "单图模块",
        },
        observerList: [], // 已曝光模块索引
        hashList: [], // 当前曝光模块缓存
        hashTimer: null, // 当前曝光模块定时器

        isLogin: false,
        isLoading: true,
        pageIndex: 1,
        pageList: [],
        pageLoading: true,
    },
    async onLoad() {
        await app.getOpenId();
        await app.getGender();
        this.getMainInfo();
    },
    onShow() {
        app.kksaTrack("CommonPageOpen", {
            CurPage: "小程序福利页",
        });
    },
    onHide() {},
    onUnload() {},
    onShareAppMessage() {},
    onPullDownRefresh() {
        this.data.pageIndex = 1;
        this.data.observerList = [];
        this.getMainInfo(() => {
            wx.stopPullDownRefresh();
        });
    },
    onReachBottom() {
        this.getMainInfo(() => {
            this.handlerObserver();
        });
    },
    getMainInfo(callback) {
        if (!this.data.isLoading || this.data.pageIndex == 0) {
            return false;
        }
        this.data.isLoading = false;

        getHomePage({
            page: this.data.pageIndex,
        })
            .then((res) => {
                const { code, data = {} } = res;
                const modules = data.modules || [];

                this.data.isLoading = true;
                this.data.pageIndex = this.data.pageIndex + 1;

                if (modules.length <= 0 && this.data.pageIndex > 1) {
                    this.data.pageIndex = 0;
                    this.setData({ pageLoading: false });
                    return false;
                }

                if (code == 200) {
                    this.formatListData(modules);
                }

                this.setData({ pageLoading: true });
            })
            .catch(() => {})
            .finally(() => {
                callback && callback();
            });
    },
    // 格式化主接口数据
    formatListData(list = []) {
        let pageList = [];
        list.map((item) => {
            item.id = item.id || 0;
            item.module_type = item.module_type || 0;
            item.title = item.title || "";
            item.subtitle = item.subtitle || "";
            item.items = item.items || [];

            // 单图模块
            if (item.module_type == 1) {
                item.items = item.items.slice(0, 1);
                pageList.push(item);
            }
        });
        if (this.data.pageIndex <= 2) {
            this.setData(
                {
                    pageList: [pageList],
                },
                () => {
                    this.data.observerTimer = setTimeout(() => {
                        clearTimeout(this.data.observerTimer);
                        this.handlerObserver();
                    }, 500);
                }
            );
        } else {
            this.setData({
                pageList: [...this.data.pageList, pageList],
            });
        }
    },
    // 监听曝光
    handlerObserver() {
        if (this.ob) {
            this.ob.disconnect();
        }
        this.ob = new IntersectionObserver({
            selector: ".benefits-observer",
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
                        if (this.data.hashTimer) {
                            clearTimeout(this.data.hashTimer);
                        }
                        this.data.hashList.push(item);
                        // 曝光节流
                        this.data.hashTimer = setTimeout(() => {
                            const data = JSON.stringify(this.data.hashList);
                            this.handlerViewTrack(JSON.parse(data));
                            this.data.hashList = [];
                        }, 500);
                    }
                });
            },
        });
        this.ob.connect();
    },
    // 神策曝光埋点
    handlerViewTrack(value) {
        const { pageList, moduleTypeMap } = this.data;
        value.map((item) => {
            let ind1 = parseInt(item.split("-")[0]);
            let ind2 = parseInt(item.split("-")[1]);
            const checkInd1 = typeof ind1 == "number" && ind1 >= 0;
            const checkInd2 = typeof ind2 == "number" && ind2 >= 0;
            if (checkInd1 && checkInd2) {
                let row = pageList[ind1][ind2];
                let type = row.module_type;
                const moduleType = moduleTypeMap[type] || "";
                if (row && typeof row == "object") {
                    app.kksaTrack("CommonItemImp", {
                        CurPage: "小程序福利页",
                        TabModuleType: moduleType,
                        ContentName: row.title,
                    });
                }
            }
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, recMap }) => {
        return { userInfo, follows, recMap };
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
        clearFollow() {
            setState({ follows: {} });
        },
    })
)(page);

Page(ConnectPage);
