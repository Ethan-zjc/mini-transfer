import { util_action, util_logout, util_showToast } from '../../../util.js';
import { miniInfo } from '../../../mini.config.js';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const env = app.globalData.environment;
const host = env == 'prod' ? 'https://h5.kuaikanmanhua.com' : 'https://mini.kkmh.com';
const JUMP_PAGE = 1;
const CLEAR_STORAGE = 2;

const page = {
    data: {
        CLEAR_STORAGE,
        list: [
            {
                title: '相关许可证',
                func: JUMP_PAGE,
                action: {
                    type: 19,
                    target_web_url: `${host}/pro/202106/license_publicity/index.html?conf2fullscreen=1&statusbar=1`,
                },
            },
            {
                title: '问题反馈',
                func: JUMP_PAGE,
                action: {
                    type: 2007,
                },
            },
            {
                title: '快看隐私协议',
                func: JUMP_PAGE,
                action: {
                    type: 19,
                    target_web_url: 'https://h5.kuaikanmanhua.com/web/mini_privacy_policy',
                },
            },
            {
                title: '用户服务协议',
                func: JUMP_PAGE,
                action: {
                    type: 19,
                    target_web_url: 'https://h5.kuaikanmanhua.com/web/mini_protocol',
                },
            },
            {
                title: '一键清除缓存',
                func: CLEAR_STORAGE,
                action: {
                    type: 13,
                },
            },
        ],
        dialogButtons: [
            {
                text: '退出',
                type: 'cancel',
            },
            {
                text: '取消',
                type: 'confirm',
            },
        ],
        dialogShow: false,
        ipxBottom: 0,
        versionName: miniInfo.version,

        versionClickTime: 0,
        versionClickCount: 0,
        enableDebug: false,
    },
    onLoad() {
        const { iPhoneX, screenRpxRate } = global;
        this.setData({
            ipxBottom: iPhoneX ? Math.ceil(34 * screenRpxRate) : 0,
        });

        if (!global.abtestSign.length) {
            app.getAbTest().then(() => {
                this.sySetFun();
            });
        } else {
            this.sySetFun();
        }
    },

    // 私域入口设置
    sySetFun() {
        if (global.abtestSign.includes('s_sy_wx_a')) {
            const { list = [] } = this.data;
            list.push({
                title: '私域来源参数',
                action: {
                    type: 3001,
                },
            });
            this.setData({ list });
        }
    },
    handleClick(e) {
        const { index } = e.currentTarget.dataset;
        const { func, action } = this.data.list[index];
        switch (func) {
            case JUMP_PAGE:
                this.tapAction(action);
                break;
            case CLEAR_STORAGE:
                this.clearStorage();
                break;
        }
    },
    tapAction(action) {
        const { type, target_id: id, target_web_url: url, parent_target_id: parentid } = action;
        util_action({ type, id, url, parentid });
    },
    openDebug() {
        // 监听每隔200ms之内连续点击10次版本号，触发debug模式
        const now = Date.now();
        const { versionClickTime, versionClickCount } = this.data;

        if (this.data.enableDebug) return false;

        if (versionClickCount > 8) {
            this.setData({
                enableDebug: true,
            });
            return false;
        }

        if (!versionClickTime || now - versionClickTime < 1000) {
            this.data.versionClickCount = versionClickCount + 1;
            this.data.versionClickTime = now;
        } else {
            this.data.versionClickCount = 0;
            this.data.versionClickTime = 0;
        }
    },

    clearStorage() {
        wx.showModal({
            title: '提示',
            content: '确认清除缓存',
            confirmText: '清除',
            success: (res) => {
                if (res.confirm) {
                    wx.clearStorage({
                        success() {
                            util_showToast({
                                title: `清除缓存成功`,
                            });
                            setTimeout(() => {
                                wx.reLaunch({
                                    url: '/pages/find/find',
                                });
                            }, 1500);
                        },
                    });
                }
            },
        });
    },

    tapLogin() {
        this.setData({
            dialogShow: true,
        });
    },
    tapButtons(e) {
        const { type } = e.detail;
        if (type == 'cancel') {
            this.logout();
        } else {
            this.setData({
                dialogShow: false,
            });
        }
    },
    logout() {
        util_logout();
        this.setUserInfo(null);
        wx.navigateBack({ delta: 1 });
    },
};

const ConnectPage = connect(
    ({ userInfo }) => {
        return {
            userInfo,
        };
    },
    (setState) => ({
        setUserInfo(newVal) {
            setState({
                userInfo: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
