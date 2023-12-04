Component({
    properties: {
        activityData: {
            type: Object,
            value: null,
        },
    },

    data: {
        isShow: false,
        limitTime: 0,
        time: null,
    },

    attached() {
        const { activityData } = this.properties;
        const { banner_limit_time } = activityData;
        this.data.limitTime = banner_limit_time;
        this.countDown();
    },

    methods: {
        countDown() {
            let timer = setInterval(() => {
                let { limitTime } = this.data;
                if (limitTime <= 0) {
                    clearInterval(timer);
                    this.setData({
                        isShow: false,
                    });
                } else {
                    let d = 1000 * 60 * 60 * 24;
                    let D = Math.floor(limitTime / d);

                    let h = 1000 * 60 * 60;
                    let H = Math.floor((limitTime - D * d) / h); // Math.floor(ntimeRemaining / h);// Math.floor(ntimeRemaining / 1000 / 60 / 60);

                    let m = 1000 * 60;
                    let M = Math.floor((limitTime - D * d - H * h) / m); // Math.floor((ntimeRemaining - H * h) / m)

                    let s = 1000;
                    let S = Math.floor((limitTime - D * d - H * h - M * m) / s); // Math.floor((ntimeRemaining - H * h - M * m) / s)

                    let time = {
                        D,
                        H,
                        M,
                        S,
                    };
                    for (let key in time) {
                        time[key] = time[key] < 9 ? `0${time[key]}` : time[key];
                    }
                    this.data.limitTime -= 1000;

                    this.setData({
                        time,
                        isShow: true,
                    });
                }
            }, 1000);
        },
    },
});
