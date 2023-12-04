const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
// let h5url = '';  // 全局存储的参数(要打开的H5链接地址)
let isOnline = true; // 是否为正式环境

import { util_prevPage, util_getUrlQuery, util_request } from "../../util.js";

const page = {
    data: {
        url: "", // 存储的跳转前的url
        session: "", // session信息
        fullurl: "", // web-view组件 scr的地质队
        type: "", // 传递的类型
        title: "", // 传递的页面标题
        h5url: "", // 要打开的H5链接地址
        isShow: false, // 是否显示页面
        isOnHide: false, // 是否隐藏页面出发的变化
        isShare: false, // 是否支持分享当前webview
        shareUrl: "", // 分享使用url
        isAddress: false, // 是否使用远程下发h5链接
        addressCallback: null, // 下发h5链接回调
    },
    async onLoad(options) {
        // 是否远程获取h5链接，该设置的时机尽可能要早
        if (options.address) {
            this.data.isAddress = true;
        }

        // 置空数据
        this.data.fullurl = "";
        this.data.session = "";
        this.data.url = "";
        this.data.type = "";
        this.data.h5url = "";
        this.data.shareUrl = options.url || "";
        app.globalData.cps = options.cps || app.globalData.cps || ""; // 保存三方投放携带cps

        // 防止直接进入webview还未拿到系统信息等
        const { name } = util_prevPage();
        if (!name) {
            await app.getSystemInfo();
        }

        // 远程获取h5链接
        if (options.address) {
            const result = await this.getAddress(options.address).catch(() => {});
            if (result && result.h5Url) {
                options.url = encodeURIComponent(result.h5Url);
            } else {
                options.url = encodeURIComponent(`https://h5.kuaikanmanhua.com/404.html?refer=address_${options.address}`);
            }
        }

        this.data.shareUrl = options.url || "";

        let { environment, scene } = global,
            { source = -1, qrcode = "", terminal = "" } = options;
        if (["dev", "stag"].includes(environment)) {
            isOnline = false;
        }
        let type = options.type || "";
        const title = options.title || "";
        let h5url = decodeURIComponent(options.url) || "";
        qrcode = util_getUrlQuery(h5url, "qrcode") || "";

        if (options.q) {
            const str = decodeURIComponent(decodeURIComponent(options.q));
            const urlIndex = str.indexOf("url=");
            if (urlIndex !== -1) {
                type = 2003;
                h5url = str.slice(urlIndex + 4);
                const otherIndex = str.indexOf("&url=");
                if (otherIndex !== -1) {
                    const prefix = str.slice(0, otherIndex);
                    type = util_getUrlQuery(prefix, "type") || 2003;
                    qrcode = util_getUrlQuery(prefix, "qrcode") || "";
                    source = util_getUrlQuery(prefix, "source") || -1;
                }
            }
        }

        // 扫描二维码埋点使用
        this.data.qrcodeSign = qrcode;

        if (title) {
            this.data.title = title;
        }
        this.data.url = h5url;
        this.data.type = type;
        this.data.h5url = h5url;

        // webview支持二维码打开时的埋点&分享卡片打开时的埋点
        this.data.source = source >= 0 ? source : -1;
        if (!name && qrcode) {
            this.shareCardEnter({ scene, source, terminal });
        }
        // 远程获取链接回调
        this.data.isAddress = false;
        if (this.data.addressCallback) {
            this.data.addressCallback();
            this.data.addressCallback = null;
        }
    },

    async onShow() {
        // 分享时不执行相关操作
        if (this.data.isShareStatus) {
            this.data.isShareStatus = false;
            return false;
        }
        const webviewRedirectUrl = decodeURIComponent(this.data.redirect_url || app.globalData.webviewRedirectUrl || "");
        app.globalData.webviewRedirectUrl = false;
        // 是否从收银台支付页面返回
        if (webviewRedirectUrl) {
            wx.redirectTo({
                url: `/pages/webview/webview?type=2003&url=${encodeURIComponent(webviewRedirectUrl)}`,
            });
            return false;
        }

        // 级别更高的强制刷新，无论是否登录，只要有参数都会执行刷新
        // 在onHide里面做了拦截将fullurl置空，再次onshow时fullurl为空，所以继续向下执行
        this.data.refresh = this.data.h5url.includes("refresh") ? util_getUrlQuery(this.data.h5url, "refresh") : false;

        if (!this.data.refresh) {
            // h5跳转到其他页面或转到后台时，当前用户是已登录，等再次回到当前页面不刷新
            let fullurl = this.data.fullurl,
                isFullurl = false,
                { isOnHide, userInfo } = this.data;
            if (fullurl && fullurl.indexOf("session") > -1) {
                isFullurl = true;
            }
            if (isOnHide && userInfo && isFullurl) {
                return false;
            }
        }

        // 防止直接进入webview还未拿到系统信息等
        const { name } = util_prevPage();
        if (!name) {
            await app.getSystemInfo();
        }

        // 防止远程获取h5链接失效
        await this.getAddresCallback();

        let header;
        // 获取storage中的header
        try {
            header = wx.getStorageSync("header") || "";
            console.log("header::", header);
        } catch (e) {
            header = "";
        }
        this.myPageIsRefresh(header, () => {
            if (this.data.title) {
                // 设置标题
                wx.setNavigationBarTitle({ title: this.data.title });
            }

            let url = this.data.h5url;
            let isHashUrl = null; // 记录当前url是否为hash链接
            if (url.indexOf("#/") > -1) {
                // 判断当前url是否为hash链接
                isHashUrl = url.split("#/");
                url = isHashUrl[0] || url; // 保证url存在
            }
            // 清除多余的session/useragent/kkid/code
            if (url.indexOf("session") >= 0) {
                url = this.funcUrlDel(url, "session");
            }
            if (url.indexOf("useragent") >= 0) {
                url = this.funcUrlDel(url, "useragent");
            }
            if (url.indexOf("kkid") >= 0) {
                url = this.funcUrlDel(url, "kkid");
            }
            if (url.indexOf("code") >= 0) {
                url = this.funcUrlDel(url, "code");
            }

            url += url.indexOf("?") == -1 ? "?" : "&";
            if (header) {
                url += `session=${header.session}&useragent=${encodeURIComponent(global.userAgent)}`;
            } else {
                url += `useragent=${encodeURIComponent(global.userAgent)}`;
            }
            // 由部分活动改为统一加kkid
            url += `&kkid=${encodeURIComponent(global.channel + ":" + global.openId + "#" + (header ? header.uid : ""))}`;

            // 添加上级页面参数，h5用于判断是否返回首页
            url += `&prevname=${name || "external"}`;

            // if (!isOnline) {
            //     url += "&eruda=true";
            // }

            if (isHashUrl && isHashUrl.length > 0) {
                // 如果是hash链接需要拼接上
                url += "#/" + (isHashUrl[1] || "");
            }

            // 跳转类型 type=19的情况
            if (this.data.type == "protocol" || this.data.type == 19 || this.data.type == 2003) {
                this.setFullurl(url); // 设置web-view的url防止报错
                return false;
            } else if (this.data.type == 2008) {
                // 跳转类型 type=2008的情况，非强制登录携带授权码
                wx.login({
                    complete: (res) => {
                        if (res.code) {
                            if (url.indexOf("#/") > -1) {
                                // 判断当前url是否为hash链接
                                let hashUrl = url.split("#/");
                                url = hashUrl[0] || url;
                                url = `${url}&code=${res.code}#/${hashUrl[1] || ""}`; // 保证url存在
                            } else {
                                url += `&code=${res.code}`;
                            }
                        }
                        if (url != this.data.fullurl) {
                            this.setFullurl(url); // 设置web-view的url防止报错
                        }
                    },
                });
            } else {
                // 跳转类型 type=18的情况
                if (header) {
                    const session = header.session;

                    // session没变化，认为用户登录态没变，则不再重置url
                    if (this.data.session === session) {
                        return;
                    }
                    this.data.session = session;
                    wx.login({
                        complete: (res) => {
                            if (res.code) {
                                if (url.indexOf("#/") > -1) {
                                    // 判断当前url是否为hash链接
                                    let hashUrl = url.split("#/");
                                    url = hashUrl[0] || url;
                                    url = `${url}&code=${res.code}#/${hashUrl[1] || ""}`; // 保证url存在
                                } else {
                                    url += `&code=${res.code}`;
                                }
                            }
                            if (url != this.data.fullurl) {
                                this.setFullurl(url); // 设置web-view的url防止报错
                            }
                        },
                    });
                } else {
                    // 跳转到登录页
                    wx.navigateTo({ url: "/pages/login/login" });
                }
            }
        });
    },

    // 隐藏页面的时候
    onHide() {
        // 分享时不执行相关操作
        if (this.data.isShareStatus) {
            return false;
        }

        this.data.isOnHide = true; // 隐藏页面显示后不触发
        // wx.setNavigationBarTitle({ title: "" }); // 将标题置空，防止h5返回标题闪烁

        // 如果登录态未发生变化不刷新
        let header;
        try {
            header = wx.getStorageSync("header") || {};
        } catch (e) {
            header = {};
        }
        const session = header.session ? header.session : "";
        if (this.data.session == session) {
            return false;
        }

        // 其余情况均刷新
        this.setData({ fullurl: "" });
    },

    // 是否刷新页面
    myPageIsRefresh(header, callback) {
        if (!callback || typeof callback != "function") {
            callback = function () {};
        }

        let { type, isShow, url: newUrl } = this.data;
        if (isShow) {
            let isHashUrl = null; // 记录当前url是否为hash链接
            if (newUrl.indexOf("#/") > -1) {
                // 判断当前url是否为hash链接
                isHashUrl = newUrl.split("#/");
                newUrl = isHashUrl[0] || newUrl; // 保证url存在
            }
            newUrl = newUrl + (header.session ? `${newUrl.includes("?") ? "&" : "?"}session=` + header.session : "");
            if (isHashUrl && isHashUrl.length > 0) {
                // 如果是hash链接需要拼接上
                newUrl += "#/" + (isHashUrl[1] || "");
            }
            let url = encodeURIComponent(newUrl);
            wx.redirectTo({
                url: `/pages/webview/webview?type=${type}&url=${url}`,
                success: () => {
                    console.log("redirectTo success");
                },
                fail: (err) => {
                    console.log("redirectTo fail", err);
                },
            });
            return false;
        }
        callback();
    },

    // 页面被用户分享时执行
    onShareAppMessage(e) {
        this.data.isShareStatus = true; // 是否分享装进入后台  false:不是 true:是

        // 解决分享地址丢失问题
        return {
            path: `/pages/webview/webview?type=${this.data.type || 2003}${global.sySign ? "&locate=kksy_" + global.sySign : ""}&url=${this.data.shareUrl}`,
        };
    },

    // 设置web-view的url防止报错    url : 要打开的H5链接
    setFullurl(url) {
        this.setData(
            {
                fullurl: url,
                isShow: true,
            },
            () => {
                console.log("onShow", this.data.type, this.data.fullurl);
            }
        );
    },

    // 绑定postMessage回调
    handlerMessage(e) {
        this.setWebview(e.detail);
    },

    // 删除url中某个参数
    funcUrlDel(url, name) {
        if (url.indexOf(name) > -1) {
            let paramObj = {};
            let baseUrl = url.split("?")[0];
            let qurey = url.split("?")[1];
            let arr = qurey.split("&");
            for (let i = 0; i < arr.length; i++) {
                arr[i] = arr[i].split("=");
                paramObj[arr[i][0]] = arr[i][1];
            }
            delete paramObj[name];
            let resultUrl =
                baseUrl +
                "?" +
                JSON.stringify(paramObj)
                    .replace(/[\"\{\}]/g, "")
                    .replace(/\:/g, "=")
                    .replace(/\,/g, "&");
            return resultUrl;
        }
    },

    // 分享卡片进入或扫描二维码
    shareCardEnter({ scene, source, terminal } = {}) {
        const origins = [1007, 1011, 1012, 1013, 2003, 2016, 1036];
        // 点击分享卡片进入,判断场景值是否为app进入
        if (origins.includes(scene)) {
            this.shareReport({
                source,
                type: 3,
                fromapp: scene == 1036 || !terminal,
                terminal,
            });
        }
    },

    /**
     * type: 1详情页，2专题页，3h5
     * fromapp: app分享标识
     * source: 分享到哪个平台
     * terminal: 来源终端
     */
    shareReport({ type = 3, fromapp = false, source = -1, terminal = "wechat" } = {}) {
        let eventName = "OpenShareMiniprogram";
        const { channel } = global;
        const { userInfo, qrcodeSign } = this.data;
        const data = {
            SourcePlatform: channel,
            ShareContentType: type,
            IsLogin: !!userInfo,
            SubjectID: qrcodeSign,
            QRcode: qrcodeSign,
            Source: fromapp ? -1 : source,
            ShareTerminal: fromapp ? "APP" : terminal,
        };
        app.kksaTrack(eventName, data);
    },
    // 根据address参数远程请求h5链接
    getAddress(id) {
        return new Promise((resolve, reject) => {
            util_request({
                url: "/v1/miniactivity/param/config/search",
                data: { id },
            })
                .then((res) => {
                    const { data = {} } = res;
                    const { value = "" } = data;
                    let result = {};
                    try {
                        result = JSON.parse(value);
                    } catch (error) {
                        console.log("fail:webview-address");
                    }
                    resolve(result);
                })
                .catch(() => {
                    reject();
                });
        });
    },
    // 远程请求h5链接回调
    getAddresCallback() {
        return new Promise((resolve) => {
            if (this.data.isAddress) {
                this.data.addressCallback = () => {
                    resolve();
                };
            } else {
                resolve();
            }
        });
    },
};

const ConnectPage = connect(
    ({ userInfo, webview }) => {
        return {
            userInfo,
            webview,
        };
    },
    (setState, _state) => ({
        setWebview(newVal) {
            setState({
                webview: newVal,
            });
        },
        clearWebview() {
            setState({ webview: {} });
        },
    })
)(page);

Page(ConnectPage);
