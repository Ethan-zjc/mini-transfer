/* eslint-disable no-use-before-define */
import base64 from './base64';
import gs from './gs';

const { miniInfo } = require('./mini.config.js');
const kksa = require('./sa-sdk-miniprogram-1.14.23/product/sensorsdata.custom.full.js');

const openId = wx.getStorageSync('openId') || '';
const header = wx.getStorageSync('header') || '';
const userId = header ? header.uid : '';
const userInfo = wx.getStorageSync('userInfo') || null;
const userAgent = wx.getStorageSync('userAgent');

const onRelease = miniInfo.release;
const onReleaseVersion = miniInfo.version;
const environment = onRelease ? 'prod' : wx.getStorageSync('environment') ? wx.getStorageSync('environment') : 'stag';

const saProject = {
    prod: 'https://sa.kkmh.com/sa?project=applet_prod',
    test: 'https://sa.kkmh.com/sa?project=kuaikan_test',
};
const enviro = environment == 'prod' ? 'prod' : 'test';

// UA携带版本号
const versionText = onReleaseVersion.replace(/\./g, '');
const defVersion = (versionText + '00') * 1 + 330000;
const minVersion = defVersion < 584000 ? 584000 : defVersion;

// 处理刚进入没有全局共享参数的默认
const app = getApp({ allowDefault: true }) || getApp() || {};

// 如果非直接进入帖子进入，埋点无需重新初始化/qq独立分包问题暂是不区分
// if (JSON.stringify(app) == "{}") {
kksa.setPara({
    show_log: !onRelease,
    batch_send: false,
    name: 'mini-program',
    server_url: saProject[enviro],
});

if (openId) {
    kksa.setOpenid(openId);
    kksa.init();
    // 绑定uid和openId
    if (userId) {
        kksa.login(userId);
    }
}
// }

// 全局数据,当回到主包会覆盖相应字段数据
app.globalData = app.globalData || {
    cps: '',
    scene: '',
    sySign: '',
    openId,
    userId,
    userInfo,
    userAgent,
    onRelease,
    environment,
    systemInfo: {},
    isiOS: false,
    iPhoneX: false,
    channel: 'wechat',
    screenRpxRate: 2,
    onReleaseVersion,
    openIdCallback: null,
};
app.postSubData = {}; // 帖子独立分包专属数据,避免进入主包混淆主包全局数据

// 检测onshow及参数
wx.onAppShow((res) => {
    const { scene, query } = res,
        { cps } = query;
    app.globalData.scene = scene;
    app.globalData.cps = cps || '';
});

const getSystemInfo = () => {
    return new Promise((resolve) => {
        wx.getSystemInfo({
            success: (res) => {
                app.globalData.systemInfo = res;
                const model = res.model;

                const isiOS = ['iPhone', 'iPad', 'iPod', 'iPodtouch', 'unknown', 'Unknown'].filter((item) => {
                    return model.indexOf(item) === 0;
                });
                let infos = isiOS[0] || '';
                // iphone5s是Unknown, iphone 11系列不支持前unknown<iPhone12,1>,现支持是model:::iPhone 11<iPhone12,1>
                if (infos === 'Unknown' || infos === 'unknown') {
                    infos = 'iPhone';
                }
                if (infos === '') {
                    app.globalData.isiOS = false;
                    infos = res.system.split(' ').join(';');
                } else {
                    app.globalData.isiOS = true;
                    app.globalData.iPhoneX =
                        model.includes('unknown') || model.includes('iPhone X') || model.includes('iPhone 11') || model.includes('iPhone 12') || model.includes('iPhone10,3') || model.includes('iPhone10,6') || model.includes('iPhone11') || model.includes('iPhone12') || model.includes('iPhone 13');
                    infos += `;${res.system}`;
                }

                // 添加适配mac
                if (res.platform == 'mac') {
                    app.globalData.isiOS = true;
                }

                const haslt = model.indexOf('<') !== -1;
                infos += `;${haslt ? model.substring(model.indexOf('<') + 1, model.indexOf('>')) : model}`;
                const ratio = res.pixelRatio;
                const screenWidth = res.screenWidth;
                const screenWidthPx = ratio * screenWidth;

                app.globalData.screenRpxRate = 750 / res.windowWidth;
                if (res.windowWidth && res.screenWidth && res.windowWidth != res.screenWidth) {
                    app.globalData.screenRpxRate = 750 / Math.min(res.windowWidth, res.screenWidth);
                }
                app.globalData.userAgent = `KuaikanMiniProgram/1.0.0/${minVersion}(${infos};${app.globalData.channel};WIFI;${ratio * res.screenHeight}*${screenWidthPx})`;
                resolve();
                wx.setStorageSync('userAgent', app.globalData.userAgent);
            },
        });
    });
};

