const { util_request, util_action } = require('../../../../util');
const app = getApp();
const global = app.globalData;
Component({
    data: {
        operationList: [],
    },

    attached() {
        this.getOperation();
    },

    methods: {
        getOperation() {
            const channel = global.channel;
            util_request({
                method: 'get',
                url: `/v1/business/mini/${channel}/operation/bookshelf/get`,
                data: {
                    banner_type: 1,
                },
            }).then((res) => {
                const { data } = res;
                const { banners } = data;

                this.impTrack(banners[0]);
                this.setData({
                    operationList: banners,
                });
            });
        },

        bannerTap(e) {
            const { index = 0 } = e.currentTarget.dataset;
            const { operationList = [] } = this.data;
            const item = operationList[index];
            const { action_protocol = {} } = item.button || {};
            const { action_type: type, target_id: id, parent_target_id: parentid } = action_protocol;
            const url = action_protocol.target_web_url || action_protocol.hybrid_url || '';

            app.kksaTrack('CommonItemClk', {
                BannerID: item.id,
                CurPage: '漫画详情页',
                TabModuleType: '漫画页底部banner',
            });

            util_action({ type, id, parentid, url });
        },

        swiperChange(e) {
            const { current } = e.detail;
            const { operationList = [] } = this.data;
            const item = operationList[current];
            this.impTrack(item);
        },

        impTrack(item) {
            if (item && !item.tracked) {
                item.tracked = true;
                app.kksaTrack('CommonItemImp', {
                    BannerID: item.id,
                    CurPage: '漫画详情页',
                    TabModuleType: '漫画页底部banner',
                });
            }
        },
    },
});
