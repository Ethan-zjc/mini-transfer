/**
 * 弹幕编辑组件
 * 用于页面: comic
 * @author chenxin
 */
const { channel, systemInfo } = getApp().globalData;
// 适配结束

import { util_request } from '../../../util.js';

Component({
    data: {
        _imageDanmuMap: {}, // key：漫画图片的key，.danmu_list：漫画的弹幕数据列表
        _imageList: [], // 所有漫画图片数据
        _timer: null, // 本次滑动后，页面停留计时器
        _currentImages: [],
        _containerWidth: 0,
        _danmuRegionHeight: 0,
        _prevScrollTop: -1,
        _prevStatus: 0,
        _observe: false,
        _prevCreatedDanmu: {},
        _viewHeight: systemInfo.screenHeight,
        danmuDataForMenu: {},
        playLists: [],
        playImageDanmuMap: {},
        playImages: [],
        realScrollTop: 0,
        danmuRegionHeight: 0,
        actionInfoForBubble: {
            action: '',
            danmuId: '',
            index: 0,
            key: '',
        },
        createdPlayList: [],
        _realScrollTop: 0,
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
            value: '',
        },
        _danmuHidden: {
            type: Boolean,
            value: false,
        },
        lastCreatedDanmu: {
            type: Object,
            value: {
                danmuId: '',
                imageData: {},
                danmuData: {},
            },
        },
        menuShown: {
            type: Boolean,
            value: false,
        },
        _scrollContainerSelector: {
            type: String,
            value: '',
        },
    },
    observers: {
        // 监听throttle的scrollTop
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
        _comicImageList() {
            if (!this.data._observe) {
                return;
            }
            this.formatImgList();
        },
        status(val) {
            this.triggerEvent('update', { sendBarrageShow: val == 0 ? 'none' : 'block' });
            if (val === 1) {
                this.startPageTimer(0);
            }
            if (val === 0) {
                this.setData({ playImages: [], playImageDanmuMap: {} });
            }
        },
    },
    methods: {
        getRealScrollTop() {
            return new Promise((resolve) => {
                const query = wx.createSelectorQuery();
                query.select(this.data._scrollContainerSelector).boundingClientRect();
                query.exec((res) => {
                    if (!res[0]) {
                        return;
                    }
                    // 首屏出现nav-bar容器有padding-top
                    this.data._realScrollTop = -res[0].top + res[0].dataset.offsettop;
                    resolve();
                });
            });
        },
        findCurrentImage() {
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
            let j = i > 0 ? i - 1 : i;
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
                method: 'get',
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
                        image_key: '',
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
            wx.nextTick(async () => {
                await this.getRealScrollTop();
                this.findCurrentImage();
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
            const _comicImageList = this.data._comicImageList;
            const imageList = _comicImageList.map((item, index) => {
                top = index == 0 ? 0 : top + _comicImageList[index - 1].height;
                return {
                    pxWidth: this.data._containerWidth, // 渲染宽度
                    pxHeight: item.height, // 渲染高度
                    height: item.height, // 传进来的渲染高度
                    realWidth: item.realWidth, // 真实宽度
                    ...item,
                    top: top, // 渲染top
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
            if (this.data.createdPlayList.length == 0) {
                setTimeout(() => {
                    this.triggerEvent('update', { sendBarrageShow: this.data.status == 0 ? 'none' : 'block' });
                }, 1500);
            }
        },
        onTriggereMenu(e) {
            if (this.data.menuShown) {
                this.onMenuLeave();
                return;
            }
            this.setData({ danmuDataForMenu: e.detail }, () => {
                this.triggerEvent('update', { barrageMenuShown: true });
            });
        },
        onMenuLeave() {
            this.triggerEvent('update', { barrageMenuShown: false });
            this.setData({ danmuDataForMenu: {} });
        },
        onHideBarrage(e) {
            this.setData({ actionInfoForBubble: e.detail });
        },
    },
    lifetimes: {
        ready() {
            setTimeout(() => {
                const query = wx.createSelectorQuery();
                query.select(this.data._comicContainerSelector).boundingClientRect();
                query.exec((res) => {
                    if (!res[0]) {
                        return;
                    }
                    const containerWidth = res[0].width;
                    let danmuRegionHeight = (res[0].height * 3) / 5;

                    // 校验是否获取到弹幕容器高度
                    if (!danmuRegionHeight) {
                        danmuRegionHeight = this.data._viewHeight;
                    }
                    Object.assign(this.data, {
                        _containerWidth: containerWidth,
                        _danmuRegionHeight: danmuRegionHeight,
                    });
                    this.formatImgList();
                    this.data._observe = true;
                    this.startPageTimer();
                });
            }, 100);
        },
    },
});
