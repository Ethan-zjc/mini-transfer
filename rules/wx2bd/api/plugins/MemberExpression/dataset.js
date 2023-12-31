/**
 * @file 针对 dataset 转换，处理大小写敏感
 */

const { get, set } = require('lodash');

module.exports = function ({ path }) {
    if (
        get(path, 'node.property.type') === 'Identifier' &&
        /dataset/i.test(get(path, 'node.property.name'))
    ) {
        set(path, 'node.property.name', 'dataset');
    }
};
