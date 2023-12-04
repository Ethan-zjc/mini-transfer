const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');
const emitter = new EventEmitter.EventEmitter();
const slog = require('single-line-log').stdout;
const { log } = console;

global.emitter = emitter;

exports.getAllFile = (dir) => {
    let transformFilesLength = 0;
    // let transFileEnd = 0;
    const typesTransFileEnd = {
        wx2qq: 0,
        wx2bd: 0,
        wx2tt: 0,
        wx2my: 0,
        wx2ks: 0,
    };
    // const eachFile = path.resolve(__dirname, dir);
    const eachFile = path.join(process.cwd(), dir);
    const getFile = (childDir) => {
        fs.readdir(childDir, (err, files) => {
            files.forEach((item) => {
                const filePath = path.resolve(childDir, item);
                // 判断是否是文件夹，如果是，递归调用
                if (fs.statSync(filePath).isDirectory()) {
                    getFile(filePath);
                }
                // 判断是否是文件，如果是，总文件数加一
                if (fs.statSync(filePath).isFile()) {
                    transformFilesLength += 1;
                }
            });
        });
    };
    getFile(eachFile);

    //  监听打印进度
    emitter.on('event', ({ statue = false, type = 'wx2bd', fileType = 'COMMON' } = {}) => {
        if (statue) {
            typesTransFileEnd[type] = transformFilesLength;
            emitter.off('event', () => {});
            return;
        } else {
            typesTransFileEnd[type] += 1;
        }
        global.transformFilesLength = transformFilesLength;
        new ProgressBar(`${type} 文件转换进度(${fileType})`).render({
            completed: typesTransFileEnd[type],
            total: transformFilesLength,
        });
    });
};

function ProgressBar(description, length) {
    this.description = description || '文件转换进度';
    this.length = length || 30;

    this.render = function (opts) {
        log(opts);
        const percent = opts.completed == 0 ? 0 : (opts.completed / opts.total).toFixed(4);
        const cellNum = Math.floor(percent * this.length);
        // 拼接黑色条
        let cell = '';
        for (let i = 0; i < cellNum; i++) {
            cell += '█';
        }
        // 拼接灰色条
        let empty = '';
        for (let i = 0; i < this.length - cellNum; i++) {
            empty += '░';
        }

        // 进度条 & 比例
        const shadow = `${cell}${empty} ${opts.completed}/${opts.total}`;
        // 拼接最终文本
        const cmdText = `🎉  ${this.description} : ${(100 * percent).toFixed(2)}% ${shadow}\n`;
        // 在单行输出文本
        slog(cmdText);
    };
}
