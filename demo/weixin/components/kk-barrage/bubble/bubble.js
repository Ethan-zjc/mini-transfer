/**
 * 弹幕气泡
 * 用于页面: comic
 * @author chenxin
 */
import { getStyle, checkStyle } from "./bubble-style";

Component({
    data: {
        _timer: 0,
        _preAction: "",
        left: 0,
        top: 0,
        playStatus: "",
        avatarUrl: "",
        editable: false,
        specialStyle: "",
        imgStyles: [],
        textStyle: "",
        hasStyle: false,
    },
    properties: {
        imageData: {
            type: Object,
            value: {
                key: "",
                top: 0,
                width: 0,
                height: 0,
                pxWidth: 0,
                pxHeight: 0,
            },
        },
        danmuData: {
            type: Object,
            value: {
                danmu_id: "",
                extend_coefficient: 1,
                stay_time: 1.5,
                editable: false,
                x_position: 0,
                y_position: 0,
                user: {
                    user_role: "user",
                    avatar_url: "",
                    id: 0,
                },
                bubble_id: 0,
            },
        },
        index: {
            type: Number,
            value: 0,
        },
        actionInfo: {
            type: Object,
            value: "",
        },
        menuShown: {
            type: Boolean,
            value: false,
        },
    },
    observers: {
        actionInfo(info) {
            const { action, danmuId } = info;
            if (!action || danmuId !== this.data.danmuData.danmu_id || action === this.data._preAction) {
                return;
            }
            this.data._preAction = action;
            // 点赞和踩
            if (action === "interact") {
                this.startDanmuPlayTimer(1.5);
                return;
            }
            // 删除
            if (action === "del") {
                this.startDanmuPlayTimer(0);
                return;
            }
        },
    },
    methods: {
        startDanmuPlayTimer(duration) {
            // 单位：秒
            if (this._timer) {
                clearTimeout(this._timer);
                this._timer = 0;
            }
            this._timer = setTimeout(() => {
                this._timer = 0;
                this.setData({ playStatus: "leave" });
            }, duration * 1000);
            return true;
        },
        onBubbleLeave() {
            this.triggerEvent("leave", {
                danmuId: this.data.danmuData.danmu_id,
                index: this.data.index,
            });
        },
        onDanmuTap() {
            const { top, left, index, danmuData, editable } = this.data;
            // menu定位需要用到高度
            // 弹幕高度
            const height = 80 / getApp().globalData.screenRpxRate;
            this.triggerEvent("triggermenu", {
                top,
                left,
                height,
                index,
                danmuId: danmuData.danmu_id,
                editable,
                key: this.data.imageData.key,
            });
        },
        decorateForIos(danmuHeight) {
            return new Promise((resolve, reject) => {
                wx.createSelectorQuery()
                    .in(this)
                    .select(".fake-text")
                    .fields({ size: true }, (size) => {
                        const paddingWidth = 36 / getApp().globalData.screenRpxRate;
                        getStyle(this.data.danmuData.bubble_id, danmuHeight, size, paddingWidth)
                            .then((res) => {
                                resolve(res);
                            })
                            .catch(reject);
                    })
                    .exec();
            });
        },
        decorate(danmuHeight) {
            if (getApp().globalData.isiOS) {
                return this.decorateForIos(danmuHeight);
            } else {
                return getStyle(this.data.danmuData.bubble_id, danmuHeight);
            }
        },
    },
    lifetimes: {
        attached() {
            // 弹幕气泡位置计算
            const { danmuData, imageData } = this.data;
            const left = (danmuData.x_position / imageData.width) * imageData.pxWidth;
            const top = (danmuData.y_position / imageData.height) * imageData.pxHeight + imageData.top;
            const { user } = danmuData;
            const avatarUrl = !user.avatar_url || /\/$/.test(user.avatar_url) ? "" : user.avatar_url;
            const editable = user.id == getApp().globalData.userId;
            this.data._preAction = this.data.action;
            checkStyle(this.data.danmuData.bubble_id).then((hasStyle) => {
                if (!hasStyle) {
                    this.setData({
                        left,
                        top,
                        playStatus: "enter",
                        avatarUrl,
                        editable,
                        hasStyle: false,
                    });
                    return;
                }
                // 处理特殊气泡样式
                // 弹幕高度
                const height = 100 / getApp().globalData.screenRpxRate;
                this.decorate(height)
                    .then((res) => {
                        this.setData({
                            left,
                            top,
                            playStatus: "enter",
                            avatarUrl,
                            editable,
                            specialStyle: res.style || "",
                            imgStyles: res.imgStyles || [],
                            textStyle: res.textStyle || "",
                            hasStyle: true,
                        });
                    })
                    .catch(() => {
                        this.setData({
                            left,
                            top,
                            playStatus: "enter",
                            avatarUrl,
                            editable,
                            specialStyle: "background: rgba(0, 0, 0, 0.6)",
                            hasStyle: true,
                        });
                    });
            });
        },
    },
});
