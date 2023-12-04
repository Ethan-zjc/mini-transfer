import { util_getGender, util_updateUserInfo, util_hideToast, util_request, util_setGlobalObj, util_storageFun, util_startCount, util_logout, util_isPage, util_openWay, util_showToast, util_feedTrack, util_getLogManager, util_logManager, util_taskDone, util_compareVersion } from './util.js';

import Events from './common/js/subscribe.js';

const kksa = require('./static_npm/sa-sdk-miniprogram-1.14.23/product/sensorsdata.custom.full.js');
const { createStore } = require('./store.js');
const { miniInfo } = require('./mini.config.js');
const openId = wx.getStorageSync('openId') || '';
const header = wx.getStorageSync('header') || '';
const userId = header ? header.uid : '';
const userInfo = wx.getStorageSync('userInfo') || null;
const globalObj = wx.getStorageSync('globalObj') || {};
const { gender = null } = globalObj;
const wallet = '',
    vipInfo = {},
    follows = {},
    pageTrigger = {},
    webview = {},
    recMap = {};
const Store = createStore({ userInfo, wallet, vipInfo, follows, pageTrigger, webview, recMap });
const onRelease = miniInfo.release;
const onReleaseVersion = miniInfo.version;
const environment = onRelease ? 'prod' : wx.getStorageSync('environment') ? wx.getStorageSync('environment') : 'stag';
const { setState } = require('./store.js');

// 创建全局发布订阅函数
const events = new Events();
// 神策SDK初始化
const saProject = {
    prod: 'https://sa.kkmh.com/sa?project=applet_prod',
    test: 'https://sa.kkmh.com/sa?project=kuaikan_test',
};
const enviro = environment == 'prod' ? 'prod' : 'test';
const openContinuRead = onRelease ? false : !!wx.getStorageSync('openContinuRead');

// UA携带版本号
const versionText = onReleaseVersion.replace(/\./g, '');
const defVersion = (versionText + '00') * 1 + 330000;
const minVersion = defVersion < 584000 ? 584000 : defVersion;

kksa.setPara({
    show_log: !onRelease,
    batch_send: false,
    name: 'mini-program',
    server_url: saProject[enviro],
});
if (openId) {
    kksa.setOpenid(openId);
    kksa.init();
    if (userId) {
        kksa.login(String(userId));
    }
}

// 性能数据采集
// if (wx.reportPerformance && wx.getPerformance) {
//     const performance = wx.getPerformance();
//     const observer = performance.createObserver((entryList) => {
//         // console.log("性能采集数据", entryList.getEntries())
//         if (!entryList) {
//             return;
//         }
//         const str = JSON.stringify(entryList.getEntries());
//         entryList.getEntries().map(item => {
//             // 采集发现页、详情页数据
//             if (str && str.includes("/comic")) {
//                 const dimensions = item.entryType == "navigation" ? item.navigationType : item.entryType
//                 wx.reportPerformance(onRelease ? 2003 : 2002, item.duration, dimensions)
//             } else if (str && str.includes("/find")) {
//                 const dimensions = item.entryType == "navigation" ? item.navigationType : item.entryType
//                 wx.reportPerformance(onRelease ? 2005 : 2004, item.duration, dimensions)
//             }
//         })
//     })
//     observer.observe({ entryTypes: ["navigation", "render", "script"] });
// }

