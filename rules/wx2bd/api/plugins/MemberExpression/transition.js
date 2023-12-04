/**
 * @file 针对 transition 转换
 */

const { get } = require('lodash');

module.exports = function ({ path }) {
    if (
        get(path, 'node.property.type') === 'Identifier' &&
        get(path, 'node.property.name') === 'transition'
    ) {
        // TODO 特殊情况兼容性
        path.replaceWithSourceString('this.data.animation');
    }
};
