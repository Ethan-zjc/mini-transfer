const app = getApp();
const global = app.globalData;
Component({
    properties: {
        currentTime: {
            type: Number,
            value: 0,
            observer() {
                this.setCurrent();
            },
        },
        duration: {
            type: Number,
            value: 0,
            observer() {
                this.setDur();
            },
        },
        isClear: {
            type: Boolean,
            value: false,
            observer() {
                this.setPageX();
            },
        },
        isPlay: {
            type: Boolean,
            value: false,
        },
        isFullScreen: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        currentStr: "00:00",
        durStr: "00:00",
        isTouch: false,
        pageX: 0,
        pageNum: 0,
        infoWidth: 480,
        areaWidth: 544,
    },
    attached() {
        this.setFullWidth();
    },
    methods: {
        setCurrent() {
            const { currentTime, duration } = this.properties;
            if (this.data.isTouch) {
                return false;
            }
            if (duration) {
                const currentStr = this.formatTime(currentTime);
                this.setPageX({
                    currentStr,
                });
            } else {
                this.setData({
                    pageNum: 0,
                    pageX: 0,
                    currentStr: "00:00",
                    durStr: "00:00",
                });
            }
        },
        setDur() {
            const { duration } = this.properties;
            const durStr = this.formatTime(duration);
            this.setData({
                durStr,
            });
        },
        formatTime(value) {
            const m = parseInt(value / 60);
            const s = value - m * 60;
            return `${m > 9 ? m : "0" + m}:${s > 9 ? s : "0" + s}`;
        },
        tapButton() {
            this.triggerEvent("onSwitch");
        },
        setPageX(value = {}) {
            const { currentTime, duration } = this.properties;
            const maxWidth = this.formatMaxWidth();
            const pageX = maxWidth * (currentTime / duration);
            const pageNum = pageX / global.screenRpxRate;
            this.setData({
                pageNum: parseInt(pageNum),
                pageX: parseInt(pageX),
                ...value,
            });
        },
        handleChange(e) {
            const { x, source } = e.detail || {};
            if (source == "touch") {
                const pageX = x * global.screenRpxRate;
                this.setData({
                    isTouch: true,
                    pageX: parseInt(pageX),
                });
                this.handleThrottle(pageX);
            }
        },
        // 滑块移动结束
        handleEnd(val) {
            const { duration } = this.properties;
            const { isTouch } = this.data;
            const maxWidth = this.formatMaxWidth();
            const touchPre = parseInt((val / maxWidth) * 100);
            if (isTouch) {
                this.triggerEvent("onSeek", {
                    value: parseInt(duration * (touchPre / 100)),
                });
                setTimeout(() => {
                    this.setData({
                        isTouch: false,
                    });
                }, 500);
            }
        },
        handleThrottle(val) {
            if (this.data.pageTimer) {
                clearTimeout(this.data.pageTimer);
            }
            this.data.pageTimer = setTimeout(() => {
                clearTimeout(this.data.pageTimer);
                this.handleEnd(val);
            }, 300);
        },
        // 获取移动框最大宽
        formatMaxWidth() {
            const { isClear, isFullScreen } = this.properties;
            const { infoWidth } = this.data;
            const chunkWidth = 10;
            const maxWidth = isFullScreen ? infoWidth : isClear ? 480 : 686;
            const stripWidth = maxWidth - chunkWidth;
            return stripWidth;
        },
        setFullWidth() {
            const { isFullScreen } = this.properties;
            const { systemInfo = {}, screenRpxRate } = global;
            const { screenHeight = 0 } = systemInfo;
            const screenHeightRpx = screenHeight * screenRpxRate;
            if (!isFullScreen) {
                return false;
            }
            const fullWidth = parseInt(screenHeightRpx);
            const infoWidth = fullWidth - 216 - 160;
            this.setData({
                infoWidth: infoWidth,
                areaWidth: infoWidth + 64,
            });
        },
    },
});
