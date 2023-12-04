/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';

const isArray = require('lodash/isArray');
const path = require('path');
const unified = require('unified'); // 通用的AST处理工具
const DepGraph = require('dependency-graph').DepGraph;
const {
    getContent,
    getContentSync,
    getHtmlParser,
    saveFile,
    getFiles,
    toVFile,
    parse,
    stringify,
    wxmlTo,
    envView,
} = require('../utils/index');
const contextStore = require('../log/store.js');
const { htmlParser, handler } = getHtmlParser();
const { get } = require('lodash');

/**
 * 构造视图到被修改名称的自定义组件的依赖树
 *
 * @param {Array.<string>} files 视图文件集合
 * @param {Object} context 转化工具上下文
 * @return {Object}
 */
function getComponentsDeps(files) {
    // if (context.type === constant.SWAN_TO_WECHAT) return;

    const swanDependencyGraph = files.reduce((graph, file) => {
        graph.addNode(file);
        htmlParser.end(getContentSync(file));
        const tree = handler.dom;
        buildGraph(tree, graph, file);
        htmlParser.reset();
        return graph;
    }, new DepGraph());

    return (
        Object.keys(contextStore.usingComponentsMap || {})
            // 有使用自定义组件、且有不合法自定义组件名称的swan文件，主要包括页面和自定义组件
            .map((key) => {
                return key.replace(/\.json$/, '.swan');
            })
            .filter((file) => swanDependencyGraph.hasNode(file))
            // 找出页面和自定义组件视图依赖的所有视图
            .map((file) => ({
                file: file,
                deps: swanDependencyGraph.dependenciesOf(file),
            }))
            // 找出页面、自定义组件视图以及以上两者使用的视图文件使用的被改名的自定义组件map
            .reduce((prev, { file, deps }) => {
                const jsonFileName = file.replace(/\.swan/, '.json');
                const renamedMap = contextStore.usingComponentsMap[jsonFileName] || {};
                deps.forEach(
                    (dep) => (prev[dep] = prev[dep] ? { ...prev[dep], ...renamedMap } : renamedMap)
                );
                prev[file] = renamedMap;
                return prev;
            }, {})
    );
}

/**
 * 转换视图
 *
 * @param {Object} context 转换上下文
 */
exports.transformView = async function (context) {
    const suffix = get(context, 'rules.suffixMapping.view');
    const files = await getFiles(context.toPath, suffix);

    // TODO 给view真正转换组件标签时使用 src/view/wxmlTo.js
    contextStore.dispatch({
        action: 'renamedComponents',
        payload: getComponentsDeps(files),
    });

    await Promise.all(
        files.map(async (file) => {
            const content = await getContent(file);
            const result = await exports.transformViewContent(file, content, context);
            await saveFile(file, String(result));

            // 更新进度
            global.emitter.emit('event', { statue: false, type: context.type, fileType: 'VIEW' });
        })
    );
};

/**
 * 构造一个视图文件节点的依赖图
 *
 * @param {Object} tree 视图树
 * @param {DepGraph} graph 视图文件依赖图
 * @param {string} from 视图文件节点
 */
function buildGraph(tree, graph, from) {
    if (!isArray(tree)) {
        const { type, name, attribs, children = [] } = tree;
        if (type === 'tag' && (name === 'import' || name === 'include') && attribs.src) {
            let dep = path.resolve(path.dirname(from), attribs.src);
            dep = dep.replace(/\.wxml/, '.swan');
            dep = dep.endsWith('.swan') ? dep : `${dep}.swan`;
            graph.addNode(dep);
            graph.addDependency(from, dep);
        }
        buildGraph(children, graph, from);
        return;
    }
    tree.forEach((node) => buildGraph(node, graph, from));
}

/**
 * 转换一个视图文件
 *
 * @param {string} path 文件路径
 * @param {string} contents 文件内容
 * @param {Object} context 上下文
 * @return {Promise.<VFile>}
 */
exports.transformViewContent = function transformViewContent(path, contents, context) {
    const file = toVFile(path, contents, context);
    const isWx2Wx = context.type === context.constant.WECHAT_TO_WECHAT;
    const transform = isWx2Wx ? envView : wxmlTo;

    // 当调用unified()并链式调用.use()方法时，首先创建一个unified处理流程，并逐个添加插件。

    // parse: 第一个.use(parse)插件用于解析输入的文件。这个插件会将输入的文本或文件解析为抽象语法树（AST）或其他中间表示。这个阶段通常用于将文本转换为统一的数据结构以供后续处理。

    // transform: 第二个.use(transform, context)插件对解析后的 AST 进行转换。这个阶段是对解析后的中间表示进行修改、转换或应用各种处理逻辑的过程。传递的context参数是用于插件处理过程中的上下文信息。

    // stringify: 最后一个.use(stringify, { context })插件用于将经过转换处理后的 AST（或中间表示）重新转换回文本形式。这个阶段通常用于将处理后的数据重新转换为所需的输出格式。

    // 最后，.process(file)方法会应用整个处理流程到给定的file，它会按照添加插件的顺序依次对输入的文件进行解析、转换和重新转换为文本，并返回最终的处理结果
    return unified().use(parse).use(transform, context).use(stringify, { context }).process(file);
};
