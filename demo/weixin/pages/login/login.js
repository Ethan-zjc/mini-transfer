import { util_logout, util_showToast, util_logManager } from '../../util.js';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const { loginImgs } = require('../../cdn.js');

const page = {
    data: {
        navHeight: 32,
        navTop: 26,
        navBottom: 8,
        loginImgs,
    },
    onLoad() {
        const channel = global.channel;
        this.setData({
            channel,
            openContinuRead: wx.getStorageSync('openContinuRead') || false, // 是否开启连续阅读
            develop: !global.onRelease, // 判断是体验版&开发版&开发者工具（注意不是判断environment）
        });
        this.setNavigation();
        this.labelTrack();
    },
    setNavigation() {
        // 系统信息不存在 || 获取不到胶囊信息
        let { systemInfo } = global,
            { windowWidth, statusBarHeight, screenHeight, windowHeight } = systemInfo;
        if (!systemInfo) {
            getApp().globalData.systemInfo = wx.getSystemInfoSync();
        } else {
            let rect = {};
            try {
                rect = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
                if (rect === null) {
                    throw 'getMenuButtonBoundingClientRect error';
                }
                // 取值为0的情况  有可能width不为0 top为0的情况
                if (!rect.width || !rect.top || !rect.left || !rect.height) {
                    throw 'getMenuButtonBoundingClientRect error';
                }
            } catch (error) {
                // 当获取不到胶囊位置信息时，执行默认数据
                let width = 96,
                    { navBottom } = this.data; // 胶囊的宽度、间隙暂时不用会影响页面高度不利于长列表
                if (systemInfo.platform === 'android') {
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
            this.setData({
                navHeight: rect.height,
                navTop: rect.top + 1,
            });
        }
    },
    closePage() {
        const pages = getCurrentPages();
        if (pages.length == 1) {
            wx.switchTab({
                url: '/pages/my/my',
            });
        } else {
            wx.navigateBack({ delta: 1 });
        }
    },
    // 退出登录（仅测试环境
    logout() {
        util_logout();
        this.setUserInfo(null);
        wx.navigateBack({ delta: 1 });
    },
    // 切换环境（仅测试环境）
    switch() {
        const list = ['dev', 'stag', 'preview', 'prod'];
        const itemList = list.map((item) => {
            return item == global.environment ? item + '（当前）' : item;
        });
        wx.showActionSheet({
            itemList,
            success: ({ tapIndex }) => {
                const env = list[tapIndex];
                global.environment = env;
                util_showToast({ title: `切换到了${env}环境，已自动退出登录&冷启动` });
                util_logout();
                this.setUserInfo(null);
                util_showToast({
                    title: `正在切换至${env}环境\n将自动退出登录&冷启动`,
                    icon: '/images/radio-checked.png',
                    mask: true,
                });
                wx.setStorage({
                    key: 'environment',
                    data: env,
                });
                setTimeout(() => {
                    wx.reLaunch({ url: '/pages/my/my' });
                }, 1500);
            },
        });
    },

    // 清除缓存
    clearStorage() {
        wx.clearStorage({
            success() {
                util_showToast({
                    title: `清除缓存成功`,
                });
                setTimeout(() => {
                    wx.reLaunch({
                        url: '/pages/find/find',
                    });
                }, 1500);
            },
        });
    },

    // 切换阅读模式
    continuRead() {
        const { openContinuRead } = this.data;
        util_showToast({ title: `\n已${openContinuRead ? '关闭' : '开启'}续读模式`, mask: true });
        global.openContinuRead = !openContinuRead;
        wx.setStorage({
            key: 'openContinuRead',
            data: !openContinuRead,
        });
        this.setData({
            openContinuRead: !this.data.openContinuRead,
        });
    },

    // 清除挽留弹窗数据
    clearDetainmentData() {
        wx.setStorageSync('vipDetainmentListData', '[]');
        util_showToast({ title: '数据清除成功' });
    },

    // 验证选标签弹窗问题日志埋点
    labelTrack() {
        util_logManager({
            LogType: 'label',
            LogInfo: {
                login: true,
            },
        });
    },
};

const connectPage = connect(null, (setState) => ({
    setUserInfo(newVal) {
        setState({
            userInfo: newVal,
        });
    },
}))(page);

Page(connectPage);
