/**
 * tabbar页面统一行为，处理小红点逻辑
 * @warning 因为小红点显示/隐藏api只能在tabbar页面调用，可能在内页查询到小红点信息，到tabbar页面再调用的场景
 所以每次onShow都要配合global.reddot查询一次，书架页除了设置tabbar小红点，还要额外设置页面内tab的小红点
 */
import { util_isPage } from "../util.js";

const app = getApp();
const global = app.globalData;

module.exports = app.onBehaviors({
    onShow() {
        this.checkReddot();
    },
    pageLifetimes: {
        show() {
            this.checkReddot();
        },
    },
    methods: {
        checkReddot() {
            if (global.reddot) {
                wx.showTabBarRedDot({ index: 3 });
                if (util_isPage("my")) {
                    this.setData({ reddot: true });
                }
            } else {
                wx.hideTabBarRedDot({ index: 3 });
                if (this.data.reddot) {
                    this.setData({ reddot: false });
                }
            }
        },
    },
});
