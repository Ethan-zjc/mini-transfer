/**
 * 弹幕编辑组件
 * 用于页面: comic
 * @author chenxin
 */
const { channel, systemInfo, iPhoneX } = getApp().globalData;
const { windowWidth } = systemInfo;
// 针对详情页关联的结构适配
const ihpneXBottomHeight = (68 * windowWidth) / 750;
const comicBottomBtnHeight = (98 * windowWidth) / 750;
import Base64 from '../../../common/js/base64';
// 适配结束
import { util_request, util_showToast } from '../../../util.js';
Component({
    data: {
        _containerWidth: 0,
        _containerHeight: 0,
        _oldEditing: false,
        disable: false,
        inputValue: '',
        focus: false,
        keybordHeight: 0,
        focusInputStyle: '',
        isLogined: true,
        _observe: false,
        _realScrollTop: 0,
        _currentImages: [],
    },
    properties: {
        _comicImageList: {
            type: Array,
            value: [],
        },
        _comicId: {
            type: Number,
            value: 0,
        },
        _comicContainerSelector: {
            type: String,
            value: '',
        },
        fullScreen: {
            type: Boolean,
            value: true,
        },
        status: {
            type: Number,
            value: 0,
        },
        danmuHidden: {
            type: Boolean,
            value: false,
        },
        editing: {
            type: Boolean,
            value: false,
        },
        _topicTitle: {
            type: String,
            value: '',
        },
        _comicTitle: {
            type: String,
            value: '',
        },
        _topicId: {
            type: String,
            value: '',
        },
        _scrollContainerSelector: {
            type: String,
            value: '',
        },
    },
    observers: {
        editing(value) {
            if (value === this.data._oldEditing) {
                return;
            }
            this.data._oldEditing = value;
            if (!value && this.data.focus) {
                this.setData({
                    focusInputStyle: '',
                    keybordHeight: 0,
                    focus: false,
                    inputValue: '',
                });
            }
        },
        _comicImageList() {
            if (!this.data._observe) {
                return;
            }
            this.formatImgList();
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
        // 找到在屏幕区域展示的从顶部开始的第一张图片or占满整屏的图片
        findCurrentImageIndex() {
            const { _imageList, _containerHeight, _realScrollTop } = this.data;
            if (_imageList.length < 1) {
                util_showToast({
                    title: '漫画资源加载中，请稍后重试',
                    position: { bottom: '320rpx' },
                });
                return 0;
            }
            let i = 0;
            while (_imageList[i] && _imageList[i].top < _realScrollTop) {
                i++;
            }
            if (!_imageList[i] || _imageList[i].top > _realScrollTop + _containerHeight) {
                return i - 1;
            }
            return i > 0 ? i - 1 : 0;
        },
        // 所有在屏幕内的图片
        findCurrentImages() {
            const { _imageList, _containerHeight, _realScrollTop } = this.data;
            let j = this.findCurrentImageIndex() == 0 ? 0 : this.findCurrentImageIndex() - 1;
            const images = [];
            while (_imageList[j] && _imageList[j].top < _realScrollTop + _containerHeight) {
                images.push({
                    index: j,
                    key: _imageList[j].key,
                    sign: _imageList[j].sign,
                });
                j++;
            }
            this.data._currentImages = images;
        },
        // 发送弹幕时判断
        canCreateDanmu() {
            // 以下基于两章节之间 内容 + 点赞 + 广告结构
            const { _imageList, _containerHeight, _realScrollTop, _currentImages } = this.data;
            const unPicIndex = (_currentImages.findIndex((it) => it.sign !== 'picture') || {}).index;
            if (unPicIndex) {
                const prevPicIndex = unPicIndex - 1;
                const nextPicIndex = _currentImages.slice(unPicIndex).findIndex((it) => it.sign == 'picture' || {}).index;
                // 100为给气泡展示预留的buffer
                const hasAreaInTop = prevPicIndex && _imageList[prevPicIndex].top + _imageList[prevPicIndex].pxHeight > _realScrollTop + 100;
                const hasAreaInBottom = nextPicIndex && _imageList[nextPicIndex].top < _realScrollTop + _containerHeight - 100;
                return hasAreaInTop || hasAreaInBottom;
            }
            return true;
        },
        async onTap() {
            if (this.data.disable) {
                this.triggerEvent('appeal');
                return;
            }
            if (this.data.danmuHidden) {
                util_showToast({
                    title: '功能升级中，暂不能发送',
                    position: { bottom: '320rpx' },
                });
                return;
            }
            let errorMsg = '';
            if (this.data._imageList.length < 1) {
                errorMsg = '漫画内容加载失败～';
            }
            this.triggerEvent('update', {
                sendBarrageShow: 'block',
            });
            await this.getRealScrollTop();
            this.findCurrentImages();
            if (!this.canCreateDanmu()) {
                errorMsg = '请在图片区域发布弹幕内容~';
            }
            if (errorMsg) {
                util_showToast({
                    title: errorMsg,
                    position: { bottom: '320rpx' },
                });
                return;
            }
            this.checkPrivilege().then(() => {
                this.data._taped = true;
                this.triggerEvent('edit', { editing: true });

                this.setData({
                    focus: true,
                });
            });
        },
        getInputTop(keybordHeight) {
            // 针对详情页关联的结构适配
            // 减去底部操作栏高度
            let top = keybordHeight - comicBottomBtnHeight;
            if (iPhoneX) {
                // 减去刘海屏适配高度
                top -= ihpneXBottomHeight;
            }
            return top;
        },
        onKeyboardHeightChange(e) {
            const keybordHeight = e.detail.height;
            const top = this.getInputTop(keybordHeight);
            if (keybordHeight > 0) {
                this.data._taped = false;
                this.setData({
                    keybordHeight,
                    focusInputStyle: `transform: translateY(-${top}px)`,
                });
                return;
            }
            if (this.data.focus && this.data._taped) {
                return;
            }
            // 键盘被收起
            if (keybordHeight <= 0 && this.data.focus) {
                this.report({ IsSendSuccess: 0 });
                this.setData(
                    {
                        focus: false,
                        inputValue: '',
                        focusInputStyle: '',
                        keybordHeight: 0,
                    },
                    () => {
                        this.triggerEvent('edit', {
                            editing: false,
                            content: '',
                        });
                    }
                );
            }
        },
        onInput(e) {
            let value = e.detail.value;
            // TODO: 符号检测
            if (value.length > 15) {
                util_showToast({
                    title: '弹幕内容不可以超过15个字符',
                    position: { bottom: `${this.data.keybordHeight + 50}px` },
                });
                value = value.slice(0, 15);
            }
            this.setData({ inputValue: value });
        },
        // 构造弹幕位置选择需要数据
        getEditorData() {
            const { _realScrollTop, _currentImages, _imageList } = this.data;
            // 屏幕中完全没有漫画图片的情况在外部已处理，这里不考虑
            let firstShowPicIndex = _currentImages[0].index;
            let lastShowPicIndex = _currentImages[_currentImages.length - 1].index;

            // 针对连续阅读comic页面结构： 内容 + 点赞关注分享 + 广告

            // 非正常图片的index
            const unPicIndex = (_currentImages.find((it) => it.sign !== 'picture') || {}).index;
            const prevPicIndex = unPicIndex - 1;
            const nextPicIndex = (this.data._imageList.slice(unPicIndex).findIndex((it) => it.sign == 'picture') || 0) + unPicIndex;

            // 普通情况
            if (!unPicIndex) {
                return {
                    movableHeight: this.data._containerHeight,
                    editingImageList: _imageList.slice(firstShowPicIndex, lastShowPicIndex + 1),
                };
            }

            // 看到最后一张漫画图片且有广告
            if (prevPicIndex == _imageList.length - 3 && unPicIndex) {
                return {
                    movableHeight: _imageList[prevPicIndex].top + _imageList[prevPicIndex].pxHeight - _realScrollTop,
                    editingImageList: _imageList.slice(firstShowPicIndex, unPicIndex),
                };
            }

            // 显示两章节之间的广告
            if (unPicIndex) {
                // 判断广告位上方还是下方可以拖动弹幕
                const prevPicShowedHeight = _imageList[prevPicIndex + 1].top - _realScrollTop;
                const nextPicShowedHeight = _realScrollTop + this.data._containerHeight - _imageList[nextPicIndex].top;
                const movableDirection = nextPicShowedHeight > prevPicShowedHeight ? 'bottom' : 'top';
                if (movableDirection == 'top') {
                    return {
                        movableHeight: prevPicShowedHeight,
                        editingImageList: _imageList.slice(firstShowPicIndex, unPicIndex),
                    };
                } else {
                    return {
                        movableHeight: nextPicShowedHeight,
                        editingImageList: _imageList.slice(nextPicIndex, lastShowPicIndex + 1),
                        bottom: '0px',
                    };
                }
            }
        },
        onSend() {
            const { inputValue, focus, keybordHeight } = this.data;
            if (!inputValue) {
                const position = focus ? { bottom: `${keybordHeight + 50}px` } : { bottom: '320rpx' };
                util_showToast({ title: '请输入弹幕内容', position });
                return;
            }
            this.setData({ inputValue: '', focus: false, focusInputStyle: '' }, () => {
                this.triggerEvent('edit', {
                    content: inputValue,
                    ...this.getEditorData(),
                    realScrollTop: this.data._realScrollTop,
                });
                this.triggerEvent('send');
            });
        },
        initStatus() {
            const { userId } = getApp().globalData;
            if (!userId) {
                this.setData({ isLogined: false });
            }
            const key = userId ? `uid:${userId}:barrage:status:new` : 'barrage:status:new';
            wx.getStorage({
                key,
                complete: (res) => {
                    if (!isNaN(parseInt(res.data))) {
                        this.triggerEvent('update', {
                            barrageStatus: parseInt(res.data),
                        });
                    } else {
                        wx.setStorage({
                            key,
                            data: this.data.status,
                        });
                    }
                },
            });
        },
        switchStatus() {
            const newStatus = (this.data.status + 1) % 2;
            const { userId } = getApp().globalData;
            const key = userId ? `uid:${userId}:barrage:status:new` : 'barrage:status:new';
            wx.setStorage({
                key,
                data: newStatus,
                fail: () => {
                    util_showToast({
                        title: '开关弹幕失败，请重试',
                        position: { bottom: '320rpx' },
                    });
                },
                success: () => {
                    this.setData({ status: newStatus }, () => {
                        this.triggerEvent('update', {
                            barrageStatus: newStatus,
                        });
                    });
                },
            });
        },
        checkPrivilege() {
            if (this.data._checkPrivilegeDone) {
                return Promise.resolve();
            }
            // 超时不阻塞键盘拉起
            const timeout = () =>
                new Promise((resolve, reject) => {
                    setTimeout(() => {
                        reject({ code: 0, message: '用户状态检测超时' });
                    }, 1000);
                });
            return Promise.race([
                timeout(),
                util_request({
                    url: `/v2/comments/mini/${channel}/can_comment`,
                    method: 'get',
                }),
            ])
                .then((result) => {
                    this.data._checkPrivilegeDone = true;
                    return result[1];
                })
                .catch(({ code, message }) => {
                    if (code === 403) {
                        this.setData({ disable: true });
                        this.triggerEvent('appeal');
                    } else {
                        util_showToast({
                            title: message,
                            position: { bottom: '320rpx' },
                        });
                    }
                    throw new Error(message);
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
        report(data) {
            const baseData = {
                TopicID: this.data._topicId,
                TopicName: this.data._topicTitle,
                ComicID: this.data._comicId,
                ComicName: this.data._comicTitle,
                ContentID: '0',
                TriggerPage: 'ComicPage',
                IsSendSuccess: -1,
                SourcePlatform: channel,
            };
            Object.assign(baseData, data);
            const reportData = {
                distinct_id: getApp().globalData.userId,
                time: Date.now(),
                event: 'BulletScreen',
                properties: baseData,
            };
            // 大数据上报
            try {
                util_request({
                    url: '/v1/app_data',
                    method: 'post',
                    data: { data: Base64.encode(JSON.stringify(reportData)) },
                });
            } catch (e) {
                // do nothing;
            }
            // 神策上报
            getApp().kksaTrack('BulletScreen', baseData);
        },
    },
    lifetimes: {
        ready() {
            this.initStatus();
            const query = wx.createSelectorQuery();
            query.select(this.data._comicContainerSelector).boundingClientRect();
            query.exec((res) => {
                if (!res[0]) {
                    return;
                }
                const containerHeight = res[0].height;
                const containerWidth = res[0].width;
                Object.assign(this.data, {
                    _containerHeight: containerHeight,
                    _containerWidth: containerWidth,
                });
                this.formatImgList();
                this.data._observe = true;
            });
        },
    },
    pageLifetimes: {
        show() {
            const { userId } = getApp().globalData;
            this.setData({ isLogined: !!userId });
        },
    },
});
