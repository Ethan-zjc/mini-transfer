import { util_getDynamicData } from '../../../util.js';

// 获取应用实例  问题反馈
const app = getApp();
const { connect } = app.Store;

const page = {
    data: {
        showModal: 'problem', // problem->问题列表 explain->问题详情描述
        explainId: 0, // 默认显示的问题描述的id
        explainTitle: '',
        problemList: [
            { title: '如何开启/关闭弹幕', id: 1 },
            { title: '换手机之后KK币消失', id: 2 },
            { title: 'KK币充值未到账', id: 3 },
            { title: '支付成功，没有显示为会员', id: 4 },
            { title: 'KK币是否会过期？', id: 5 },
            { title: '使用小程序过程中闪退', id: 6 },
        ],
        explainList: [
            {
                title: '如何开启/关闭弹幕',
                id: 1,
                list: ['方法一：点击发布栏上方的「弹幕」按钮，即可开启/关闭弹幕', '方法二：长按屏幕中图片2s后，即可开启/关闭弹幕'],
            },
            {
                title: '换手机之后KK币消失',
                id: 2,
                list: ['• 因苹果公司限制，iOS设备与Android设备的KK币余额不互通', '• 请确认您登陆的账号是否为您充值的账号。'],
            },
            {
                title: 'KK币充值未到账',
                id: 3,
                list: ['充值后可能会出现延缓到账的问题，若延缓到账超过8小时，您可以联系客服为您补单（注意：订单从充值时间开始算起，没有超过8小时，不能补单哦~）', '客服联系方式：关注微信公众号“快看club”解决您的问题'],
            },
            {
                title: '支付成功，没有显示为会员',
                id: 4,
                list: [
                    '• 请您首先核实订单是否支付成功，如订单未支付成功，则会员开通失败',
                    '• 请您核实是否已登录会员账号，并检查会员账号是否已经到期',
                    '• 请尝试退出会员中心/开通页面，然后再次进入会员中心页面，会员状态会自动刷新；',
                    '• 如您正确登录了账号并且会员未到期，请您先尝试退出重登的方式，如仍未解决，请关注微信公众号“快看club”解决您的问题',
                ],
            },
            {
                title: 'KK币是否会过期？',
                id: 5,
                list: ['赠币有效期15~30天，过期后将失效不可用，可以在我的钱包中查看过期时间，及时使用'],
            },
            {
                title: '使用小程序过程中闪退',
                id: 6,
                list: ['可能是因为手机同时运行多个应用，长时间运行过多应用会导致内存不足，进而导致小程序出现闪退情况，可以尝试清理手机内存，或重启手机后再访问小程序。'],
            },
        ],
        height: 0, // 胶囊的高度
        top: 0, // 胶囊距离头部的距离
        time: 0, // 点击返回或者叉号延迟的时间  防止重复点击
        iPhoneX: app.globalData.iPhoneX, // 是否为ios全屏手机
    },

    // 页面创建时执行
    onLoad() {
        this.getMenuTop();

        this.getRechargeDesc(3);
        this.getRechargeDesc(4);
    },

    // 页面被用户分享时执行
    onShareAppMessage() {},

    async getRechargeDesc(explainId) {
        let id = explainId === 3 ? (app.globalData.onRelease ? 103 : 60) : explainId === 4 ? (app.globalData.onRelease ? 104 : 61) : 0;
        const { data } = await util_getDynamicData({ id });
        let { explainList } = this.data;
        const { order_froms, desc } = data;

        if (desc && order_froms.includes(3)) {
            explainList.map((item) => {
                if (item.id === explainId) {
                    item.list = [desc];
                }
                return item;
            });
            this.setData({
                explainList,
            });
        }
    },

    // 获取胶囊信息
    getMenuTop() {
        if (!wx.getMenuButtonBoundingClientRect) {
            return;
        }
        const menuButton = wx.getMenuButtonBoundingClientRect();
        this.setData({
            height: menuButton.height,
            top: menuButton.top + 1,
        });
    },

    clickProblemItem(event) {
        let dataset = event.currentTarget.dataset; // 数据集合
        // 获取跳转数据
        let { id, title } = dataset;
        this.setData({
            showModal: 'explain', // problem->问题列表 explain->问题详情描述
            explainId: id, // 默认显示的问题描述的id
            explainTitle: title,
        });
    },

    // 修改定时时间
    setTime() {
        this.data.time = setTimeout(() => {
            clearTimeout(this.data.time);
            this.data.time = 0;
        }, 500);
    },

    // 点击头部返回按钮
    topNavigateBack() {
        if (this.data.time != 0) {
            // 防止重复点击
            return false;
        }
        this.setTime(); // 点击延迟

        if (this.data.showModal == 'explain') {
            // 如果是问题详细描述
            this.setData({
                showModal: 'problem',
                explainId: '',
                explainTitle: '',
            });
            return false;
        } else {
            let pages = getCurrentPages(); // 页面栈
            if (pages.length == 1) {
                // 没其它页面栈,跳转到首页
                wx.switchTab({
                    url: '/pages/find/find',
                });
            } else {
                // 有其它页面栈,返回上一页
                wx.navigateBack({ delta: 1 });
            }
        }
    },
};

const ConnectPage = connect(
    ({ userInfo, vipInfo }) => {
        return {
            userInfo,
            vipInfo,
        };
    },
    (setState) => ({
        setVipinfo(newVal) {
            setState({
                vipInfo: newVal,
            });
        },
    })
)(page);

Page(ConnectPage);
