/**
 * 自定义顶部导航
 * @param {String} mode：模式选择，可选dark/light;
 * dark：深色模式（文字和图标是白色）light：浅色模式（文字和图标是黑色）
 */

import { util_prevPage } from '../../util.js';

const global = getApp().globalData;
const computedBehavior = require('miniprogram-computed');
const { cdnIconsImgs } = require('../../cdn.js');

Component({
    behaviors: [computedBehavior],
    data: {
        height: 32,
        top: 26,
        left: 10,
        cdnIconsImgs,
    },
    properties: {
        title: {
            type: String,
            value: '',
        },
        mode: {
            type: String,
            value: 'light',
        },
    },
    computed: {
        color(data) {
            const { mode } = data;
            return mode == 'dark' ? '#fff' : '#333';
        },

        icon(data) {
            const { mode } = data;
            return `arrow-left-${mode == 'dark' ? 'white' : 'black'}`;
        },
    },
    attached() {
        if (!wx.getMenuButtonBoundingClientRect) {
            return;
        }
        const menuButton = wx.getMenuButtonBoundingClientRect();
        this.setData({
            height: menuButton.height,
            top: menuButton.top + 1,
            left: global.systemInfo.screenWidth - menuButton.left - menuButton.width,
        });
    },
    methods: {
        async navigateBack() {
            if (await this.pagePress()) {
                return;
            }
            const { name } = util_prevPage();
            if (name) {
                wx.navigateBack({ delta: 1 });
            } else {
                wx.reLaunch({ url: '/pages/find/find' });
            }
        },
        pagePress() {
            const pages = getCurrentPages();
            const curPage = pages[pages.length - 1];
            return curPage.navigateBackPress && curPage.navigateBackPress();
        },
    },
});
