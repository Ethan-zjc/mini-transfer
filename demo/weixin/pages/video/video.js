import { getHomePage } from "./api.js";

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

const page = {
    data: {
        isLogin: false,
        isLoading: true,
        pageIndex: 1,
        pageList: [],
        finished: false,
        coldBoot: 1,
        count: 4,
        origin: "小程序漫剧页",
    },
    async onLoad() {
        await app.getOpenId();
        await app.getGender();
        this.refreshData();
    },
    onShow() {
        app.kksaTrack("CommonPageOpen", {
            CurPage: this.data.origin,
        });
        this.refreshCheck();
    },
    onShareAppMessage() {},
    onPullDownRefresh() {
        this.refreshData(() => {
            wx.stopPullDownRefresh();
        });
    },
    onReachBottom() {
        this.getMainInfo();
    },
    refreshData(cb) {
        wx.pageScrollTo({
            scrollTop: 0,
            duration: 0,
        });
        this.setData({
            finished: false,
        });
        this.data.pageIndex = 1;
        this.getMainInfo(cb);
    },
    refreshCheck() {
        if (global.refreshPage && global.refreshPage.videoPage) {
            global.refreshPage.videoPage = false;
            this.refreshData();
        }
    },
    getMainInfo(callback) {
        const { isLoading, coldBoot, count, pageIndex, finished } = this.data;
        if (!isLoading || finished) {
            return false;
        }
        const options = {
            cold_boot: coldBoot,
            page: pageIndex,
            count,
        };
        this.data.isLoading = false;
        this.data.coldBoot = 0;
        getHomePage(options)
            .then((res) => {
                const { code, data = {} } = res;
                const modules = data.infos || [];
                this.data.isLoading = true;
                this.data.pageIndex = pageIndex + 1;

                if (modules.length <= 0 && this.data.pageIndex > 1) {
                    this.setData({ finished: true });
                    return false;
                }

                if (code == 200) {
                    this.formatListData(modules);
                }

                this.setData({ finished: false });

                callback && callback();
            })
            .catch(() => {
                this.data.isLoading = true;
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
            item.banner_list = item.banner_list || [];
            item.uuid = `${Date.now().toString(36)}_${item.module_type}_${Math.random().toString(36)}`;

            // 轮播图模块
            if (item.module_type == 13) {
                pageList.push(item);
            }

            // 入口模块
            if (item.module_type == 2) {
                item.banner_list = item.banner_list.slice(0, 3);
                pageList.push(item);
            }

            // 漫剧6图模块 show_style_type： 展示ui类型 1-查看更多 2-横滑
            if (item.module_type == 14) {
                item.show_style_type = item.show_style_type || 0;
                // 男女作品模块
                if (item.show_style_type == 1) {
                    item.banner_list = item.banner_list.slice(0, 6);
                    pageList.push(item);
                }
                // kkb/vip模块
                if (item.show_style_type == 2) {
                    item.banner_list = item.banner_list.slice(0, 30);
                    pageList.push(item);
                }
            }
        });
        if (this.data.pageIndex <= 2) {
            this.setData({
                pageList: [pageList],
            });
        } else {
            this.setData({
                pageList: [...this.data.pageList, pageList],
            });
        }
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
