/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';
const components = require('./component');

module.exports = {
    'app.json': ['prefetches'],
    components,
    'project.json': {
        miniprogramRoot: 'smartProgramRoot',
    },
};