/**
 * 统一异步本地存储，避免大量使用非必要的同步存储
 * set、remove
 */
const storageFun = ({ type = 'set', key = '', data = '' } = {}) => {
    if (type == 'set') {
        wx.setStorage({
            key,
            data,
            success: () => {},
        });
    } else if (type == 'remove') {
        wx.removeStorage({
            key,
            success: () => {},
        });
    }
};
const getOpenSubId = () => {
    return new Promise((resolve) => {
        if (app.globalData.openId) {
            resolve(app.globalData.openId);
        } else {
            wx.login({
                success: (res) => {
                    request({
                        // app: this,
                        url: '/v2/passport/oauth/code_info',
                        data: {
                            code: res.code,
                            source: app.globalData.channel,
                        },
                    }).then((res) => {
                        const openId = res.data.open_id;
                        storageFun({ type: 'set', key: 'openId', data: openId });
                        app.globalData.openId = openId;
                        // 获取 openId 后，执行神策 init 初始化
                        if (kksa) {
                            kksa.setOpenid(openId);
                            kksa.init();

                            // 绑定uid和openId
                            if (global.userId) {
                                kksa.login(global.userId);
                            }
                        }

                        resolve(openId);
                    });
                },
            });
        }
    });
};

/*
 * 检查当前是否在目标name页面
 * 如果是，则返回该页面实例
 */
const isPage = (name) => {
    const pages = getCurrentPages();
    const length = pages.length;
    if (length) {
        const currentPage = pages[length - 1];
        if (currentPage) {
            const route = currentPage.route;
            if (route && route.substring(route.lastIndexOf('/') + 1) == name) {
                return currentPage;
            }
        }
    }
    return false;
};

const logout = (newlogout) => {
    const global = app.globalData;
    if (global.logoutting) {
        return;
    }
    global.logoutting = true;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('header');
    wx.removeStorageSync('subscribeStatus');
    app.globalData.userId = '';
    getApp().kksa.logout();

    if (newlogout) {
        global.logoutting = false;
    } else {
        if (!isPage('login')) {
            wx.navigateTo({
                url: '/pages/login/login',
                complete: () => {
                    global.logoutting = false;
                },
            });
        } else {
            global.logoutting = false;
        }
    }
};

/**
 * 从cookieList中 获取目标cookie的值
 * @params {Array} cookieList     request返回cookies,例如：["a=123; Domain=.quickcan.cn; Expires=Fri, 04-Nov-2022 10:31:23 GMT; Path=/"]
 * @params {String} key           目标key
 * @params {Object} app           app实例
 */
const cacheCookie = (cookieStr = '', key = '') => {
    if (!key) {
        return;
    }
    const reg = new RegExp(key + '=([^;]*)');
    const matchRes = cookieStr.match(reg);
    if (matchRes) {
        const global = app.globalData || {};
        global[key] = decodeURIComponent(matchRes[1]);
    }
};

