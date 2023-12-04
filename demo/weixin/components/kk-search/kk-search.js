/*
 * 自定义顶部搜索导航
 * 目前用于feed和find
 */
import { util_request } from "../../util.js";

const global = getApp().globalData;

Component({
    data: {
        height: 32,
        top: 26,
        left: 10,
        hotwords: [], // 热搜词轮播列表
        searchWord: "", // 关键搜索词
        current: 0, // 当前轮播下标
        autoplay: true, // 是否自动轮播
        isBackPage: false, // 是否是搜索返回页面
    },
    properties: {
        word: {
            type: String,
            value: "",
        },
        sheet: {
            type: Boolean,
            value: false,
        },
    },
    attached() {
        if (!wx.getMenuButtonBoundingClientRect) {
            return;
        }
        const menuButton = wx.getMenuButtonBoundingClientRect();
        const height = menuButton.height;
        this.setData({
            height,
            style: `line-height: ${height}px; width: ${menuButton.left}px; padding: ${menuButton.top + 1}px 24rpx 12rpx;`,
        });
        // 获取热搜词
        this.getHotwords();
    },
    pageLifetimes: {
        show() {
            let options = {
                autoplay: true,
            };
            if (this.data.isBackPage) {
                this.data.isBackPage = false;
                options.current = this.data.current < this.data.hotwords.length - 1 ? this.data.current + 1 : 0;
            }
            this.setData(options);
        },
        hide() {
            this.setData({
                autoplay: false,
            });
        },
    },
    methods: {
        routeSearch() {
            this.data.isBackPage = true;
            wx.navigateTo({
                url: `/pages/search/search?searchWord=${this.data.searchWord}`,
            });
        },
        // 禁止轮播手动上下滑动
        catchTouchMove() {
            return false;
        },
        // 监听轮播变化事件
        swiperChange(param) {
            let current = param.detail.current;
            this.setData({
                current,
                searchWord: this.data.hotwords[current].split("|")[0],
            });
        },
        // 获取热搜词
        getHotwords() {
            util_request({
                host: "search",
                url: "/search/mini/hot_word",
                data: {
                    page: 1,
                    size: 100,
                },
            }).then((res) => {
                let backhotword = res.hits.hot_word;
                let hotwords = [];
                for (let i = 0; i < backhotword.length; i++) {
                    if (i % 2 === 0) {
                        if (i + 1 < backhotword.length) {
                            backhotword[i].target_title += " | " + backhotword[i + 1].target_title;
                        }
                        hotwords.push(backhotword[i].target_title);
                    }
                }
                this.setData({
                    hotwords: hotwords.length > 0 ? hotwords : ["搜索作品名"],
                    searchWord: hotwords.length > 0 ? hotwords[0].split("|")[0] : "搜索作品名",
                });
            });
        },
    },
});
