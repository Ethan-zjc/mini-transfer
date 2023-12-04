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
import Base64 from "../../../common/js/base64";
import { util_request, util_showToast } from "../../../util.js";
Component({
    data: {
        _containerWidth: 0,
        _containerHeight: 0,
        _danmuRegionHeight: 0,
        _oldEditing: false,
        disable: false,
        inputValue: "",
        focus: false,
        keybordHeight: 0,
        focusInputStyle: "",
        isLogined: true,
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
            value: "",
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
        unusable: {
            type: Boolean,
            value: false,
        },
        _topicTitle: {
            type: String,
            value: "",
        },
        _comicTitle: {
            type: String,
            value: "",
        },
        _topicId: {
            type: String,
            value: "",
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
                    focusInputStyle: "",
                    keybordHeight: 0,
                    focus: false,
                    inputValue: "",
                });
            }
        },
    },
    methods: {
        // 获取当前准确的scrollTop
        getScrollTop(cb) {
            const query = wx.createSelectorQuery();
            query.select(this.data._comicContainerSelector).scrollOffset();
            query.exec((res) => {
                cb(res[0] && res[0].scrollTop ? res[0].scrollTop : 0);
            });
        },
        // 获取当前屏幕上部展示的图片索引
        findCurrentImage(scrollTop) {
            // 找到在屏幕上部区域展示的漫画图片的索引
            const { _imageList, _danmuRegionHeight } = this.data;
            if (_imageList.length < 1) {
                util_showToast({
                    title: "漫画资源加载中，请稍后重试",
                    position: { bottom: "320rpx" },
                });
                return 0;
            }
            let i = 0;
            while (_imageList[i] && _imageList[i].top < scrollTop) {
                i++;
            }
            if (!_imageList[i] || _imageList[i].top > scrollTop + _danmuRegionHeight) {
                return i - 1;
            }
            return i;
        },
        // 发送弹幕时判断
        canCreateDanmu(scrollTop) {
            const { _imageList } = this.data;
            const last = _imageList[_imageList.length - 1];
            return (last && last.top ? last.top : 0) + (last && last.pxHeight ? last.pxHeight : 0) > scrollTop + 300; // 100为给气泡展示预留的buffer
        },
        onTap() {
            if (this.data.disable) {
                this.triggerEvent("appeal");
                return;
            }
            if (this.data.danmuHidden) {
                util_showToast({
                    title: "功能升级中，暂不能发送",
                    position: { bottom: "320rpx" },
                });
                return;
            }
            this.getScrollTop((scrollTop) => {
                let errorMsg = "";
                if (this.data._imageList.length < 1) {
                    errorMsg = "漫画内容加载失败～";
                }
                if (!this.canCreateDanmu(scrollTop) || this.data.unusable) {
                    errorMsg = "请在图片区域发布弹幕内容~";
                }
                if (errorMsg) {
                    util_showToast({
                        title: errorMsg,
                        position: { bottom: "320rpx" },
                    });
                    return;
                }
                this.checkPrivilege().then(() => {
                    this.data._taped = true;
                    this.triggerEvent("edit", { editing: true });

                    this.setData({
                        focus: true,
                    });
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
                        inputValue: "",
                        focusInputStyle: "",
                        keybordHeight: 0,
                    },
                    () => {
                        this.triggerEvent("edit", {
                            editing: false,
                            content: "",
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
                    title: "弹幕内容不可以超过15个字符",
                    position: { bottom: `${this.data.keybordHeight + 50}px` },
                });
                value = value.slice(0, 15);
            }
            this.setData({ inputValue: value });
        },
        // 构造弹幕位置选择需要数据
        getEditorData(scrollTop) {
            const currentImageIndex = this.findCurrentImage(scrollTop);
            // 屏幕中完全没有漫画图片的情况在外部已处理，这里不考虑
            const { _imageList } = this.data;
            // 获取当前屏幕中展示所有漫画图片
            let prev = prev > 0 ? currentImageIndex - 1 : currentImageIndex;
            let next = currentImageIndex + 1;
            // 向上找到第一个部分展示的漫画图片
            while (prev > 0 && _imageList[prev] && _imageList[prev].top > scrollTop) {
                prev -= 1;
            }
            // 向下找到第一个部分展示的漫画图片
            while (_imageList[next] && _imageList[next].top + _imageList[next].pxHeight < scrollTop + this.data._containerHeight) {
                next += 1;
            }
            let movableHeight = this.data._containerHeight;
            // 看到最后一张漫画图片，且图片未填满屏幕
            if (!_imageList[next]) {
                next -= 1;
                movableHeight = _imageList[next].top + _imageList[next].pxHeight - scrollTop;
            }
            return {
                movableHeight,
                editingImageList: _imageList.slice(prev, next + 1),
            };
        },
        onSend() {
            const { inputValue, focus, keybordHeight } = this.data;
            if (!inputValue) {
                const position = focus ? { bottom: `${keybordHeight + 50}px` } : { bottom: "320rpx" };
                util_showToast({ title: "请输入弹幕内容", position });
                return;
            }
            this.getScrollTop((scrollTop) => {
                this.setData({ inputValue: "", focus: false, focusInputStyle: "" }, () => {
                    this.triggerEvent("edit", {
                        content: inputValue,
                        ...this.getEditorData(scrollTop),
                        realScrollTop: scrollTop,
                    });
                    this.triggerEvent("send");
                });
            });
        },
        initStatus() {
            const { userId } = getApp().globalData;
            if (!userId) {
                this.setData({ isLogined: false });
            }
            const key = userId ? `uid:${userId}:barrage:status:new` : "barrage:status:new";
            wx.getStorage({
                key,
                complete: (res) => {
                    if (!isNaN(parseInt(res.data))) {
                        this.triggerEvent("update", {
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
            const key = userId ? `uid:${userId}:barrage:status:new` : "barrage:status:new";
            wx.setStorage({
                key,
                data: newStatus,
                fail: () => {
                    util_showToast({
                        title: "开关弹幕失败，请重试",
                        position: { bottom: "320rpx" },
                    });
                },
                success: () => {
                    this.setData({ status: newStatus }, () => {
                        this.triggerEvent("update", {
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
                        reject({ code: 0, message: "用户状态检测超时" });
                    }, 1000);
                });
            return Promise.race([
                timeout(),
                util_request({
                    url: `/v2/comments/mini/${channel}/can_comment`,
                    method: "get",
                }),
            ])
                .then((result) => {
                    this.data._checkPrivilegeDone = true;
                    return result[1];
                })
                .catch(({ code, message }) => {
                    if (code === 403) {
                        this.setData({ disable: true });
                        this.triggerEvent("appeal");
                    } else {
                        util_showToast({
                            title: message,
                            position: { bottom: "320rpx" },
                        });
                    }
                    // throw new Error(message);
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
        report(data) {
            const baseData = {
                TopicID: this.data._topicId,
                TopicName: this.data._topicTitle,
                ComicID: this.data._comicId,
                ComicName: this.data._comicTitle,
                ContentID: "0",
                TriggerPage: "ComicPage",
                IsSendSuccess: -1,
                SourcePlatform: channel,
            };
            Object.assign(baseData, data);
            const reportData = {
                distinct_id: getApp().globalData.userId,
                time: Date.now(),
                event: "BulletScreen",
                properties: baseData,
            };
            // 大数据上报
            try {
                util_request({
                    url: "/v1/app_data",
                    method: "post",
                    data: { data: Base64.encode(JSON.stringify(reportData)) },
                });
            } catch (e) {
                // do nothing;
            }
            // 神策上报
            getApp().kksaTrack("BulletScreen", baseData);
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
                const danmuRegionHeight = (res[0].height * 3) / 5;
                Object.assign(this.data, {
                    _containerHeight: containerHeight,
                    _containerWidth: containerWidth,
                    _danmuRegionHeight: danmuRegionHeight,
                });
                this.formatImgList();
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
