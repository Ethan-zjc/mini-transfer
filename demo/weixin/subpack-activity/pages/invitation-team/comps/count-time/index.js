const app = getApp();
const global = app.globalData;

Component({
    properties: {
        lastTime: {
            type: Number,
            value: 0,
        },
        type: {
            type: Number,
            value: 1,
        },
        fontColor: {
            type: String,
            value: "#8547F0",
        },
    },
    data: {
        time: null, // 定时器对象
        timeStr: "", // 格式后的时间字符串
        timeData: {}, // 格式化后的时间对象
        orifice: null,
    },
    observers: {
        lastTime() {
            this.throttle();
        },
    },
    attached() {
        this.throttle();
    },
    detached() {
        this.clearDown();
    },
    pageLifetimes: {
        hide() {
            this.clearDown();
        },
    },
    methods: {
        throttle() {
            if (this.data.orifice) {
                clearTimeout(this.data.orifice);
                this.data.orifice = null;
            }
            this.data.orifice = setTimeout(() => {
                this.countDown();
            }, 200);
        },
        // 将0-9的数字前面加上0，例1变为01
        checkTime(i) {
            if (i < 10) {
                i = "0" + i;
            }
            return i;
        },
        // 畅读卡倒计时计算
        countDown() {
            this.clearDown();
            let count = 1;
            let ntimeRemaining = this.data.lastTime;
            let fn = (type) => {
                if (!type && !this.data.time) {
                    return false;
                }
                if (ntimeRemaining > 0) {
                    let d = 1000 * 60 * 60 * 24;
                    let D = Math.floor(ntimeRemaining / d);

                    let h = 1000 * 60 * 60;
                    let H = Math.floor((ntimeRemaining - D * d) / h); // Math.floor(ntimeRemaining / h);// Math.floor(ntimeRemaining / 1000 / 60 / 60);

                    let m = 1000 * 60;
                    let M = Math.floor((ntimeRemaining - D * d - H * h) / m); // Math.floor((ntimeRemaining - H * h) / m)

                    let s = 1000;
                    let S = Math.floor((ntimeRemaining - D * d - H * h - M * m) / s); // Math.floor((ntimeRemaining - H * h - M * m) / s)

                    ntimeRemaining = ntimeRemaining - s * count; // 剩余的毫秒
                    let timeStr = "";
                    if (D >= 1) {
                        // timeStr = `${D}天${H}小时`;
                        H = H + D * 24;
                        D = 0;
                    }
                    // if (D <= 0 && H < 24) {
                    //     timeStr = `${H}小时${M}分`;
                    // }
                    // if (D <= 0 && H <= 0) {
                    //     timeStr = `${M}分`;
                    // };
                    // if (D <= 0 && H <= 0 && M <= 0) {
                    //     timeStr = `${S}秒`;
                    // };
                    // if (D <= 0 && H <= 0 && M <= 0) {
                    //     timeStr = "";
                    //     this.clearDown();
                    // };
                    D = this.checkTime(D); // 补零后的天数
                    H = this.checkTime(H); // 补零后的小时
                    M = this.checkTime(M); // 补零后的分钟
                    S = this.checkTime(S); // 补零后的秒
                    this.setData({
                        timeStr: `${H}:${M}:${S}`, // ${D}天${H}小时${M}分${S}秒
                        // timeStr: timeStr, // ${D}天${H}小时${M}分${S}秒
                        timeData: { D, H, M, S },
                    });
                } else {
                    this.clearDown();
                    this.setData({
                        timeStr: "00:00:00",
                        timeData: { D: "00", H: "00", M: "00", S: "00" },
                    });
                    this.countEnd();
                }
            };
            fn(true); // 初始化数据

            if (ntimeRemaining <= 0) {
                return false;
            }

            // 开始倒计时 1分钟执行一次
            this.data.time = setInterval(fn, 1000 * count);
        },
        clearDown() {
            if (this.data.time) {
                clearInterval(this.data.time);
            }
        },
        countEnd() {
            this.triggerEvent("timeEnd", { type: this.data.type });
        },
    },
});
