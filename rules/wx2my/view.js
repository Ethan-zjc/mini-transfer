/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';

module.exports = {
    boolAttr: ['a:if', 'a:elif'],

    selfClosingTag2EndTag: ['image'],
    brackets: ['a:if', 'a:elif', 'a:for'],
    src: {
        regExp: /\.wxml$/i,
        replace: '.axml',
    },
    data: {
        // 把data数据添加{}
        regExp: /^{{(.*)}}$/,
        replace: '{{$1}}',
    },
    script: {},
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
