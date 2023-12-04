/**
 * 弹幕气泡
 * 用于页面: comic
 * @author chenxin
 */
Component({
    data: {
        _timer: 0,
        playList: [],
        playIndex: 0,
        _maxCount: 10,
        _autoPlayWhenLeave: false,
        actionInfoForBubble: {
            danmuId: "",
            action: "",
        },
        _playingFlagMap: {},
        _collisionList: [],
    },
    properties: {
        danmuList: {
            type: Array,
            value: [],
        },
        imageData: {
            type: Object,
            value: {},
        },
        scrollTop: {
            type: Number,
            value: 0,
        },
        danmuRegionHeight: {
            type: Number,
            value: 0,
        },
        actionInfo: {
            type: Object,
            value: {
                action: "",
                key: "",
                danmuId: "",
                index: 0,
            },
        },
        menuShown: {
            type: Boolean,
            value: false,
        },
    },
    observers: {
        danmuList() {
            this.data.playIndex = 0;
            this.autoPlay();
        },
        actionInfo(info) {
            if (info.key !== this.data.imageData.key || !info.action || !info.key || !info.danmuId) {
                return;
            }
            this.setData({ actionInfoForBubble: info });
        },
    },
    methods: {
        isDanmuInRegion(danmu) {
            if (!danmu) {
                return false;
            }
            const comicImage = this.data.imageData;
            const danmuTop = comicImage.top + (danmu.y_position / comicImage.height) * comicImage.pxHeight;
            const { scrollTop, danmuRegionHeight } = this.data;
            // 80: 弹幕高度设计尺寸常量
            const halfDanmuPxHeight = ((80 / getApp().globalData.screenRpxRate) * danmu.extend_coefficient) / 2;
            // 弹幕以中心点定位
            return danmuTop >= scrollTop + halfDanmuPxHeight && danmuTop + halfDanmuPxHeight / 2 < scrollTop + danmuRegionHeight;
        },
        isPlaying(danmu) {
            return this.data._playingFlagMap[danmu.danmu_id];
        },
        checkCollision(danmu) {
            return this.data.playList.some((item) => {
                const playingDanmu = item.danmuData;
                const xDis = Math.abs(playingDanmu.x_position - danmu.x_position);
                const yDis = Math.abs(playingDanmu.y_position - danmu.y_position);
                if (xDis >= 100 || yDis >= 40) {
                    return false;
                } else {
                    this.data._collisionList.push(danmu);
                    return true;
                }
            });
        },
        autoPlay(canPlayCollision = true) {
            const { _timer, danmuList, playList, playIndex, imageData, _maxCount, _collisionList } = this.data;
            // 有播放定时或待播放列表皆为空或同时播放弹幕已达最大值
            if (_timer || (danmuList.length < 1 && _collisionList.length < 1) || playList.length >= _maxCount) {
                this.data._autoPlayWhenLeave = playList.length >= _maxCount;
                return;
            }
            // 弹幕图片发生了变化，重置并开始新的播放
            const lastPlayItem = playList[playIndex];
            if (lastPlayItem && lastPlayItem.imageData.key !== imageData.key) {
                this.setData({ playList: [], playIndex: 0 }, () => {
                    this.autoPlay();
                });
                return;
            }
            // 从碰撞冲突和列表中选择播放
            const showcollisionDanmu = _collisionList.length > 0 && canPlayCollision;
            const danmuData = showcollisionDanmu ? _collisionList.shift() : danmuList[playIndex];
            if (!danmuData) {
                return;
            }
            // 不在播放区域或重复播放则直接播放下一条
            if (!this.isDanmuInRegion(danmuData) || this.isPlaying(danmuData)) {
                !showcollisionDanmu && (this.data.playIndex += 1);
                this.autoPlay();
                return;
            }
            // 碰撞检测，碰撞则立马播放下一条非碰撞列表中的弹幕
            if (this.checkCollision(danmuData)) {
                !showcollisionDanmu && (this.data.playIndex += 1);
                this.autoPlay(false);
                return;
            }
            // 播放并开始下一个计时
            const list = playList.concat([
                {
                    danmuData,
                    imageData,
                    danmuId: danmuData.danmu_id,
                },
            ]);
            this.setData({ playList: list }, () => {
                !showcollisionDanmu && (this.data.playIndex += 1);
                this.data._playingFlagMap[danmuData.danmu_id] = true;
                this.data._timer = setTimeout(() => {
                    this.data._timer = 0;
                    this.autoPlay();
                }, 400 + Math.random() * 300);
            });
        },
        onBarrageLeave(e) {
            const { danmuId, index } = e.detail;
            const playData = this.data.playList[index];
            if (playData && playData.danmuData.danmu_id === danmuId) {
                this.setData(
                    {
                        playList: [...this.data.playList.slice(0, index), ...this.data.playList.slice(index + 1)],
                    },
                    () => {
                        delete this.data._playingFlagMap[danmuId];
                        if (this.data._autoPlayWhenLeave) {
                            this.data._autoPlayWhenLeave = false;
                            this.autoPlay();
                        }
                    }
                );
            }
        },
        onTriggereMenu(e) {
            this.triggerEvent("triggermenu", e.detail);
        },
    },
});