const request = ({ url, data, host, method }) => {
    return new Promise((resolve, reject) => {
        // 设置header信息
        const header = {
            'content-type': 'application/x-www-form-urlencoded',
            'Package-Id': 'com.kuaikan.main',
            'User-Agent-Mini': app.globalData.userAgent,
        };

        // 公共请求
        const publicRequest = () => {
            let cookieStr = '';
            const { kk_s_t = '', channel = '', openId = '' } = app.globalData || {};
            if (openId) {
                const kkst = kk_s_t || '';
                header['Mini-App-Info'] = gs(`${channel}:${openId}`, kkst, data);
                cookieStr += `kk_s_t=${kkst};`;
                header['Cookie'] = cookieStr;
            }

            // 读取本地缓存的header
            // 读取成功（已登录），则置入请求Cookie
            // 否则（未登录），则在请求回调中，将header放入本地缓存
            const cacheHeader = wx.getStorageSync('header') || '';
            if (cacheHeader) {
                // header["Cookie"] = `session=${cacheHeader.session}; uid=${cacheHeader.uid};`;
                cookieStr += `session=${cacheHeader.session}; uid=${cacheHeader.uid};`;
                header['Cookie'] = cookieStr;
            }
            // 拼接请求url
            let requesturl = 'https://';
            host = host || 'api';
            const preiview = {
                api: 'api-preview',
                pay: 'pay',
                search: 'search-preview',
                social: 'api-preview',
            };
            requesturl += {
                prod: `${host}.kkmh.com`,
                preview: `${preiview[host]}.kkmh.com`,
                stag: `${host}.quickcan.cn`,
                dev: `dev-${host}.quickcan.cn`,
            }[app.globalData.environment];
            requesturl += url[0] === '/' ? url : `/${url}`;
            // 对'DELETE'方法，单独处理参数
            if ((method == 'DELETE' || method == 'delete') && data) {
                requesturl += '?';
                requesturl += Object.keys(data)
                    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                    .join('&');
            }
            // 发起请求
            wx.request({
                url: requesturl,
                method: (method || 'get').toUpperCase(),
                data: data || {},
                dataType: 'json',
                header,
                timeout: 10000,
                success: (res) => {
                    res = res ? res : {};
                    const data = res.data ? res.data : {};
                    const code = data['code'];
                    const responseCookies = res.header['Set-Cookie'] || res.header['set-cookie'] || `kk_s_t=${Date.now()}`;
                    cacheCookie(responseCookies, 'kk_s_t');
                    if (code === 200) {
                        // 设置本地存储header
                        if (!cacheHeader) {
                            const header = res.header['Set-Cookie'] || res.header['set-cookie'];
                            if (header) {
                                const sessionIndex = header.indexOf('session=');
                                const uidIndex = header.indexOf('uid=');
                                if (sessionIndex !== -1 && uidIndex !== -1) {
                                    let session = header.substring(sessionIndex + 8);
                                    session = session.substring(0, session.indexOf(';'));
                                    let uid = header.substring(uidIndex + 4);
                                    uid = uid.substring(0, uid.indexOf(';'));
                                    wx.setStorage({
                                        key: 'header',
                                        data: { session, uid },
                                        complete: () => {
                                            resolve(data);
                                        },
                                    });
                                    return;
                                }
                            }
                        }
                        resolve(data);
                    } else {
                        if (code === 401 || code === 402) {
                            let myPagePatt = /benefit\/my_page/;
                            if (url !== '/v2/users/me' && !myPagePatt.test(url)) {
                                // 该接口请求401|402时，不进行登出
                                logout();
                            }
                            return;
                        } else {
                            // 6002: like/{targetType}/{targetId} ===> 重复点赞
                            // 6003: like/{targetType}/{targetId} ===> 重复取消点赞
                            // 10550: comic/detail & topic/detail ===> 此专题/章节在当前区域有版权限制
                            // 10551: comic/detail & topic/detail ===> 此专题/章节是敏感专题
                            // 10500: comic/detail ===> 没有找到这个章节
                            // 10552: topic/detail ===> 没有找到这部漫画
                            // 10553: favourite/remind_layer ===> 没有未读的关注漫画更新
                            // 10005: v2/comicbuy/encrypt_buy_h5 ===> 漫画已经免费
                            // 10023: v2/comicbuy/encrypt_buy_h5 ===> 漫画可以观看（已经买过，或者已经是会员）
                            // 11039: v2/kb/banner/h5_recharge ===> KK币已领取
                            // if (![6002, 6003, 10550, 10551, 10500, 10552, 10553, 10005, 10023, 11039].includes(code)) {
                            //     showToast({ title: data['message'] })
                            // }
                            // add 暂时放开这几个
                            if ([6002, 6003, 10552, 2005].includes(code)) {
                                showToast({ type: '', title: data['message'] });
                            }
                        }
                        reject(data);
                    }
                },
                fail: (res) => {
                    showToast({ title: res.message || '系统错误' });
                    reject(res);
                },
            });
        };

        // 设置openId
        const openId = app.globalData.openId;
        if (openId) {
            header['Mini-Id'] = `${app.globalData.channel}:${openId}`;
            publicRequest();
        } else {
            publicRequest();
            // getOpenSubId().then(openId => { // 防止未拿到openId
            //     header['Mini-Id'] = `${app.globalData.channel}:${openId}`
            //     publicRequest()
            // })
        }
    });
};

