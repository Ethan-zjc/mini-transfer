import { util_request, util_action, util_showToast, util_getGender, util_setGlobalObj, util_checkWallet, util_skipDirection, util_reportMonitor, util_checkVipInfo, util_getDynamicData } from '../../util.js';

const app = getApp();
const global = app.globalData;
const api = require('./api');
const { connect } = app.Store;
const reddotBehavior = require('../../behaviors/reddot');
const userInfoBehavior = require('../../behaviors/userInfo');
const { myImgs } = require('../../cdn.js');

const page = {
    behaviors: [reddotBehavior, userInfoBehavior],
    data: {
        active: 1, // 吸顶或者内容部分tab(阅读历史/我的关注)是否选中
        reddot: false, // 我的关注 是否显示红点

        // 阅读历史相关
        readRadio1: false, // 阅读历史筛选项(readRadio=1[已关注漫画])
        readRadio2: false, // 阅读历史筛选项(readRadio=2[阅读>1话])
        readLoading: false, // 阅读历史是否在加载中 false:不是   true:是
        readSince: 0, // 阅读历史请求的页码 要求首次传递0
        readLimit: 30, // 阅读历史请求的每页数据
        readList: [], // 获取到的阅读历史列表
        readNomore: false, // 阅读历史没有更多数据  false:不是   true:是
        readError: false, // 阅读历史是否加载失败 false:不是   true:是
        readEmpty: false, // 阅读历史是否是空数据 false:不是   true:是

        // 我的关注相关
        followLoading: false, // 我的关注是否在加载中 false:不是   true:是
        followType: 1, // 我的关注筛选项  最近阅读:1     最近关注:2
        followSince: 0, // 我的关注请求的页码 要求首次传递0
        followLimit: 20, // 我的关注请求的每页数据
        followList: [], // 获取到的我的关注列表
        followNomore: false, // 我的关注没有更多数据  false:不是   true:是
        followError: false, // 我的关注是否加载失败 false:不是   true:是
        followEmpty: false, // 我的关注是否是空数据 false:不是   true:是

        activity: '',
        swiperHeight: 0,
        mounted: false, // 吸顶状态 false:不是 true:是
        scrollTop: 0, // 滚动多少需要吸顶显示
        setScroll: false, // 设置滚动条位置
        isGetCheckForUpdate: true, // 是否可以调用未登录上报接口

        // signDays: 0, // 连续签到天数
        // signList: {},  // 签到列表数据
        // showSignMoudle: false, // 是否展示签到模块
        recordH5Url: '', // 签到领取阅读h5url地址
        successDialogData: {
            show: false, // false 是否显示弹窗
            type: 'sign', // 弹窗类型 type 支持的值:sign->签到(签到弹窗)  task:->任务[日常任务](任务弹窗)  newTask:->新手任务(新手任务弹窗)
            isRule: true, // 是否为规则弹窗
            ruleList: [], // 规则弹窗是数据
            clickMask: false, // 是否允许遮罩层,关闭弹窗
            content: '', // 奖励信息内容
            rewardType: 1, // 奖励的类型(icon): 1(KKB图标) 2(vip图标) 3(优惠卷图标) 4(福利礼包图标)
            subtitle: '', // 副标题内容(标题下方的小文子)
            title: '', // 弹窗标题
            btnName: '', // 弹窗按钮文字
        },

        // 新手福利相关
        benefitText: '',
        myImgs,
        showActivityBubble: false,

        // 漫剧相关
        listType: 1, // 1:漫画 2:漫剧
        videoHistoryList: [], // 漫剧列表
        videoHistoryPage: 1, // 漫剧历史 请求的页码
        videoHistoryLimit: 30, // 漫剧历史 每页数据

        videoFollowList: [], // 漫剧关注列表
        videoFollowPage: 1, // 漫剧关注 请求的页码
        videoFollowLimit: 20, // 漫剧关注 每页数据

        shieldVideo: true, // 是否屏蔽漫剧
    },
    onLoad() {
        const screenRpxRate = global.screenRpxRate;
        this.checkVideoShield(); // 检查是否屏蔽漫剧

        this.setData({
            screenRpxRate,
            develop: !global.onRelease,
        });
        // 获取签到领取阅读币的h5Url地址
        api.getSignInfo()
            .then((res) => {
                let { data } = res;
                data = data || {};
                let {
                    target_url, // 跳转的webapp的url地址
                    new_target_url, // 跳转的webapp的url地址
                } = data;
                this.data.recordH5Url = new_target_url || target_url || ''; // 签到领取阅读币url地址
            })
            .catch(() => {
                this.data.recordH5Url = '';
            });
    },
    onShow() {
        this.checkWallet();
        this.checkVipInfo();
        this.setSexFun(); // 设置性别
        this.setScrollTop(); // 获取吸顶高度
        // this.signListInit(); // 获取签到奖励列表

        this.setData(
            {
                listType: 1,
                isGetCheckForUpdate: true, // 可以调用未登录上报接口
                // active:1,//吸顶或者内容部分tab(阅读历史/我的关注)是否选中
                readRadio1: false, // 阅读历史筛选项(readRadio=1[已关注漫画])
                readRadio2: false, // 阅读历史筛选项(readRadio=2[阅读>1话])
                readNomore: false, // 阅读历史没有更多数据  false:不是   true:是
                readSince: 0, // 阅读历史请求的页码 要求首次传递0
                readLoading: false, // 阅读历史是否在加载中 false:不是   true:是
                readError: false, // 阅读历史是否加载失败 false:不是   true:是
                readEmpty: false, // 阅读历史是否是空数据 false:不是   true:是
                readList: [], //获取到的阅读历史列表
                followLoading: false, // 我的关注是否在加载中 false:不是   true:是
                followType: 1, // 我的关注筛选项  最近阅读:1     最近关注:2
                followSince: 0, // 我的关注请求的页码 要求首次传递0
                followNomore: false, // 我的关注没有更多数据  false:不是   true:是
                followError: false, // 我的关注是否加载失败 false:不是   true:是
                followEmpty: false, // 我的关注是否是空数据 false:不是   true:是
                followList: [], //获取到的我的关注列表
                videoFollowList: [], // 漫剧关注列表
                videoHistoryList: [], // 漫剧列表
                videoHistoryPage: 1, // 漫剧历史 请求的页码
                videoFollowPage: 1, // 漫剧关注 请求的页码
            },
            () => {
                this.getReadList(true); // 获取阅读历史列表
                this.getFollowList(true); // 获取我的关注列表
                this.setTrigger();
            }
        );

        if (this.data.userInfo) {
            this.getBenefitText(); // 新手福利文案
        }

        this.setRecMap({});
        app.kksaTrack('VisitBookshelfPage');
    },

    checkVideoShield() {
        const id = global.environment === 'prod' ? 93 : 57;
        util_getDynamicData({ id }).then((res) => {
            const { data } = res;
            const isShield = data.desc === '0';
            this.setData({ shieldVideo: isShield });
        });
    },

    // 设置性别
    setSexFun() {
        const { userInfo } = this.data;
        if (userInfo) {
            const { gender } = global;
            if (gender != null) {
                this.setData({ gender });
            } else {
                util_getGender().then((gender) => {
                    this.setData({ gender });
                });
            }
        }
    },

    // 切换性别
    changeSex() {
        const { gender = 0 } = this.data;
        const curgender = gender == 1 ? 0 : 1;
        global.gender = curgender;
        global.refreshPage = { findPage: true, feedPage: true, videoPage: true };
        this.setData({ gender: curgender });
        util_showToast({ title: `已切换为${curgender ? '男' : '女'}版，优先展示${curgender ? '男' : '女'}生漫画` });
        util_setGlobalObj({ key: 'gender', value: curgender });
    },

    // 获取签到奖励列表
    // signListInit() {
    //     api.getSignList(global.channel).then((result) => {
    //         let { data } = result;
    //         this.setData({
    //             showSignMoudle: data.enable_checkin || false // 是否展示签到模块
    //         }, () => {
    //             this.setScrollTop(); // 记录吸顶的位置
    //         });

    //         // 判断该平台是否有签到模块
    //         if (!data.enable_checkin) {
    //             return false;
    //         }

    //         // 兼容不同设备数字1占位的不同
    //         data.activity_rules[0] = "<b class=\"b\">1</b>" + data.activity_rules[0].substring(1);
    //         this.setData({
    //             signList: data.days_award_list || {}, // 签到奖励列表
    //             "successDialogData.ruleList": data.activity_rules || [] // 签到规则
    //         });

    //         // 判断是否登陆
    //         if (this.data.userInfo) {
    //             this.checkinDays(data); // 计算连续签到天数
    //             if (!data.today_checkin) { // 今日是否签到
    //                 this.toSignIn(); // 调用签到接口
    //             }
    //         }
    //     }).catch((error) => {
    //         this.setScrollTop(); // 记录吸顶的位置
    //         util_showToast({
    //             title: error.message || "获取签到列表异常",
    //             type: "error",
    //             mask: true,
    //             duration: 3000
    //         });
    //     });
    // },

    // 调用签到接口
    // toSignIn() {
    //     api.toSignIn(global.channel).then((signInResult) => {
    //         let { code, data, message } = signInResult;
    //         let kksacheckinResult = {
    //             CheckInDays: data.checkin_days,
    //             SourcePlatform: global.channel || ""
    //         };
    //         // 签到成功埋点
    //         app.kksaTrack("CheckInSuccess", kksacheckinResult);
    //         api.getSignList(global.channel).then((result) => {
    //             let subtitle = "";
    //             if (data.award_list[0].award_type == 2) {
    //                 subtitle = data.award_list[0].award_count + "日" + data.award_list[0].award_name;
    //             } else {
    //                 subtitle = data.award_list[0].award_count + data.award_list[0].award_name;
    //             }
    //             // 更新签到数据
    //             this.setData({
    //                 signDays: data.checkin_days || 0, // 连续签到天数
    //                 signList: result.data.days_award_list || {}, // 签到数据列表
    //                 "successDialogData.show": true, // 是否显示弹窗
    //                 "successDialogData.isRule": false, // 是否为规则弹窗
    //                 "successDialogData.type": "sign",
    //                 "successDialogData.subtitle": "连续签到 <b>" + data.checkin_days + " </b> 天啦，加油！",
    //                 "successDialogData.content": subtitle,
    //                 "successDialogData.rewardType": data.award_list[0].award_type,  // 今日签到奖励类型
    //                 "successDialogData.title": "签到成功",  // 签到弹窗标题
    //                 "successDialogData.btnName": "悄悄收下"  // 签到弹窗按钮标题
    //             });
    //         }).catch((error) => {
    //             util_showToast({
    //                 title: error.message || "获取签到列表异常",
    //                 type: "error",
    //                 mask: true,
    //                 duration: 3000
    //             });
    //         });
    //     }).catch((error) => {
    //         util_showToast({
    //             title: error.message || "签到异常",
    //             type: "error",
    //             mask: true,
    //             duration: 3000
    //         });
    //     });
    // },

    // 获取本地缓存数据(缓存的阅读历史数据)
    getLocalHistory() {
        return new Promise((resolve, reject) => {
            const keyMap = {
                1: 'historyForMy',
                2: 'videoHistoryForMy',
            };
            const key = keyMap[this.data.listType];
            wx.getStorage({
                key,
                success: (res) => {
                    resolve(res.data);
                },
                fail: () => {
                    reject();
                },
            });
        });
    },

    // 获取新手福利文案
    getBenefitText() {
        api.getGreenHandTips({ channel: global.channel }).then((res) => {
            if (res.code === 200) {
                const data = res.data || {};
                this.setData({
                    benefitText: data.benefit_remind || '',
                });
            }
        });
    },

    // 获取阅读历史数据列表  type:是否只使用新数据  active==1 获取的是阅读历史    active==2 获取的是关注列表
    getReadList(type = false) {
        if (this.data.readNomore) {
            return false;
        }
        if (this.data.readLoading) {
            return false;
        }
        if (!this.data.userInfo && this.data.isGetCheckForUpdate) {
            this.getLocalHistory()
                .then((list) => {
                    if (list.length) {
                        list.forEach((item) => {
                            item.id = item.id ? item.id : 0;
                            item.uuid = `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`;
                        });
                        // 由于本地的历史数据可能比较滞后
                        // 单独请求远程，更新每个item的comics_count
                        const topic_ids = list.map((item) => item.id).join(',');
                        api.getCheckForUpdate({ channel: global.channel, topic_ids })
                            .then((res) => {
                                res.data.topic_info.forEach((item, index) => {
                                    if (item.can_display && list[index].id == item.topic_id) {
                                        list[index].comics_count = item.comics_count;
                                        list[index].label_image = item.label_image || '';
                                    }
                                });
                                this.setData({ readList: list }, () => {
                                    this.guideFunc();
                                    this.setData({
                                        isGetCheckForUpdate: false, // 已上报(未登录状态上报)
                                        readEmpty: !(this.data.readList.length > 0),
                                    });
                                }); // 存储数据
                            })
                            .catch(() => {
                                this.setData({ readList: list }, () => {
                                    this.guideFunc();
                                    this.setData({
                                        readEmpty: !(this.data.readList.length > 0),
                                    });
                                }); // 存储数据
                            });
                    } else {
                        this.setData({ readList: [] }, () => {
                            this.guideFunc();
                            this.setData({
                                readEmpty: !(this.data.readList.length > 0),
                            });
                        }); // 存储数据
                    }
                })
                .catch(() => {
                    this.setData({ readList: [] }, () => {
                        this.guideFunc();
                        this.setData({
                            readEmpty: !(this.data.readList.length > 0),
                        });
                    }); // 存储数据
                });
            return false;
        }

        this.setData({ readLoading: true }); // 修改为加载数据中
        // 已登录的情况
        // readRadio1:0,//阅读历史筛选项(readRadio=1[已关注漫画])
        // readRadio2:0,//阅读历史筛选项(readRadio=2[阅读>1话])
        let readSendData = {
            channel: global.channel, // 渠道配置   微信小程序/qq小程序/百度小程序/头条小程序/阿里小程序
            only_favourite: this.data.readRadio1, // false-全部漫画，true-关注的漫画
            more_than_one: this.data.readRadio2, // false-全部漫画，true-大于1话的漫画
            since: this.data.readSince, // 阅读历史请求的页码
            limit: this.data.readLimit, // 阅读历史请求的每页数据
        };
        this.data.listType === 1 &&
            api
                .getReadHistory(readSendData)
                .then((res) => {
                    let { data } = res;
                    let { topics, since } = data;
                    topics = topics ? topics : [];
                    topics.forEach((item) => {
                        item.id = item.id ? item.id : 0;
                        item.uuid = `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`;
                        item.label_image = item.label_image || '';
                    });

                    let readList = this.data.readList;
                    if (type) {
                        // 情况存储的数据
                        readList = [];
                    }

                    this.setData(
                        {
                            readSince: since, // 阅读历史请求的页码 要求首次传递0(存储下次请求值)
                            readNomore: since < 0, // 阅读历史没有更多数据 since小于0说明没有数据
                            readList: [...readList, ...topics], // 存储数据列表
                            readLoading: false, // 修改为加载数据完成
                            readError: false, // 是否加载失败
                        },
                        () => {
                            this.guideFunc();
                            this.setData({
                                readEmpty: !(this.data.readList.length > 0),
                            });
                        }
                    );
                })
                .catch(() => {
                    this.setData({ readLoading: false, readError: true }); // 修改为加载数据完成
                });

        this.data.listType === 2 && this.getVideoHistory(type);
    },

    getVideoHistory(type) {
        api.getVideoHistory({ page: this.data.videoHistoryPage, limit: this.data.videoHistoryLimit })
            .then((res) => {
                const { data } = res;
                let { infos = [], page } = data;
                infos = infos.map((item) => {
                    const play_record = item.play_record || {};
                    let subtitle = `${play_record.cur_play || 0}话/${item.post_count}话`; // item.continue_play.cur_play
                    return {
                        id: item.id ? item.id : 0,
                        cover_url: item.vertical_image_url || '',
                        title: item.title || '',
                        subtitle,
                    };
                });

                let videoHistoryList = this.data.videoHistoryList;
                if (type) {
                    // 情况存储的数据
                    videoHistoryList = [];
                }

                this.setData(
                    {
                        videoHistoryPage: page, // 阅读历史请求的页码 要求首次传递0(存储下次请求值)
                        readNomore: infos.length < this.data.videoHistoryLimit, // 阅读历史没有更多数据 since小于0说明没有数据
                        videoHistoryList: [...videoHistoryList, ...infos], // 存储数据列表
                        readLoading: false, // 修改为加载数据完成
                        readError: false, // 是否加载失败
                    },
                    () => {
                        this.guideFunc();
                        this.setData({
                            readEmpty: !(this.data.videoHistoryList.length > 0),
                        });
                    }
                );
            })
            .catch(() => {
                this.setData({ readLoading: false, readError: true }); // 修改为加载数据完成
            });
    },

    // 获取我的关注历史列表 type:是否只使用新数据
    getFollowList(type = false) {
        if (this.data.followNomore) {
            return false;
        }
        if (this.data.followLoading) {
            return false;
        }
        if (!this.data.userInfo) {
            this.setData({
                followList: [],
            });
            return false;
        }
        this.setData({ followLoading: true }); // 修改为加载数据中
        let followSendData = {
            channel: global.channel, // 渠道配置
            order_type: this.data.followType, // 是必填项,默认:1 1-最近更新,2-最近关注
            since: this.data.followSince, // 阅读历史请求的页码
            limit: this.data.followLimit, // 阅读历史请求的每页数据
        };

        this.data.listType === 1 &&
            api
                .getFavouriteList(followSendData)
                .then((res) => {
                    let { data } = res;
                    let { topics, since } = data;
                    topics = topics ? topics : [];

                    topics.forEach((item) => {
                        item.id = item.id ? item.id : 0;
                        item.uuid = `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`;
                        item.label_image = item.label_image || '';
                    });
                    let followList = this.data.followList;
                    if (type) {
                        // 情况存储的数据
                        followList = [];
                    }
                    this.setData(
                        {
                            followSince: since, // 阅读历史请求的页码 要求首次传递0(存储下次请求值)
                            followNomore: topics.length == 0, // 阅读历史没有更多数据 since小于0说明没有数据了
                            followList: [...followList, ...topics], // 存储数据列表
                            followLoading: false, // 修改为加载数据完成
                            followError: false, // 是否加载失败
                        },
                        () => {
                            this.setData({
                                followEmpty: this.data.followList.length == 0,
                            });
                        }
                    );
                })
                .catch(() => {
                    this.setData({ followLoading: false, followError: true }); // 修改为加载数据完成
                });

        this.data.listType === 2 && this.getVideoFollowList(type);
    },

    getVideoFollowList(type) {
        api.getVideoFollow({ page: this.data.videoFollowPage, limit: this.data.videoFollowLimit }).then((res) => {
            let { data } = res;
            let { infos = [], page } = data;
            infos = infos.map((item) => {
                return {
                    id: item.id ? item.id : 0,
                    cover_url: item.vertical_image_url || '',
                    title: item.title || '',
                    subtitle: `更新${item.post_count}集`,
                };
            });

            let videoFollowList = this.data.videoFollowList;
            if (type) {
                // 情况存储的数据
                videoFollowList = [];
            }
            this.setData(
                {
                    videoFollowPage: page, // 阅读历史请求的页码 要求首次传递0(存储下次请求值)
                    followNomore: page === -1, // 阅读历史没有更多数据 since小于0说明没有数据了
                    videoFollowList: [...videoFollowList, ...infos], // 存储数据列表
                    followLoading: false, // 修改为加载数据完成
                    followError: false, // 是否加载失败
                },
                () => {
                    this.setData({
                        followEmpty: this.data.videoFollowList.length == 0,
                    });
                }
            );
        });
    },

    // 吸顶状态变化返回的数据
    moutingChange(e) {
        this.setData({
            mounted: e.detail.state,
        });
    },

    // 触发下拉加载的情况
    onMounting(event) {
        let active = this.data.active; // 吸顶或者内容部分tab(阅读历史->1/我的关注->2)是否选中
        if (!this.data.userInfo) {
            return false;
        }
        if (event.detail.loading) {
            if (active == 1) {
                this.getReadList();
            }

            if (active == 2) {
                // 我的关注
                this.getFollowList();
            }
        }
    },
    bannerShowEvent() {
        this.data.showBanner = true;

        // 避免返回较延时，没有重新设置吸顶数据
        this.setScrollTop();
    },

    // 设置 滚动条到多少的位置开始吸顶操作
    setScrollTop() {
        const query = wx.createSelectorQuery();
        const _this = this;
        // 获取签到模块高度 吸顶高度变化
        // let signTop = 0;
        // if (_this.data.showSignMoudle) {
        //     query.selectAll("#sign-box").boundingClientRect(function (res) {
        //         signTop = res[0].height ? res[0].height : 0;
        //     }).exec();
        // }
        query
            .selectAll('#section-top')
            .boundingClientRect(function (res) {
                res = res ? res : {};
                res = res[0] ? res[0] : {};
                let top = res.height ? res.height : 0;
                _this.setData({
                    // scrollTop: top + signTop + 1// 滚动多少需要吸顶显示
                    scrollTop: top + 1 + (_this.data.showBanner ? Math.floor(136 / global.screenRpxRate) : 0), // 滚动多少需要吸顶显示
                });
            })
            .exec();
    },

    // 检查kk币余额，以及set钱包运营文案 kkb展示的气泡文案
    checkWallet() {
        if (!this.data.userInfo) {
            this.setWallet(0);
            return;
        }
        util_checkWallet(this).then((data) => {
            const word = global.isiOS ? '' : data.activity.activity_word;
            const click_time = global.isiOS ? '' : data.activity.activity_word_click_time;
            let bubbleclicktimes = wx.getStorageSync('bubbleclicktimes') || 0;
            if (word) {
                let activity = '';
                let flag = 0;
                for (let n = 0; n < word.length; n++) {
                    const code = word.charCodeAt(n);
                    flag += code >= 0 && code <= 128 ? 1 : 2;
                    if (flag < 13) {
                        activity += word[n];
                    }
                }
                if (flag > 12) {
                    activity += '...';
                }
                this.setData({
                    activity,
                    showActivityBubble: bubbleclicktimes < click_time,
                });
            }
        });
    },

    // 会员信息查询 (是否展示会员)
    checkVipInfo() {
        if (!this.data.userInfo) {
            this.setVipinfo({});
            return;
        }
        util_checkVipInfo(this);
    },

    // 检查登录，通过后resolve，否则前往登录页
    checkLogin() {
        return new Promise((resolve) => {
            if (!this.data.userInfo) {
                this.routeLogin();
            } else {
                resolve();
            }
        });
    },

    // 触发登录
    triggerLogin() {
        this.setData({
            showLogin: true,
        });
    },

    // 点击头像和用户名
    faceClick() {
        this.checkLogin().then(() => {
            wx.showActionSheet({
                itemList: ['切换帐号'],
                success: () => {
                    this.routeLogin();
                },
            });
        });
    },

    // 点击 切换tab（阅读历史->1/我的关注->2)
    tabChangeTap(e) {
        let active = this.data.active;
        let eActive = e.currentTarget.dataset.active;
        let name = e.currentTarget.dataset.name;
        if (active == eActive) {
            // 点击的和现在展示的一样什么也不做
            return false;
        }
        if (active == 1 && this.data.reddot) {
            global.reddot = false;
            wx.hideTabBarRedDot({ index: 2 });
            this.setData({ reddot: false });
        }
        let setScroll = false;
        let readEmpty = this.data.readList.length == 0;
        let followEmpty = this.data.followList.length == 0;

        if (eActive == 1) {
            // 阅读历史
            setScroll = this.data.readList.length > 8;
        }
        if (eActive == 2) {
            // 我的关注
            setScroll = this.data.readList.length > 6;
        }
        if (name == 'top') {
            this.setData({ active: eActive, listType: 1, setScroll, readEmpty, followEmpty }, () => {});
        } else {
            this.setData({ active: eActive, listType: 1, readEmpty, followEmpty });
        }

        this.setTrigger();
    },

    // 阅读历史筛选项(已关注漫画[type=1]/阅读>1话[type=2]) 切换按钮
    readRadioTap(e) {
        if (this.data.readLoading) {
            // 如果阅读历史在加载中什么也不做
            return false;
        }
        const { type } = e.currentTarget.dataset;
        this.setData(
            {
                readSince: 0, // 从第0条数据开始查询
                [`readRadio${type}`]: !this.data[`readRadio${type}`],
                readNomore: false, // 改为有数据状态
            },
            () => {
                this.getReadList(true); // 获取数据
            }
        );
    },

    // 关注列表中的类型切换(最新更新/最近关注)
    followTypeTap(event) {
        if (this.data.followLoading) {
            // 我的关注是否在加载中 false:不是   true:是
            return false; // 是在加载状态
        }

        const { type } = event.currentTarget.dataset;
        this.setData({ followType: type, followSince: 0, followNomore: false }, () => {
            this.getFollowList(true);
        });
    },

    // 关注列表中的类型切换
    changeType(e) {
        if (this.data.loading2) {
            return;
        }
        const { type } = e.currentTarget.dataset;
        this.setData({ type, sinces2: 0 });
    },

    // 跳转到详情页
    routeComic(e) {
        const { id, count, topicid } = e.currentTarget.dataset;
        if (!id) {
            util_action({ type: 2, id: topicid });
            return;
        }
        let options = { type: 3, id };
        if (count) {
            options.params = { count };
        }
        util_action(options);
    },

    // 显示并隐藏引导
    guideFunc() {
        const { readList } = this.data;
        if (readList.length && wx.getStorageSync('guide:delHis')) {
            wx.setStorageSync('guide:delHis', false);
            this.setData(
                {
                    guideShowTime: true,
                },
                () => {
                    setTimeout(() => {
                        this.setData({
                            guideShowTime: false,
                        });
                    }, 2500);
                }
            );
        }
    },

    // 长按删除
    hisPress(e) {
        const { index } = e.currentTarget.dataset;
        wx.showActionSheet({
            itemList: ['删除'],
            success: () => {
                if (this.data.listType === 1) {
                    let topic = this.data.readList[index];
                    topic = topic ? topic : {};
                    topic.id = topic.id ? topic.id : '';
                    1;

                    this.data.userInfo &&
                        this.delHisRequest({
                            params: [{ topic_id: topic.id }],
                            callback: () => {
                                this.removeHistory.call(this, topic.id, index);
                            },
                        });
                    !this.data.userInfo && this.removeHistory.call(this, topic.id, index);
                }

                if (this.data.listType === 2) {
                    const video = this.data.videoHistoryList[index];
                    const id = video.id ? video.id : '';

                    this.data.userInfo &&
                        this.delVideoHis({
                            params: { ids: id },
                            callback: () => {
                                this.removeHistory.call(this, id, index);
                            },
                        });
                    !this.data.userInfo && this.removeHistory.call(this, id, index);
                }
            },
            fail: () => {
                // 取消删除提示
            },
        });
    },

    delVideoHis(options) {
        util_request({
            method: 'post',
            url: `/v1/comic_video/history/delete`,
            data: { ids: options.params.ids },
        })
            .then((res) => {
                options.callback(res);
            })
            .catch(() => {
                util_showToast({
                    title: '删除失败，请重试',
                    duration: 1500,
                });
            });
    },

    delHisRequest(options) {
        util_request({
            method: 'post',
            url: `/mini/v1/comic/${global.channel}/read_history/delete`,
            data: { record: JSON.stringify(options.params) },
        })
            .then((res) => {
                options.callback(res);
            })
            .catch(() => {
                util_showToast({
                    title: '删除失败，请重试',
                    duration: 1500,
                });
            });
    },

    removeHistory(id, index) {
        const dataObj = {};
        const storageMap = {
            1: 'historyForMy',
            2: 'videoHistoryForMy',
        };
        const dataMap = {
            1: 'readList',
            2: 'videoHistoryList',
        };
        let arry = wx.getStorageSync(storageMap[this.data.listType]) || [];
        const historyForMy = arry.filter((item) => item.id != id);
        if (!historyForMy.length) {
            wx.removeStorage({
                key: 'historyForMy',
                success: () => {},
            });
        } else {
            wx.setStorage({
                key: 'historyForMy',
                data: historyForMy,
            });
        }

        dataObj[dataMap[this.data.listType]] = this.data[dataMap[this.data.listType]].filter((item, ind) => ind != index);
        this.setData(dataObj, () => {
            util_showToast({
                title: '删除一条浏览历史',
                duration: 1500,
            });
        });
    },

    // 跳转到专题页
    routeTopic(e) {
        const { topicid } = e.currentTarget.dataset;
        const options = { type: 2, id: topicid };
        util_skipDirection({ topicId: topicid }).then((res) => {
            if (res.continueId) {
                // 跳转详情页
                options.type = 3;
                options.id = res.continueId;
                util_action(options);
            } else {
                // 跳转专题页
                util_action(options);
            }
        });
    },

    // 跳转登录页
    routeLogin() {
        wx.navigateTo({ url: '/pages/login/login' });
    },

    // 跳转到充值
    routeWallet() {
        if (this.data.showActivityBubble) {
            let bubbleclicktimes = wx.getStorageSync('bubbleclicktimes') || 0;
            wx.setStorageSync('bubbleclicktimes', ++bubbleclicktimes);
            util_action({ type: 22, subpack: true });
            return false;
        }

        util_action({ type: 21, subpack: true });
        this.publicTrack(1);
    },

    // 跳转到会员中心
    routeVipCenter() {
        util_action({ type: 44, subpack: true });
        this.publicTrack(2);
    },

    // 跳转到签到&领取阅读币H5页面
    routeRecordH5Url() {
        if (!this.data.recordH5Url) {
            return false;
        }
        let url = this.data.recordH5Url || '';
        url = url.indexOf('?') > -1 ? `${url}&origin=bookPage` : `${url}?origin=bookPage`;
        util_action({ type: 2003, url: url });
        this.publicTrack(3);
    },

    publicTrack(value) {
        const typeMap = {
            1: 'KK币',
            2: '会员中心',
            3: '每日签到',
        };
        app.kksaTrack('PublicClk', {
            TriggerPage: 'BookshelfPage',
            ButtonName: typeMap[value],
        });
    },

    // 设置全局active变量
    setTrigger() {
        this.setPageTrigger('my', {
            active: this.data.active,
        });
    },

    // 跳转设置页
    feedbackTap() {
        util_action({
            type: 2006,
        });
        util_reportMonitor('0');
    },

    // 点击签到规则
    // showRules() {
    //     this.setData({
    //         "successDialogData.show": true, // 是否显示弹窗
    //         "successDialogData.isRule": true, // 是否是签到规则
    //         "successDialogData.title": "签到规则",  // 弹窗标题
    //         "successDialogData.btnName": "知道啦"   // 弹窗按钮文字
    //     });
    // },

    // 关闭弹出框
    closeSignWindow() {
        this.setData({
            'successDialogData.show': false,
        });
    },

    // 判断是否登陆
    isLogin() {
        if (!this.data.userInfo) {
            this.routeLogin();
        }
    },

    interceptLogin() {
        if (!this.data.userInfo) {
            this.triggerLogin();
        }
    },

    // 计算连续签到天数
    // checkinDays(data) {
    //     let days = 0;
    //     for (let i = 0; i < data.days_award_list.length; i++) {
    //         if (data.days_award_list[i].checkin) {
    //             days++;
    //         }
    //     }
    //     this.setData({
    //         signDays: days // 连续签到天数
    //     });
    // },

    // 长按显示uid
    pressShowUid() {
        const { userInfo } = this.data;
        if (userInfo) {
            util_showToast({
                title: `uid: ${userInfo.user.id}`,
                duration: 3000,
            });
            util_reportMonitor('1');
        }
    },

    typeHandler(e) {
        const { type } = e.currentTarget.dataset;
        if (type === this.data.listType) return false;
        this.setData({ listType: type, readNomore: false, followNomore: false }, () => {
            const { active } = this.data;
            if (active == 1) this.getReadList();
            if (active == 2) this.getFollowList();
        });
    },

    routeVideo(e) {
        const { index } = e.currentTarget.dataset;
        const { active, videoHistoryList, videoFollowList } = this.data;
        const list = active == 1 ? videoHistoryList : videoFollowList;
        const { id } = list[index];
        const type = 2009;
        const target_id = id;

        util_action({ type, parentid: target_id });
    },
};

const ConnectPage = connect(
    ({ userInfo, wallet, vipInfo, pageTrigger, recMap }) => {
        return {
            userInfo,
            wallet,
            vipInfo,
            pageTrigger,
            recMap,
        };
    },
    (setState, _state) => ({
        setWallet(newVal) {
            setState({
                wallet: newVal,
            });
        },
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
        setPageTrigger(page, newVal) {
            const pageTrigger = _state.pageTrigger;
            pageTrigger[page] = newVal;
            setState({ pageTrigger });
        },
        setRecMap(newVal) {
            setState({
                recMap: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
