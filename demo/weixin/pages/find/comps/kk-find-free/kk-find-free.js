/*
 * 会员整本限免模块
 */
import { util_showToast, util_request, util_action, util_feSuffix } from "../../../../util.js";

const app = getApp();
const api = require("../../api"); // api 请求

Component({
    properties: {
        userInfo: {
            type: Object,
            value: {},
        },
        vipInfo: {
            type: Object,
            value: {},
        },
        position: {
            type: String,
            value: "top",
        },
    },
    data: {
        showMode: false,
    },
    pageLifetimes: {
        show() {
            this.getBaseInfo();
        },
    },
    attached() {
        this.getBaseInfo();
    },
    methods: {
        getBaseInfo() {
            if (this.data.userInfo) {
                this.checkVipInfo().then((vipInfo) => {
                    if (vipInfo && vipInfo.vip_type) {
                        this.getFindFreeData();
                    } else {
                        this.setData({
                            showMode: false,
                        });
                    }
                });
            }
        },
        // vip限免模块
        getFindFreeData() {
            api.getTopicFree()
                .then((res) => {
                    let { code, data, message } = res;
                    // 倒计时时间
                    let diffTime = data.activity_period_time - new Date().getTime();
                    // 剩余可领取时间
                    let dayTime = parseInt(diffTime / (1000 * 3600 * 24)) == 0 ? 1 : parseInt(diffTime / (1000 * 3600 * 24));
                    // 会员限免模块数据
                    let freeList = data.topic_infos || [];
                    // 是否领取
                    let hasAssigned = data.has_assigned;
                    // 格式化图片格式
                    if (hasAssigned) {
                        freeList[0].vertical_image_url = util_feSuffix({ src: freeList[0].vertical_image_url, width: 224 });
                    } else {
                        freeList.forEach((item) => {
                            item.cover_image_url = util_feSuffix({ src: item.cover_image_url, width: 234 });
                            item.vertical_image_url = util_feSuffix({ src: item.vertical_image_url, width: 484 });
                        });
                    }
                    this.setData({
                        showMode: true,
                        diffTime,
                        dayTime,
                        freeList,
                        showFreeList: freeList.length >= 4 ? freeList.slice(0, 4) : [],
                        hasAssigned,
                        clickAssign: hasAssigned,
                    });
                    // 发现页会员限免模块曝光
                    app.kksaTrack("UserDefinedTabFindPageModuleExp", {
                        ModuleName: "会员整本限免",
                    });
                })
                .catch((error) => {
                    this.setData({
                        showMode: false,
                    });
                });
        },

        // 限免领取
        assignAward(e) {
            const { index, assign, title } = e.currentTarget.dataset;
            api.limitFreeAssign({
                assign_encrypt_str: assign,
                order_from: global.payfrom,
            })
                .then((res) => {
                    // 本地刷新其他数据
                    let showFreeList = this.data.showFreeList;
                    showFreeList.map((item, curIndex) => {
                        if (index == curIndex) {
                            item.assign_status = 1;
                        } else {
                            item.assign_status = 2;
                        }
                    });
                    this.setData({
                        showFreeList,
                        clickAssign: true,
                    });
                    // 领取成功埋点
                    app.kksaTrack("UserDefinedTabFindPageClk", {
                        ButtonName: "领取限免",
                        ModuleName: "会员整本限免",
                        isSuccessReceived: 1,
                        TopicName: title,
                    });
                })
                .catch((error) => {
                    util_showToast({
                        title: error.message || "领取失败",
                    });
                    // 领取失败埋点
                    app.kksaTrack("UserDefinedTabFindPageClk", {
                        ButtonName: "领取限免",
                        ModuleName: "会员整本限免",
                        isSuccessReceived: 0,
                        TopicName: title,
                    });
                });
        },

        // 跳转连续阅读详情页
        getContinueId(e) {
            const { id, title } = e.currentTarget.dataset;
            util_action({
                type: 68,
                parentid: id * 1,
            });
            app.kksaTrack("UserDefinedTabFindPageClk", {
                ButtonName: "免费阅读",
                ModuleName: "会员整本限免",
                TopicName: title,
            });
        },
        // 会员信息查询
        checkVipInfo() {
            const vipInfo = this.data.vipInfo;
            return new Promise((resolve, reject) => {
                if (JSON.stringify(vipInfo) != "{}") {
                    resolve(vipInfo);
                } else {
                    util_request({
                        host: "pay",
                        url: "/v1/vip/me",
                    })
                        .then((res) => {
                            resolve(res.data.vip);
                        })
                        .catch((error) => {
                            reject();
                        });
                }
            });
        },

        // 整本限免点击跳转
        continueAction(event) {
            const { id } = event.currentTarget.dataset;
            util_action({
                type: 68,
                parentid: id * 1,
            });
        },
        // 整本限免查看更多
        topicBottomMoreFree() {
            util_action({
                type: 10,
                url: `type=find&module_id=&card_type=&title=会员整本限免`,
            });
            app.kksaTrack("UserDefinedTabFindPageClk", {
                ButtonName: "查看更多",
                ModuleName: "会员整本限免",
            });
        },

        // 整本限免换一换
        topicBottomexchangeFree() {
            // 随机选取4个数据展示
            let freeList = JSON.parse(JSON.stringify(this.data.freeList));
            let result = [];
            let ranNum = 4;
            for (let i = 0; i < ranNum; i++) {
                let ran = Math.floor(Math.random() * freeList.length);
                result.push(freeList.splice(ran, 1)[0]);
            }
            this.setData({ showFreeList: result }); // 点击换一换的模块索引
            // 换一换埋点上报
            app.kksaTrack("UserDefinedTabFindPageClk", {
                ButtonName: "换一换",
                ModuleName: "会员整本限免",
            });
        },
    },
});
