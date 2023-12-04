/**
 *  @file 移除computedBehavior
 */

const { has, get } = require('lodash');

module.exports = function ({ path }) {
    if (
        path.node &&
        get(path, 'node.type') === 'VariableDeclaration' &&
        has(path, 'node.declarations')
    ) {
        let declarations = get(path, 'node.declarations');
        declarations.map((item) => {
            if (item.id.name == 'computedBehavior') {
                path.remove();
            }
        });
    }
};
