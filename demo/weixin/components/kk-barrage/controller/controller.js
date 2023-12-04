/**
 * 弹幕编辑组件
 * 用于页面: comic
 * @author chenxin
 */
const { channel } = getApp().globalData;
import { util_request } from "../../../util.js";
Component({
    data: {
        _imageDanmuMap: {}, // key：漫画图片的key，value：漫画的弹幕数据列表
        _imageList: [], // 所有漫画图片数据
        _timer: null, // 本次滑动后，页面停留计时器
        _realScrollTop: 0,
        _currentImages: [],
        _containerWidth: 0,
        _containerHeight: 0,
        _danmuRegionHeight: 0,
        _prevScrollTop: -1,
        _prevStatus: 0,
        _observe: false,
        _prevCreatedDanmu: {},
        danmuDataForMenu: {},
        playLists: [],
        playImageDanmuMap: {},
        playImages: [],
        realScrollTop: 0,
        danmuRegionHeight: 0,
        actionInfoForBubble: {
            action: "",
            danmuId: "",
            index: 0,
            key: "",
        },
        createdPlayList: [],
    },
    properties: {
        _comicImageList: {
            type: Array,
            value: [],
        },
        scrollTop: {
            type: Number,
            value: 0,
        },
        status: {
            type: Number,
            value: 0,
        },
        comicId: {
            type: Number,
            value: 0,
        },
        _comicContainerSelector: {
            type: String,
            value: "",
        },
        _danmuHidden: {
            type: Boolean,
            value: false,
        },
        lastCreatedDanmu: {
            type: Object,
            value: {
                danmuId: "",
                imageData: {},
                danmuData: {},
            },
        },
        menuShown: {
            type: Boolean,
            value: false,
        },
        topicId: {
            type: Number,
            value: 0,
        },
        topicTitle: {
            type: String,
            value: "",
        },
        comicTitle: {
            type: String,
            value: "",
        },
    },
    observers: {
        scrollTop(value) {
            const { _prevScrollTop, _observe } = this.data;
            if (!_observe || (_prevScrollTop > 0 && Math.abs(value - _prevScrollTop) < 10)) {
                return;
            }
            this.data._prevScrollTop = value;
            this.startPageTimer();
        },
        lastCreatedDanmu(playData) {
            if (playData.danmuId && playData.danmuId !== this.data._prevCreatedDanmu.danmuId) {
                this.data._prevCreatedDanmu = playData;
                this.setData({
                    createdPlayList: this.data.createdPlayList.concat(playData),
                });
            }
        },
        status(val) {
            if (val === 1) {
                this.startPageTimer(0);
            }
            if (val === 0) {
                this.setData({ playImages: [], playImageDanmuMap: {} });
            }
        },
    },
    methods: {
        // 获取当前准确的scrollTop
        getRealScrollTop(cb) {
            const query = wx.createSelectorQuery();
            query.select(this.data._comicContainerSelector).scrollOffset();
            query.exec((res) => {
                cb(res[0] && res[0].scrollTop ? res[0].scrollTop : 0);
            });
        },
        // 获取当前屏幕上部展示的图片索引
        findCurrentImage() {
            // 找到在屏幕上部区域展示的漫画图片的索引
            const { _imageList, _danmuRegionHeight, _realScrollTop } = this.data;
            if (_imageList.length < 1) {
                return [];
            }
            let i = 0;
            while (_imageList[i] && _imageList[i].top < _realScrollTop) {
                i++;
            }
            if (!_imageList[i] || _imageList[i].top > _realScrollTop + _danmuRegionHeight) {
                i -= 1;
            }
            let j = i > 1 ? i - 1 : i;
            const images = [];
            // 所有在弹幕展示区域的图片
            while (_imageList[j] && _imageList[j].top < _realScrollTop + _danmuRegionHeight) {
                if (_imageList[j].top + _imageList[j].pxHeight > _realScrollTop + 80) {
                    images.push({
                        index: j,
                        key: _imageList[j].key,
                    });
                }
                j++;
            }
            this.data._currentImages = images;
            return images;
        },
        // 弹幕数据获取
        getDanmuList() {
            // 得到前后10张图片
            const { _imageList, comicId, _imageDanmuMap, _currentImages } = this.data;
            if (_currentImages.length < 1) {
                return Promise.resolve();
            }
            let next = _currentImages[0].index;
            let prev = _currentImages[_currentImages.length - 1].index;
            let count = 1;
            while (count < 10 && (_imageList[next + 1] || _imageList[prev - 1])) {
                if (_imageList[next + 1]) {
                    count += 1;
                    next += 1;
                }
                if (_imageList[prev - 1]) {
                    count += 1;
                    prev -= 1;
                }
            }
            const aggregationKey = [];
            while (prev <= next) {
                const { key } = _imageList[prev];
                // 获取过的不再获取
                if (!_imageDanmuMap[key]) {
                    aggregationKey.push({
                        image_key: key,
                        since: 0,
                    });
                }
                prev += 1;
            }
            if (aggregationKey.length < 1) {
                return Promise.resolve();
            }
            return util_request({
                url: `/v1/danmu/mini/${channel}/get_dynamic_list`,
                method: "get",
                data: {
                    comic_id: comicId,
                    aggregation_key: JSON.stringify(aggregationKey),
                    count: 100,
                },
            }).then((res) => {
                const { image_list: imageListWithDanmu } = res.data;
                const danmuMap = imageListWithDanmu.reduce((result, item) => {
                    result[item.image_key] = item;
                    return result;
                }, {});
                Object.assign(this.data._imageDanmuMap, danmuMap);
            });
        },
        startPlay() {
            if (this.data.status !== 1) {
                return;
            }
            this.getDanmuList().then(() => {
                const { _currentImages = [], _imageList, _imageDanmuMap, _realScrollTop, _danmuRegionHeight } = this.data;
                if (_currentImages.length < 1) {
                    return;
                }
                const danmuMap = _currentImages.reduce((result, item) => {
                    const imageDanmu = _imageDanmuMap[item.key] || {
                        image_key: "",
                        since: 0,
                        danmu_list: [],
                    };
                    result[item.key] = {
                        danmuList: imageDanmu.danmu_list,
                        imageData: _imageList[item.index],
                    };
                    return result;
                }, {});
                this.setData({
                    playImageDanmuMap: danmuMap,
                    playImages: _currentImages,
                    realScrollTop: _realScrollTop,
                    danmuRegionHeight: _danmuRegionHeight,
                });
            });
        },
        startPageTimer(duration = 1) {
            if (this.data._danmuHidden || this.data.status !== 1) {
                return;
            }
            this.getRealScrollTop((realScrollTop) => {
                this.data._realScrollTop = realScrollTop;
                const indexs = this.findCurrentImage();
                if (this.data._timer) {
                    clearTimeout(this.data._timer);
                }
                this.data._timer = setTimeout(() => {
                    this.data._timer = 0;
                    this.startPlay();
                }, duration * 1000);
            });
        },
        formatImgList() {
            let top = 0;
            let pxHeight = 0;
            const imageList = this.data._comicImageList.map((item) => {
                top += pxHeight;
                pxHeight = (item.height * this.data._containerWidth) / item.width;
                return {
                    top,
                    pxWidth: this.data._containerWidth,
                    pxHeight,
                    ...item,
                };
            });
            this.data._imageList = imageList;
        },
        onBarrageLeave(e) {
            const { danmuId, index } = e.detail;
            const playData = this.data.createdPlayList[index];
            if (playData && playData.danmuData.danmu_id === danmuId) {
                this.setData({
                    createdPlayList: [...this.data.createdPlayList.slice(0, index), ...this.data.createdPlayList.slice(index + 1)],
                });
            }
        },
        onTriggereMenu(e) {
            if (this.data.menuShown) {
                this.onMenuLeave();
                return;
            }
            this.setData({ danmuDataForMenu: e.detail }, () => {
                this.triggerEvent("update", { barrageMenuShown: true });
            });
        },
        onMenuLeave() {
            this.triggerEvent("update", { barrageMenuShown: false });
            this.setData({ danmuDataForMenu: {} });
        },
        onHideBarrage(e) {
            this.setData({ actionInfoForBubble: e.detail });
        },
    },
    lifetimes: {
        ready() {
            const query = wx.createSelectorQuery();
            query.select(this.data._comicContainerSelector).boundingClientRect();
            query.exec((res) => {
                if (!res[0]) {
                    return;
                }
                const containerHeight = res[0].height;
                const containerWidth = res[0].width;
                const danmuRegionHeight = (res[0].height * 3) / 5;
                Object.assign(this.data, {
                    _containerHeight: containerHeight,
                    _containerWidth: containerWidth,
                    _danmuRegionHeight: danmuRegionHeight,
                });
                this.formatImgList();
                this.data._observe = true;
                this.startPageTimer();
            });
        },
    },
});
