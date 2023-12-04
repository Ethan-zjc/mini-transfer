/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';
const api = require('./api');
const view = require('./view');
const css = require('./css');
const js = require('./js');
const json = require('./json');
const component = require('./component');

module.exports = {
    suffixMapping: {
        view: 'axml',
        css: 'acss',
        script: 'js',
        npm: 'node_modules',
    },
    api,
    view,
    css,
    js,
    json,
    component,
    appType: 'my',
};
