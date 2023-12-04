import { util_formatTime } from '../../../util';

const app = getApp();
const global = app.globalData;
const { connect } = app.Store;

const page = {
    data: {
        type: 0, // 查询类型 0:未使用，1:已失效
        list: [],
        defCoupon: 0,
        couponObj: {},
    },
    onLoad(options) {
        const { couponStr = '{}', checked = '' } = options;
        Object.assign(this.data, {
            couponObj: JSON.parse(couponStr),
        });
        this.getCouponList(checked);
        this.comTrack(0);
    },
    handleTabChange(e) {
        const { type } = e.currentTarget.dataset;
        const { type: nowType } = this.data;
        if (type === nowType) return false;
        this.comTrack(type);
        this.setData({ type });
        this.getCouponList();
    },
    getCouponList(checked) {
        const list = this.data.couponObj[this.data.type ? 'unreachable_list' : 'usable_list'];
        list.forEach((item) => {
            item.amount_str = item.amount / 100;
            item.start_time = util_formatTime(item.start_at, 'yyyy.MM.dd');
            item.end_time = util_formatTime(item.end_at, 'yyyy.MM.dd');
        });
        const options = {
            list,
        };
        if (checked) {
            const index = list.findIndex((item) => item.id == checked);
            options.defCoupon = index >= 0 ? index : 0;
        }
        this.setData(options);
    },
    handleClick(e) {
        if (this.data.type == 1) {
            return;
        }
        const { index } = e.currentTarget.dataset;
        this.setData({
            defCoupon: index,
        });
        global.defaultCouponItem = this.data.list[index];
    },
    comTrack(tab) {
        app.kksaTrack('CommonPageOpen', {
            CurPage: '小程序会员优惠券页面',
            PrePage: '会员中心页',
            ModuleName: !tab ? '可用优惠券' : '不可用优惠券',
        });
    },
};

const ConnectPage = connect()(page);
Page(ConnectPage);
