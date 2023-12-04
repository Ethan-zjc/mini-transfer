/**
 * 基础悬浮通用运营位 20211010 新增
 * @param newClass {Boolean}  是否使用距离底部大的class
 * @param triggerPage {String}  触发页面
 * **/
const app = getApp();

import { util_action, util_showToast } from "../../util.js";
import { operationEvent, getMiniBaseOperation } from "./api.js";

Component({
    properties: {
        // 是否使用距离底部大的class 名称
        newClass: {
            type: Boolean,
            value: false,
        },
        topicId: {
            type: Number,
            value: 0,
        },
        triggerPage: {
            // 触发页面对应索引1-发现页 2-推荐页 3-漫画页
            type: String,
            value: "",
        },
        suspendAnimation: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        iPhoneX: getApp().globalData.iPhoneX,
        isShow: false, // 接口返回的是否显示悬浮框
        currentIndex: 0, // 轮播图当前index
    },
    attached() {
        let { gender } = getApp().globalData;
        const params = {
            page: this.data.triggerPage,
            gender: gender == null ? 0 : gender,
        };
        if (this.data.triggerPage == 3) {
            if (!this.data.topicId) return;
            params.topic_id = this.data.topicId;
        }
        getMiniBaseOperation(params)
            .then((res) => {
                res = res || {};
                let { code, message } = res;
                let { operation_activity = [] } = res.data;
                if (code != 200) {
                    util_showToast({
                        title: message,
                        duration: 3000,
                    });
                    return false;
                }
                if (operation_activity.length) {
                    const activity = operation_activity
                        .map((item) => ({
                            ...item,
                            is_exp: false,
                        }))
                        .slice(0, 3);
                    this.setData(
                        {
                            isShow: true,
                            activity,
                        },
                        () => {
                            if (this.data.triggerPage == 3) {
                                this.setTimeHideEntry();
                            }
                        }
                    );
                    this.kksaReport(0);
                    this.eventReport(1);
                }
            })
            .catch((err) => {
                util_showToast({
                    title: err.message || "服务异常",
                    duration: 3000,
                });
            });
    },
    methods: {
        // 判断设置的ua是否存在, 存在后再执行操作
        getUserAgent(callback) {
            if (!callback || typeof callback != "function") {
                callback = () => {};
            }
            let time = setInterval(() => {
                let userAgent = getApp().globalData.userAgent;
                if (userAgent) {
                    clearInterval(time);
                    callback(userAgent);
                    return false;
                }
            }, 100);
        },

        // 点击关闭按钮
        tapClose() {
            this.kksaReport(3);
            this.eventReport(3);
            this.setData({
                isShow: false,
            });
        },

        // 定时隐藏运营位
        setTimeHideEntry() {
            // 页面hidden的时候也要清除定时
            this.data.timer = setTimeout(() => {
                clearTimeout(this.data.timer);
                this.setData({
                    isShow: false,
                });
            }, 10000);
        },

        // 点击去H5活动页
        tapGoActive(event) {
            let dataset = event.currentTarget.dataset;
            const { action_protocol = {} } = this.data.activity[dataset.index];
            const { type, target_id: id, parent_target_id: parentid, target_web_url: url } = action_protocol;
            this.kksaReport(2);
            this.eventReport(2);
            util_action({ type, id, parentid, url });
        },

        // 事件上报1-曝光 2-点击 3-关闭
        eventReport(event) {
            const { triggerPage, currentIndex } = this.data;
            const { id } = this.data.activity[currentIndex];
            if (!triggerPage || !id || !event) {
                return; // 三个参数均为必填项
            }
            if (event === 1 && this.data.activity[currentIndex].is_exp) {
                return; // 禁止曝光事件重复上报
            }
            operationEvent({ page: triggerPage, id, event }).then((res) => {
                console.log("上报成功", res);
                this.data.activity[currentIndex].is_exp = true;
            });
        },

        swiperChange(event) {
            const { current } = event.detail;
            this.setData(
                {
                    currentIndex: current,
                },
                () => {
                    this.kksaReport(0);
                    this.eventReport(1);
                }
            );
        },

        // 埋点内容
        kksaReport(behavior) {
            // 1-发现页 2-推荐页 3-漫画页
            let pages = {
                1: "FindPage",
                2: "RecommendPage",
                3: "ComicPage",
                4: "ClassPage",
            };
            const { id, is_exp } = this.data.activity[this.data.currentIndex];
            if (is_exp) return false;
            const { triggerPage } = this.data;
            const data = {
                CurPage: pages[triggerPage],
                PUWID: id,
                popupName: "挂角浮标",
            };
            if (behavior) {
                data.ElementType = "右下角图标";
                data.OperEventNam = behavior == 3 ? "关闭" : "跳转";
            }
            // console.log("埋点要上报的内容",behavior, data)
            app.kksaTrack(behavior ? "PopupClk" : "PopupShow", data);
        },
    },
});
