/**
 * 三分横向拉伸背景图片，保证图片不变形
 * 需要图片拉伸起始横坐标位置
 * 将图片分成三部分：左右按照拉伸坐标分割，中间取1px拉伸
 */

let canvasComIns;
let scaleQuene = [];

function setcanvasComIns(ins) {
    canvasComIns = ins;
}

function onDetached() {
    canvasComIns = null;
}

function cropImage(cropOption) {
    return new Promise((resolve, reject) => {
        wx.canvasToTempFilePath(
            {
                canvasId: "bg-scale-canvas",
                x: cropOption.x,
                y: cropOption.y,
                width: cropOption.width,
                height: cropOption.height,
                success: function (res) {
                    resolve(res.tempFilePath);
                },
                fail: function () {
                    reject(new Error("canvasToTempFilePath failed"));
                },
            },
            canvasComIns
        );
    });
}

function generateBgImgs(option) {
    return new Promise((resolve) => {
        if (!canvasComIns) {
            resolve([]);
            return;
        }
        const img = {};
        img.success = function (res) {
            if (!canvasComIns) {
                resolve([]);
                return;
            }
            // 绘制
            const ctx = wx.createCanvasContext("bg-scale-canvas", canvasComIns);
            canvasComIns.updateSize(option.image_width, option.image_height).then(() => {
                ctx.drawImage(res.path, 0, 0, option.image_width, option.image_height, 0, 0, option.image_width, option.image_height);
                ctx.draw(false, function () {
                    const cropOptions = [
                        { x: 0, y: 0, width: option.stretch_position, height: option.image_height }, // 左边不拉伸区域
                        { x: option.stretch_position, y: 0, width: 1, height: option.image_height }, // 1px 拉伸区域
                        { x: option.stretch_position + 1, y: 0, width: option.image_width - option.stretch_position, height: option.image_height }, // 右边不拉伸区域
                    ];
                    // 串行输出三部分图片地址
                    const bgImgs = [];
                    const imgsPromise = cropOptions.reduce((promise, cropOption, index) => {
                        return promise.then(() => {
                            return cropImage(cropOption).then((filePath) => {
                                bgImgs[index] = { src: filePath, width: cropOption.width, height: cropOption.height };
                            });
                        });
                    }, Promise.resolve());
                    // 获取结果
                    imgsPromise
                        .then(() => {
                            resolve(bgImgs);
                        })
                        .catch(() => {
                            resolve([]);
                        });
                });
            });
        };
        img.src = option.image_url;
        wx.getImageInfo(img);
    });
}

/**
 * 横向拉伸背景图片，保持不变形
 * @param {Object} option 配置参数
 * @param {Number} option.height dom元素高度，单位：px
 * @param {Number} option.image_url 图片地址
 * @param {Number} option.image_width 图片宽度
 * @param {Number} option.image_height 图片宽度
 * @param {Number} option.stretch_position 图片拉伸起始横坐标
 * @returns {Promise}
 */
function scaleBgImg(option) {
    return generateBgImgs(option).then((imgs) => {
        if (imgs.length < 1) {
            throw new Error("scaleBgImg failed");
        }
        const leftWidth = Math.floor((imgs[0].width * option.height) / imgs[0].height);
        const leftBgStyle = `url(${imgs[0].src}) left top / ${leftWidth}px 100% no-repeat`;

        const rightWidth = Math.floor((imgs[2].width * option.height) / imgs[2].height);
        const rightBgStyle = `url(${imgs[2].src}) right top / ${rightWidth}px 100% no-repeat`;

        const middleBgStyle = `url(${imgs[1].src}) ${leftWidth}px top / calc(100% - ${leftWidth + rightWidth}px) 100% no-repeat`;

        return {
            leftWidth,
            rightWidth,
            background: `${leftBgStyle},${middleBgStyle},${rightBgStyle}`,
            imgs,
        };
    });
}

/**
 * 横向拉伸背景图片，保持不变形
 * @param {Object} option 配置参数
 * @param {Number} option.height dom元素高度，单位：px
 * @param {Number} option.image_url 图片地址
 * @param {Number} option.image_width 图片宽度
 * @param {Number} option.image_height 图片宽度
 * @param {Number} option.stretch_position 图片拉伸起始横坐标
 * @returns {Promise}
 */
function scaleInQuene(option) {
    return new Promise((resolve, reject) => {
        scaleQuene.push(() => {
            scaleBgImg(option)
                .then((res) => {
                    scaleQuene.shift();
                    if (scaleQuene.length > 0) {
                        scaleQuene[0]();
                    }
                    resolve(res);
                })
                .catch((err) => {
                    scaleQuene.shift();
                    if (scaleQuene.length > 0) {
                        scaleQuene[0]();
                    }
                    reject(err);
                });
        });
        if (scaleQuene.length === 1) {
            scaleQuene[0]();
        }
    });
}

export { scaleBgImg, setcanvasComIns, onDetached, scaleInQuene };
