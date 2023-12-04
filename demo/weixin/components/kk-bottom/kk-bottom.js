/**
 * 列表底部loading/到底提示信息
 * @param {Boolean} loading 加载中状态，（default: false）
 * @param {Boolean} finish 加载完成状态，(default: false)
 */

Component({
    properties: {
        loading: {
            type: Boolean,
            value: false,
        },
        finish: {
            type: Boolean,
            value: false,
        },
    },
});