let toastTimeout = null;
const showToast = (toast) => {
    const isloading = toast.type == 'loading';
    if (!isloading && !toast.title) {
        // 如果是普通toast，但是没有传递title，则停止执行
        return;
    }
    const pages = getCurrentPages();
    const length = pages.length;
    if (length) {
        const currentPage = pages[length - 1];
        const nowtoast = currentPage.data.toast;
        if (nowtoast && nowtoast.show && nowtoast.type == 'loading') {
            // 如果当前有在显示的loading，则停止执行
            return;
        }
        const duration = toast.duration || 1500;
        toast.show = true;
        if (toastTimeout) {
            clearTimeout(toastTimeout);
            // 关闭再打开，为了触发组件内的watch，重新计算高度
            currentPage.setData(
                {
                    [`toast.show`]: false,
                },
                () => {
                    currentPage.setData({ toast });
                }
            );
        } else {
            currentPage.setData({ toast });
        }
        if (!isloading) {
            toastTimeout = setTimeout(() => {
                clearTimeout(toastTimeout);
                currentPage.setData({
                    [`toast.show`]: false,
                });
            }, duration);
        }
    }
};
const hideToast = () => {
    const pages = getCurrentPages();
    const length = pages.length;
    if (length) {
        const currentPage = pages[length - 1];
        if (toastTimeout) {
            clearTimeout(toastTimeout);
        }
        currentPage.setData({
            [`toast.show`]: false,
        });
    }
};

const formatTime = function (date, format) {
    date = new Date(date);
    let map = {
        M: date.getMonth() + 1,
        d: date.getDate(),
        h: date.getHours(),
        m: date.getMinutes(),
        s: date.getSeconds(),
        q: Math.floor((date.getMonth() + 3) / 3),
        S: date.getMilliseconds(),
    };

    format = format.replace(/([yMdhmsqS])+/g, function (all, t) {
        let v = map[t];
        if (v !== undefined) {
            if (all.length > 1) {
                v = '0' + v;
                v = v.substr(v.length - 2);
            }
            return v;
        } else if (t === 'y') {
            return (date.getFullYear() + '').substr(4 - all.length);
        }
        return all;
    });
    return format;
};
const transNum = (el) => {
    const num = el + '';
    const len = num.length;
    if (len > 8) {
        return num.slice(0, -8) + '.' + num.slice(-8, -6) + '\u4EBF';
    } else if (len == 5) {
        return num.slice(0, -4) + '.' + num.slice(-4, -3) + '\u4E07';
    } else if (len > 5) {
        return num.slice(0, -4) + '\u4E07';
    } else {
        return num;
    }
};

/*
 * 检查页面栈里的上一个页面
 * 如果存在，则返回{page(该页面实例)、name(页面名称，如'login')、options(页面参数)}
 * 否则返回空对象{}
 */
const prevPage = () => {
    const pages = getCurrentPages();
    const length = pages.length;
    const ary = {
        topic: 'TopicPage',
        find: 'FindPage',
        feed: 'RecommendPage',
        class: 'FindCat',
        rank: 'RankPage',
        'topic-list': 'CurrencyVisitPage',
        my: 'BookshelfPage',
        comic: 'ComicPage',
    };
    if (length && length > 1) {
        const prevPage = pages[length - 2];
        if (prevPage) {
            const route = prevPage.route;
            const name = route.substring(route.lastIndexOf('/') + 1);
            return {
                page: prevPage,
                name,
                options: prevPage.options,
                trigger: ary[name] || 'Kuaikan',
            };
        }
    }
    return {};
};

