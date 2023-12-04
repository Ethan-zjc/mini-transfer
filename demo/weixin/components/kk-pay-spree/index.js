/**
 * 付费弹窗天降礼包运营位 20211105 新增
 * @param customNav {Boolean}  是否为自定义导航
 * **/
const app = getApp();
const global = app.globalData;

import { util_action, util_storageFun, util_formatTime } from "../../util.js";
import { getPaySpreeApi, postSpreeAssign } from "./api.js";

Component({
    properties: {
        customNav: {
            type: Boolean,
            value: false,
        },
        topicId: {
            type: Number,
            value: 0,
        },
        comicId: {
            type: Number,
            value: 0,
        },
        topicName: {
            type: String,
            value: "",
        },
        comicName: {
            type: String,
            value: "",
        },
    },
    data: {
        isShow: false, // 接口返回的是否显示悬浮框
        status: 0, // 运营位的几种展示状态0: 中间（初次显示） 1: 点击或者曝光过，显示在右上角
        navTop: 0,
        dialogInfo: {},
        activityId: 0,
        bannerType: 0,
    },
    attached() {
        const { comicId, topicId, customNav } = this.data;
        const params = {
            comic_id: comicId,
            topic_id: topicId,
        };

        // 每周六定期清除缓存(不判断是否存在，避免一次同步操作)
        const week = new Date().getDay();
        if (week == 6) {
            util_storageFun({ type: "remove", key: "pay:spreeShow" });
        } else if (week == 1) {
            util_storageFun({ type: "remove", key: "pay:spreeClose" });
        }

        getPaySpreeApi(params).then((res) => {
            res = res || {};
            let { id, type, status, big_gift = {}, small_gift = {}, action_target = {}, activity_name = "", banner_type = 153, activity_id = 0 } = res.data || {};

            if (id) {
                // 解析通跳内容
                const { action_type, target_id, parent_target_id, target_web_url, hybrid_url } = action_target;
                const target = {
                    action_type,
                    target_id,
                    parent_target_id,
                    target_web_url,
                    hybrid_url,
                };

                // 不限时&任务已完成不展示
                if (type == 1 && status == 3) {
                    return;
                }

                // 根据曝光情况判断显示大图还是小图
                const tsStatus = wx.getStorageSync("pay:spreeShow");
                this.data.spreeType = type;
                this.data.spreeStatus = status;
                this.setData(
                    {
                        target,
                        bigGift: big_gift,
                        smallGift: small_gift,
                        activityName: activity_name,
                        status: !tsStatus ? 0 : 1,
                        navTop: !tsStatus ? (customNav ? 180 : 100) : customNav ? 220 : 60,
                        activityId: activity_id,
                        bannerType: banner_type,
                    },
                    () => {
                        if (type == 2) {
                            // 判断此类型之前是否点击关闭过
                            const tsType = wx.getStorageSync("pay:spreeClose");
                            if (!tsType) {
                                this.commonFun(tsStatus);
                            }
                        } else {
                            this.commonFun(tsStatus);
                        }
                    }
                );
            } else {
                // this.kksaReport(-1);
            }
        });
    },
    methods: {
        // 礼包展示&大图曝光缓存&曝光上报
        commonFun(tsStatus) {
            this.setData({ isShow: true });
            this.triggerEvent("paySpreeShow");

            // 大图曝光本地缓存，首次展示大图
            if (!tsStatus) {
                util_storageFun({ type: "set", key: "pay:spreeShow", data: true });
            }
            this.kksaReport(0);
        },

        // 点击去H5活动页
        tapGoActive(e) {
            const { ctype } = e.currentTarget.dataset;
            const { target = {}, bannerType } = this.data;
            const { action_type: type, target_id: id, parent_target_id: parentid } = target;
            const url = target.target_web_url || target.hybrid_url || "";

            // 大图小图点击行为
            if (parseInt(ctype)) {
                util_storageFun({ type: "set", key: "pay:spreeShow", data: true });
            }

            // 如果礼包的类型为点击后消失,不再展示
            if (this.data.spreeStatus == 2) {
                this.setData({
                    isShow: false,
                });
                util_storageFun({ type: "set", key: "pay:spreeClose", data: true });
            }

            this.kksaReport(!parseInt(ctype) ? 1 : 2);

            if (bannerType == 153) {
                this.spreeAssign();
            } else {
                util_action({ type, id, parentid, url });
            }
        },

        spreeAssign() {
            const { topicId, activityId } = this.data;
            if (!global.userId) {
                wx.navigateTo({ url: "/pages/login/login" });
                return false;
            }
            postSpreeAssign({
                activity_coupon_id: activityId,
                topic_id: topicId,
            })
                .then((res) => {
                    const { code, data } = res;
                    if (code == 200) {
                        this.assignSuccess(data);
                    } else {
                        this.assignError(code);
                    }
                })
                .catch((error) => {
                    this.assignError(error.code || 500);
                });
        },
        assignSuccess(data) {
            const { assign_count, topic_title, topic_cover_image: url, coupon_started_at = 0, coupon_expired_at = 0, unavailable_comic_num: count = 0 } = data;
            const title = `免费阅读劵*${assign_count}`;
            const subtitle = `可用于《${topic_title}》`;
            const started_at = util_formatTime(coupon_started_at, "yyyy.MM.dd");
            const expired_at = util_formatTime(coupon_expired_at, "yyyy.MM.dd");
            const deadline = `有效期${started_at}~${expired_at}`;
            this.setData({
                dialogInfo: {
                    show: true,
                    code: 200,
                    message: "领取成功",
                    title,
                    subtitle,
                    deadline,
                    count,
                    url,
                },
            });
            this.popupTrack(1);
        },
        assignError(code = 500) {
            this.popupTrack(2);
            this.setData({
                dialogInfo: {
                    show: true,
                    message: "阅读券已抢光",
                    code,
                },
            });
        },
        tapCloseDialog(e) {
            const { reload } = e.currentTarget.dataset;
            const comicId = this.data.comicId;
            this.setData(
                {
                    dialogInfo: {
                        show: false,
                    },
                },
                () => {
                    if (reload == "1") {
                        wx.redirectTo({
                            url: `/pages/comic/comic?id=${comicId}&comicId=${comicId}`,
                        });
                    }
                }
            );
        },

        // 领取弹窗曝光埋点
        popupTrack(type = 1) {
            const { topicName: TopicName, comicName: ComicName, comicId: ComicID, topicId: TopicID } = this.data;
            const typeMap = {
                1: "领取成功弹窗",
                2: "领取失败弹窗",
            };
            const name = typeMap[type] || "";
            const options = {
                popupName: name,
                ComicID,
                ComicName,
                TopicID,
                TopicName,
            };
            app.kksaTrack("PopupShow", options);
        },

        // 埋点内容
        kksaReport(behavior) {
            const data = {
                PayActivityName: String(this.data.activityId),
                ButtonType: "天降礼包",
            };
            if (this.data.bannerType == 153) {
                data.NoticeType = "使用阅读券";
            }
            if (behavior > 0) {
                data.ButtonName = behavior == 1 ? "天降礼包小图" : "天降礼包大图";
            } else {
                data.IsPayGift = behavior == -1 ? 0 : 1;
            }
            app.kksaTrack(behavior > 0 ? "ClickPayPopup" : "PayPopup", data);
        },
    },
});
