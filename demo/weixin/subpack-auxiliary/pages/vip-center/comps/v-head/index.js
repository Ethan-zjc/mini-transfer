/**
 * 会员中心header
 * **/
Component({
    properties: {
        isVip: {
            type: Boolean,
            value: false,
        },
        isiOS: {
            type: Boolean,
            value: false,
        },
        userInfo: {
            type: Object,
            value: null,
        },
        vipInfo: {
            type: Object,
            value: null,
        },
    },
});
