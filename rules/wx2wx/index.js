/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';
const api = require('./api');

module.exports = {
    suffixMapping: {
        view: 'wxml',
        css: 'wxss',
        script: 'wxs',
        npm: 'miniprogram_npm',
    },
    api,
    view: {},
    css: {},
    js: {},
    json: {},
    component: {},
    appType: 'wx',
};
