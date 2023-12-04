/**
 * 内容点赞（详见target）
 * @param id {String} 这一条点赞对象的id
 * @param state {Boolean} 当前的状态，是否点赞（发起请求前）
 * @param target {Number} 点赞类型，默认漫画0，具体枚举如下：
 * 0: 漫画, 1: 动态, 2: 评论, 3: 漫评, 4: 专题, 5: 游戏, 7: 动漫, 8: 动漫剧集, 9: 社区帖子
 * @param list {Array} 仅id数组，举例：['123', '124', '125']
 */
import { util_request } from "../util.js";

const app = getApp();
const global = getApp().globalData;
const channel = global.channel;

module.exports = app.onBehaviors({
    methods: {
        handlePraise({ id, state, target }, callback) {
            util_request({
                method: "post",
                url: `/v2/like/mini/${channel}/${state ? "dislike" : "add/safe"}`,
                data: {
                    target_type: target || 0,
                    target_id: id,
                },
                sign: !state,
            })
                .then((res) => {
                    if (callback) {
                        callback({
                            count: res.data.like_count,
                            state: !state,
                        });
                    }
                })
                .catch((e) => {
                    console.log(e);
                });
        },
        checkPraise({ list, target }, callback) {
            let ids = list.filter((id) => !!id);
            if (!ids.length) {
                return;
            }
            // 默认target为0，如果其他类型点赞，需要传参覆盖
            const target_info = JSON.stringify(
                ids.map((id) => {
                    return {
                        target_id: id,
                        target_type: target || 0,
                    };
                })
            );
            util_request({
                url: `/v2/like/mini/${channel}/get_infos`,
                data: { target_info },
            })
                .then((res) => {
                    if (callback) {
                        callback(res.data.like_infos);
                    }
                })
                .catch((e) => {
                    console.log(e);
                });
        },
    },
});
