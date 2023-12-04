const app = getApp();
const { connect } = app.Store;
const api = require('./api');
const { videoImgs } = require('../../../cdn.js');
const { util_action, util_feSuffix } = require('../../../util.js');

const page = {
    data: {
        videoImgs,
        navList: api.getNavList(),
        navIndex: 0,

        videoList: [],

        loading: false,
        finished: false,
    },

    onLoad() {
        this.getData();

        app.kksaTrack('CommonPageOpen', {
            CurPage: '漫剧分类页',
        });
    },

    getData() {
        if (this.data.finished || this.data.loading) return;
        const { navList, navIndex } = this.data;
        const category = navList.find((item, index) => index === navIndex).title;

        this.setData({ loading: true });
        api.getCategoryList({
            category: encodeURIComponent(category),
        }).then((res) => {
            const { data } = res;
            let { list } = data;

            list = list.map((item) => {
                let labels = item.labels.filter((item) => item.text) || [];
                return {
                    id: item.id || '',
                    title: item.title || '',
                    subtitle: item.categories || '',
                    cover_url: util_feSuffix({ src: item.vertical_image_url, width: 750, quality: 'h' }) || '',
                    labels: labels ? labels.slice(0, 1) : [],
                };
            });
            this.setData({
                videoList: list,
                loading: false,
            });
        });
    },

    classHandler(e) {
        const { index } = e.currentTarget.dataset;
        const { navList } = this.data;

        app.kksaTrack('ClickButton', {
            CurPage: '漫剧分类页',
            ButtonName: navList[index].title,
        });

        index !== this.data.navIndex &&
            this.setData(
                {
                    navIndex: index,
                },
                () => {
                    this.getData();
                }
            );
    },

    routeVideo(e) {
        const { index } = e.currentTarget.dataset;
        const { videoList } = this.data;

        const { id } = videoList[index];
        const type = 2009;
        const target_id = id;

        util_action({ type, parentid: target_id });
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
