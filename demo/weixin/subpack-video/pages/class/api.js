import { util_request } from '../../../util.js';
const app = getApp();
const global = app.globalData;

function getCategoryList({ category = '' } = {}) {
    const url = `/mini/v1/comic/${global.channel}/comic_video/list_by_category`;
    const method = 'get';
    const data = { category };

    return util_request({
        url,
        method,
        data,
    });
}

function getNavList() {
    return [
        // { title: "甜宠" },
        { title: '古风' },
        // { title: "爱情纠葛" },
        { title: '搞笑' },
        { title: '穿越' },
        { title: '剧情' },
        { title: '青春' },
        // { title: "奇幻元素" },
        { title: '逆袭' },
        // { title: "青春懵懂" },
        { title: '治愈' },
        // { title: "总裁" },
        // { title: "奇幻世界" },
        // { title: "欢喜冤家" },
        { title: '大女主' },
        { title: '重生' },
        { title: '热血' },
        { title: '冒险' },
        // { title: "跨种族恋" },
        // { title: "虐恋" },
    ];
}

module.exports = {
    getNavList,
    getCategoryList,
};