const kksaTrack = (eventName, props) => {
    const { channel, cps, onRelease, onReleaseVersion, locate } = app.globalData;

    // 获取openid后，执行埋点方法
    const options = {
        SourcePlatform: channel,
        mini_program_version: onRelease ? onReleaseVersion : '1.0.0',
        // abtestSign: abtestSign
    };

    if (cps) {
        options.cps_parameter = cps;
    }

    if (locate) {
        options.Locate = locate;
    }

    if (kksa) {
        kksa.track(eventName, Object.assign(options, props));
    }
};

// 推荐数据打点
const feedTrack = (event, options) => {
    const global = app.globalData;
    const SourcePlatform = global.channel;
    const openId = `${SourcePlatform}:${global.openId}`;
    const def = {
        SourcePlatform,
        TriggerPage: '',
    };
    const data = {
        distinct_id: global.userId || openId,
        time: new Date().getTime(),
        event,
    };
    let properties = {};

    if (Object.prototype.toString.call(options) === '[object Array]') {
        properties = options.map((item) => {
            return {
                ...def,
                ...item,
            };
        });
    } else {
        Object.assign(properties, def, options);
    }

    Object.assign(data, { properties });

    request({
        url: '/v1/app_data',
        method: 'post',
        data: { data: base64.encode(JSON.stringify(data)) },
    }).then(() => {});
};

// 转换数字 X亿 X万（大于10w）
const util_transNum = (el) => {
    const num = el + '';
    const len = num.length;
    if (len > 8) {
        return num.slice(0, -8) + '.' + num.slice(-8, -6) + '\u4EBF';
    } else if (len > 5) {
        return num.slice(0, -4) + '\u4E07';
    } else {
        return num;
    }
};

/*
 * 仅支持安卓的场景，直接resolve
 * 如果是iOS，弹出modal，显示统一文案，用户点击按钮才会reject
 */
const util_notiOS = () => {
    return new Promise((resolve, reject) => {
        if (app.globalData.isiOS && app.globalData.iosIsShowPay) {
            resolve();
        } else if (app.globalData.isiOS) {
            swan.showModal({
                content: '由于相关规范，iOS功能暂不可用',
                showCancel: false,
                confirmColor: '#FF751A',
                confirmText: '我知道了',
                complete(res) {
                    reject(res);
                },
            });
        } else {
            resolve();
        }
    });
};

