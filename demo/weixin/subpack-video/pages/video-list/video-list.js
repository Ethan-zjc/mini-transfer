const app = getApp();
const { connect } = app.Store;
const api = require("./api");
const { videoImgs } = require("../../../cdn.js");
const { util_action, util_checkVipInfo } = require("../../../util.js");

const page = {
    data: {
        videoImgs,
        since: 0,
        limit: 20,

        moduleId: 0,
        videoList: [],
        isVip: true,
    },
    onLoad(options) {
        this.data.moduleId = options.module_id || 0;
    },

    onShow() {
        this.data.since = 0;
        this.getData();

        util_checkVipInfo(this, (vipInfo) => {
            this.setData({ isVip: !!vipInfo.vip_type });
        });
    },

    getData() {
        const { since, limit, moduleId } = this.data;
        api.getVideoList({
            module_id: moduleId,
            since,
            limit,
        }).then((res) => {
            const { data } = res;
            let { infos, since, title = "" } = data;
            infos = infos.map((item) => {
                return {
                    id: item.id || 0,
                    title: item.title || "",
                    cover_url: item.vertical_image_url || "",
                    subtitle: item.categories || "",
                    favourite: !!item.favourite,
                };
            });

            wx.setNavigationBarTitle({
                title,
            });

            this.setData({
                videoList: infos,
                since,
                loading: false,
                finished: infos.length < limit,
            });
        });
    },

    routeVip() {
        util_action({ type: 44 });
    },

    routeVideo(e) {
        const { index } = e.currentTarget.dataset;
        const { videoList } = this.data;
        const videoInfo = videoList[index];
        const id = videoInfo.id;
        const type = 2009;

        util_action({ type, id });
    },
};

const ConnectPage = connect(
    ({ userInfo, pageTrigger, vipInfo }) => {
        return {
            userInfo,
            pageTrigger,
            vipInfo,
        };
    },
    (setState, _state) => ({
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
    })
)(page);

Page(ConnectPage);
