/**
 * @file
 * Created by zhangjinchao on 2023/11/28.
 */
'use strict';
const postcss = require('postcss');

const relativePathsPlugin = postcss.plugin('postcss-match-relative-paths', ({ context }) => {
    return (root) => {
        root.walkAtRules('import', (decl) => {
            decl.params = decl.params.replace(
                /\.(wxss|css)/gi,
                '.' + context.rules.suffixMapping.css
            );
        });
    };
});

module.exports = {
    relativePathsPlugin,
};
