// const generate = require('@babel/generator').default;
// const { relative, dirname } = require('path');
const types = require('@babel/types');
const propertiesString = 'xXksjUhmbvhaks'; // 临时字面量
const constant = require('../../../../../src/config/constant');
const { get } = require('lodash');

module.exports = function ({ path, context }) {
    const { getuserinfo, projectType } = get(context, 'rules.api');
    if (projectType !== 'internal' && context.type !== constant.WECHAT_TO_SWAN) {
        return;
    }

    if (get(path, 'node.key.type') === 'Identifier' && get(path, 'node.key.name') === getuserinfo) {
        let flag = false;
        path.traverse({
            Identifier(identifierPath) {
                if (get(identifierPath, 'node.name') === 'getCookieForSystem') {
                    flag = true;
                }
            },
        });
        if (flag) {
            return;
        }

        const MemberExpression = types.memberExpression(
            types.Identifier('swan'),
            types.Identifier(propertiesString)
        );
        const CallExpression = types.callExpression(MemberExpression, []);
        const blockBody = [types.expressionStatement(CallExpression)];
        path.replaceWith(
            types.objectMethod(
                'method',
                types.Identifier(get(path, 'node.key.name')),
                get(path, 'node.params'),
                types.blockStatement(blockBody)
            )
        );

        /* eslint-enable */
    }
};
