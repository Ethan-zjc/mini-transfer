/**
 * 类比 java String.getBytes 方法
 * https://developer.mozilla.org/zh-CN/docs/Web/API/TextEncoder
 */
const SparkMD5 = require("./spark-md5.min");
const { gsInfo } = require("./mini.config.js");
import base64 from "./base64.js";

const encode = function (str) {
    const utf8 = [];
    for (let ii = 0; ii < str.length; ii++) {
        let charCode = str.charCodeAt(ii);
        if (charCode < 0x80) {
            utf8.push(charCode);
        } else if (charCode < 0x800) {
            utf8.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
        } else if (charCode < 0xd800 || charCode >= 0xe000) {
            utf8.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
        } else {
            ii++;
            // Surrogate pair:
            // UTF-16 encodes 0x10000-0x10FFFF by subtracting 0x10000 and
            // splitting the 20 bits of 0x0-0xFFFFF into two halves
            charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (str.charCodeAt(ii) & 0x3ff));
            utf8.push(0xf0 | (charCode >> 18), 0x80 | ((charCode >> 12) & 0x3f), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
        }
    }
    // 兼容汉字，ASCII码表最大的值为127，大于127的值为特殊字符
    for (let jj = 0; jj < utf8.length; jj++) {
        let code = utf8[jj];
        if (code > 127) {
            utf8[jj] = code - 256;
        }
    }
    return utf8;
};

const fomateQueryPrams = (params) => {
    const sortKeys = Object.keys(params).sort();
    return sortKeys.reduce((res, key) => {
        let str = "";
        if (typeof params[key] === "string") {
            str = params[key].replace(/\r/g, "").replace(/\s/g, "");
        } else if (typeof params[key] === "number" || typeof params[key] === "boolean") {
            str = params[key] + "";
        } else if (typeof params[key] === "undefined") {
            str = "";
        } else {
            str = JSON.stringify(params[key]).replace(/\r/g, "").replace(/\s/g, "");
        }
        return (res += `${encode(key).join("")}${encode(str).slice(0, 80).join("")}`);
    }, "");
};
const getGsContent = (miniId, appSecret, kkst, queryParams) => {
    const params = fomateQueryPrams(queryParams);
    return encode(miniId).join("") + encode(appSecret).join("") + encode(kkst).join("") + params;
};

const gs = function (miniId = "", kkst = "", queryParams = {}) {
    const gsContent = getGsContent(miniId, gsInfo.gsContent, kkst, queryParams);
    const sign = SparkMD5.hash(gsContent);
    return base64.encode(
        JSON.stringify({
            kk_s_t: kkst,
            aegis_app_id: gsInfo.gsId,
            aegis_sign: sign,
        })
    );
};

export default gs;