const util_action = ({ type, id, url, params, parentid, subpack, redirect }) => {
    url = url ? url : '';
    url = url.replace(/(^\s*)|(\s*$)/g, '');
    return new Promise((resolve, reject) => {
        if ([21, 22, 43, 44, 77].includes(type)) {
            subpack = true;
        } else {
            subpack = false;
        }
        let page = subpack ? '' : '/pages';
        const navigate = () => {
            if (params) {
                let flag = true;
                page += page.indexOf('?') === -1 ? '?' : '&';
                for (let key in params) {
                    page += flag ? '' : '&';
                    page += `${key}=${params[key]}`;
                    if (flag) {
                        flag = false;
                    }
                }
            }

            if (redirect) {
                wx.redirectTo({
                    url: page,
                    success: () => {
                        resolve();
                    },
                    fail: (e) => {
                        reject(e);
                    },
                });
            } else {
                wx.navigateTo({
                    url: page,
                    success: () => {
                        resolve();
                    },
                    fail: (e) => {
                        reject(e);
                    },
                });
            }
        };
        if (!type || type == 13) {
            // 无跳转
            reject('无跳转');
        } else if (type == 2) {
            // 专题/作品
            page += `/topic/topic?id=${id}&topicId=${id}`;
        } else if (type == 3) {
            // 章节/详情
            page += `/comic/comic?id=${id}&comicId=${id}`;
        } else if (type == 68) {
            // 章节/详情/续读话
            if (!app.globalData.userId) {
                let topicHistory = wx.getStorageSync('historyForTopic') || {};
                const obj = topicHistory[parentid] || {};
                id = obj.lastId || '';
            }
            page += `/comic/comic?id=${id}&comicId=${id}&parentId=${parentid || ''}`;
        } else if (type == 9) {
            // 分类
            page += '/class/class';
        } else if (type == 10) {
            // 二级列表页，需携带参数指定列表类型
            page += `/topic-list/topic-list${url ? '?' + url : ''}`;
        } else if (type == 15) {
            // 发现页
            page += '/find/find';
        } else if (type == 18 || type == 2004) {
            // 18本地维护,2004服务端维护
            // hybrid跳转 需要登录
            page += `/webview/webview?url=${encodeURIComponent(url)}`;
        } else if (type == 19 || type == 2003) {
            // 19本地维护,2003服务端维护
            // hybrid跳转 不需要登录状态
            page += `/webview/webview?url=${encodeURIComponent(url)}&type=protocol`;
        } else if (type == 21) {
            // 我的钱包
            page += '/subpack-auxiliary/pages/wallet/wallet';
        } else if (type == 22) {
            // 充值中心    type:下单来源  1:我的钱包  2:活动页
            page += '/subpack-auxiliary/pages/buykkb/buykkb';
        } else if (type == 43) {
            // 会员开通页   type:下单来源  1:我的钱包  2:活动页
            page += '/subpack-auxiliary/pages/vip-center/vip-center';
        } else if (type == 44) {
            // 会员中心
            page += '/subpack-auxiliary/pages/vip-center/vip-center';
        } else if (type == 66) {
            // 排行榜
            page += `/rank/rank?id=${id}`;
        } else if (type == 77) {
            page += `/subpack-auxiliary/pages/comment-detail/comment-detail?id=${id}`;
        } else if (type == 2000 || type == 2002) {
            // 新增跳转至活动页(小程序原生活动页面)
            page = url;
        } else if (type == 2001) {
            // 20200630(小程序迭代8)新增跳转至小程序任务中心(任务二级页)
            // page += `/task/task`; // 已删除
        } else if (type == 2005) {
            // 跳转其他小程序
            wx.navigateToMiniProgram({
                appId: id,
                path: url || '', // 目标地址
                extraData: {}, // 传递给目标小程序数据
                envVersion: app.globalData.onRelease ? 'release' : 'trial',
                success() {
                    // 打开成功
                },
            });
            return;
        }

        if ([22, 43].includes(type)) {
            // 仅支持安卓，iOS禁止
            util_notiOS()
                .then(() => {
                    if (!wx.getStorageSync('header')) {
                        logout();
                    } else {
                        navigate();
                    }
                })
                .catch(() => {
                    console.warn('iOS不支持该跳转类型');
                });
            return;
        }
        if ([18, 21, 22, 43, 44, 2002].includes(type) && !wx.getStorageSync('header')) {
            // 需要登录且未登录
            console.warn('该跳转类型需要登录');
            logout();
            return;
        }
        if (type !== 2005) {
            navigate();
        }
    });
};

/*
 * 获取页面路径中的参数值 例，'pages/find/find?a=1&b=2&cps=3222' 中获取 'cps' , 返回 3222
 * @params url    类型:String   是否必填：是    含义：页面路径
 * @params urlkey  类型:String  是否必填：是    含义：参数的key
 * return 参数的值   含义：参数的value   如果无返回空值
 */
const util_getUrlQuery = (url, urlkey) => {
    let querystr = url.split('?');
    let GETs;
    let GET = [];
    let tmp_arr;
    let key;
    if (querystr[1]) {
        GETs = querystr[1].split('&');
        for (let i = 0; i < GETs.length; i++) {
            tmp_arr = GETs[i].split('=');
            key = tmp_arr[0];
            GET[key] = tmp_arr[1];
            if (urlkey == key) {
                return GET[key];
            }
        }
        return '';
    }
    return '';
};

if (!app.loadPost) {
    // 此时初始化默认数据
    app.globalData.sySign = wx.getStorageSync('kksy:sign') || '';
    getSystemInfo().then(() => {
        getOpenSubId().then(() => {
            // 初次获取后，执行回调
            if (app.globalData.openIdCallback) {
                app.globalData.openIdCallback();
                app.globalData.openIdCallback = null;
            }
        });
    });
    app.loadPost = true; // 是否加载了帖子分包
}

const global = app.globalData;

export { global, request, prevPage, transNum, formatTime, showToast, hideToast, kksaTrack, feedTrack, storageFun, util_action, util_transNum, util_getUrlQuery };
