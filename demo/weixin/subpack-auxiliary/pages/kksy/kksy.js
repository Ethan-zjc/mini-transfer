import { util_showToast, util_storageFun } from "../../../util.js";

// 获取应用实例  问题反馈
const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

const page = {
    data: {
        syOrigin: "",
    },

    // 页面创建时执行
    onLoad() {
        this.setData({
            syOrigin: global.sySign,
        });

        if (global.sySign) {
            wx.onCopyUrl(() => {
                return { query: `locate=kksy_${global.sySign}` };
            });
        } else {
            wx.offCopyUrl();
        }
    },
    bindKeyInput(e) {
        this.setData({
            syOrigin: e.detail.value,
        });
    },
    save() {
        // 验证输入框内容是否合法
        let reg = /^[0-9a-zA-Z]*$/g;
        let match = reg.test(this.data.syOrigin);
        if (!this.data.syOrigin) {
            util_showToast({ title: "请输入内容" });
            return;
        }
        if (!match) {
            util_showToast({ title: "请输入字母或数字" });
            return;
        }
        util_showToast({ title: "保存成功" });
        global.sySign = this.data.syOrigin;

        // 绑定私域相关参数
        // wx.offCopyUrl();
        wx.onCopyUrl(() => {
            return { query: `locate=kksy_${global.sySign}` };
        });

        // 本地存储
        util_storageFun({ type: "set", key: "kksy:sign", data: global.sySign });
    },
};

const ConnectPage = connect(
    ({ userInfo, vipInfo }) => {
        return {
            userInfo,
            vipInfo,
        };
    },
    (setState, _state) => ({
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
