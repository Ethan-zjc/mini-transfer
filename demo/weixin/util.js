/* eslint-disable no-use-before-define */
import base64 from './common/js/base64';
import gs from './common/js/gs';

const { deleteStore } = require('./store.js');

/*
 * request封装
 * @params {String} url         请求地址（不带域名），必填
 * @params {Json} data          请求参数，非必填
 * @params {String} host        请求域名，非必填，枚举['api', 'search', 'pay']，默认为'api'
 * @params {String} method      请求方式，非必填，枚举['get', 'post', 'delete']，默认为'get'
 * @params {Object} app         getApp实例，非必填，由于在app.js中调用request触发了getApp()方法，这是不被官方允许的，所以直接把app实例传递进函数
 * @params {Boolean} json 	    设置header 中content-type是否为application/json
 * @params {Boolean} sign       是否接口验签名，默认false
 */
const util_request = ({ url, data, host, method, app, json = false }) => {
    return new Promise((resolve, reject) => {
        const _app = getApp() || app;
        _app.globalData = _app.globalData ? _app.globalData : {};
        const global = _app.globalData;
        const requestData = data || '';

        // 设置header信息
        const header = {
            'content-type': json ? 'application/json' : 'application/x-www-form-urlencoded',
            'Package-Id': 'com.kuaikan.main',
            'User-Agent-Mini': global.userAgent,
        };
        // 设置openId
        const openId = global.openId;
        let cookieStr = '';
        if (openId) {
            const kkst = global.kk_s_t || '';
            header['Mini-Id'] = `${global.channel}:${openId}`;
            header['Mini-App-Info'] = gs(`${global.channel}:${openId}`, kkst, data);
            cookieStr += `kk_s_t=${kkst};`;
            header['Cookie'] = cookieStr;
        }

        // 读取本地缓存的header
        // 读取成功（已登录），则置入请求Cookie
        // 否则（未登录），则在请求回调中，将header放入本地缓存
        const cacheHeader = wx.getStorageSync('header') || '';
        if (cacheHeader) {
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
        };
        requesturl += {
            prod: `${host}.kkmh.com`,
            preview: `${preiview[host]}.kkmh.com`,
            stag: `${host}.quickcan.cn`,
            dev: `dev-${host}.quickcan.cn`,
        }[global.environment];
        requesturl += url[0] === '/' ? url : `/${url}`;
        // 对'DELETE'方法，单独处理参数
        if ((method == 'DELETE' || method == 'delete') && data) {
            requesturl += '?';
            requesturl += Object.keys(data)
                .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(data[key])}`)
                .join('&');
        }
        // 发起请求
        global.mainInterfaceStartTimestamp = new Date().getTime();
        wx.request({
            url: requesturl,
            method: (method || 'get').toUpperCase(),
            data: data || {},
            dataType: 'json',
            header,
            success: (res) => {
                res = res ? res : {};
                const profile = res.profile || {};
                const data = res.data ? res.data : {};
                const code = data['code'];
                const responseCookies = res.header['Set-Cookie'] || res.header['set-cookie'] || `kk_s_t=${Date.now()}`;
                cacheCookie(responseCookies, 'kk_s_t', _app);
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
                            util_logout();
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
                        //     util_showToast({ title: data['message'] })
                        // }
                        // add 暂时放开这几个
                        if ([6002, 6003, 10552].includes(code)) {
                            util_showToast({ title: data['message'] });
                        }
                    }
                    const timeStart = profile.fetchStart || 0;
                    const timeEnd = profile.responseEnd || 0;
                    const log = {
                        LogType: 'request',
                        ErrorCode: code,
                        ErrorMsg: data['message'],
                        RequestData: requestData,
                        RequestUrl: requesturl,
                    };
                    util_getLogManager('request', log);
                    util_logManager({
                        ...log,
                        LogInfo: {
                            duration: timeEnd - timeStart,
                        },
                    });
                    reject(data);
                }
            },
            fail: (res) => {
                const message = res.message || '服务异常';
                const log = {
                    LogType: 'request',
                    ErrorCode: 100200,
                    ErrorMsg: message,
                    RequestData: requestData,
                    RequestUrl: requesturl,
                };
                // util_showToast({ title: message });
                util_getLogManager('request', log);
                util_logManager({
                    ...log,
                    LogInfo: res,
                });
                reject(res);
            },
        });
    });
};

/**
 * 从cookieList中 获取目标cookie的值
 * @params {Array} cookieList     request返回cookies,例如：["a=123; Domain=.quickcan.cn; Expires=Fri, 04-Nov-2022 10:31:23 GMT; Path=/"]
 * @params {String} key           目标key
 * @params {Object} app           app实例
 */
const cacheCookie = (cookieStr = '', key = '', app) => {
    if (!key) {
        return;
    }
    const reg = new RegExp(key + '=([^;]*)');
    const matchRes = cookieStr.match(reg);
    if (matchRes) {
        const _app = app || getApp();
        _app.globalData = _app.globalData ? _app.globalData : {};
        const global = _app.globalData;
        global[key] = decodeURIComponent(matchRes[1]);
    }
};

/*
 * { type, title, duratioin, mask } 参数含义如下：
 * @params {String} type        控制图标显示以及显示类型，非必填，枚举'success'/'error'/'loading'，默认为空（不显示图标）
 * @params {String} title       toast内容，必填，支持换行（\n），如果传值为空不会显示toast
 * 以下参数同 wx.showToast()，参考 https://developers.weixin.qq.com/miniprogram/dev/api/ui/interaction/wx.showToast.html
 * @params {Number} duration    控制显示时长，非必填，默认1500（毫秒）
 * @params {Boolean} mask       控制是否显示透明蒙层，阻止用户触发页面其他事件，非必填，默认false
 */
let toastTimeout = null;
const util_showToast = (toast) => {
    toast.type = toast.type || '';
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
const util_hideToast = () => {
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

/*
 * 检查当前是否在目标name页面
 * 如果是，则返回该页面实例
 */
const util_isPage = (name) => {
    const pages = getCurrentPages();
    const length = pages.length;
    if (length) {
        const currentPage = pages[length - 1];
        if (currentPage) {
            const route = currentPage.route;
            if (route.substring(route.lastIndexOf('/') + 1) == name) {
                return currentPage;
            }
        }
    }
    return false;
};

/*
 * 检查页面栈里的上一个页面
 * 如果存在，则返回{page(该页面实例)、name(页面名称，如'login')、options(页面参数)}
 * 否则返回空对象{}
 */
const util_prevPage = () => {
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

/*
 * 退出登录（前端行为，未调用接口），如果不在登录页，则自动跳转登录页
 */
const util_logout = (newlogout, noClearCookie) => {
    const global = getApp().globalData;

    // 新增退出登录接口
    if (!noClearCookie) {
        util_request({
            url: '/v1/passport/mini/sign_out',
            method: 'get',
            data: {},
        });
    }

    if (global.logoutting) {
        return;
    }
    global.logoutting = true;
    wx.removeStorageSync('userInfo');
    wx.removeStorageSync('header');
    wx.removeStorageSync('openContinuRead');
    wx.removeStorageSync('subscribeStatus');
    util_storageFun({ type: 'remove', key: 'pullRechargeBubble:find' });
    util_storageFun({ type: 'remove', key: 'pullRechargeBubble:feed' });
    util_storageFun({ type: 'remove', key: 'bubbleclicktimes' });
    getApp().globalData.userId = '';
    getApp().kksa.logout();
    deleteStore('wallet');
    deleteStore('vipInfo');
    deleteStore('userInfo');

    // 清除天降礼包相关缓存
    util_storageFun({ type: 'remove', key: 'pay:spreeShow' });
    util_storageFun({ type: 'remove', key: 'pay:spreeClose' });

    if (newlogout) {
        global.logoutting = false;
    } else {
        if (!util_isPage('login') && !util_isPage('setting')) {
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

/*
 * 通用跳转
 * @params {String} type        跳转类型，对应actionType，必填
 * @params {Number|String} id   专题id、章节id，等等，对应targetId，非必填
 * @params {String} url         hybrid url，对应targetUrl，非必填
 * @params {Object} params        自定义参数，会转化成字符串拼接到url，非必填
 * @params {redirect} Boolearn    是否重定向打开页面，非必填
 * https://wiki.quickcan.com/pages/viewpage.action?pageId=131008370
 */
const util_action = ({ type, id, url, params, parentid, subpack, redirect }) => {
    url = url ? url : '';
    url = url.replace(/(^\s*)|(\s*$)/g, '');
    return new Promise((resolve, reject) => {
        if ([21, 22, 43, 44, 77, 2006, 2007, 3001, 2009, 2010].includes(type)) {
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

            // 避免页面栈中存在多个长列表页面导致长列表id冲突
            if (getApp().globalData.abContinuRead && type == 3) {
                const pages = getCurrentPages() || [];
                const routes = pages.map((item) => item.route);
                if (routes.includes('pages/comicnew/comicnew')) {
                    wx.reLaunch({
                        url: page,
                        success: () => {
                            resolve();
                        },
                        fail: (e) => {
                            reject(e);
                        },
                    });
                    return;
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
            getApp().globalData.OnActionStartTimestamp = new Date().getTime();
            page += `/${getApp().globalData.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${id}&comicId=${id}`;
        } else if (type == 68) {
            // 章节/详情/续读话
            if (!getApp().globalData.userId) {
                let topicHistory = wx.getStorageSync('historyForTopic') || {};
                const obj = topicHistory[parentid] || {};

                // 轮播图支持指定章节
                id = obj.lastId ? obj.lastId : params && params.source == 'find-carousel' ? id || '' : '';
            }
            getApp().globalData.OnActionStartTimestamp = new Date().getTime();
            page += `/${getApp().globalData.abContinuRead ? 'comicnew/comicnew' : 'comic/comic'}?id=${id}&comicId=${id}&parentId=${parentid || ''}`;
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
                envVersion: getApp().globalData.onRelease ? 'release' : 'trial',
                success() {
                    // 打开成功
                },
            });
            return;
        } else if (type == 2006) {
            page += `/subpack-auxiliary/pages/setting/setting`;
        } else if (type == 2007) {
            page += `/subpack-auxiliary/pages/feedback/feedback`;
        } else if (type == 2008) {
            // h5非强制登录，携带code码
            // hybrid跳转 不需要登录状态
            page += `/webview/webview?url=${encodeURIComponent(url)}&type=2008`;
        } else if (type == 3001) {
            // 3*** 私有工具, 3001私域运营
            page += `/subpack-auxiliary/pages/kksy/kksy`;
        } else if (type == 2009) {
            // 跳转到漫剧播放页，续播
            page += `/subpack-video/pages/chapters/chapters?parentId=${parentid ? parentid : id}`;
        } else if (type == 2010) {
            // 跳转到漫剧播放页，非续播
            page += `/subpack-video/pages/chapters/chapters?id=${id}&parentId=${parentid}`;
        }

        if ([22, 43].includes(type)) {
            // 仅支持安卓，iOS禁止
            util_notiOS()
                .then(() => {
                    if (!wx.getStorageSync('header')) {
                        util_logout();
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
            util_logout();
            return;
        }
        if (type !== 2005) {
            navigate();
        }
    });
};

/*
 * 仅支持安卓的场景，直接resolve
 * 如果是iOS，弹出modal，显示统一文案，用户点击按钮才会reject
 */
const util_notiOS = () => {
    return new Promise((resolve, reject) => {
        if (getApp().globalData.isiOS) {
            wx.showModal({
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

// 图片统一拼接后缀方法
const util_feSuffix = ({ src, width, quality }) => {
    const global = getApp().globalData;
    const ratio = global.ratio;
    const screenWidth = global.screenWidth;
    const rpxToPx = Math.ceil(width / 2);
    const cssWidth = Math.floor((rpxToPx / 375) * screenWidth);
    const realWidth = cssWidth * ratio;
    let target, format, q, newsrc;

    // 兼容老方法
    if (src.indexOf('imageMogr2') !== -1) {
        return src;
    }
    // 兼容脏数据
    newsrc = src;
    let reg = /-((c\.w\.i\d+|c\.w\d+|cw\.w\d+)|(fe\.w\d+)|(h\.w\d+)|(h\.w\.i\d+)|(icon)|(o\d+)|(o\.i\d+)|(t\.w\d+)|(w\d+)|(yyb)|(lw\d+))[\s\S]*$/g;
    if (reg.test(src)) {
        newsrc = src.replace(reg, '');
    } else if (/\.webp\.w\.jpg/.test(src)) {
        newsrc = src.replace(/\.webp\.w\.jpg/, '.webp');
    }

    // 过滤 gif
    if (/.gif$/.test(newsrc)) {
        return newsrc;
    }

    if (realWidth <= 50) {
        target = 50;
    } else if (realWidth <= 70) {
        target = 70;
    } else if (realWidth <= 90) {
        target = 90;
    } else if (realWidth <= 120) {
        target = 120;
    } else if (realWidth <= 180) {
        target = 180;
    } else if (realWidth <= 207) {
        target = 207;
    } else if (realWidth <= 320) {
        target = 320;
    } else if (realWidth <= 360) {
        target = 360;
    } else if (realWidth <= 414) {
        target = 414;
    } else if (realWidth <= 540) {
        target = 540;
    } else if (realWidth <= 563) {
        target = 563;
    } else if (realWidth <= 640) {
        target = 640;
    } else if (realWidth <= 720) {
        target = 720;
    } else if (realWidth <= 750) {
        target = 750;
    } else if (realWidth <= 828) {
        target = 828;
    } else if (realWidth <= 960) {
        target = 960;
    } else if (realWidth <= 1080) {
        target = 1080;
    } else if (realWidth <= 1125) {
        target = 1125;
    } else if (realWidth <= 1280) {
        target = 1280;
    } else if (realWidth <= 1440) {
        target = 1440;
    } else if (realWidth <= 1600) {
        target = 1600;
    } else if (realWidth <= 2160) {
        target = 2160;
    }
    target = 750; // 固定图片质量

    // format = global.isiOS ? "jpg" : "webp";
    format = 'webp';
    if (global.isiOS) {
        const systemInfo = global.systemInfo;
        let system = systemInfo.system || '';
        system = (system || '').toLowerCase();
        system = system.replace(/ios /g, '');
        let list = system.split('.') || [];
        format = Number(list[0] || 0) >= 14 ? format : /.png$/.test(newsrc) ? 'png' : 'jpg';
    }
    q = quality ? 'l' : 'h'; // h or l 两种质量 quality为true默认为低质量

    return `${newsrc}-t.w${target}.${format}.${q}`;
};

/*
 * 检查我的钱包余额
 * 传入页面实例，直接更改data.wallet
 */
const util_checkWallet = (page) => {
    return new Promise((resolve, reject) => {
        if (page.data && page.data.userInfo) {
            util_request({
                host: 'pay',
                url: '/v2/kb/mini/wallet',
                data: {
                    from: 3,
                },
            }).then((res) => {
                const data = res.data;
                const wallet = data.wallet[getApp().globalData.isiOS ? 'ios_balance' : 'nios_balance'];
                if (page.setWallet && typeof page.setWallet == 'function') {
                    page.setWallet(wallet);
                }
                resolve(data);
            });
        } else {
            if (page.setWallet && typeof page.setWallet == 'function') {
                page.setWallet('');
            }
            reject();
        }
    });
};

// 检查我的vip状态
const util_checkVipInfo = (page, callback) => {
    if (!callback && typeof callback != 'function') {
        callback = () => {};
    }
    util_request({
        host: 'pay',
        url: '/v1/vip/me',
    })
        .then((res) => {
            res = res || {};
            res.data = res.data || {};
            res.data.vip = res.data.vip || {};
            page.setVipinfo(res.data.vip);
            callback(res.data.vip);
        })
        .catch(() => {
            callback({});
        });
};

// 数组去重
const util_arrayArrange = (ary) => {
    const obj = {};
    const result = [];
    const len = ary.length;
    for (let i = 0; i < len; i++) {
        if (!obj[ary[i]]) {
            obj[ary[i]] = true;
            result.push(ary[i]);
        }
    }
    return result;
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
 * 时间戳转换为时间
 * @params date    类型:Number|String   时间戳
 * @params format  类型:String          转换的事件的格式
 * format支持: 年:yyyy|yy  月:M|MM  日:d|dd  小时:h|hh 分:m|mm 秒:s|ss  链接符支持任意字符
 * format实例:
 *  'yyyy-MM-dd hh:mm:ss'
 *  'yyyy年MM月dd日 hh时mm分ss秒'
 *  'yy年M月d日'
 *  'hh:mm:ss'
 * return 格式化后的时间
 */
const util_formatTime = (date, format) => {
    date = date || new Date();
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

// 广告打点
const util_adTrack = (obj, callback) => {
    const global = getApp().globalData;
    const platform = global.channel == 'wechat' ? 10 : global.channel == 'qq' ? 11 : 10;
    const options = Object.assign(
        {
            creative_type: 1,
            ad_platform_id: platform,
            timestamp: new Date().getTime(),
        },
        obj
    );

    util_request({
        url: '/v3/ad/mini_program/upload',
        method: 'post',
        data: { events: JSON.stringify([options]) },
    })
        .then(() => {
            if (callback) {
                callback();
            }
        })
        .catch(() => {});

    // 日志统计
    if (options.event == 'AD_ERROR') {
        const { unit_id, ad_pos_id, debug_info = {} } = options;
        const { error_code: ErrorCode, error_msg: ErrorMsg } = debug_info.mini_program || {};
        util_getLogManager('ad', options);
        util_logManager({
            LogType: 'ad',
            LogInfo: {
                unit_id,
                ad_pos_id,
            },
            ErrorCode,
            ErrorMsg,
        });
    }
};

// 推荐数据打点
const util_feedTrack = (event, options) => {
    const global = getApp().globalData;
    const SourcePlatform = global.channel;
    const openId = `${SourcePlatform}:${global.openId}`;
    const def = {
        SourcePlatform,
        TriggerPage: '',
        AppletName: '快看mini',
        PackageId: 'com.kuaikan.main',
        MiniProgramID: global.openId,
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

    util_request({
        url: '/v1/app_data',
        method: 'post',
        data: { data: base64.encode(JSON.stringify(data)) },
    });
};

/*
 * 多级页面来源
 * 返回{ SrcPageLevel1, SrcPageLevel2, SrcPageLevel3, TriggerPage, CurPage}
 */
const util_multPage = (value) => {
    const hashPages = getCurrentPages();
    const currentPages = hashPages.map((item) => {
        const route = item.route;
        const name = route.substring(route.lastIndexOf('/') + 1);
        return {
            name,
            route,
        };
    });
    const length = currentPages.length;
    const options = {
        SrcPageLevel1: '',
        SrcPageLevel2: '',
        SrcPageLevel3: '',
        TriggerPage: '',
        CurPage: '',
    };
    const ary = {
        find: {
            trackName: 'FindPage',
            level: 1,
        },
        feed: {
            trackName: 'RecommendPage',
            level: 1,
        },
        my: {
            trackName: 'BookshelfPage',
            level: 1,
        },
        class: {
            trackName: 'FindCat',
            level: 2,
        },
        rank: {
            trackName: 'RankPage',
            level: 2,
        },
        'topic-list': {
            trackName: 'CurrencyVisitPage',
            level: 2,
        },
        topic: {
            trackName: 'TopicPage',
            level: 2,
            isFilter: true,
        },
        comic: {
            trackName: 'ComicPage',
            level: 3,
            isFilter: true,
        },
        search: {
            trackName: 'SearchPage',
            level: 2,
            isFilter: true,
        },
        custom: {
            trackName: '定制漫画页',
            level: 2,
        },
        'welfare-list': {
            trackName: '新手福利二级页',
            level: 2,
        },
        'welfare-list-new': {
            trackName: '新手福利二级页',
            level: 2,
        },
        'invitation-team': {
            trackName: '组队活动页',
            level: 1,
        },
    };

    if (length) {
        const manyPage = currentPages.filter((item) => {
            const row = ary[item.name];
            return !!row && !row.isFilter;
        });
        const prevPage = currentPages[length - 2];
        const lastPage = currentPages[length - 1];

        const setPageFn = (params) => {
            const name = params.name;
            const obj = ary[name] || {};
            let children = '';
            if (name == 'rank' || name == 'class') {
                children = options.SrcPageLevel3;
            } else if (name == 'my') {
                children = options.SrcPageLevel2;
            } else {
                children = obj.trackName;
            }
            return children;
        };

        if (manyPage.length) {
            const addList = [];
            const newListPages = manyPage.map((item) => {
                const name = item.name;
                const moreData = ary[name];

                if (name == 'class' && value && value['class']) {
                    addList.push({
                        name: 'class-children',
                        trackName: `FindCat_${value['class'].tagTitle}`,
                        level: 3,
                    });
                }
                if (name == 'rank' && value && value['rank']) {
                    addList.push({
                        name: 'rank-children',
                        trackName: `RankPage_${value['rank'].title}`,
                        level: 3,
                    });
                }
                if (name == 'my' && value && value['my']) {
                    addList.push({
                        name: 'my-children',
                        trackName: value['my'].active == 1 ? 'ReadHistoryPage' : 'MyFavTopicPage',
                        level: 2,
                    });
                }

                // if (name == 'topic-list' && value) {
                //     Object.assign(moreData,{
                //         trackName: value['topic-list'].type == 'feed' ? 'HotRecommendPage' : 'CurrencyVisitPage'
                //     })
                // }

                return {
                    name,
                    ...moreData,
                };
            });
            const allListPages = newListPages.concat(addList);
            allListPages.map((item) => {
                if ([1, 2, 3].includes(item.level)) {
                    Object.assign(options, {
                        [`SrcPageLevel${item.level}`]: item.trackName,
                    });
                }
            });
        }

        if (prevPage) {
            const TriggerPage = setPageFn(prevPage);
            Object.assign(options, {
                TriggerPage,
            });
        }

        if (lastPage) {
            const CurPage = setPageFn(lastPage);
            Object.assign(options, {
                CurPage,
            });
        }
    }

    return options;
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

// 启动次数
const util_startCount = () => {
    let num = wx.getStorageSync('newStartCount') || 0;
    num++;
    wx.setStorage({
        key: 'newStartCount',
        data: num,
    });
};

/*
 * 根据场景值判断打开方式
 * 文档地址：https://developers.weixin.qq.com/miniprogram/dev/reference/scene-list.html
 * @params scene 场景值
 * return 场景值映射
 */
const util_openWay = (scene, app) => {
    app = app || getApp();
    const sceneMap = {
        1001: '任务栏-最近使用',
        1089: '任务栏-最近使用',
        1005: '搜索-卡片（小程序全局卡片)',
        1026: '任务栏-我的小程序',
        1035: '公众号菜单',
        1023: '系统桌面',
        1058: '公众号文章',
        1007: '分享卡打开小程序',
        1008: '分享卡打开小程序',
        1074: '会话',
        1082: '会话',
        1088: '会话',
        1090: '长按小程序菜单圆点',
        1036: 'APP分享',
        1073: '小程序客服消息',
        1081: '小程序客服消息',
        1103: '发现入口-我的小程序',
        1104: '发现入口-我的小程序',
        1024: '小程序主页',
        1038: '其他小程序返回',
        1012: '长按识别二维码',
        1043: '模板消息',
        1014: '订阅消息',
        1037: '其他小程序',
        1011: '扫一扫二维码',
        1047: '扫一扫二维码',
        1049: '扫一扫二维码',
        1013: '相册选取二维码',
        1048: '相册选取二维码',
        1102: '公众号主页',
        1022: '聊天顶部',
        1056: '聊天顶部',
        1107: '订阅消息', // 订阅号视频打开小程序
        1152: '订阅消息', // 订阅号视频打开小程序
    };
    let result = sceneMap[scene] || '其他';
    if (scene == 1107 || scene == 1014) {
        const notice = app.globalData.notice;
        switch (notice) {
            case '1':
                result += '-关注漫画';
                break;
            case '2':
                result += '-开通会员';
                break;
            case '3':
                result += '-会员即将过期';
                break;
            case '4':
                result += '-会员到期';
                break;
            case '5':
                result += '-领取赠币提示';
                break;
            case '6':
                result += '-赠币到期提示';
                break;
            case '7':
                result += '-裂变活动';
                break;
            case '8':
                result += '-未知';
                break;
            case '9':
                result += '-VIP3开始';
                break;
            case '10':
                result += '-VIP3结束';
                break;
            case '11':
                result += '-签到提醒';
                break;
            case '1001':
                result += '-作品更新';
                break;
            case '1002':
                result += '-奖品更新通知';
                break;
            case '1003':
                result += '-活动到期提醒';
                break;
            case '1004':
                result += '-新作上架';
                break;
            case '1005':
                result += '-红包雨开始提醒';
                break;
            default:
                result += '-未知';
                break;
        }
    }
    return result;
};

// 小程序防抖函数
const util_debounce = (func, wait = 500, option = { leading: false, trailing: true }) => {
    const { leading = false, trailing = true } = option;
    let _leading = leading;
    let timeout = 0;
    return function (...args) {
        clearTimeout(timeout);
        if (_leading) {
            func.apply(this, args);
            _leading = false;
        }
        timeout = setTimeout(() => {
            _leading = leading;
            trailing && func.apply(this, args);
        }, wait);
    };
};

// 节流(降低频次)
let throttleTimeout = null,
    throttleLastTime = null;
const util_throttle = (func, wait) => {
    return (...args) => {
        let now = +new Date();
        if (now - throttleLastTime - wait > 0) {
            if (throttleTimeout) {
                clearTimeout(throttleTimeout);
                throttleTimeout = null;
            }
            func.apply(this, args);
            throttleLastTime = now;
        } else if (!throttleTimeout) {
            throttleTimeout = setTimeout(() => {
                func.apply(this, args);
            }, wait);
        }
    };
};

// 公共自定义分享拉取数据
const util_getCustomShare = ({ page, id, cb } = {}) => {
    const global = getApp().globalData,
        { channel } = global;
    const platform = {
            qq: 2,
            wechat: 3,
        },
        pageId = {
            comic: 1,
            topic: 12,
        };
    const data = {
        share_content: pageId[page], // 分享页面对应类型
        subject_id: id, // 相关页面id
        landing_type: 2, // 固定小程序
        share_from: platform[channel],
    };
    util_request({
        url: '/v1/share/content/mini_share',
        data,
    }).then((res) => {
        global.shareContent = res.data || [];

        // 将链接中存在的随机码放在全局
        let trackId;
        if (res.data && res.data.length) {
            const url = res.data[0].action_url;
            trackId = util_getUrlQuery(url, 'track_id');
        }
        getApp().globalData.activityTrackId = trackId ? trackId : '';
        cb && cb();
    });
};

/* 自定义分享
 * title自定义文案；page当前页面；params拼接url的参数集合；shareTarget要分享到的渠道
 * shareTarget: (3:微信分享微信好友) 微信分享
 * shareTarget: (0:分享到qq好友, 1:分享到qq空间, 3:分享到微信好友, 4:分享到微信朋友圈, 5: 分享到最近联系人) qq分享
 * title, page, activityPage 在服务没有下发自定义内容的时候，本地的自定义
 */
const util_returnShareContent = ({ title, page = '', params, shareTarget, activityPage = '' } = {}) => {
    const { shareContent } = getApp().globalData;
    const share = {
        title,
        path: `/pages/${page}/${page}`,
    };
    if (activityPage) {
        share.path = activityPage;
    } // 处理分享的是活动页面，活动在子包中
    const shareChannel = {
        // 官方分享渠道id转化为当前后台配置id
        3: 1,
        0: 2,
        1: 5,
        4: 4,
        5: 2,
    };
    const navigate = () => {
        if (params) {
            let flag = true;
            share.path += !share.path.includes('?') ? '?' : '&';
            Object.keys(params).forEach((key) => {
                share.path += flag ? '' : '&';
                share.path += `${key}=${params[key]}`;
                if (flag) {
                    flag = false;
                }
            });
        }
    };
    if (!shareContent.length) {
        navigate();
        return share;
    } else {
        const custom = shareContent.filter((item) => item.share_platform == shareChannel[shareTarget]);
        if (custom.length) {
            const obj = custom[0],
                privateProps = {};
            const backUrl = obj.action_url;
            share.title = obj.title;
            if (obj.picture) {
                share.imageUrl = obj.picture;
            }
            if (page != 'comicnew' && backUrl) {
                share.path = backUrl.split('?')[0];
            }

            // 解析返回路径参数合并后再拼接
            if (backUrl && backUrl.split('?')[1]) {
                backUrl
                    .split('?')[1]
                    .split('&')
                    .forEach((item) => {
                        const val = item.split('=');
                        privateProps[val[0]] = val[1];
                    });
            }
            // 本地合并返回参数、拼接路径、
            Object.assign(params, privateProps);
            navigate();

            return share;
        } else {
            navigate();
            return share;
        }
    }
};

/**
 * getPointCharge 用户充值相关埋点(获取用户累计充值次数和最后充值时间)        get: /v2/kb/point/charge
 * yapi: https://yapi.quickcan.com/project/311/interface/api/4157
 * 对接后端: 汤冬冬(付费)
 * charge_time_idx    否    需要获取最近第N次付款 默认1表示最近一次
 * comic_id    否    漫画id
 * topic_id    否    专题id
 *
 * return Promise
 * **/
const util_getPointCharge = ({ charge_time_idx = 1, comic_id = 0, topic_id = 0 } = {}) => {
    let url = '/v2/kb/point/charge',
        method = 'get',
        host = 'pay';
    let data = {
        charge_time_idx,
    };
    if (comic_id) {
        data.comic_id = comic_id;
    }
    if (topic_id) {
        data.topic_id = topic_id;
    }
    let resData = {
        last_recharge_time: -2, // 最后充值时间
        LastRechargeTime: -2, // 最后充值时间
        recharge_type: 0, // 累计充值次数
        RechargeType: 0, // 累计充值次数
    };
    return new Promise((resolve) => {
        util_request({
            url,
            method,
            host,
            data,
        })
            .then((res) => {
                let { data } = res;
                data = data ? data : {};
                const info = data.charge_values ? data.charge_values : {};
                const last_recharge_time = info.last_charge_time;
                const recharge_type = info.total_charge_cnt;
                resolve({
                    last_recharge_time, // 最后充值时间
                    LastRechargeTime: last_recharge_time, // 最后充值时间
                    recharge_type, // 累计充值次数
                    RechargeType: recharge_type, // 累计充值次数
                });
            })
            .catch(() => {
                resolve(resData);
            });
    });
};

/*
 * 消息推送相关
 * form_id: 表单id， form_event上报事件类型（暂时默认为9，详情页下一章节）
 */
const util_infoPushServer = ({ form_id, form_event = 9 } = {}) => {
    const { channel } = getApp().globalData;
    const url = `/mini/v1/partner/message/${channel}/submit_form`,
        data = {
            form_id,
            form_event,
        };

    util_request({
        app: this,
        url,
        data,
        method: 'post',
    }).then(() => {});
};

// 充值业务页面 如果是微信平台并且是ios设备在线上环境,的页面跳转
const util_buyRedirect = (app) => {
    app = app ? app : getApp();
    // environment环境变量， prod / preview / stag / dev
    let { isiOS, environment } = app.globalData;

    // 充值业务页面 如果是微信(qq)平台并且是ios设备在线上环境,的页面跳转
    if (isiOS && environment == 'prod') {
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
};

/*
 * 版本号比较
 * params: v1/v2
 * compareVersion('1.11.0', '1.9.9') // 1
 */
const util_compareVersion = (v1, v2) => {
    v1 = v1.split('.');
    v2 = v2.split('.');
    const len = Math.max(v1.length, v2.length);

    while (v1.length < len) {
        v1.push('0');
    }
    while (v2.length < len) {
        v2.push('0');
    }

    for (let i = 0; i < len; i++) {
        const num1 = parseInt(v1[i]);
        const num2 = parseInt(v2[i]);

        if (num1 > num2) {
            return 1;
        } else if (num1 < num2) {
            return -1;
        }
    }

    return 0;
};

/**
 * 通用活动分享文案拉取数据、扩展
 * page: 所分享页面, id: 活动id, name: 用户昵称, comicId: 漫画章节id, cb: 回调方法
 */
const util_getActivityShare = ({ page, id, name, comicId, cb } = {}) => {
    let global = getApp().globalData,
        { channel } = global;
    const platform = {
            qq: 2,
            wechat: 3,
        },
        pageId = {
            comic: 1,
            topic: 12,
            activity: 5,
        };
    const data = {
        activity_id: id, // 活动id
        share_from: platform[channel],
    };
    const swatchCase = (aid) => {
        let datas = {
            Mp_sanrenzudui_06: () => {
                // 三人组队活动,活动二期
                return {
                    url: '/v1/share/content/mini_activity',
                    params: {
                        nick_name: name, // 用户昵称
                        share_content: pageId[page], // 分享页面对应类型
                    },
                };
            },
            Mp_sanrenzudui_07: () => {
                // 三人组队活动,养敌为患免费看
                return {
                    url: '/v1/share/content/mini_activity',
                    params: {
                        nick_name: name, // 用户昵称
                        share_content: pageId[page], // 分享页面对应类型
                    },
                };
            },
            Mp_anlimanhua_07: () => {
                // 安利漫画活动,活动三期
                return {
                    url: '/v1/share/content/sincere/activity',
                    params: {
                        subject_id: comicId, // 漫画章节id
                    },
                };
            },
        };
        return datas[aid]();
    };

    const { url, params } = swatchCase(id);
    util_request({
        url,
        data: Object.assign(data, params),
    })
        .then((res) => {
            const { list } = res.data;
            global.shareContent = list || [];

            // 将链接中存在的随机码放在全局
            let trackCode, activityId;
            if (list && list.length) {
                const url = list[0].action_url;
                trackCode = util_getUrlQuery(url, 'track_code');
                activityId = util_getUrlQuery(url, 'activity_id');
            }
            if (trackCode && !getApp().globalData.activityTrackId) {
                getApp().globalData.activityTrackId = trackCode ? trackCode : '';
            }
            if (activityId && !getApp().globalData.activityId) {
                getApp().globalData.activityId = activityId;
            }
            cb && cb();
        })
        .catch(() => {
            cb && cb();
        });
};

/**
 * 通用方法获取用户取向，重新赋值新的用户取向
 * 场景: 小程序注册，登录成功后（切换账号），登出，tab页切换
 */
const util_getGender = (app) => {
    return new Promise((resolve, reject) => {
        util_request({
            app,
            url: '/v2/passport/gender',
        })
            .then((res) => {
                const gender = res.data.gender;
                const _app = getApp() || app || {};
                _app.globalData = _app.globalData ? _app.globalData : {};
                _app.globalData.gender = gender;
                resolve(gender);
            })
            .catch(() => {
                reject();
            });
    });
};

/**
 * 通用方法更新性别年龄的接口
 * 场景: 发现页，推荐页，漫画详情页，登录页
 * 参数data : gender，medium_age，request_type（1用户变更/2用户登陆/3小程序广告更新）,tags
 */
const util_updateUserInfo = (data) => {
    return new Promise((resolve, reject) => {
        util_request({
            app: this,
            url: '/horadric/api/recommend/update/user/information',
            method: 'post',
            data: data,
        })
            .then(() => {
                resolve();
            })
            .catch(() => {
                reject();
            });
    });
};

// 获取制定元素的宽高
const util_getElementWH = (id = '') => {
    let _query = wx.createSelectorQuery();
    return new Promise((resolve) => {
        _query
            .select(id)
            .fields(
                {
                    size: true,
                },
                (res) => {
                    resolve(res);
                    _query = null;
                }
            )
            .exec();
    });
};

// 获取组件内dom宽高
const util_getModuleDomWH = ({ _this = null, id = '' } = {}) => {
    let _query = wx.createSelectorQuery().in(_this);
    return new Promise((resolve) => {
        _query
            .select(id)
            .fields(
                {
                    size: true,
                },
                (res) => {
                    resolve(res);
                    _query = null;
                }
            )
            .exec();
    });
};

/**
 *  skipDirection
 *  通用判断跳转专题||详情页方法
 *  返回是否存在阅读记录以及 续读章节信息
 *  入参为专题id
 */

const util_skipDirection = ({ topicId = '' } = {}) => {
    return new Promise((resolve) => {
        const global = getApp().globalData,
            dataObj = {};
        if (global.userId) {
            util_request({
                url: `/mini/v1/comic/${global.channel}/topic/read_record`,
                data: {
                    topic_id: topicId,
                },
                timeout: 500,
            })
                .then((res) => {
                    const { comic_records } = res.data;
                    const continueId = comic_records.filter((item) => item.continue_read_comic).length ? comic_records.filter((item) => item.continue_read_comic)[0].id : '';
                    const readFind = comic_records.find((item) => item.id == continueId);
                    // 续读的id continueId 续读的已阅读漫画图片数
                    // continueId comic_records.filter(item => item.id == continueId).read_count || 0
                    dataObj.continueId = continueId;
                    dataObj.readCount = readFind ? readFind.read_count : 0;
                    resolve(dataObj);
                })
                .catch(() => {
                    resolve(dataObj);
                });
        } else {
            let topicHistory = wx.getStorageSync('historyForTopic') || {};
            const obj = topicHistory[topicId] || {};
            if (obj) {
                // 续读的id obj.lastId， 续读的已阅读漫画图片数
                // obj.lastId  obj.readList.filter(item => item.id == obj.lastId).read_count || 0
                const readList = obj.readList || [];
                const readFind = readList.find((item) => item.id == obj.lastId);
                dataObj.continueId = obj.lastId;
                dataObj.readCount = readFind ? readFind.read_count || 0 : 0;
                resolve(dataObj);
            } else {
                // 没有阅读历史
                resolve(dataObj);
            }
        }
    });
};

/**
 * 统一异步本地存储，避免大量使用非必要的同步存储
 * set、remove
 */
const util_storageFun = ({ type = 'set', key = '', data = '' } = {}) => {
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

// 获取实验标识
const util_getAbTest = () => {
    const app = getApp();
    return new Promise((resolve, reject) => {
        app.getAbTest()
            .then((data) => {
                resolve(data);
            })
            .catch(() => {
                reject();
            });
    });
};

const util_getTime = () => {
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let date = now.getDate();
    let hour = now.getHours();
    let minute = now.getMinutes();
    let second = now.getSeconds();
    month = month > 9 ? month : `0${month}`;
    date = date > 9 ? date : `0${date}`;
    hour = hour > 9 ? hour : `0${hour}`;
    minute = minute > 9 ? minute : `0${minute}`;
    second = second > 9 ? second : `0${second}`;

    return `${year}-${month}-${date} ${hour}:${minute}:${second}`;
};

/** *
 * 通知服务端发送订阅消息
 * yapi: https://yapi.quickcan.com/project/979/interface/api/44296
 * */
const util_sendMessageApi = ({ notice_type = 0, data = {} } = {}) => {
    return util_request({
        method: 'post',
        url: `/v1/miniactivity/thirdmsg/send?notice_type=${notice_type}`,
        data: JSON.stringify(data),
        json: true,
    });
};

const util_requestSubscribeMessage = ({ tmplIds }) => {
    return new Promise((resolve, reject) => {
        wx.requestSubscribeMessage({
            tmplIds,
            complete(res) {
                resolve(res);
            },
            fail(err) {
                reject(err);
            },
        });
    });
};

/**
 * 通知基础服务端发送内容更新消息-新版
 */
const util_sendNotifyApi = ({ ids = [] }) => {
    const global = getApp().globalData;
    const { openId, channel } = global;
    const auth_param = ids.map((item) => {
        if (typeof item == 'object') {
            return {
                template_id: item.id,
                biz_type: item.type,
                subscribe_id: '',
                subscribe_type: 1,
            };
        } else {
            return {
                template_id: item,
                subscribe_id: '',
            };
        }
    });

    return util_request({
        method: 'post',
        url: `/mini/v1/partner/message/${channel}/authorization/notify`,
        data: {
            auth_param: JSON.stringify(auth_param),
            open_id: openId,
        },
    });
};

/**
 * setStorage一个全局对象
 */
const util_setGlobalObj = ({ key = '', value = '' } = {}) => {
    if (!key) {
        return false;
    }
    const globalObj = getApp().globalData.globalObj;
    globalObj[key] = value;
    wx.setStorage({
        key: 'globalObj',
        data: globalObj,
    });
};

/**
 * 自定义业务数据监控上报接口
 */
const util_reportMonitor = (id, value = 1) => {
    if (wx.reportMonitor) {
        if (!id) {
            return false;
        }
        wx.reportMonitor(id, value);
    }
};

/**
 * 自定义日志统计和上报
 */
const util_getLogManager = (key, value, type = '') => {
    if (wx.getLogManager) {
        const logger = wx.getLogManager({ level: 1 });
        const global = getApp().globalData;
        const { onRelease, userId, gender } = global;
        const options = {
            onRelease,
            userId,
            gender,
        };
        if (type == 'log') {
            logger.log(key, value, options);
        } else if (type == 'debug') {
            logger.debug(key, value, options);
        } else if (type == 'warn') {
            logger.warn(key, value, options);
        } else {
            logger.info(key, value, options);
        }
    }
};

/**
 * 实时日志统计和上报
 */
const util_getRealtimeLogManager = (key, value, type = '') => {
    if (wx.getRealtimeLogManager) {
        const logger = wx.getRealtimeLogManager();
        const global = getApp().globalData;
        const { onRelease, userId, gender } = global;
        const options = {
            onRelease,
            userId,
            gender,
        };
        if (type == 'error') {
            logger.error(key, value, options);
        } else if (type == 'warn') {
            logger.warn(key, value, options);
        } else {
            logger.info(key, value, options);
        }
    }
};

/**
 * 神策日志统计和上报
 * 文档：https://wiki.quickcan.com/pages/viewpage.action?pageId=425987689
 */
const util_logManager = (value) => {
    const app = getApp() || {};
    const pages = getCurrentPages();
    const pagesLen = pages.length;
    const pagesCurrent = pages[pagesLen - 1] || {};
    const path = pagesCurrent.route || '';
    const global = app.globalData || {};
    const system = global.systemInfo || {};
    const options = {
        AppletVersion: system.version,
        SdkVersion: system.SDKVersion,
        MiniUa: global.userAgent,
        IsLogin: !!global.userId,
        PagePath: path,
        RequestUrl: '',
        RequestData: '',
        ErrorMsg: '',
        ErrorCode: '100100',
        LogType: 'unknown',
        LogInfo: '',
        LogPlatform: 'mini-program',
        MiniSystem: JSON.stringify({
            model: system.model,
            system: system.system,
            platform: system.platform,
            pixelRatio: system.pixelRatio,
        }),
        MiniLaunch: JSON.stringify(global.launchInfo),
    };
    if (value && typeof value == 'object') {
        Object.assign(options, value);
        if (options.LogInfo) {
            options.LogInfo = JSON.stringify(options.LogInfo);
        }
        if (options.RequestData) {
            options.RequestData = JSON.stringify(options.RequestData);
        }
        if (options.ErrorCode && typeof options.ErrorCode == 'number') {
            options.ErrorCode = String(options.ErrorCode);
        }
    }
    app.kksaTrack('LogManager', options);
};

/*
 * 页面统一性能数据收集指标
 */
const util_performanceTrack = () => {
    // options = options || {};
    // const app = getApp() || {};
    // const { environment } = app.globalData;
    // if (app.kksaTrack && event) {
    //     // 是否有其他公共属性值
    //     // 1、是否为直达当前页getCurrentPages()
    //     app.kksaTrack(event, options);
    //     // 同时进行三方上报
    //     if (event == "MainInterface") {
    //         wx.reportPerformance(environment == "prod" ? 2007 : 2006, options.MainInterfaceTime, `MainInterfaceTime_${options.CurrentPageBase}`);
    //     }
    // }
};

/*
 * 顶部通用提示条
 * 除了参数title，其他均为非必填
 * @params {String} type  提示框类型，默认layout通栏，可选值 side，右侧带箭头
 * @params {String} title 提示文案，如果传值为空不会显示
 * @params {Number} sort 优先级，值越大优先级越高
 * @params {Number} duration 显示时长，结束后自动消失
 * @params {String} color 提示文案颜色，当type值为side时，不生效
 * @params {String} background 提示文案背景色，当type值为side时，不生效
 * @params {Boolean} showClose 是否显示关闭按钮
 */
let notifyTimer = null;
const util_showNotify = (config) => {
    const options = Object.assign(
        {
            type: 'side', // 默认，可选值： layout
            title: '',
            duration: 0,
            icon: '',
            color: '#fff',
            background: 'rgba(0,0,0,.7)',
            sort: 1,
            showClose: true,
            visible: true,
        },
        config
    );

    const pages = getCurrentPages();
    const length = pages.length;

    // 校验提示文案空、type值不正确
    if (!options.title || !length || !['side', 'layout'].includes(options.type)) {
        return;
    }

    const currentPage = pages[length - 1];
    const nowNotify = currentPage.data.notifyOptions;

    // 如果推送消息的优先级低于当前正在展示的，该推送消息不展示
    if (nowNotify && nowNotify.visible && nowNotify.sort > options.sort) {
        return;
    }

    if (notifyTimer) {
        clearTimeout(notifyTimer);
    }

    currentPage.setData(
        {
            notifyOptions: options,
        },
        () => {
            if (options.duration > 0) {
                notifyTimer = setTimeout(() => {
                    clearTimeout(notifyTimer);
                    util_hideNotify();
                }, options.duration);
            }
        }
    );
};

/*
 * 隐藏顶部通用提示条
 */
const util_hideNotify = () => {
    const pages = getCurrentPages();
    const length = pages.length;
    if (length) {
        const currentPage = pages[length - 1];
        const nowNotify = currentPage.data.notifyOptions;
        if (notifyTimer) {
            clearTimeout(notifyTimer);
        }
        if (nowNotify) {
            currentPage.setData({
                [`notifyOptions.visible`]: false,
            });
            if (nowNotify.onClose) {
                nowNotify.onClose();
            }
        }
    }
};

/**
 * 控制右下角气泡的显示隐藏
 * 页面中需要提前引入 kk-bubble 组件
 */
const util_handleBubble = () => {
    const { bubble, isiOS } = getApp().globalData;
    const pages = getCurrentPages();
    const length = pages.length;
    const currentPage = pages[length - 1];

    let timestamp = wx.getStorageSync(`pullRechargeBubble:${currentPage.route.split('/').pop()}`) || 0;
    let showBubble = true;
    if (timestamp && new Date().getTime() - timestamp < 1000 * 60 * 60 * 24 * 7) {
        showBubble = false;
    }

    if (showBubble && !isiOS && !bubble) {
        util_checkWallet(currentPage).then((data) => {
            let { activity_word: activityWord } = data.activity;
            if (activityWord) {
                currentPage.setData({
                    bubbleText: activityWord,
                });
                wx.setStorage({
                    key: `pullRechargeBubble:${currentPage.route.split('/').pop()}`,
                    data: new Date().getTime(),
                });
                setTimeout(() => {
                    currentPage.setData({
                        bubbleText: '',
                    });
                }, 3000);
            }
        });
    }
};

/**
 * 初始化加载任务
 */
const util_initTask = (taskList = []) => {
    const pages = getCurrentPages(); // 获取加载的页面
    const currentPage = pages[pages.length - 1]; // 获取当前页面的对象

    for (let i = 0; i < taskList.length; i++) {
        const task = taskList[i];
        const { taskType, config } = task;
        const adUnitId = config.adUnitId;
        let rewardedVideoAd;
        if (taskType == 6) {
            rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId });
        }

        switch (taskType) {
            case 5:
                // 分享
                currentPage.onShareAppMessage = () => {
                    return {
                        title: config.shareTitle,
                    };
                };
                break;
            case 6:
                rewardedVideoAd.onLoad(() => {
                    currentPage.adDone = true;
                });
                rewardedVideoAd.onError(() => {
                    util_showToast({
                        title: '广告加载失败，请重试！',
                    });
                });
                currentPage.rewardedVideoAd = rewardedVideoAd;
                break;

            default:
                break;
        }
    }
};

/**
 * 做任务
 */
const util_doTask = (config = {}, cb = () => {}) => {
    const pages = getCurrentPages(); // 获取加载的页面
    const currentPage = pages[pages.length - 1]; // 获取当前页面的对象

    const { task_type, action_protocol, task_id, activity_id, task_status, award_grant_type, task_record_id } = config;

    if (task_status === 3) {
        return false;
    }

    if (task_status === 2 && award_grant_type === 1) {
        util_request({
            url: '/v1/applet/task/award/take',
            method: 'post',
            host: 'api',
            data: {
                task_record_id,
            },
        }).then(cb);
        return false;
    }
    const { rewardedVideoAd, adDone } = currentPage;
    const { type, target_id: id, parent_target_id: parentid, target_web_url: url } = action_protocol;

    switch (task_type) {
        case 4:
            // 打卡
            util_taskDone({ activity_id, task_id }).then(cb);
            break;
        case 5:
            // 分享
            util_taskDone({ activity_id, task_id }).then(cb);
            break;
        case 6:
            // 看广告
            if (!rewardedVideoAd) {
                console.warn('请调用util_initTask方法初始化广告任务');
                return false;
            }

            if (adDone) {
                rewardedVideoAd.onClose((res) => {
                    if (res.isEnded) {
                        // 看完广告领取奖励
                        util_taskDone({ activity_id, task_id }).then(cb);
                    }
                });
                rewardedVideoAd.show();
            } else {
                util_showToast({
                    title: '广告加载失败，请重试！',
                });
                rewardedVideoAd.load();
            }

            break;
        case 8:
            // 添加桌面
            util_showNotify({
                title: '点击 … 添加到我的小程序 漫画随时畅读',
                duration: 3000,
            });
            wx.setStorageSync('cultivate:desktopTaskData', {
                activity_id,
                task_id,
            });
            break;
        default:
            util_action({ type, id, parentid, url });
            break;
    }
};

// 完成任务
const util_taskDone = ({ activity_id = 0, task_id = 0 } = {}) => {
    let url = `/v1/applet/task/complete`;
    let method = 'post';
    let host = 'api';
    let data = {
        activity_id,
        task_id,
    };
    return util_request({
        url,
        method,
        host,
        data,
    });
};

// 通用动态配置接口
const util_getDynamicData = ({ id = 0 }) => {
    if (!id) {
        return new Promise((resolve) => resolve(null));
    }
    const url = '/v1/miniactivity/param/config/search';
    const method = 'get';
    return util_request({
        url,
        method,
        data: { id },
    });
};

export {
    util_request,
    util_showToast,
    util_hideToast,
    util_isPage,
    util_prevPage,
    util_logout,
    util_action,
    util_notiOS,
    util_feSuffix,
    util_checkWallet,
    util_checkVipInfo,
    util_arrayArrange,
    util_transNum,
    util_formatTime,
    util_adTrack,
    util_feedTrack,
    util_multPage,
    util_getUrlQuery,
    util_startCount,
    util_openWay,
    util_throttle,
    util_getCustomShare,
    util_returnShareContent,
    util_getPointCharge,
    util_infoPushServer,
    util_buyRedirect,
    util_compareVersion,
    util_getActivityShare,
    util_getGender,
    util_getElementWH,
    util_getModuleDomWH,
    util_updateUserInfo,
    util_skipDirection,
    util_storageFun,
    util_getAbTest,
    util_getTime,
    util_sendMessageApi, // 1
    util_requestSubscribeMessage, // 2
    util_sendNotifyApi,
    util_setGlobalObj,
    util_logManager,
    util_reportMonitor,
    util_getLogManager,
    util_getRealtimeLogManager,
    util_performanceTrack,
    util_showNotify,
    util_hideNotify,
    util_handleBubble,
    util_initTask,
    util_doTask,
    util_taskDone,
    util_getDynamicData,
    util_debounce,
};
