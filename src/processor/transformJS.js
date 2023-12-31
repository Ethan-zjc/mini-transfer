/**
 * 转换JS代码(可能涉及的wxs、sjs等小程序自定义脚本语言转换，暂时不涉及，留入口)
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';

const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const t = require('@babel/types');
const { getContent, saveFile, getFiles, formatContent } = require('../utils/index');
// const constant = require('../config/constant');
const { get } = require('lodash');
const temp = {};
const { log } = console;

/**
 * 对文件中使用sjs语法的转换
 *
 * @param {Object} context 函数上下文
 */
exports.transformJS = async function (context) {
    const { js: jsConfig, suffixMapping: suffix } = context.rules;
    const files = await getFiles(context.toPath, suffix.script);

    const promise = files.map(async (file) => {
        const content = await getContent(file);
        let code = content.replace(/module\.exports\s*?=|export default\s*?/, jsConfig.export);
        try {
            code = exports.transformJSContent(code, jsConfig);
        } catch (err) {
            log(file + '转换有问题');
        }
        code = await formatContent(code);
        await saveFile(file, code);
        // 更新进度
        global.emitter.emit('event', { statue: false, type: context.type, fileType: 'JS' });
    });

    await Promise.all(promise);
};

function isAopBlock(path, block, AOP, cb) {
    t.isExpressionStatement(block) &&
        t.isCallExpression(block.expression) &&
        t.isMemberExpression(get(block, 'expression.callee')) &&
        get(block, 'expression.callee.property.name') === 'after' &&
        cb(path, block, AOP);
}

function isOriginBlock(block, AOP, cb) {
    t.isExpressionStatement(block) &&
        t.isCallExpression(block.expression) &&
        t.isIdentifier(get(block, 'expression.callee')) &&
        cb(block, AOP);
}

function save(path, block, AOP, index) {
    AOP.forEach((aopName) => {
        if (get(block, 'expression.callee.object.name') === aopName) {
            get(block, 'expression.arguments').forEach((arg) => {
                arg.properties.forEach((obj) => {
                    if (t.isObjectProperty(obj) && get(obj, 'key.name') === 'methods') {
                        temp[aopName] = get(obj.value.properties);
                    }
                });
            });
            path.get('body')[index].get('expression').remove();
        }
    });
}

/**
 * AOP 规则转换
 *
 * @param {Object} content 文件的内容
 * @param {Object} jsConfig js的配置规则
 */
exports.transformJSContent = function transformJSContent(content, jsConfig) {
    const result = parse(content, {
        sourceType: 'module',
        plugins: [],
    });

    const _AOP = jsConfig.AOP;
    if (_AOP) {
        traverse(result, {
            Program: {
                // enter获取after内容
                enter(path) {
                    get(path, 'node.body').forEach((block) => {
                        isAopBlock(path, block, _AOP, save);
                    });
                },
                // exit合并after内容
                exit(path) {
                    get(path, 'node.body').forEach((block) => {
                        isOriginBlock(block, _AOP, exports.merge);
                    });
                },
            },
        });
    }

    const generateResult = generate(result, {});
    return generateResult.code;
};

exports.merge = function (block, AOP) {
    AOP.forEach((item) => {
        if (get(block, 'expression.callee.name') !== item) {
            return;
        }
        get(block, 'expression.arguments').forEach((arg) => {
            if (!t.isObjectExpression(arg)) {
                return;
            }
            temp[item] &&
                temp[item].forEach((cont, index) => {
                    arg.properties.forEach((obj) => {
                        if (get(obj, 'key.name') !== get(cont, 'key.name')) {
                            return;
                        }
                        const blockBody = t.blockStatement(get(cont, 'body.body'));
                        get(obj, 'body.body').push(blockBody);
                        temp[item].splice(index, 1);
                    });
                });
            arg.properties = arg.properties.concat(temp[item]);
        });
    });
};
