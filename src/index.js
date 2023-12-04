const path = require('path');
const fs = require('fs');
const { resolve } = require('path');
const Inquirer = require('inquirer');
const Log = require('./log/log');
const Store = require('./log/store');
const pReduce = require('p-reduce');
const bootstrap = require('./processor/bootstrap');
const Config = require('./processor/transformConfig');
const API = require('./processor/transformAPI');
const JS = require('./processor/transformJS');
const View = require('./processor/transformView');
const Css = require('./processor/transformCss');
const createTransformInfo = require('./processor/createTransformInfo');
const constant = require('./config/constant');
const progress = require('./utils/progress');
const chalk = require('chalk');
const { getSelfRules } = require('./utils/rewriteRule');
const { log } = console;
const {
    getQuestions,
    isDirectory,
    isFolderEmpty,
    mergeJSON,
    getPlugins,
} = require('./utils/index');

/**
 * 获取转换类型
 *
 * @param {string=} target 转换类型默认是 swan
 * @return {string} 转换类型
 */
const getType = (target) => {
    switch (target) {
        case 'qq':
            return constant.WECHAT_TO_QQ;
        case 'baidu':
            return constant.WECHAT_TO_SWAN;
        case 'ks':
            return constant.WECHAT_TO_KS;
        case 'douyin':
            return constant.WECHAT_TO_TT;
        case 'alipay':
            return constant.WECHAT_TO_MY;
        default:
            return constant.WECHAT_TO_SWAN;
    }
};

/**
 * 获取项目转换需要的 rules
 *
 * @param {string}  rules的文件地址
 * @return {Object}所有的规则
 */
const getRules = (rulesPath, transformType) => {
    const rules = require(rulesPath);
    const customProCfg = {
        projectType: 'u-design',
    };

    rules.api.babelPlugins = getPlugins(rulesPath, transformType);
    mergeJSON(rules.api, customProCfg);
    return rules;
};

/**
 * 执行转换方法
 * @param {*} options
 */
const convert = async (options = {}, item, logInstance) => {
    const from = options.project;
    const opath = options.entry; // 源平台路径

    const TYPE = getType(item);
    const RULES_PATH = resolve(__dirname, '../rules/', TYPE);

    const CONTEXT = {
        type: TYPE,
        status: constant.TRANSFORM_WAIT,
        constant,
        entry: path.join(process.cwd(), opath),
        dist: '.',
        toPath: path.join(process.cwd(), opath.replace(from, item)),
        rules: getRules(RULES_PATH, TYPE),
        log: logInstance,
        Store,
        selfRules: options.rules || {},
        data: {},
    };

    // 判断自定义规则是否存在，如果存在则进行规则merge
    // 当我们执行了自定义规则wx2.json路径时
    if (options.rules) {
        // 需要配置多个规则区分，需要用名称区分开
        let { plugin, baseRules } = getSelfRules(CONTEXT);
        // 自定义规则处理;
        for (let item in CONTEXT.rules) {
            baseRules[item] &&
                (CONTEXT.rules[item] = Object.assign(CONTEXT.rules[item], baseRules[item]));
        }
        // 自定义插件处理
        for (let item in CONTEXT.rules.api.babelPlugins) {
            plugin[item] &&
                (CONTEXT.rules.api.babelPlugins[item] = CONTEXT.rules.api.babelPlugins[item].concat(
                    plugin[item]
                ));
        }
    }

    const wxProcessor = [
        {
            name: 'Bootstrap',
            handle: bootstrap.transformBootstrap,
        },
        {
            name: 'Api',
            handle: API.transformApi,
        },
        {
            name: 'Config',
            handle: Config.transformConfig,
        },
        {
            name: 'View',
            handle: View.transformView,
        },
        {
            name: 'TransformInfo',
            handle: createTransformInfo,
        },
    ];
    const defaultProcessor = wxProcessor.concat([
        {
            name: 'JS',
            handle: JS.transformJS,
        },
        {
            name: 'Css',
            handle: Css.transformCss,
        },
    ]);

    let processor = TYPE === constant.WECHAT_TO_WECHAT ? wxProcessor : defaultProcessor;

    await pReduce(
        processor,
        async (placeholder, p) => {
            p.handle.decorate = function (beforefn, afterfn) {
                const _self = this;
                return async function () {
                    beforefn.apply(this, arguments);
                    try {
                        await _self.apply(this, arguments);
                    } catch (error) {
                        logInstance.error({
                            progress: `[FAILURE] ${p.name} failure`,
                            error,
                        });
                        throw error;
                    }
                    afterfn.apply(this, arguments);
                };
            };
            const handleDecorate = p.handle.decorate(
                () => {
                    logInstance.info({
                        progress: `[START] transforming ${p.name}`,
                    });
                },
                () => {
                    logInstance.info({
                        progress: `[DONE] transforming ${item.name} done`,
                    });
                }
            );
            await handleDecorate(CONTEXT);
        },
        0
    );
};

/**
 * 执行编译方法
 *
 * @param {*} options
 * project: 'weixin', 源项目
 * enter: '/wechat', 源项目路径
 * target: [ 'qq' ], 目标项目
 * output: '', 目标项目路径
 */
const action = async (options = {}) => {
    // 判断是由源平台(一个) 转向 目标平台(多个)
    try {
        // 获取待转换文件总数
        progress.getAllFile(options.entry);
    } catch (e) {
        // console.log(e);
    }
    log(chalk.green('🎉    Transforming  ...'));

    if (options.target) {
        const logInstance = new Log(options.logFor || path.join(process.cwd(), ''));
        for (let i = 0; i < options.target.length; i++) {
            const item = options.target[i];
            await convert(options, item, logInstance);
        }

        // 完成进度，取消事件监听
        global.emitter.emit('event', { statue: true });

        // 日志转存
        logInstance.dump();

        log(
            chalk.green('🎉    Ok, check transform log in ') + chalk.blue.underline.bold('wx2_log/')
        );
    }
};

// 命令行参数解析
const analysis = (options) => {
    // 没有指定要转换的项目
    if (!options.project) {
        console.error('没有指定要转换的项目！');
        return;
    }

    // 没有输入要转换的项目路径
    const enterFile = path.join(process.cwd(), options.entry);
    if (!fs.existsSync(enterFile)) {
        console.error('没有输入要转换的项目路径！');
        return;
    }

    // 输入要转换的项目路径路径下为空
    if (isDirectory(enterFile) && isFolderEmpty(enterFile)) {
        console.error('输入要转换的项目路径路径下为空！');
        return;
    }

    action(options); // 执行编译
};

// 问答选项收集
const collect = async () => {
    const answer = await new Inquirer.prompt(getQuestions());
    analysis(answer); // 执行编译
};

/**
 * 小程序互转的入口文件(需要简化参数)
 * @param {Object} options
 * @param {string} options.entry  互转的入口文件
 * @param {string=} options.dist  转换之后的地址
 * @param {string=} options.logFor  转换产生的日志地址
 * @param {string=} options.selfRules  自定义规则地址
 * @param {string=} options.target  要转换的类型 如：wx2swan、wx2qq、swan2wx
 */
module.exports = function (value = {}) {
    if (value.prject || value.entry || value.target || value.output) {
        if (value.prject) {
            analysis(value); // 命令行
        } else {
            console.error('error: Params project required');
        }
    } else {
        collect(); // prompt问答模式
    }
};
