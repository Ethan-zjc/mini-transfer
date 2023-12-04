import { scaleInQuene } from '../bg-scale-canvas/index';
import { util_request } from '../../../util.js';
const { channel } = getApp().globalData;

let bubbleConfigMap;
const getTimeoutPromise = function (timer = 500) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(), timer);
    });
};

function fetchBubbleConfig() {
    return util_request({
        url: `/v1/danmu/mini/${channel}/bubble`,
        method: 'get',
    }).then((res) => {
        if (res.code !== 200) {
            return;
        }
        bubbleConfigMap = res.data.list.reduce((result, item) => {
            result[item.id] = item;
            return result;
        }, {});
    });
}

function getConfig() {
    let requestPromise = Promise.resolve();
    if (!bubbleConfigMap) {
        requestPromise = Promise.race([fetchBubbleConfig(), getTimeoutPromise()]);
    }
    return requestPromise;
}

function getStyle(id, danmuHeight, danmuTextSize, paddingWidth) {
    return getConfig().then(() => {
        if (bubbleConfigMap && bubbleConfigMap[id]) {
            const bubble = bubbleConfigMap[id];
            const option = {
                image_url: bubble.image_url,
                image_width: bubble.image_width,
                image_height: bubble.image_height,
                stretch_position: bubble.stretch_position,
                height: danmuHeight,
            };
            return scaleInQuene(option).then((scaleData) => {
                const { leftWidth, background, rightWidth, imgs } = scaleData;
                if (!getApp().globalData.isiOS) {
                    return {
                        style: `padding-left:${leftWidth}px;background:${background};color:${bubble.font_color}`,
                        imgStyles: [],
                        textStyle: '',
                        rightWidth,
                        leftWidth,
                        imgs,
                    };
                }
                const middleWidth = danmuTextSize.width - (rightWidth - paddingWidth);
                const imgStyles = [
                    { src: imgs[0].src, width: `${leftWidth}px`, height: '100%' },
                    { src: imgs[1].src, width: `${middleWidth}px`, height: '100%' },
                    { src: imgs[2].src, width: `${rightWidth}px`, height: '100%' },
                ];
                return {
                    style: `color:${bubble.font_color};width:${leftWidth + middleWidth + rightWidth}px`,
                    imgStyles,
                    textStyle: `position:absolute;left:${leftWidth}px;top:0`,
                    rightWidth,
                    leftWidth,
                    imgs,
                };
            });
        }
        return {};
    });
}

function checkStyle(id) {
    return getConfig().then(() => Boolean(bubbleConfigMap && bubbleConfigMap[id]));
}

export { getStyle, checkStyle };
