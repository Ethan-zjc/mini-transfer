/*
 发现页banner模块
 */

Component({
    properties: {
        carouselData: {
            type: Object,
            value: {},
        },
        bannerState: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        autoPlay: true, // 是否自动播放
        bannerRatio: true, // 轮播图曝光状态
        bannerHis: {}, // 轮播图曝光记录
        bannerCurrent: 0, // 当前轮播图索引
    },
    observers: {
        bannerState: function (value) {
            if (value) {
                this.data.bannerHis = {};
            }
        },
    },
    attached() {
        this.handlerSwiper();
    },
    pageLifetimes: {
        show() {
            this.setData({
                autoPlay: true,
            });
        },
        hide() {
            this.setData({
                autoPlay: false,
            });
        },
    },
    methods: {
        subnavTap(event) {
            let eventName = "onSubnavTap";
            let dataset = event.currentTarget.dataset;
            this.triggerEvent(eventName, dataset, { bubbles: true });
        },
        // 轮播图曝光状态
        handlerSwiper() {
            if (this.carousel) {
                this.carousel.disconnect();
            }
            this.carousel = wx.createIntersectionObserver(this);

            this.carousel
                .relativeToViewport({
                    top: -50,
                })
                .observe(".carousel-observe", (res) => {
                    const ratio = res.intersectionRatio || 0;
                    const isTrigger = ratio > 0;
                    this.data.bannerRatio = isTrigger;
                    if (isTrigger) {
                        this.bannerWatch();
                    }
                });
        },
        // 轮播图切换回调
        subnavFinish(e) {
            const { current } = e.detail;
            const { bannerRatio, bannerHis } = this.data;
            const { carouselData } = this.properties;
            this.setData({
                bannerCurrent: current,
            });
            if (bannerRatio && carouselData.banner_list && !bannerHis[current]) {
                const row = carouselData.banner_list[current];
                if (row && row.id) {
                    this.data.bannerHis[current] = true;
                    this.bannerTrack({
                        current,
                    });
                }
            }
        },
        // 轮播图曝光初始化
        bannerWatch() {
            this.subnavFinish({
                detail: {
                    current: this.data.bannerCurrent,
                },
            });
        },
        // 轮播图神策埋点
        bannerTrack(options) {
            const { current } = options;
            this.triggerEvent("onBannerImp", {
                current,
            });
        },
    },
});
