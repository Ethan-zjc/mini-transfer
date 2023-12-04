const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const { globalImgs } = require("../../../cdn.js");

import { util_request, util_action, util_showToast, util_transNum } from "../../../util.js";

const page = {
    data: {
        globalImgs,
        listTitle: "",
        query: {},
        offset: 1,
        limit: 10,
        list: [],
        error: false,
        empty: false,
        loading: true,
        finished: false,
        complete: false,
        running: true,
        isLogin: false,
        isFirst: true,
        version: "",

        time: null, // 定时器对象
        timeStr: "", // 格式后的时间字符串
        timeData: "", // 格式化后的时间对象
    },
    onLoad(options) {
        const { request_version = "v1" } = options;
        this.data.version = request_version;
        this.data.isFirst = true;
        this.getList();
    },
    onUnload() {
        this.clearDown();
    },
    onShareAppMessage() {},
    // 触底回调
    onReachBottom() {
        const { complete, running } = this.data;
        if (!complete && !running) {
            this.setData({
                running: true,
                loading: true,
            });
            this.getList();
        }
    },
    // 加载数据
    getList() {
        util_request({
            url: `/v1/checkin/api/mini/${global.channel}/benefit/discovery/list`,
            data: {
                request_version: this.data.version,
                gender: global.gender == null ? 0 : global.gender,
                page: this.data.offset,
            },
        })
            .then((res) => {
                const { data = {} } = res;
                const { title = "新用户免费看", free_deadline = 0, topic_list: topicList = [] } = data;
                const list = topicList.map((item) => {
                    return {
                        des: item.popularity_text || "",
                        id: item.id,
                        title: item.title,
                        img: item.vertical_image_url,
                        uuid: `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`,
                    };
                });
                this.setData({
                    list: this.data.list.concat(list),
                });

                const length = this.data.list.length;
                const empty = length == 0;
                const offset = empty ? -1 : this.data.offset + 1;
                const complete = offset === -1;

                this.setData({
                    offset,
                    loading: !complete,
                    running: false,
                    error: false,
                    complete,
                    empty,
                    finished: complete && !empty && length > 4,
                });

                if (this.data.isFirst) {
                    this.data.isFirst = false;
                    const countTime = free_deadline - new Date();
                    if (countTime > 0 && !empty) {
                        this.countDown(countTime);
                    }
                    wx.setNavigationBarTitle({ title });
                }
            })
            .catch(() => {
                this.setData({
                    error: true,
                    loading: false,
                });
            });
    },
    // 跳转专题
    action(e) {
        const { id, index } = e.currentTarget.dataset;
        util_action({ type: 68, id: "", parentid: id });
        app.kksaTrack("NewUserPageClk", {
            TriggerPage: "新手福利落地页",
            ButtonName: "新手福利页面按钮",
        });
    },
    // 畅读卡倒计时计算
    countDown(ntimeRemaining) {
        this.clearDown();
        let count = 1;
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
                    // if (H > 0) {
                    //     timeStr = `${D}天${H}小时`;
                    // } else {
                    //     timeStr = `${D}天`;
                    // }
                    timeStr = `${D}天${H}小时`;
                }
                if (D <= 0 && H < 24) {
                    timeStr = `${H}小时${M}分`;
                }
                if (D <= 0 && H <= 0) {
                    timeStr = `${M}分`;
                }
                if (D <= 0 && H <= 0 && M <= 0) {
                    timeStr = `${S}秒`;
                }
                // if (D <= 0 && H <= 0 && M <= 0) {
                //     timeStr = "";
                //     this.clearDown();
                // };
                // D = this.checkTime(D); // 补零后的天数
                // H = this.checkTime(H); // 补零后的小时
                // M = this.checkTime(M); // 补零后的分钟
                // S = this.checkTime(S); // 补零后的秒
                this.setData({
                    timeStr: timeStr, // ${D}天${H}小时${M}分${S}秒
                    timeData: { D: this.checkTime(D), H: this.checkTime(H), M: this.checkTime(M), S: this.checkTime(S) },
                });
            } else {
                this.clearDown();
                this.setData({
                    timeStr: "",
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
    // 将0-9的数字前面加上0，例1变为01
    checkTime(i) {
        if (i < 10) {
            i = "0" + i;
        }
        return i;
    },
    clearDown() {
        if (this.data.time) {
            clearInterval(this.data.time);
        }
    },
    countEnd() {
        console.log("倒计时结束");
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, pageTrigger, recMap }) => {
        return { userInfo, follows, pageTrigger, recMap };
    },
    (setState, _state) => ({
        setFollows(id, newVal) {
            const follows = _state.follows;
            follows[id] = newVal;
            setState({ follows });
        },
    })
)(page);

Page(ConnectPage);
