/**
 * 倒计时
 */
Component({
    options: {
        styleIsolation: "apply-shared",
    },
    properties: {
        lastTime: {
            type: Number,
            value: 0,
        },
    },
    data: {
        endtimeH: "00",
        endtimeM: "00",
        endtimeS: "00",
        endtimeD: "00",
        countTimer: null,
    },
    // 组件数据字段监听器，用于监听 properties 和 data 的变化
    observers: {
        lastTime() {
            this.timeStart();
        },
    },
    attached() {
        this.timeStart();
    },
    detached() {
        this.clearTimeEvent();
    },

    // 组件所在页面的生命周期函数
    pageLifetimes: {
        show() {},
        hide() {
            this.clearTimeEvent();
        },
        resize() {},
    },
    methods: {
        timeStart() {
            let _this = this;
            if (_this.data.lastTime > 0) {
                _this.clearTimeEvent();
                _this.data.countTimer = setInterval(() => {
                    _this.countTime();
                    let { endtimeD = "", endtimeH = "", endtimeM = "", endtimeS = "" } = this.data;
                    if (endtimeD == "00" && endtimeH == "00" && endtimeM == "00" && endtimeS == "00") {
                        clearInterval(_this.data.countTimer);
                    }
                }, 1000);
            }
        },
        countTime() {
            let differTime = this.data.lastTime - 1000;
            let d, h, m, s;
            if (differTime >= 0) {
                d = Math.floor(differTime / 1000 / 60 / 60 / 24);
                h = Math.floor((differTime / 1000 / 60 / 60) % 24);
                m = Math.floor((differTime / 1000 / 60) % 60);
                s = Math.floor((differTime / 1000) % 60);
                d = d < 10 ? "0" + d : d;
                h = h < 10 ? "0" + h : h;
                m = m < 10 ? "0" + m : m;
                s = s < 10 ? "0" + s : s;
            } else {
                d = "00";
                h = "00";
                m = "00";
                s = "00";
            }
            this.data.lastTime = differTime;
            this.setData(
                {
                    endtimeD: d,
                    endtimeH: h,
                    endtimeM: m,
                    endtimeS: s,
                },
                () => {
                    console.log();
                }
            );
        },
        clearTimeEvent() {
            if (this.data.countTimer) {
                clearInterval(this.data.countTimer);
            }
        },
    },
});
