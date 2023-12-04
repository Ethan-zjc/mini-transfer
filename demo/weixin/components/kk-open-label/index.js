/**
 * 开屏新用户选标签弹窗 20211025 新增
 * **/
const app = getApp();
const global = app.globalData;
const images = {
    boyIcon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/boy-icon_3f1f8fa.png",
    girlIcon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/girl-icon_d6d5516.png",
    titlebgIcon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/find/titlebg-icon_048f8ad.png",
};

import { util_updateUserInfo, util_getGender, util_logManager, util_request } from "../../util.js";
import { getOpenLabelApi } from "./api.js";

Component({
    properties: {
        userInfo: {
            type: Object,
            value: null,
        },
    },
    data: {
        images,
        isShow: false, // 接口返回的是否显示选标签
        showUserLabel: false, // 是否展示用户选择弹窗
        showSex: true, // 显示性别区域/喜欢的类型区域
        labelList: [], // 标签列表
        curLabels: [], // 当前性别对应的标签
        labeRow: 0, // curLabels.length/3上取整后的值,设置高度使用
        choseNum: 0, // 选中标签的个数
        curSex: null,
        popLevel1: false,
    },
    attached() {
        if (global.openAcount) {
            this.judgeOpenCount();
        } else {
            global.openAcountCallback = () => {
                this.judgeOpenCount();
            };
        }
    },
    methods: {
        judgeOpenCount() {
            // 调用拉取性别以及喜好标签接口
            if (global.openAcount === 1 && !global.labelWinClose) {
                this.choseUserInfo();
            } else {
                this.setData({
                    popLevel1: true,
                });
            }
        },
        // 调用拉取性别以及喜好标签接口
        choseUserInfo() {
            getOpenLabelApi()
                .then((res) => {
                    let { data } = res;
                    this.data.labelList = data.label_list;
                    this.setData({ isShow: true });
                    this.showTrack();
                })
                .catch(() => {
                    this.setData({
                        popLevel1: true, // 新手福利优先级是1，选标签是0
                    });
                });
        },

        // 选择性别
        choseSex(e) {
            let curSex = e.currentTarget.dataset.sex;
            let curLabels = this.data.labelList.filter((item) => {
                if (item.gender == curSex) {
                    return item;
                }
            })[0];
            let labels = curLabels.labels.map((item) => {
                item.isSelect = false;
                return item;
            });
            let row = Math.ceil(labels.length / 3);
            this.setData({
                curLabels: labels,
                labeRow: row > 8 ? 8 : row,
                showSex: false,
                curSex: curSex,
            });
            // 选择性别上报
            app.kksaTrack("ClickButton", {
                TriggerPage: "GenderSelectPage", // 触发页面
                ButtonName: curSex == 0 ? "性别选择页_女生" : "性别选择页_男生", // 选择上报按钮名称
            });
        },

        // 选择标签
        choseLabels(e) {
            let curIndex = e.currentTarget.dataset.index;
            let curLabels = this.data.curLabels;
            let choseNum = this.data.choseNum;
            curLabels.map((item, index) => {
                if (curIndex == index) {
                    item.isSelect = !item.isSelect;
                    item.isSelect ? choseNum++ : choseNum--;
                }
                return item;
            });
            this.setData({
                curLabels,
                choseNum,
            });
        },

        // 选择性别标签弹窗，点击选好了
        submitLabels() {
            let submitLabels = "";
            this.data.curLabels.map((item, index) => {
                if (item.isSelect) {
                    submitLabels += item.name + ",";
                }
            });
            submitLabels = submitLabels.substr(0, submitLabels.length - 1);
            this.setData({
                isShow: false,
            });
            // 上报用户信息接口
            util_updateUserInfo({
                gender: this.data.curSex,
                medium_age: "",
                request_type: 1,
                tags: submitLabels,
            }).then((res) => {
                // 刷新发现页数据
                util_getGender()
                    .then(() => {
                        this.triggerEvent("labelCallback");
                    })
                    .catch(() => {});
            });

            // 选择标签，点击选好了上报
            app.kksaTrack("ClickButton", {
                TriggerPage: "LabelSelectPage", // 触发页面
                ButtonName: "选择标签页_选好啦", // 选择上报按钮名称
            });

            // 选择标签，上报选好标签
            app.kksaTrack("LabelSelectClk", {
                LabelSelect: submitLabels, // 选择的标签
            });
            global.labelWinClose = true;
            this.setData({
                popLevel1: true, // 新手福利优先级是1，选标签是0
            });
        },

        // 点击遮罩关闭弹窗
        maskclose() {
            global.labelWinClose = true;
            if (this.data.showSex) {
                // 关闭弹窗上报
                app.kksaTrack("ClickButton", {
                    TriggerPage: "GenderSelectPage", // 触发页面
                    ButtonName: "性别选择页_关闭", // 选择上报按钮名称
                });
            } else {
                // 关闭弹窗上报
                app.kksaTrack("ClickButton", {
                    TriggerPage: "LabelSelectPage", // 触发页面
                    ButtonName: "选择标签页_关闭", // 选择上报按钮名称
                });
            }
            this.setData({
                isShow: false,
                popLevel1: true,
            });
        },
        welfareEvent() {
            this.triggerEvent("welfareCallback");
        },
        welfareFinish() {
            this.triggerEvent("welfareFinish");
        },
        // 曝光埋点
        showTrack() {
            app.kksaTrack("PopupShow", {
                PrePage: "",
                CurPage: "FindPage",
                popupName: "选择性别弹窗",
            });
        },
    },
});
