import { util_formatTime } from "../../util.js";
const app = getApp();

// 存储和获取挽留弹窗相关数据
const storeFn = (() => {
    const API = wx;

    // 格式化存储的数据, 防止存储超过10个账号信息
    const myInitSetData = ({ list = [], num = 1, time = 0 } = {}) => {
        const global = app.globalData;
        let maxLen = 10;

        list = Array.isArray(list) ? list : [];
        let dateTimeStamp = time || new Date().getTime();
        let newData = {
            userId: global.userId,
            showPopupNum: num,
            dateTimeStamp, // 记录的时间戳
        };
        let isUidNum = 0;

        list.forEach((item, i) => {
            if (item.userId == global.userId) {
                newData.showPopupNum = num || item.showPopupNum || 0; // 弹窗出现的次数
                list[i] = newData;
            } else {
                isUidNum = isUidNum + 1;
            }
        });
        if (list <= 0 || isUidNum == list.length) {
            list.push(newData);
        }
        if (list.length > maxLen) {
            list = list.slice(list.length - maxLen, list.length);
        }
        return list;
    };

    // 格式要获取的数据,防止无数据
    const myInitGetData = ({ list = [] } = {}) => {
        const global = app.globalData;

        list = Array.isArray(list) ? list : [];
        let data = null;
        let time = new Date().getTime() - 1000 * 60 * 60 * 24;
        list.forEach((item) => {
            if (item.userId == global.userId) {
                data = item;
            }
        });

        if (!data) {
            data = {
                userId: global.userId,
                dateTimeStamp: time,
                showPopupNum: 0,
            };
        } else {
            data.dateTimeStamp = data.dateTimeStamp || time;
            data.showPopupNum = data.showPopupNum || 0;
        }
        return data;
    };

    // 设置存储挽留弹窗的数据
    const setStoreVipData = ({ num = 1, time = 0 } = {}) => {
        let vipDetainmentListData = API.getStorageSync("vipDetainmentListData") || "[]";
        vipDetainmentListData = JSON.parse(vipDetainmentListData);
        vipDetainmentListData = myInitSetData({ list: vipDetainmentListData, num: num, time: time });
        API.setStorageSync("vipDetainmentListData", JSON.stringify(vipDetainmentListData));
    };

    // 设置存储最新的日期
    const setStoreDate = () => {
        let vipDetainmentListData = API.getStorageSync("vipDetainmentListData") || "[]";
        vipDetainmentListData = JSON.parse(vipDetainmentListData);
        vipDetainmentListData = myInitSetData({ list: vipDetainmentListData });
        API.setStorageSync("vipDetainmentListData", JSON.stringify(vipDetainmentListData));
    };

    // 设置当天弹窗出现过的次数
    const setStorePopupNum = (num) => {
        let vipDetainmentListData = API.getStorageSync("vipDetainmentListData") || "[]";
        vipDetainmentListData = JSON.parse(vipDetainmentListData);
        vipDetainmentListData = myInitSetData({ list: vipDetainmentListData, num });
        API.setStorageSync("vipDetainmentListData", JSON.stringify(vipDetainmentListData));
    };

    // 获取存储挽留弹窗的数据
    const getStoreVipData = () => {
        let vipDetainmentListData = API.getStorageSync("vipDetainmentListData") || "[]";
        vipDetainmentListData = JSON.parse(vipDetainmentListData);
        let data = myInitGetData({ list: vipDetainmentListData });
        return {
            timeStamp: data.dateTimeStamp,
            time: util_formatTime(data.dateTimeStamp, "yyyy-MM-dd"),
            ...data,
        };
    };

    // 获取存储的日期
    const getStoreDate = () => {
        let vipDetainmentListData = API.getStorageSync("vipDetainmentListData") || "[]";
        vipDetainmentListData = JSON.parse(vipDetainmentListData);
        let data = myInitGetData({ list: vipDetainmentListData });
        let dateTimeStamp = data.dateTimeStamp;
        return {
            time: util_formatTime(dateTimeStamp, "yyyy-MM-dd"), // 格式化后的时间字符串
            timeStamp: dateTimeStamp, // 当前时间戳
        };
    };

    // 获取今天日期
    const getTodayDate = () => {
        return {
            time: util_formatTime(new Date().getTime(), "yyyy-MM-dd"), // 格式化后的时间字符串
            timeStamp: new Date().getTime(), // 当前时间戳
        };
    };

    return {
        setStoreVipData, // 设置存储挽留弹窗的数据
        setStoreDate, // 设置存储最新的日期
        setStorePopupNum, // 设置当天弹窗出现过的次数
        getStoreVipData, // 获取存储挽留弹窗的数据
        getStoreDate, // 获取存储的日期
        getTodayDate, // 获取今天日期
    };
})();

