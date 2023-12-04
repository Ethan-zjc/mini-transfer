const { has, get, set } = require('lodash');
module.exports = function ({ path, context }) {
    if (
        has(path, 'node.value') &&
        get(path, 'node.value.type') === 'Identifier' &&
        get(path, 'node.value.name') === 'wx' &&
        context.type === context.constant.WECHAT_TO_SWAN
    ) {
        set(path, 'node.value.name', 'swan');
    }
};