App({
    Store,
    globalData: {
        onRelease, // 用于提审包阶段，提审包阶段设置为 true , 开发阶段设置为 false
        onReleaseVersion, // 线上小程序版本号
        environment, // 环境变量，prod/preview/stag/dev
        channel: 'wechat', // 平台标识，微信: wechat，QQ: qq，用于接口url传参{channel}
        payfrom: 3, // 用于付费接口from参数的平台表示，微信: 3 qq:4   百度:8
        openId, // 与微信号绑定的唯一id
        userId, // 快看帐号唯一id
        gender, // 性别标识，0女性，1男性，3未知，用于接口参数传递
        scene: 0, // 场景值，每次App.onShow()更新，https://developers.weixin.qq.com/miniprogram/dev/reference/scene-list.html
        appId: '', // 部分场景值下还可以获取来源应用、公众号或小程序的appId，https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/scene.html
        cps: '', // 获取query参数cps的value
        logoutting: false, // 避免异步logout时，重复多次跳转登录页
        systemInfo: {}, // 系统信息，只在launch调用api获取一次，页面使用直接取globalData
        screenWidthPx: 0, // 屏幕真实宽度（物理像素宽*设备像素比得出）
        screenRpxRate: 2, // 1px=多少rpx，用于换算
        isiOS: false, // iOS的判断
        iPhoneX: false, // iPhoneX的判断
        userAgent: '', // UA，用于request-header
        reddot: false, // 小红点信息，个人页使用
        bubble: null, // 气泡信息
        bubbleCallback: null, // 气泡回调，气泡请求与页面渲染气泡组件一般是异步关系
        historyPosting: false, // 阅读历史在上传中，包括漫画详情页onHide上报，和登录后上报storage
        historyCallback: null, // 阅读历史上传完成的回调
        recharge: {}, // 活动配置信息（my「钱包」和wallet「客服」共用）
        toSignProgram: false, // 成功跳转到签约小程序（自动续费）
        openIdCallback: null, // 获取openId后的回调（仅首页使用）
        adData: [], // 广告数据
        gdtVid: '', // 获取query参数gdt_vid的value，用于上报跟踪id（click_id）
        shareContent: [], // 服务端下发自定义分享内容
        activityTrackId: '', // 获客活动标识随机码
        activityId: '', // all活动唯一id标识
        kksaIsEnable: true, // 神策初始化成功标识
        openContinuRead, // 是否开启连续阅读
        abContinuRead: false, // 实验控制连续阅读
        abtestSign: [], // AB实验标识

        adTopicId: '', // 从广告点进来，传递过来的topicId
        adGender: '', // 从广告点进来，传递过来的性别
        adAge: '', // 从广告点进来，传递过来的年龄区间
        openAcount: null, // 打开小程序次数，判断是否首次打开小程序
        openAcountCallback: null, // 打开小程序次数接口成功的回调
        labelWinClose: false, // 是否关闭用户选择标签
        launchInfo: {}, // onlaunch启动参数
        isOldUser: true, // 是否为老用户
        loginInfo: {},
        backBubbleData: {}, // 返回首页按钮记录数据
        backSource: '', // 返回首页来源记录
        globalObj, // 存储全局缓存数据
        favourite: [], // 自动关注，记录全局专题id
        notice: '', // 订阅消息来源
        locate: '', // 全局来源
        coldBoot: true, // 是否冷启动
        abtestFlag: false, // 获取实验标识接口是否已请求
        messageFlag: false, // 订阅消息模板接口是否已请
        messageTemp: [], // 订阅消息模板列表
        isUpdateNewUser: false, // 发现页新手专题模块是否强制刷新
        isExpNewUser: true, // 发现页是否允许曝光新手提示弹窗（冷启动只曝光一次）
        isLoadNewUser: true, // 是否请求新手福利模块（display接口）
        isSuspendedWin: true, // 是否显示悬浮框(20210528 新增)
        webviewRedirectUrl: false, // 全局变量记录的webview重定向地址
        mpSubscribeFlag: false, // 全局变量记录公众号订阅弹窗

        onLaunchStartTime: 0, // 性能耗时采集
        OnActionStartTimestamp: 0, // 性能耗时采集

        sySign: '', // 私域临时标识
    },
    onBehaviors(options) {
        if (this.globalData.channel == 'qq') {
            return options;
        } else if (this.globalData.channel == 'wechat') {
            return Behavior(options);
        }
    },
    onLaunch(options) {
        this.globalData.onLaunchStartTime = new Date().getTime();
        const { query } = options;
        this.globalData.gdtVid = query.gdt_vid || '';
        this.globalData.launchInfo = options;
        this.kksa = kksa; // 神策初始化方法运行
        wx.setStorageSync('startBenifit', 1);

        // this.syncOldHistory(); // 同步历史数据

        // 对于第一次打开新版本的用户，清除老版本storage，避免一些错误
        // if (wx.getStorageSync("startCount")) {
        //     // 暂时同步使用的异步存储、所以不能保证每次都没有被清除
        //     wx.removeStorageSync("userInfo");
        //     wx.removeStorageSync("searchHis");
        // }
        // 获取systemInfo和计算UA
        this.getSystemInfo().then(() => {
            // 初始化openId
            this.setOpenId().then(() => {
                this.globalData.isSuspendedWin = true;

                this.globalData.coldBoot = false;

                // 设置全局实验标识
                this.setAbTest().then((abtestSign) => {
                    // 连续阅读标识 s_Tlonglist_base(对照组 | 非连续) s_Tlonglist_a (连续阅读)
                    const sdkVersion = util_compareVersion(this.globalData.systemInfo.SDKVersion, '2.10.4') > 0;
                    this.globalData.abContinuRead = abtestSign.includes('s_xcximmerse_new') && sdkVersion;
                });

                // 通过openId，获取gender
                this.setGender().then(() => {
                    this.afterGenderCallback();
                });

                // 设置全局订阅消息模板
                this.setSubMessage();

                let timer = setTimeout(() => {
                    clearTimeout(timer);
                    // 获得小程序打开次数
                    this.getOpenAcount().then(() => {
                        // 初次获取后，执行回调
                        if (this.globalData.openAcountCallback) {
                            this.globalData.openAcountCallback();
                            this.globalData.openAcountCallback = null;
                        }
                        this.openTrack(options);
                    });
                    // 启动日志
                    util_getLogManager('launch', options);
                }, 800);
            });
        });

        // 获取广告
        this.handleAd();

        // 同步换成异步、非紧急内容存储放在后面处理不阻碍必要api获取信息
        util_storageFun({ type: 'remove', key: 'backBubble' });

        // 阅读历史可删除引导
        if (!wx.getStorageSync('guide:delHis')) {
            util_storageFun({ type: 'set', key: 'guide:delHis', data: true });
        }
        util_startCount(); // 新版启动次数+1

        // 删除一些用户本地明确不用的缓存
        util_storageFun({ type: 'remove', key: 'updateComicList' });
    },

    onShow(options) {
        const { scene, path, query, referrerInfo } = options;
        this.globalData.scene = scene;
        this.globalData.appId = (referrerInfo && referrerInfo.appId) || '';
        if (query) {
            if (query.cps) {
                this.globalData.cps = query.cps;
            }
            if (query.mediumtopicid) {
                this.globalData.adTopicId = query.mediumtopicid;
            }
            if (query.mediumgender) {
                this.globalData.adGender = query.mediumgender;
            }
            if (query.mediumage) {
                this.globalData.adAge = query.mediumage;
            }
            if (query.locate) {
                this.globalData.locate = query.locate;
            }
            if (query.notice) {
                this.globalData.notice = query.notice;
            }
        }

        // 获取systemInfo
        // this.getSystemInfo().then(res => {
        //     // 连续阅读, 用户本地实验标识已存在不更新问题兼容，用户不主动杀掉小程序
        //     if (this.globalData.systemInfo) {
        //         const sdkVersion = parseInt(this.globalData.systemInfo.SDKVersion.split(".").join("")) > 2104;
        //         if (!sdkVersion) {
        //             this.globalData.abContinuRead = false; // 确定版本不兼容，用户命中base组非连续阅读
        //         }
        //     }
        // });

        if (scene === 1038 || scene === 1001) {
            // 从另一个小程序打开
            const isPay = path.indexOf('pages/pay/pay') !== -1;
            if (this.globalData.toSignProgram && isPay && referrerInfo && referrerInfo.appId) {
                this.globalData.toSignProgram = false;
                const { appId, extraData } = referrerInfo;
                if (appId == 'wxbd687630cd02ce1d') {
                    // 从签约小程序跳转回来(此appId唯一)
                    const pages = getCurrentPages();
                    const currPage = pages[pages.length - 1];
                    const res = typeof extraData == 'undefined' ? '{}' : extraData;
                    currPage.complete(res, 'signpay_sucess');
                }
            }
        }

        // 热启动时才上报
        if (!this.globalData.coldBoot) {
            this.openTrack(options);
        }

        // 行为奖励领取
        setTimeout(() => {
            this.behavoirAward(scene);
        }, 500);

        // 小程序打开，调用上报接口，统计开启小程序的用户量
        this.getUserCountReport();

        // 私域标识别
        this.syInit();

        // 检测内存告警
        if (wx.canIUse('onMemoryWarning')) {
            this.globalData.onMemoryWarningSwitch = true;
            this.onMemoryWarning();
        }
    },
    onHide() {
        // 如果有新手福利挂件点击记录，则清除
        if (wx.getStorageSync('isbenifitClose')) {
            wx.removeStorageSync('isbenifitClose');
        }
        if (this.globalData.onMemoryWarningSwitch) {
            this.globalData.onMemoryWarningSwitch = false;
            wx.offMemoryWarning();
        }
    },

    // 私域内容
    syInit() {
        wx.getStorage({
            key: 'kksy:sign',
            success: (res) => {
                this.globalData.sySign = res.data || '';
                if (res.data) {
                    wx.showToast({
                        title: `当前存在短链标识 kksy_${res.data}`,
                        icon: 'none',
                        duration: 3000,
                    });
                }
            },
        });
    },

    // 行为场景进入领取奖励
    behavoirAward(scene) {
        const scenes = ['1023', '1035', '1089'];
        const userInfo = wx.getStorageSync('userInfo') || null;
        const dasktopTaskData = wx.getStorageSync('cultivate:desktopTaskData');
        // console.log('进入的场景值', scene, scenes.includes(scene));
        if (scene && userInfo && scenes.includes(scene.toString())) {
            // 4:关注公众号 5:添加到我的小程序 6:添加到手机桌面
            const events = {
                1023: 6,
                1035: 4,
                1089: 5,
            };
            util_request({
                method: 'get',
                host: 'pay',
                url: '/v1/payactivity/behavoir_task/take',
                data: {
                    event: events[scene.toString()],
                },
            })
                .then((res) => {
                    // 显示toast信息
                    const { assignFee } = res.data || {};
                    util_showToast({
                        title: `${assignFee}KK币已自动到账，请查收~`,
                        duration: 3000,
                        position: { bottom: '45%' },
                    });
                })
                .catch(() => {
                    // console.log(err);
                });
        }

        if (['1089', '1023'].includes(scene.toString()) && userInfo && dasktopTaskData) {
            const { activity_id, task_id } = dasktopTaskData;
            util_taskDone({ activity_id, task_id }).then(() => {
                util_showToast({
                    title: `任务完成！重新进入养成活动页面查看～`,
                    duration: 3000,
                });
                wx.removeStorageSync('cultivate:desktopTaskData');
            });
        }
    },

    // gender接口后初始化登录
    afterGenderCallback() {
        // 获取openId后，再初始化登录
        this.initUserInfo().catch(() => {});
        // 初次获取后，执行回调
        if (this.globalData.openIdCallback) {
            this.globalData.openIdCallback();
            this.globalData.openIdCallback = null;
        }
    },

    // 把失去的阅读历史拿回来
    async syncOldHistory() {
        const forUpload = wx.getStorageSync('forUpload');
        const hasRead = wx.getStorageSync('hasRead') || {};
        const synchronized = wx.getStorageSync('synchronized') || false; // 用户是否已经同步过
        if (synchronized) {
            return;
        }
        if (forUpload && userInfo) {
            // 旧版本阅读历史存在且用户已登陆，再次上报成功且种下标识、防止多次上报
            // 将旧版本阅读历史转化为新版本数据参数格式上报、不存在的直接不传
            const historyForPost = this.returnForPostData(forUpload, hasRead);
            this.recordDataSync(historyForPost, true);
        } else if (forUpload && !userInfo) {
            // 旧版本阅读历史存在且用户已登陆，合并到新版本地并存储
            let historyForMy = wx.getStorageSync('historyForMy') || [];
            let historyForTopic = wx.getStorageSync('historyForTopic') || {};
            let historyForPost = wx.getStorageSync('historyForPost') || [];
            const topic_ids = Object.keys(forUpload).join(',');

            // 旧版本中的hasRead需要同步到新版本的historyForTopic，专题选集历史数据
            if (hasRead) {
                Object.keys(hasRead).forEach((key) => {
                    const obj = hasRead[key];
                    if (historyForTopic[key]) {
                        // 存在相同的专题阅读历史，更新专题历史中已读章节数据
                        const forTopicList = historyForTopic[key]['readList'];
                        const forHasReadList = obj['readList'].map((id) => ({
                            id,
                            has_read: true,
                            continue_read_comic: obj.lastId && obj.lastId == id,
                            read_count: forUpload[key] && forUpload[key].picIndex ? forUpload[key].picIndex : 0,
                        }));

                        // 开始合并和覆盖、续读章节应该取新版的存在数据、不用更改，暂时理解已读章节列表信息也是最新的覆盖旧版本的
                        const mergeArry = forHasReadList.concat(forTopicList);
                        historyForTopic[key]['readList'] = this.filterArr(mergeArry, 'id');
                        historyForTopic[key]['lastId'] = obj.lastId;
                    } else {
                        historyForTopic[key] = {
                            readList:
                                obj.readList &&
                                obj.readList.map((item) => ({
                                    id: item,
                                    has_read: true,
                                    continue_read_comic: obj.lastId && obj.lastId == item,
                                    read_count: forUpload[key] && forUpload[key].picIndex ? forUpload[key].picIndex : 0,
                                })),
                            lastId: obj.lastId,
                        };
                    }
                });
            }

            // 先将老版本的数据格式转化为新版本格式
            const turnForMyArry = [];
            Object.keys(forUpload).forEach((key) => {
                const obj = forUpload[key];
                let continue_read_comic = {
                    id: obj.last,
                    title: obj.comicTit,
                    read_count: obj.picIndex || 0,
                };
                turnForMyArry.push({
                    id: key * 1,
                    title: obj.topicTit,
                    vertical_image_url: '',
                    comics_count: '',
                    continue_read_comic,
                    time: obj.time,
                    // read_count: hasRead[key] ? hasRead[key].readList.length : 0,
                    // continue_read_comic: historyForTopic[key] ? historyForTopic[key].lastId : obj.last,
                    read_count: historyForTopic[key] ? historyForTopic[key].readList.length : hasRead[key] ? hasRead[key].readList.length : 0, // 是为已读多少话、如果新版数据存在更新为最新版本的数据
                });
            });

            // 根据老版本缓存专题id查询一些本地需要使用的数据（竖图、漫画总章节）
            const { data } = await this.getCheckForUpdate(topic_ids);
            data.topic_info.forEach((item, index) => {
                if (item.can_display && turnForMyArry[index].id == item.topic_id) {
                    turnForMyArry[index].comics_count = item.comics_count;
                    turnForMyArry[index].vertical_image_url = item.vertical_image_url; // 等待服务端加上字段
                }
            });

            // 开始合并阅读历史的数据了，turnForMyArry  historyForMy
            // 根据阅读历史最后离开专题时间排序compareList, 最新阅读的在最前面
            const reverseArray = turnForMyArry
                .sort(this.compareList('time'))
                .map((item) => {
                    const obj = item;
                    delete obj.time;
                    return obj;
                })
                .reverse();
            const mergeForMyArry = reverseArray.concat(historyForMy);
            historyForMy = this.filterArr(mergeForMyArry, 'id');

            // 合并上报的历史进行本地存储、专题下的章节再进行遍历上报，顺序应该是详情页将最新的放在最前面
            const turnForPostArry = this.returnForPostData(forUpload, hasRead);
            const mergeForPostArry = historyForPost.concat(turnForPostArry);

            wx.setStorage({
                key: 'historyForTopic',
                data: historyForTopic,
            });
            wx.setStorage({
                key: 'historyForMy',
                data: historyForMy,
            });
            wx.setStorage({
                key: 'historyForPost',
                data: mergeForPostArry,
            });
            wx.setStorageSync('synchronized', true);
        }
    },

    // 需要上报服务端部分数据方法抽离
    returnForPostData(forUpload, hasRead) {
        const arry = [];
        const temArry = Object.keys(forUpload).map((item) => ({ time: forUpload[item].time, key: item }));
        temArry.sort(this.compareList('time')).forEach((item) => {
            const obj = forUpload[item.key];
            const list = hasRead[item.key] && hasRead[item.key].readList ? hasRead[item.key].readList : [];
            const uniteTime = obj.time - 5 * 60 * 1000; // 旧版本部分章节没有时间标识，将除续读话外，其他章节统一减5分钟
            list.forEach((comicId) => {
                let postObj = {
                    topic_id: item.key * 1,
                    comic_id: comicId,
                    read_time: obj.last == comicId ? obj.time : uniteTime,
                    read_count: obj.last == comicId ? obj.picIndex : 9999,
                };
                arry.push(postObj);
            });
        });
        return arry;
    },

    // 数组排序
    compareList(key) {
        return (obj1, obj2) => {
            if (Number(obj1[key]) < Number(obj2[key])) {
                return -1;
            } else if (obj1[key] === obj2[key]) {
                return 0;
            } else {
                return 1;
            }
        };
    },

    // 数组对象元素去重
    filterArr(arr, prop) {
        let hash = {};
        return arr.reduce((ss, item) => {
            // reduce累计器, ss是具体满足条件后返回的数据, item是数组依次循环的每一项
            hash[item[prop]] ? '' : hash[item[prop]] && ss.push(item);
            return ss;
        }, []);
    },

    // 查相应的专题最新总章节数量
    getCheckForUpdate(topic_ids) {
        let url = `/mini/v1/comic/${this.globalData.channel}/read_history/check_for_update`;
        let method = 'get';
        let host = 'api';
        let data = {
            topic_ids,
        };
        return util_request({ url, method, host, data, app: this });
    },

    // 阅读历史上报的方法
    recordDataSync(history, synchronized) {
        if (history && history.length) {
            const global = this.globalData;
            global.historyPosting = true;
            util_request({
                method: 'post',
                url: `/mini/v1/comic/${global.channel}/read_history/record_sync`,
                data: { record: JSON.stringify(history) },
            })
                .then(() => {
                    wx.removeStorageSync('historyForPost');
                    wx.removeStorageSync('historyForTopic');
                    wx.removeStorageSync('historyForMy');
                    global.historyPosting = false;
                    if (synchronized) {
                        wx.setStorageSync('synchronized', true);
                    }
                    if (global.historyCallback) {
                        global.historyCallback();
                        global.historyCallback = null;
                    }
                })
                .catch(() => {
                    wx.setStorage({
                        key: 'historyForPost',
                        data: history,
                    });
                });
        }
    },

    getSystemInfo() {
        return new Promise((resolve) => {
            const global = this.globalData;
            wx.getSystemInfo({
                success: (res) => {
                    global.systemInfo = res;
                    const model = res.model;
                    const isiOS = ['iPhone', 'iPad', 'iPod', 'iPodtouch', 'unknown', 'Unknown'].filter((item) => {
                        return model.indexOf(item) === 0;
                    });
                    let infos = isiOS[0] || '';
                    // iphone5s是Unknown, iphone 11系列不支持前unknown<iPhone12,1>,现支持是model:::iPhone 11<iPhone12,1>
                    if (infos === 'Unknown' || infos === 'unknown') {
                        infos = 'iPhone';
                    }
                    if (infos === '') {
                        global.isiOS = false;

                        // windows存在三位情况(Windows 10 x64),截取前两位
                        const sysInfos = res.system.split(' ');
                        infos = sysInfos.length > 2 ? sysInfos.slice(0, 2).join(';') : sysInfos.join(';');
                    } else {
                        global.isiOS = true;
                        // 从机型和model两个纬度判断，模拟器返回的是机型，真机包含的有model
                        global.iPhoneX =
                            model.includes('unknown') ||
                            model.includes('iPhone X') ||
                            model.includes('iPhone 11') ||
                            model.includes('iPhone 12') ||
                            model.includes('iPhone10,3') ||
                            model.includes('iPhone10,6') ||
                            model.includes('iPhone11') ||
                            model.includes('iPhone12') ||
                            model.includes('iPhone 13') ||
                            model.includes('iPhone 14');
                        infos += `;${res.system}`;
                    }

                    // 添加适配mac
                    if (res.platform == 'mac') {
                        global.isiOS = true;
                    }

                    const haslt = model.indexOf('<') !== -1;
                    infos += `;${haslt ? model.substring(model.indexOf('<') + 1, model.indexOf('>')) : model}`;
                    const ratio = res.pixelRatio;
                    const screenWidth = res.screenWidth;
                    const screenWidthPx = ratio * screenWidth;
                    global.screenWidthPx = screenWidthPx;
                    global.screenWidth = screenWidth;
                    global.ratio = ratio;
                    global.screenRpxRate = 750 / res.windowWidth;
                    if (res.windowWidth && res.screenWidth && res.windowWidth != res.screenWidth) {
                        global.screenRpxRate = 750 / (res.windowWidth > res.screenWidth ? res.screenWidth : res.windowWidth);
                    }
                    global.userAgent = `KuaikanMiniProgram/1.0.0/${minVersion}(${infos};${global.channel};WIFI;${ratio * res.screenHeight}*${screenWidthPx})`;
                    resolve();
                },
            });
        });
    },

    initUserInfo() {
        return new Promise((resolve, reject) => {
            // 判断为曾经登录过的用户（可以直接拿到uid && 不管是否登录过期）
            const userId = this.globalData.userId;
            if (userId) {
                // 通过userId获取userInfo
                util_request({
                    app: this,
                    url: '/v2/users/me',
                    data: { user_id: userId },
                })
                    .then((res) => {
                        const userInfo = res.data;
                        wx.setStorageSync('userInfo', userInfo);
                        this.handleUserStuff();
                        resolve(userInfo);
                    })
                    .catch(() => {
                        util_logout();
                    });
            } else {
                reject();
            }
        });
    },

    // 登录完成后要做的事（包括未登录-登录，登录-登录）
    // 小红点、关注更新气泡、付费气泡/运营位，信息获取
    // 本地阅读历史上报
    handleUserStuff() {
        const global = this.globalData;
        // 小红点
        util_request({
            url: '/v2/timeline/all_status',
            data: { start_time: new Date().getTime() },
        }).then((res) => {
            const reddot = !!res.data.favourite_unread;
            global.reddot = reddot;
            const pageMy = util_isPage('my');
            // 请求结束时已经在tabbar页（无法触发onShow的设置事件）
            if (pageMy || util_isPage('feed') || util_isPage('find')) {
                if (reddot) {
                    wx.showTabBarRedDot({ index: 3 });
                }
                if (pageMy) {
                    // 请求结束时已经在个人页
                    pageMy.setData({ reddot });
                }
            }
        });
        // 气泡
        let bubbles = [];
        const setBubble = () => {
            if (bubbles.length == 2) {
                let bubble = Object.assign(bubbles[0], bubbles[1]);
                if (!bubble.title && !bubble.topic) {
                    bubble = null;
                }
                global.bubble = bubble;
                if (global.bubbleCallback) {
                    global.bubbleCallback(bubble);
                    global.bubbleCallback = null;
                }
            }
        };
        // 关注更新气泡
        util_request({
            url: `/mini/v1/comic/${global.channel}/favourite/remind_layer`,
        })
            .then((res) => {
                const data = res.data;
                bubbles.push(
                    data
                        ? {
                              topic: data.topic.title,
                              update: data.unread_comic_count,
                          }
                        : {}
                );
                setBubble();
            })
            .catch(() => {
                bubbles.push({});
                setBubble();
            });
        // 付费气泡/运营位信息拉取
        util_request({
            host: 'pay',
            url: '/v2/kb/banner/h5_recharge',
            data: { from: global.payfrom || 3 },
        })
            .then((res) => {
                let data = res.data.banners[0];
                if (data && data.mini_views) {
                    data = data.mini_views;
                    global.recharge = {
                        wallet: data.wallet_text,
                        customer: data.customer_service_text,
                    };
                    bubbles.push({
                        title: data.mine_text,
                    });
                } else {
                    bubbles.push({});
                }
                setBubble();
            })
            .catch(() => {});
        // 本地阅读历史上报
        const history = wx.getStorageSync('historyForPost');
        this.recordDataSync(history);
    },

    openTrack(options) {
        const { query } = options;
        // 首次打开
        const count = wx.getStorageSync('newStartCount') || 0;
        const FirstOpen = count == 1;

        // 打开方式
        const scene = this.globalData.scene;
        // const channel = this.globalData.channel;
        let ProgramOpenWay = util_openWay(scene, this);

        // 增长channel
        const channels = query.channel;
        const channelsType = {
            1: '免费渠道',
            2: '付费渠道',
        };
        const channelDefault = {
            Channels: '30000',
            ChannelsType: '其他',
        };

        if (channels) {
            const first = channels.slice(0, 1);
            Object.assign(channelDefault, {
                Channels: query.channel,
                ChannelsType: channelsType[first] || '其他',
            });
        }

        const source = query.source || '';

        if (source == '1001') {
            ProgramOpenWay = 'm站导流';
        } else if (source == '1002') {
            ProgramOpenWay = 'pc导流';
        }

        const programOptions = {
            FirstOpen,
            ProgramOpenWay,
            IsLogin: !!this.globalData.userId,
            OpenCount: this.globalData.openAcount || 0,
            ...channelDefault,
        };

        // 直达详情页
        // if (path.indexOf("pages/comic/comic") > -1 && query.id) {
        //     programOptions.ComicID = Number(query.id);
        // }

        this.kksaTrack('OpenProgram', programOptions);
    },
    // 获取相关广告信息
    handleAd() {
        const { channel } = this.globalData;
        const list = [
            {
                type: 'feed_4', // feed第4广告位
                index: 3,
                wechat: {
                    position: '3.1.d.1',
                    unitId: 'adunit-656db48fe064ef51',
                    type: 'video',
                },
                qq: {
                    position: '3.1.d.3',
                    unitId: '942cd44cffb6cc09552513337bf9ed61',
                    type: 'card',
                },
            },
            {
                type: 'feed_8', // feed第8广告位
                index: 7,
                wechat: {
                    position: '3.1.d.2',
                    unitId: 'adunit-caef4399136480da',
                    type: 'video',
                },
                qq: {
                    position: '3.1.d.4',
                    unitId: 'f44e2c647979db3770c1148efbaf73fa',
                    type: 'card',
                },
            },
            {
                type: 'find_top', // 发现页第1广告位
                index: 2,
                wechat: {
                    position: '3.1.c.1',
                    unitId: 'adunit-e2944303a812e4f5',
                    newId: 'adunit-dbcbc135f8f34e5b',
                    type: 'banner',
                },
                qq: {
                    position: '3.1.c.2',
                    unitId: 'c688b423021df2770151fd7415768512',
                    type: 'card',
                },
            },
            {
                type: 'comic_center', // 详情页底部广告位
                index: 0,
                wechat: {
                    position: '3.1.e.1',
                    unitId: 'adunit-88ee40f2e9fc44b5',
                    newId: 'adunit-470e81355ff213ef',
                    type: 'video',
                },
                qq: {
                    position: '3.1.e.2',
                    unitId: 'de141e4876a51eeddf6c03767fdbf72a',
                    type: 'card',
                },
            },
        ];
        this.globalData.adData = list.map((item) => {
            const row = item[channel] || {};
            return {
                ad_type: item.type,
                ad_position_id: row.position,
                custom_index: item.index,
                custom_unit_id: row.unitId,
                custom_new_id: row.newId || '',
                custom_type: row.type,
            };
        });
    },
    // 小程序打开调用，统计每日启动小程序的用户
    getUserCountReport() {
        this.getOpenId().then(() => {
            util_request({
                app: this,
                url: '/mini/v1/device/open/report',
                method: 'post',
            });
        });
    },
    // 神策埋点方法 需要判断是否要调用abtest接口
    kksaTrack(eventName, props) {
        this.getAbTest().then(() => {
            this.kksaTrackReport(eventName, props);
        });
    },
    // 神策埋点方法上报 (原kksaTrack方法)
    kksaTrackReport(eventName, props) {
        const { channel, cps, onRelease, onReleaseVersion, abtestSign, locate, openId, gender, userId } = this.globalData;

        const options = {
            SourcePlatform: channel,
            mini_program_version: onRelease ? onReleaseVersion : '1.0.0',
            uid: userId,
            abtestSign: abtestSign,
            AppletName: '快看mini',
            PackageId: 'com.kuaikan.main',
            MiniProgramID: openId,
            GenderType: gender == 0 ? '女' : gender == 1 ? '男' : '未知',
        };

        if (cps) {
            options.cps_parameter = cps;
        }

        if (locate) {
            options.Locate = locate;
        }

        // 部分事件迁移数仓
        const eventList = ['OpenProgram', 'Consume', 'ReadTopic', 'ReadComic', 'CommonItemImp', 'CommonItemClk', 'CommonPageOpen', 'BeMembershipResult', 'RechargeResult', 'Like', 'Share', 'FavTopic', 'ItemImp', 'ItemClk', 'Search'];
        if (eventList.includes(eventName)) {
            // 历史遗留只报数仓util_feedTrack方法
            // 1、数仓会存在批量上报，即props为数组，此种必须只上报数仓方法，神策不支持
            // 2、数仓上报属性和神策上报属性不一致问题，征求产品意见是否可以统一(可以统一)

            // 过滤只报数仓事件
            const onceName = ['Share', 'ItemImp', 'ItemClk'];

            let isAry = Object.prototype.toString.call(props) === '[object Array]';
            util_feedTrack(eventName, props);

            // props为数组(历史遗留)或者只上报神策
            if (isAry || onceName.includes(eventName)) {
                return;
            }
        }

        if (this.kksa) {
            this.kksa.track(eventName, Object.assign(options, props));
        }
    },

    // 离开页面时，清空广告链接的参数
    clearAdParam() {
        this.globalData.adTopicId = '';
        this.globalData.adGender = '';
        this.globalData.adAge = '';
    },

    // 获取小程序打开次数
    getOpenAcount() {
        return new Promise((resolve) => {
            util_request({
                app: this,
                url: '/v2/passport/mini_open/record',
                method: 'post',
            }).then((res) => {
                const { data = {} } = res;
                const { open_count } = data;
                this.globalData.openAcount = open_count;
                resolve();
            });
        });
    },

    /**
     * 检测内存告警
     * 当检测到用户内存紧张时给出弹窗提示，当用户点击我知道了回收其他折叠页面，重新打开当前页面
     * 为了防止直接reLaunch页面没有来源页面右上角显示home图标（有些机型不显示home问题），我们在路由栈里压了一个首页栈
     */
    onMemoryWarning() {
        wx.onMemoryWarning((res) => {
            // 如果onshow中直接触发kennel存在拿不到页面栈根据情况待确定
            const pages = getCurrentPages();
            const length = pages.length;
            if (!length) {
                return;
            }
            const { options, __wxExparserNodeId__ = '' } = pages[length - 1];
            const urlOption = Object.keys(options)
                .map((item) => `${item}=${options[item]}`)
                .join('&');

            util_logManager({
                LogType: 'memory',
                WarningLevel: res.level || -1, // 告警等级
                PagesLength: length, // 页面栈深度
                CurPageParams: urlOption || '', // 页面参数
                ExparserNodeId: __wxExparserNodeId__, // 页面实例id
            });
        });
    },

    // 微信/QQ登录（用户主动授权获取信息） isTrack: 登录后是否上报埋点
    originLogin(e, isTrack = true) {
        return new Promise((resolve, reject) => {
            this.globalData.resolve = resolve;
            this.globalData.reject = reject;
            this.globalData.isTrack = isTrack;
            this.originUserInfo().then((resInfo) => {
                wx.login({
                    success: (res) => {
                        // 登录前行为
                        util_showToast({ type: 'loading', title: '登录中...' });
                        util_logout(true, true);
                        const code = res.code;
                        // 页面级存储数据
                        this.globalData.loginInfo = { detail: resInfo, code };
                        util_request({
                            method: 'get',
                            url: `/v2/passport/oauth/check`,
                            data: {
                                oauth_token: code,
                                oauth_provider: 'wechat',
                                from: 'mini',
                            },
                        })
                            .then((res) => {
                                // 判断是否注册过快看
                                const { exist_user } = res.data;
                                // 是否为老用户
                                this.globalData.isOldUser = exist_user;
                                if (exist_user) {
                                    // 注册过
                                    this.signup({ detail: resInfo, code }, resolve, reject, isTrack);
                                } else {
                                    // 没注册过
                                    // 2次确认对话框显示
                                    util_hideToast();
                                    // this.showDialog()
                                    let pages = getCurrentPages();
                                    let curpage = pages[pages.length - 1];
                                    curpage.showDialog();
                                }
                            })
                            .catch((e) => {
                                // 接口失败时
                                util_showToast({
                                    title: e.message,
                                    duration: 3000,
                                });
                            });
                    },
                });
            });
        });
    },
    originUserInfo() {
        return new Promise((resolve) => {
            if (wx.getUserProfile) {
                wx.getUserProfile({
                    desc: '用于完善用户信息资料',
                    success: (resInfo) => {
                        resolve(resInfo);
                    },
                    fail: () => {
                        util_hideToast();
                    },
                });
            } else {
                wx.getUserInfo({
                    success: (resInfo) => {
                        resolve(resInfo);
                    },
                    fail: () => {
                        util_hideToast();
                        util_logout();
                    },
                });
            }
        });
    },
    onDialogButtontapEvent(e) {
        let pages = getCurrentPages();
        let curpage = pages[pages.length - 1];
        curpage.hideDialog();
        // 拒绝时，注册/登录快看
        const loginInfo = this.globalData.loginInfo;
        if (e.detail.index == 0) {
            this.signup(
                {
                    detail: loginInfo.detail,
                    code: loginInfo.code,
                },
                this.globalData.resolve,
                this.globalData.reject,
                this.globalData.isTrack
            );
        }
    },
    onDiallogGetPhoneNumberEvent(e) {
        let pages = getCurrentPages();
        let curpage = pages[pages.length - 1];
        curpage.hideDialog();
        // 同意授权时，
        const { phone_data, phone_iv } = e.detail;
        const loginInfo = this.globalData.loginInfo;
        // 用户同意手机号授权时，
        this.signup(
            {
                detail: loginInfo.detail,
                code: loginInfo.code,
                phone_data,
                phone_iv,
            },
            this.globalData.resolve,
            this.globalData.reject,
            this.globalData.isTrack
        );
    },
    // signup 注册通用方法
    signup(options, resolve, reject, isTrack) {
        const { detail, code, phone_data, phone_iv } = options;
        const { channel, gdtVid } = this.globalData;
        const params = {
            code: code,
            data: JSON.stringify(detail),
            phone_data: phone_data || '', // 必填项，值可为空
            phone_iv: phone_iv || '', // 必填项，值可为空
        };

        // 微信接入api上报click_id
        if (channel == 'wechat' && !!gdtVid) {
            Object.assign(params, {
                click_id: gdtVid,
            });
        }

        util_request({
            method: 'post',
            url: `/v1/passport/mini/${channel}_signup`,
            data: params,
        })
            .then((res) => {
                // 注册过则上报登陆埋点  否则上报注册埋点
                if (this.globalData.isOldUser) {
                    this.trackLogIn(res.data.reg_type, true, '', isTrack); // 上报 登陆埋点
                } else {
                    this.trackSignIn(true, ''); // 上报 注册埋点
                }

                this.loginSuccess(res.data.id, resolve);
            })
            .catch((e) => {
                reject();
                // 注册过则上报登陆埋点  否则上报注册埋点
                const regType = this.globalData.channel; // wechat qq baidu
                if (this.globalData.isOldUser) {
                    this.trackLogIn(regType, false, e.message, isTrack); // 上报 登陆埋点
                } else {
                    this.trackSignIn(false, e.message); // 上报 注册埋点
                }

                // this.loginFail(e)
                util_logout(true, true);
                util_hideToast();

                util_showToast({
                    title: e.message,
                    duration: 3000,
                });
            });
    },
    // 上报登陆埋点
    trackLogIn(regType, loginState, errMsg, isTrack = true) {
        if (!isTrack) {
            return false;
        }
        const LOGIN_LIST = { wechat: '微信', qq: 'qq', phone: '手机号' }; // 登陆类型
        const data = {
            CurPage: '静默方式',
            SourcePlatform: this.globalData.channel, // 来源平台
            LoginType: LOGIN_LIST[regType], // 登录方式 QQ、微信、手机号
            TriggerPage: 'MyHomePage', // 触发页面 我的主页
            IsLogSuccess: loginState, // 是否登录成功 true/false
            LogFailError: loginState ? '' : errMsg, // 登录失败原因
        };
        this.kksaTrack('LoginProgram', data);
    },
    // 上报注册埋点
    trackSignIn(loginState, errMsg) {
        const channel = this.globalData.channel; // 平台
        const LOGIN_LIST = { wechat: '微信', qq: 'qq', phone: '手机号' }; // 登陆类型
        const data = {
            CurPage: '静默方式',
            SourcePlatform: channel, // 来源平台
            SignupType: LOGIN_LIST[channel], // 注册方式 QQ、微信、手机号
            TriggerPage: 'MyHomePage', // 触发页面 我的主页
            IsSignSuccess: loginState, // 是否注册成功 true/false
            SignFailError: loginState ? '' : errMsg, // 注册失败原因
        };
        this.kksaTrack('SignProgram', data);
    },
    // 登录成功后
    loginSuccess(uid, resolve) {
        this.globalData.userId = uid;

        // 登录成功后调用上报信息接口
        util_updateUserInfo({
            gender: this.globalData.gender || 0,
            medium_age: '',
            request_type: 2,
            tags: '',
        });

        // 重新登录后distinct_id都会覆盖掉旧的uid
        if (this.kksa) {
            this.kksa.login(String(uid));
        }
        this.initUserInfo().then((userInfo) => {
            setState({
                userInfo: userInfo,
            });
            util_hideToast();
            resolve();
        });
    },
    // 设置openId，仅执行一次
    setOpenId() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.openId) {
                resolve(global.openId);
            } else {
                this.autoLogin().then((res) => {
                    const { code, open_id: openId } = res;
                    if (code == 14220 || !openId) {
                        this.codeInfo().then((id) => {
                            this.setOpenIdAfter(id);
                            resolve(id);
                        });
                    } else {
                        this.setOpenIdAfter(openId);
                        resolve(openId);
                    }
                });
            }
        });
    },
    // 获取openID之后，进行初始化一些关联信息
    setOpenIdAfter(openId) {
        const global = this.globalData;
        util_storageFun({ type: 'set', key: 'openId', data: openId });
        global.openId = openId;
        if (this.kksa) {
            this.kksa.setOpenid(openId);
            this.kksa.init();
            if (global.userId) {
                this.kksa.login(String(global.userId));
            }
        }
        events.publish('openId', openId);
    },
    // 自动登录&获取openID
    autoLogin() {
        return new Promise((resolve) => {
            wx.login({
                success: (loginRes) => {
                    const loginUrl = '/v1/passport/mini/wechat_auto_login';
                    const loginCode = loginRes.code;
                    util_request({
                        app: this,
                        method: 'post',
                        url: loginUrl,
                        data: { code: loginCode },
                    })
                        .then((res) => {
                            const { code, data = {}, message } = res;
                            const { user = {}, open_id } = data;
                            const { id } = user;
                            this.globalData.openId = open_id;
                            this.loginSuccess(id, () => {
                                // console.log('wechat_auto_login:success');
                            });
                            resolve({ code, open_id });
                            util_logManager({
                                LogType: 'login',
                                LogInfo: {
                                    loginCode,
                                },
                                ErrorCode: code,
                                ErrorMsg: message,
                                RequestUrl: loginUrl,
                            });
                        })
                        .catch((res) => {
                            const { code, data = {} } = res;
                            const { open_id } = data;
                            resolve({ code, open_id });
                        });
                },
            });
        });
    },
    // 获取openID专用接口
    codeInfo() {
        return new Promise((resolve) => {
            const global = this.globalData;
            wx.login({
                success: (res) => {
                    util_request({
                        app: this,
                        url: '/v2/passport/oauth/code_info',
                        data: {
                            code: res.code,
                            source: global.channel,
                        },
                    }).then((res) => {
                        const openId = res.data.open_id;
                        resolve(openId);
                    });
                },
            });
        });
    },
    // 获取openId
    getOpenId() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.openId) {
                resolve(global.openId);
            } else {
                events.subscribe('openId', (id) => {
                    resolve(id);
                });
            }
        });
    },
    // 设置性别，仅执行一次
    setGender() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.gender != null) {
                resolve(global.gender);
            } else {
                util_getGender(this)
                    .then((gender) => {
                        events.publish('gender', gender);
                        util_setGlobalObj({ key: 'gender', value: gender });
                        resolve(gender);
                    })
                    .catch(() => {
                        const gender = 3;
                        global.gender = gender;
                        events.publish('gender', gender);
                        resolve(gender);
                    });
            }
        });
    },
    // 获取性别
    getGender() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.gender != null) {
                resolve(global.gender);
            } else {
                events.subscribe('gender', (gender) => {
                    resolve(gender);
                });
            }
        });
    },
    // 设置ab实验标识，仅执行一次
    setAbTest() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.abtestFlag) {
                resolve(global.abtestSign);
            } else {
                util_request({
                    app: this,
                    url: '/v2/scheme/list/mini',
                })
                    .then((res) => {
                        const { code, data } = res;
                        this.globalData.abtestFlag = true;
                        if (code == 200) {
                            const abTestList = data.scheme_list || [];
                            const abtestSign = abTestList.map((item) => {
                                return item.identity;
                            });
                            this.globalData.abtestSign = abtestSign;
                            resolve(abtestSign);
                            events.publish('abTest', {
                                code: 200,
                                data: { list: abtestSign },
                            });
                        } else {
                            resolve(global.abtestSign);
                            events.publish('abTest', { code });
                        }
                    })
                    .catch(() => {
                        this.globalData.abtestFlag = true;
                        resolve(global.abtestSign);
                        events.publish('abTest', { code: 2005 });
                    });
            }
        });
    },
    // 获取ab实验标识
    getAbTest() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.abtestFlag) {
                resolve(global.abtestSign);
            } else {
                events.subscribe('abTest', (res) => {
                    const { code, data = {} } = res;
                    if (code == 200) {
                        resolve(data.list);
                    } else {
                        resolve(global.abtestSign);
                    }
                });
            }
        });
    },
    // 设置订阅消息模板，仅执行一次
    setSubMessage() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.messageFlag) {
                resolve(global.messageTemp);
            } else {
                util_request({
                    app: this,
                    url: `/mini/v1/partner/message/${global.channel}/templates/get`,
                    data: {
                        channel: global.channel,
                    },
                })
                    .then((res) => {
                        const { code, data } = res;
                        this.globalData.messageFlag = true;
                        if (code == 200) {
                            const list = data.templates || [];
                            const messageTemp = list.map((item) => {
                                return {
                                    type: item.biz_type,
                                    id: item.template_id,
                                };
                            });
                            this.globalData.messageTemp = messageTemp;
                            events.publish('subMessage', {
                                code: 200,
                                data: { list: messageTemp },
                            });
                        } else {
                            events.publish('subMessage', { code });
                        }
                        resolve(global.messageTemp);
                    })
                    .catch(() => {
                        this.globalData.messageFlag = true;
                        events.publish('subMessage', { code: 2005 });
                        resolve(global.messageTemp);
                    });
            }
        });
    },
    // 获取订阅消息模板
    getSubMessage() {
        return new Promise((resolve) => {
            const global = this.globalData;
            if (global.messageFlag) {
                resolve(global.messageTemp);
            } else {
                events.subscribe('subMessage', (res) => {
                    const { code, data = {} } = res;
                    if (code == 200) {
                        resolve(data.list);
                    } else {
                        resolve(global.messageTemp);
                    }
                });
            }
        });
    },

    /**
     * ** 首页配置接口
     * https://yapi.quickcan.com/project/347/interface/api/41668
     * 对接后端: 杨忠宇
     *
     * return Promise
     * **/
    getGuidePop() {
        return new Promise((resolve, reject) => {
            util_request({
                app: this,
                host: 'pay',
                url: '/v1/payactivity/behavoir_task/config',
            })
                .then((res) => {
                    resolve(res);
                })
                .catch(() => {
                    reject();
                });
        });
    },
});