// 判断日期
const judgmentDate = (() => {
    let mons = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    // 是否为闰年
    function isLeapYear(year) {
        let r = year / 100;
        if (r === parseInt(r)) {
            r = year / 400;
            return r === parseInt(r);
        }
        r = year / 4;
        if (r === parseInt(r)) {
            return true;
        }
        return false;
    }
    // 判断一个月的天数
    function getDaysOfMonth(month, year) {
        if (month === 2 && isLeapYear(year)) {
            return 29;
        }
        return mons[month];
    }
    // 判断一年的天数
    function getMonthsOfYear(year) {
        if (isLeapYear(year)) {
            return 366;
        }
        return 365;
    }
    // s1:存储的日期: 2021-12-1  s2:当前的日期
    function diff(s1, s2) {
        let arr1 = s1.split("-").map(Number);
        let arr2 = s2.split("-").map(Number);
        let [year, month, day] = arr2.map((n, i) => n - arr1[i]);
        if (day < 0) {
            day += getDaysOfMonth(arr2[1], arr2[0]);
            month--;
        }
        if (month < 0) {
            month += getMonthsOfYear(arr2[0]);
            year--;
        }
        return [year, month, day];
    }

    /**
     * judgmentDate 判断日期
     * @param s1 {{string}} 存储的日期
     * @param s2 {{string}} 当前的日期
     *
     * @return object
     * { today bool今天,pastDate bool过去日期,futureDate bool未来日期 }
     * **/
    function judgmentDate(s1, s2) {
        let isToday = 0; // 今天
        let isPastDate = 0; // 过去日期
        let isFutureDate = false; // 未来日期
        let arr = diff(s1, s2);
        for (let i = 0; i < arr.length; i++) {
            let item = arr[i];
            if (item < 0) {
                isFutureDate = true;
            }
            if (item >= 0) {
                isPastDate = isPastDate + 1;
            }
            if (item == 0) {
                isToday = isToday + 1;
            }
        }
        // 判断是否为今日
        if (isToday >= 3) {
            isToday = true;
        } else {
            isToday = false;
        }
        // 判断是否为过去时间
        if (isPastDate >= 3) {
            isPastDate = true;
        } else {
            isPastDate = false;
        }

        return {
            today: isToday, // 今天
            pastDate: isToday ? false : isPastDate, // 过去日期
            futureDate: isFutureDate, // 未来日期
            diff: diff(s1, s2),
        };
    }
    return judgmentDate;
})();

// 指定x秒间隔执行回调函数 s:默认10秒  cb:默认空函数 newthis:当前块的this
const specifySecondInterval = ({ newthis = "", s = 10, cb = "" } = {}) => {
    s = isNaN(s) ? 10 : Number(s);
    if (!cb || typeof cb != "function") {
        cb = () => {};
    }
    if (!newthis) {
        newthis = { data: {} };
    } else if (!newthis.data) {
        newthis.data = {};
    }
    newthis.data.time_s = setInterval(() => {
        s = s - 1;
        if (s == 0) {
            clearInterval(newthis.data.time_s);
            cb();
        }
    }, 1000);
};

// 指定x分钟间隔执行回调函数 m:默认20分钟  cb:默认空函数 newthis:当前块的this  debugSpeed:调试使用计时间隔 debugSpeed = false
const specifyMinuteInterval = ({ newthis = "", m = 20, cb = "" } = {}) => {
    // debugSpeed = app.globalData.environment != "prod" && debugSpeed ? debugSpeed : false;// 防止线上出问题
    m = isNaN(m) ? 20 : Number(m);
    if (!cb || typeof cb != "function") {
        cb = () => {};
    }
    if (!newthis) {
        newthis = { data: {} };
    }
    if (!newthis.data) {
        newthis.data = {};
    }
    let speed = 1000 * 60; // 倒计时速度
    let now = storeFn.getTodayDate(); // 获取今天日期(现在的)
    let record = storeFn.getStoreDate(); // 获取存储的日期
    let nowTimeStamp = now.timeStamp || 0;
    let recordTimeStamp = record.timeStamp || 0;
    let getTime = nowTimeStamp - recordTimeStamp;
    let getTimeM = Math.ceil(getTime / speed); // 间隔过期的分钟数
    // if (debugSpeed) { // 调试20分钟后第二次展示
    //     specifySecondInterval({ newthis, s: 30, cb });
    //     return false
    // }
    // 计算当前时间差的分钟
    if (getTimeM >= m) {
        // 间隔过去的分钟数大于等于间隔分钟数的情况
        specifySecondInterval({ newthis, s: 10, cb });
        return false;
    } else {
        // 间隔过去的分钟数小于间隔分钟数的情况
        m = m - getTimeM;
    }

    newthis.data.time_m = setInterval(() => {
        m = m - 1;
        if (m == 0) {
            clearInterval(newthis.data.time_m);
            cb();
        }
    }, speed);
};

const setStoreVipData = storeFn.setStoreVipData; // 设置存储挽留弹窗的数据
const setStorePopupNum = storeFn.setStorePopupNum; // 设置当天弹窗出现过的次数
const getStoreVipData = storeFn.getStoreVipData; // 获取存储挽留弹窗的数据
const getTodayDate = storeFn.getTodayDate; // 获取今天日期
const setStoreDate = storeFn.setStoreDate; // 更新一次记录的时间

export {
    setStoreVipData, // 设置存储挽留弹窗的数据
    setStorePopupNum, // 设置当天弹窗出现过的次数
    getStoreVipData, // 获取存储挽留弹窗的数据
    getTodayDate, // 获取今天日期
    specifySecondInterval, // 指定x秒间隔执行回调函数 s:默认10秒  cb:默认空函数 newthis:当前块的this
    specifyMinuteInterval, // 指定x分钟间隔执行回调函数 m:默认20分钟  cb:默认空函数 newthis:当前块的this
    judgmentDate, // 判断日期
    setStoreDate, // 更新一次记录的时间
};
