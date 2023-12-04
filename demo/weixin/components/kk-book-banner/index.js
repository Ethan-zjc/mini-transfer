/**
 * 书架页运营位
 * **/
const app = getApp();

import { util_action, util_showToast } from "../../util.js";
import { getBookBannerApi } from "./api.js";

Component({
    properties: {},
    data: {
        isShow: false, // 接口返回的是否显示悬浮框
        activities: [],
        bannerState: {}, // 记录轮播图曝光状态，每次冷启动曝光一次
    },
    pageLifetimes: {
        show() {
            // 每次show重新拉取数据
            this.showInit();
        },
    },
    methods: {
        showInit() {
            getBookBannerApi()
                .then((res) => {
                    res = res || {};
                    let { banners = [] } = res.data;
                    if (banners.length) {
                        this.setData({
                            isShow: true,
                            bannerState: {},
                            activities: banners,
                        });

                        // 回调方法, 父页面修改吸顶距离
                        this.triggerEvent("bannerShowEvent");

                        // 默认第一个数据曝光
                        this.data.bannerState[0] = true;
                        this.bookBannerReport(0, 0);
                    }
                })
                .catch((err) => {
                    util_showToast({
                        title: err.message || "服务异常",
                        duration: 3000,
                    });
                });
        },
        swiperAnimationFinish(e) {
            const { current } = e.detail;
            if (!this.data.bannerState[current]) {
                this.data.bannerState[current] = true;
                this.bookBannerReport(0, current);
            }
        },
        bannerTap(e) {
            const { index } = e.currentTarget.dataset;
            const { action_protocol = {} } = this.data.activities[index].button;
            const { action_type: type, target_id: id, parent_target_id: parentid } = action_protocol;
            const url = action_protocol.target_web_url || action_protocol.hybrid_url || "";
            this.bookBannerReport(1, index);
            util_action({ type, id, parentid, url });
        },

        // 埋点内容
        bookBannerReport(behavior, index) {
            // behavior 0-曝光 1-点击
            const { activities } = this.data;
            const data = {
                CurPage: "BookshelfPage",
                TabModuleType: "书架banner模块",
                ContentName: activities[index].title,
                ContentID: activities[index].id,
            };
            console.log("埋点要上报的内容", behavior, data);
            app.kksaTrack(behavior ? "CommonItemClk" : "CommonItemImp", data);
        },
    },
});
