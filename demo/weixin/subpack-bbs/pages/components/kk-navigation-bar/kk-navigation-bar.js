/**
 * 自定义导航栏
 */
import { global, prevPage } from "../../common/subapp";

Component({
    data: {
        navHeight: 32,
        navTop: 26,
        navBottom: 6,
    },
    properties: {
        title: {
            type: String,
            value: "",
        },
        background: {
            type: String,
            value: "rgba(255, 255, 255, 1)",
        },
        delta: {
            type: Number,
            value: 1,
        },
    },
    attached() {
        // 系统信息不存在 || 获取不到胶囊信息
        let { systemInfo } = global,
            { screenWidth, windowWidth, statusBarHeight, screenHeight, windowHeight } = systemInfo;
        if (!systemInfo) {
            global.systemInfo = wx.getSystemInfoSync();
            return;
        } else {
            let rect = {};
            try {
                rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
                if (rect === null) {
                    throw "getMenuButtonBoundingClientRect error";
                }
                // 取值为0的情况  有可能width不为0 top为0的情况
                if (!rect.width || !rect.top || !rect.left || !rect.height) {
                    throw "getMenuButtonBoundingClientRect error";
                }
            } catch (error) {
                // 当获取不到胶囊位置信息时，执行默认数据
                let width = 96,
                    { navBottom } = this.data;
                if (systemInfo.platform === "android") {
                    width = 96;
                } else {
                    width = 88;
                }
                if (!statusBarHeight) {
                    statusBarHeight = screenHeight - windowHeight - 20;
                }
                rect = {
                    bottom: statusBarHeight + navBottom + 32,
                    height: 32,
                    left: windowWidth - width - 10,
                    right: windowWidth - 10,
                    top: statusBarHeight + navBottom,
                    width,
                };
            }

            // 设置导航值
            const viewWidth = screenWidth && windowWidth ? Math.min(...[screenWidth, windowWidth]) : 375;
            this.setData(
                {
                    navHeight: rect.height,
                    navTop: rect.top + 1,
                    innerWidth: rect.left,
                    contentWidth: viewWidth - (viewWidth - rect.left) * 2,
                    innerPadding: `${viewWidth - rect.right}px`,
                },
                () => {
                    const { navHeight, navTop, navBottom } = this.data;
                    this.triggerEvent("navHeightFun", { height: navHeight + navTop + navBottom });
                }
            );
        }
    },
    methods: {
        // 返回发现首页
        goHome() {
            wx.reLaunch({ url: "/pages/find/find" });
        },
        // 判断是否有上一层，无上一页面栈，返回首页
        back() {
            const { name } = prevPage();
            if (name) {
                wx.navigateBack({ delta: this.data.delta });
                this.triggerEvent("back", { delta: this.data.delta });
            } else {
                this.goHome();
            }
        },
    },
});
