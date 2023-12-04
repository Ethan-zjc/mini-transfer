const fs = require('fs-extra');
const os = require('os');
const mkdirp = require('mkdirp');
const path = require('path');
const vfile = require('vfile');
const glob = require('glob');
const log = require('../log/log');
const prettier = require('prettier');
const prettierJson = require('../config/prettier');
const { Parser, DomHandler } = require('stricter-htmlparser2');

// 文件夹是否为空
const isFolderEmpty = (folderPath) => {
    try {
        const files = fs.readdirSync(folderPath);
        return files.length === 0;
    } catch (error) {
        console.error('读取文件夹时出现错误:', error);
        return false;
    }
};

// 是文件,还是文件夹判断
const isDirectory = (filePath) => {
    try {
        const stats = fs.statSync(filePath);
        return stats.isDirectory();
    } catch (error) {
        console.error('获取文件/文件夹信息时出现错误:', error);
        return false;
    }
};

// 递归创建目录
const createDirectory = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// 读取目录下的所有文件和子目录
const readDirectory = (dirPath) => {
    return fs.readdirSync(dirPath, { withFileTypes: true });
};

// 复制文件
const copyFile = (source, destination) => {
    fs.copyFileSync(source, destination);
};

// 替换文件内容
const replaceContent = (filePath, replacePairs) => {
    let content = fs.readFileSync(filePath, 'utf-8');
    for (const [search, replace] of replacePairs) {
        content = content.replace(new RegExp(search, 'g'), replace);
    }
    fs.writeFileSync(filePath, content);
};

// 判断是win 环境还是 mac
const isWin = () => {
    const platform = os.platform();
    return /win\d+/gi.test(platform);
};

const saveLog = (ContentPath, con) => {
    return new Promise((resolve, reject) => {
        mkdirp(path.dirname(ContentPath), (err) => {
            if (err) {
                reject(err);
            } else {
                fs.writeFileSync(ContentPath, con);
            }
        });
    });
};

/**
 * 获取文件的类型
 *
 * @param {string} filePath 文件路径
 * @return {Object}  babel的类型对应的函数
 */
const getPlugins = (rulesPath) => {
    const types = [
        'MemberExpression',
        'CallExpression',
        'ObjectProperty',
        'StringLiteral',
        'ExpressionStatement',
        'ObjectMethod',
        'ImportDeclaration',
        'VariableDeclaration',
    ];
    const babelPlugins = {};

    types.map((type) => {
        const baseEnvPluginsPath = path
            .resolve(rulesPath, '../base/base-env-plugins', type, '*.js')
            .replace(/\\/g, '/');
        const basePluginsPath = path
            .resolve(rulesPath, '../base', type, '*.js')
            .replace(/\\/g, '/');
        const pluginsPath = path
            .resolve(rulesPath, './api/plugins', type, '*.js')
            .replace(/\\/g, '/');

        // 保证 baseEnvPluginsPath 在最后运行，保证 transformEnv.js 中改变节点类型不影响其他插件
        const allPlugins = [basePluginsPath, pluginsPath, baseEnvPluginsPath];

        let files = [];
        allPlugins.forEach((item) => {
            files = files.concat(glob.sync(item));
        });

        if (!files.length) {
            return;
        }
        babelPlugins[type] = files.map((plugin) => {
            return require(plugin);
        });
    });
    return babelPlugins;
};

/**
 * 判断是否为JSON
 *
 * @return {boolean}
 */
const isJSON = (target) => {
    return typeof target === 'object' && target.constructor === Object;
};

/**
 * JSON合并（递归深度合并）
 *
 * @param  {Object} 主对象
 * @param  {Object} 合并对象
 */
const mergeJSON = (main, minor) => {
    for (const key in minor) {
        if (main[key] === undefined) {
            main[key] = minor[key];
            continue;
        }
        // 不是Object 则以（a）为准为主，
        if (isJSON(main[key])) {
            mergeJSON(main[key], minor[key]);
        } else {
            main[key] = minor[key];
        }
    }
};

/**
 * 异步获取文件内容
 *
 * @param {string} path 文件路径
 * @returns {string}  文件内容
 */
const getContent = (path) => {
    return fs
        .readFile(path)
        .then((data) => data.toString())
        .catch((e) => {
            log.notice(e);
            return '';
        });
};

/**
 * 同步获取文件内容
 *
 * @param {string} path 文件路径
 * @returns {string}  文件内容
 */
const getContentSync = (path) => {
    return fs.readFileSync(path).toString();
};

/**
 * 格式化文件内容
 */
const formatContent = (code) => {
    // 使用 Prettier 格式化代码，并应用自定义配置
    return prettier.format(code, {
        ...prettierJson,
        parser: 'babel', // 使用 Babel 解析器（根据需要选择）
    });
};

/**
 * 保存文件
 *
 * @param {string} path 文件存储路径
 * @param {string} con 写入内容
 * @param {string} options 写入文件的参数
 * @returns {Object}
 */
const saveFile = (path, con, options) => {
    return fs.outputFile(path, con, options);
};

/**
 * object to json string
 *
 * @param {Object} obj
 * @return {string}
 */
