/**
 * 转换项目api、和代码适配
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';

const { isArray, isFunction } = require('lodash');
const { parse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;
const { getContent, saveFile, getFiles, formatContent } = require('../utils/index');

/**
 * 转换小程序中的 API 调用
 *
 * @param {Object} context  转换上下文
 */
exports.transformApi = async function (context) {
    const files = await getFiles(context.toPath, 'js');
    context.log.info({
        progress: '[START] transforming api',
        files,
    });

    const promise = files.map(async (file) => {
        let code = await exports.transformApiContent(file, context);
        code = await formatContent(code);
        await saveFile(file, code);
    });

    await Promise.all(promise);
};

exports.transformApiContent = async function transformApiContent(file, context) {
    const content = await getContent(file);
    const api = context.rules.api;

    const result = parse(content, {
        sourceType: 'module',
        plugins: [
            'asyncGenerators',
            'bigInt',
            'classProperties',
            'classPrivateProperties',
            'classPrivateMethods',
            ['decorators', { decoratorsBeforeExport: false }],
            'doExpressions',
            'dynamicImport',
            'exportDefaultFrom',
            'exportNamespaceFrom',
            'functionBind',
            'functionSent',
            'importMeta',
            'logicalAssignment',
            'nullishCoalescingOperator',
            'numericSeparator',
            'objectRestSpread',
            'optionalCatchBinding',
            'optionalChaining',
            'partialApplication',
            ['pipelineOperator', { proposal: 'minimal' }],
            'throwExpressions',
            'topLevelAwait',
        ],
    });

    // 转换api接口
    traverse(result, executeHooks(api.babelPlugins, { context, file }));

    const generateResult = generate(result, {});
    return generateResult.code;
};

/**
 * 构造babel函数的hooks
 *
 * @param {Object} babelPlugins所有插件函数
 */
function executeHooks(babelPlugins, context) {
    const hooks = {};
    for (const type in babelPlugins) {
        hooks[type] = function (path) {
            executePlugin(babelPlugins[type], { path, ...context });
        };
    }
    return hooks;
}

/**
 * 执行所有的数组函数
 *
 * @param {Array} arr 所有babel插件的集合
 * @param {Object} option 插件执行所需参数
 */
function executePlugin(arr, option) {
    if (!isArray(arr) && !!arr.length) {
        return;
    }
    arr.forEach((fun) => {
        isFunction(fun) && fun(option);
    });
}
