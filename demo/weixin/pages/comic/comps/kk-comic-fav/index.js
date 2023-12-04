/**
 * 关注提醒
 * **/

const app = getApp();
const global = app.globalData;

Component({
    properties: {
        ipxBottom: {
            type: [Number, String],
            value: 0,
        },
        userInfo: {
            type: Object,
            value: {},
        },
    },
    methods: {
        stopPop() {
            console.log("stop");
        },
        closeFav() {
            this.triggerEvent("closeFav");
        },
        followClick() {
            this.triggerEvent("followClick");
        },
        originLogin(e) {
            this.triggerEvent("originLogin", e);
        },
    },
});