const object2String = (obj) => {
    const cache = [];
    return JSON.stringify(
        obj,
        function (key, value) {
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // Circular reference found, discard key
                    return;
                }
                // Store value in our collection
                cache.push(value);
            }

            return value;
        },
        4
    );
};

/**
 * 替换文档后缀
 *
 * @param {string} filePath 文件路径
 * @param {string} contents 文件内容
 * @param {Object} context 上下文
 * @return {string} 处理后的文件
 */
const toVFile = (filePath, contents, context) => {
    const file = vfile({
        path: filePath,
        contents: contents,
    });
    const SUFFIX = {
        SWAN_HTML: 'swan',
        SWAN_CSS: 'css',
        WECHAT_CSS: 'wxss',
        WECHAT_HTML: 'wxml',
        JS_FILE: 'js',
        JSON_FILE: 'json',
    };
    const WECHAT_TO_SWAN = context.type === 'WECHAT_TO_SWAN';
    const RELATED = {
        style: WECHAT_TO_SWAN ? SUFFIX.SWAN_CSS : SUFFIX.WECHAT_CSS,
        view: WECHAT_TO_SWAN ? SUFFIX.SWAN_HTML : SUFFIX.WECHAT_HTML,
        js: SUFFIX.JS_FILE,
        config: SUFFIX.JSON_FILE,
    };

    const { cwd, dirname, stem, extname } = file;

    file.data.relatedFiles = Object.keys(RELATED).reduce((prev, type) => {
        const ext = `.${RELATED[type]}`;
        if (ext !== extname) {
            const filePath = path.resolve(cwd, dirname, stem + ext);
            // 判断路径是否存在
            fs.existsSync(filePath) && (prev[type] = filePath);
            prev[type] = filePath;
        }
        return prev;
    }, {});
    return file;
};

/**
 * 无请求头的css静态资源url添加https请求头
 *
 * @param {string} content 文件内容
 * @return {string} 处理后文件内容
 */
const transformCssStaticUrl = (content) => {
    content = content.replace(/url\((.*)\)/g, function ($1, $2) {
        if (!$2) {
            return $1;
        }
        const res = $2.replace(/^(['"\s^]?)(\/\/.*)/, function ($1, $2, $3) {
            return `${$2}https:${$3}`;
        });
        return `url(${res})`;
    });
    return content;
};

/**
 * 获取parser和handler
 *
 * @param {Object} options Parser函数的参数
 * @returns {Object} DomHandler的实例和 Parser 的实例
 */
const getHtmlParser = (options) => {
    options = options || {
        xmlMode: false,
        lowerCaseAttributeNames: false,
        recognizeSelfClosing: true,
        lowerCaseTags: false,
    };
    const handler = new DomHandler();
    const htmlParser = new Parser(handler, options);
    return {
        htmlParser,
        handler,
    };
};

/**
 * 获取对象方法调用成员表达式中的方法名称
 *
 * @param {Object} node traverse节点
 */
const getNodeMethodName = (node) => {
    if (node.callee) {
        const type = node.callee.type;
        if (type === 'MemberExpression') {
            return node.callee.property.name;
        }
    } else {
        const stringLiteralMethod = node.property.value;
        const identifierMethod = node.property.name;
        return node.property.type === 'StringLiteral' ? stringLiteralMethod : identifierMethod;
    }
};

/**
 * 获取文件的类型
 *
 * @param {string} filePath 文件路径
 * @return {string}  返回文件类型
 */
const getFileType = (filePath) => {
    if (/\.(swan|wxml)$/.test(filePath)) {
        return 'view';
    }
    if (/\.(css|wxss)$/.test(filePath)) {
        return 'css';
    }
    if (/\.(wxs|sjs|js)$/.test(filePath)) {
        return 'script';
    }
    if (/\.(json)$/.test(filePath)) {
        return 'json';
    }
    return null;
};

/**
 * 获取指定 suffix name 的 file
 *
 * @param {string} disk 文件夹路径
 * @param {string} suffix 文件后缀名称
 */
const getFiles = async (dist, suffix) => {
    let filePath = `${dist}/**/*.${suffix}`;

    filePath = filePath.replace(/\\/g, '/');
    return glob.sync(filePath, {
        ignore: [
            '**/pass_utils/**',
            '**/pass_requestapi/**',
            '**/wx2_log/**',
            '**/package.json',
            '**/package-lock.json',
            '**/node_modules/**',
        ],
    });
};

/**
 * 判断是否为 json
 *
 * @param {string}
 */
const isJsonStr = (str) => {
    try {
        const obj = JSON.parse(str);
        return !!obj && typeof obj === 'object';
    } catch (e) {
        // console.log(e);
    }
    return false;
};

module.exports = {
    isDirectory,
    isFolderEmpty,
    createDirectory,
    readDirectory,
    copyFile,
    replaceContent,
    isWin,
    saveLog,
    getPlugins,
    mergeJSON,
    getContent,
    getContentSync,
    saveFile,
    object2String,
    toVFile,
    transformCssStaticUrl,
    getHtmlParser,
    getNodeMethodName,
    getFileType,
    getFiles,
    isJsonStr,
    formatContent,
};
