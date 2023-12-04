/**
 * 监听userInfo变化，在onShow判断userInfo是否变化，执行回调方法
 */

const app = getApp();
const userInfo = wx.getStorageSync("userInfo");

module.exports = app.onBehaviors({
    data: {
        cacheUserId: userInfo ? userInfo.user.id : "",
    },
    onShow() {
        if (this.watchUser) {
            this.userChanged((userId) => {
                this.watchUser(userId);
            });
        }
    },
    pageLifetimes: {
        show() {
            if (this.watchUser) {
                this.userChanged((userId) => {
                    this.watchUser(userId);
                });
            }
        },
    },
    methods: {
        userChanged(callback) {
            const userInfo = this.data.userInfo;
            let ifChange = false;
            if (userInfo) {
                const userId = userInfo.user.id;
                ifChange = userId !== this.data.cacheUserId;
                this.data.cacheUserId = userId;
            } else {
                ifChange = this.data.cacheUserId;
                this.data.cacheUserId = "";
            }
            if (ifChange && this.watchUser) {
                callback(this.data.cacheUserId);
            }
        },
    },
});
