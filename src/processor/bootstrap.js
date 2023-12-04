/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';

const recursiveCopy = require('recursive-copy');
const path = require('path');
const { getFileType } = require('../utils/index');

/**
 * 拷贝文件，及其更换后缀名称
 *
 * @param {Object} context 上下文信息
 */
exports.transformBootstrap = async function (context) {
    let { entry: fromPath, toPath, log, rules } = context;

    await recursiveCopy(fromPath, toPath, {
        overwrite: true,
        expand: true,
        dot: true,
        filter(filePath) {
            return !/(\.idea|\.git|DS_store)/.test(filePath);
        },
        rename(filePath) {
            if (/node_modules/.test(filePath)) {
                return filePath;
            }
            if (/\bminiprogram_npm\b/.test(filePath)) {
                const npmFileName = rules.suffixMapping.npm || 'node_modules';
                filePath = filePath.replace(/\bminiprogram_npm\b/, npmFileName);
                log.warning({
                    time: '[START] bootstrapping - find 『miniprogram_npm』deps',
                    filePath,
                });
            }
            const ext = path.extname(filePath);
            if (!ext) {
                return filePath;
            }

            const fileType = getFileType(filePath);
            if (!fileType) {
                // 更新进度,scss文件不做处理只copy
                global.emitter.emit('event', {
                    statue: false,
                    type: context.type,
                    fileType: 'COMMON',
                });
                return filePath;
            }

            const targetExtname = rules.suffixMapping[fileType];

            if (!targetExtname) {
                return filePath;
            }
            return filePath.replace(ext, '.' + targetExtname);
        },
    });
};
