import { util_request } from "../../util.js";

const global = getApp().globalData;

/**
 * 手机号登录
 */
const phoneSignin = (data) => {
    const url = `/v2/passport/mini/phone_sign${data.code ? "up" : "in"}`;
    const method = "post";
    return util_request({
        url,
        method,
        data: { ...data, web_source: true },
        sign: true,
    });
};

/**
 * 是否注册过
 */
const isRegist = ({ code } = {}) => {
    const url = "/v2/passport/oauth/check";
    return util_request({
        url,
        method: "get",
        data: {
            oauth_token: code,
            oauth_provider: global.channel,
            from: "mini",
        },
    });
};

/**
 * 注册登录通用
 */
const loginSignup = (data) => {
    return util_request({
        method: "post",
        url: `/v2/passport/mini/${global.channel}_signup`,
        data,
        sign: true,
    });
};

/**
 * 获取验证码
 */
const getCode = ({ phone = "", ticket = "" } = {}) => {
    const data = {
        phone,
    };
    if (ticket) {
        data.verify_provider = "tencent";
        data.ticket = ticket;
    }
    return util_request({
        method: "post",
        url: "/v2/passport/mini/send_code",
        data,
        sign: true,
    });
};

/**
 * 验证码方式开关
 */
const getConfigs = () => {
    return new Promise((resolve) => {
        util_request({
            url: "/v2/passport/mini_profile/configs",
        })
            .then((res) => {
                resolve(res);
            })
            .catch(() => {
                resolve({});
            });
    });
};

module.exports = {
    phoneSignin,
    isRegist,
    loginSignup,
    getCode,
    getConfigs,
};
