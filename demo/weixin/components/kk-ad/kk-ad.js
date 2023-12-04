/**
 * 通用AD组件
 * @param {String} postion 必填，广告位 find_top/comic_center/feed_4/feed_8
 * @param {Number} index 非必填，唯一索引标识，当前页仅引一次组件的情况下，可以不传
 * @return {Function} adSuccess 加载成功时触发，回调参数：event、index、options
 * @return {Function} adError 加载成功时触发，回调参数：event、index、options
 * @return {Function} adClose 加载成功时触发，回调参数：event、index、options
 */

const global = getApp().globalData;
import { util_compareVersion, util_adTrack } from "../../util.js";
const computedBehavior = require("miniprogram-computed");

Component({
    behaviors: [computedBehavior],
    properties: {
        options: {
            type: Object,
            value: {},
        },
        index: {
            type: Number,
            value: 0,
        },
        position: {
            type: String,
            value: "find_top",
        },
    },
    data: {
        isUpdate: true, // 强制刷新使用
        adHeight: "auto", // 广告模块高度，强制刷新时，防止抖动
        visible: false, // 广告开关
        type: "banner", // 广告类型 banner/video/custom/card
        unitId: "", // 广告ID
        adData: {}, // 广告数据
        isExposure: false, // 是否已曝光
        isLoad: false, // 是否已加载成功
        isViewport: false, // 是否在曝光区域
        creative: {
            video: 2,
            banner: 3,
            card: 3,
            custom: 1,
        }, // 根据展示判断广告类型，1=未知，2=视频广告，3=图文广告
    },
    attached() {
        const index = global.adData.findIndex((item) => item.ad_type == this.data.position);

        if (index > -1) {
            this.initData(index);
        } else {
            console.log("There is no advertising");
        }
    },
    pageLifetimes: {
        show() {
            this.checkObserver();
        },
    },
    methods: {
        /**
         * @description: 初始化广告
         * @param {index} 获取globa的对应广告数据索引
         */
        initData(index) {
            const { channel, adData, systemInfo } = global;

            const version = systemInfo.SDKVersion || "2.10.0";
            const isWechat = channel == "wechat" && util_compareVersion(version, "2.10.4") >= 0 ? 1 : 0;

            const row = adData[index];
            const isCustom = isWechat && !!row.custom_new_id;
            const type = isCustom ? "custom" : row.custom_type;
            const unitId = isCustom ? row.custom_new_id : row.custom_unit_id;

            this.data.adData = row;
            this.data.isLoad = false;
            this.data.isExposure = false;

            this.setData(
                {
                    unitId,
                    type,
                    visible: true,
                },
                () => {
                    this.onAdTrack("REQUEST");
                    this.createObserver();
                }
            );
        },

        /**
         * @description: 创建广告曝光方法
         * @param {}
         */
        createObserver() {
            this.disconnect();

            this.observer = wx.createIntersectionObserver(this, {
                thresholds: [0.1],
            });

            this.observer.relativeToViewport().observe(`.ad-observe-${this.data.index}`, (res) => {
                const ratio = res.intersectionRatio || 0;
                this.data.isViewport = ratio > 0.1;
                this.onAdView();
            });
        },

        /**
         * @description: 停止曝光监听
         */
        disconnect() {
            if (this.observer) {
                this.observer.disconnect();
            }
        },

        /**
         * @description: 曝光处理
         * @tip 触发时机：加载完成 or 监听视口触发时
         */
        onAdView() {
            const { isViewport, isExposure, isLoad } = this.data;
            // 暴露在视口 && 未曝光 && 已加载成功
            if (isViewport && !isExposure && isLoad) {
                this.data.isExposure = true;
                this.disconnect();
                this.onAdTrack("VIEW");
            }
        },

        /**
         * @description: 隐藏当前广告位
         */
        onAdHidden() {
            this.disconnect();
            this.setData({
                visible: false,
                adHeight: "auto",
            });
        },

        /**
         * @description: 加载成功回调
         */
        onAdSuccess(event) {
            this.data.isLoad = true;
            this.onAdTrack("AD_LOAD");
            this.onAdView();
            this.triggerEvent("adSuccess", this.onAdEvent(event));
            if (this.data.position == "find_top") {
                this.setData({
                    adHeight: "auto",
                });
            }
        },

        /**
         * @description: 加载失败回调
         */
        onAdError(event) {
            const { errCode, errMsg } = event.detail;
            this.onAdTrack("AD_ERROR", {
                debug_info: {
                    mini_program: {
                        error_code: errCode,
                        error_msg: errMsg,
                    },
                },
            });
            this.triggerEvent("adError", this.onAdEvent(event));
            this.onAdHidden();
        },

        /**
         * @description: 点击关闭按钮回调
         */
        onAdClose(event) {
            this.onAdTrack("AD_CLOSE");
            this.triggerEvent("adClose", this.onAdEvent(event));
            this.onAdHidden();
        },

        /**
         * @description: 回调事件传参
         */
        onAdEvent(event = {}) {
            return {
                event,
                index: this.data.index,
                options: this.data.options,
            };
        },

        /**
         * @description: 广告打点
         * @param: REQUEST / AD_LOAD / AD_ERROR / AD_CLOSE / VIEW
         */
        onAdTrack(event, obj) {
            const { ad_position_id } = this.data.adData;
            const { type, unitId, creative } = this.data;
            const creative_type = creative[type] || 1;
            util_adTrack({
                event,
                ad_pos_id: ad_position_id,
                unit_id: unitId,
                creative_type,
                ...obj,
            });
        },
        checkFindHeight() {
            const query = this.createSelectorQuery();
            query.select(".ad-control").boundingClientRect();
            query.selectViewport().scrollOffset();
            query.exec((res) => {
                const info = res.length > 0 ? res[0] : {};
                const row = info || {};
                const height = row.height || 140;
                this.setData(
                    {
                        adHeight: `${height}px`,
                    },
                    () => {
                        this.setData(
                            {
                                isUpdate: false,
                            },
                            () => {
                                setTimeout(() => {
                                    this.setData(
                                        {
                                            isUpdate: true,
                                        },
                                        () => {
                                            this.data.isViewport = false;
                                            this.data.isLoad = false;
                                            this.data.isExposure = false;
                                            this.onAdTrack("REQUEST");
                                            this.createObserver();
                                        }
                                    );
                                }, 700);
                            }
                        );
                    }
                );
            });
        },

        /**
         * @description: 发现页广告位，onShow时校验是否立即刷新
         */
        checkObserver() {
            if (this.data.position != "find_top") {
                return false;
            }
            if (this.observerView) {
                this.observerView.disconnect();
            }
            this.observerView = wx.createIntersectionObserver(this, {
                thresholds: [0, 1],
                initialRatio: 1,
            });
            this.observerView.relativeToViewport().observe(`.ad-observe-${this.data.index}`, (res) => {
                const ratio = res.intersectionRatio || 0;
                if (ratio == 0) {
                    this.checkFindHeight();
                    this.observerView.disconnect();
                }
            });
        },
    },
});
