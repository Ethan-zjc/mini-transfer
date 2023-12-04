import { util_prevPage } from '../../util.js';
const global = getApp().globalData;

Page({
    onLoad(opts) {
        if (opts.pagetype && opts.pagetype == 'auto') {
            // 签约自动续费
            let extraData = JSON.parse(decodeURIComponent(opts.extraData));
            extraData.request_serial = extraData.request_serial * 1;
            wx.showModal({
                title: '提示',
                content: '是否确定要自动签约？',
                success: (res) => {
                    if (res.confirm) {
                        // 加一个本地存储sence、cps
                        wx.setStorageSync('sign:params', { sence: global.sence || '', cps: global.cps });
                        wx.navigateToMiniProgram({
                            appId: 'wxbd687630cd02ce1d',
                            path: 'pages/index/index',
                            extraData: extraData,
                            success: () => {
                                // 成功跳转到签约小程序
                                global.toSignProgram = true;
                            },
                            fail: (res) => {
                                // 未成功跳转到签约小程序
                                this.complete(res, 'signpay_error');
                            },
                        });
                    } else {
                        wx.navigateBack();
                    }
                },
            });
        } else {
            // 调起微信支付
            opts.timeStamp += '';
            opts.package = decodeURIComponent(opts.package);
            opts.success = (res) => {
                // 支付成功
                this.complete(res, 'pay_sucess');
            };
            opts.fail = (res) => {
                // 支付失败
                this.complete(res, 'pay_error');
            };
            wx.requestPayment(opts);
        }
    },

    // 完成后的统一行为
    complete(res, type) {
        const { page, name } = util_prevPage();
        if (name == 'webview') {
            this.init(true);
        }
        page.setData(
            {
                fullurl: '',
            },
            () => {
                const str = typeof res == 'string' ? res : JSON.stringify(res);
                page.setData(
                    {
                        fullurl: `${page.data.url}&res=${str}&restype=${type}`,
                    },
                    () => {
                        wx.navigateBack();
                    }
                );
            }
        );
    },
});
