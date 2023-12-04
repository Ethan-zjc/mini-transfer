/**
 * view视图内容解析为ast
 * @file 视图内容解析为ast
 */

'use strict';

const { isArray } = require('lodash');
const FAKE_ROOT = Symbol.for('fake-root');
const { getHtmlParser } = require('./tools');

module.exports = function parse(options) {
    options = options || {
        xmlMode: false,
        lowerCaseAttributeNames: false,
        recognizeSelfClosing: true,
        lowerCaseTags: false,
    };
    this.Parser = parser;

    function parser(doc) {
        const { htmlParser, handler } = getHtmlParser(options);
        htmlParser.end(doc);
        return {
            type: 'tag',
            name: FAKE_ROOT,
            attribs: {},
            children: isArray(handler.dom) ? handler.dom : [handler.dom],
        };
    }
};
