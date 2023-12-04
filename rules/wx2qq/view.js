/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';

module.exports = {
    boolAttr: ['wx:if', 'wx:elif'],

    selfClosingTag2EndTag: ['image'],
    brackets: ['wx:if', 'wx:elif', 'wx:for'],
    src: {
        regExp: /\.wxml$/i,
        replace: '.wxml',
    },
    data: {
        // 把data数据添加{}
        regExp: /^{{(.*)}}$/,
        replace: '{{$1}}',
    },
    script: {
        oldTagName: 'wxs',
        newTagName: 'import-sjs',
        oldFileJsSuffix: 'wxs',
        newFileJsSuffix: 'sjs',
        wxExport: 'module.exports',
        swanExport: 'export default',
        regExp: /module.exports[\s]*=/,
    },
    bindData: {
        'scroll-view': ['scroll-top', 'scroll-left', 'scroll-into-view'],
        input: ['value'],
        textarea: ['value'],
        'movable-view': ['x', 'y'],
        slider: ['value'],
    },
    bindDataBracket: {
        regExp: /^{{(.*)}}$/,
        replace: '{=$1=}',
    },
};
