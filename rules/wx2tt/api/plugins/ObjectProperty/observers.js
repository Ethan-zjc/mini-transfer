const t = require('@babel/types');
const { get } = require('lodash');

// 还需要更改
module.exports = function ({ path }) {
    if (
        get(path, 'node.type') === 'ObjectProperty' &&
        get(path, 'node.key.name') === 'behaviors' &&
        get(path, 'node.value.type') == 'ArrayExpression'
    ) {
        const elements = get(path, 'node.value.elements');
        const index = elements.findIndex((item) => item.name == 'computedBehavior');
        if (index > -1) {
            elements.splice(index, 1);
        }
    }

    if (get(path, 'node.key.name') === 'computed' || get(path, 'node.key.name') === 'watch') {
        const parent = path.parent;
        const siblings = parent.properties;
        const observers = siblings.find((prop) => prop.key.name === 'observers');

        const computedIndex = siblings.findIndex((prop) => prop.key.name === 'computed');
        const watchIndex = siblings.findIndex((prop) => prop.key.name === 'watch');
        // const maxIndex = Math.max(computedIndex, watchIndex);

        if (!observers) {
            // 新建 observers 节点
            const newObserversNode = t.objectProperty(
                t.identifier('observers'),
                t.objectExpression([])
            );
            path.insertBefore(newObserversNode);
        }

        // 合并 computed 和 watch 到 observers
        if (computedIndex > -1 || watchIndex > -1) {
            const observersNode = siblings.find((prop) => prop.key.name === 'observers');
            if (computedIndex > -1) {
                const computedNode = siblings[computedIndex].value;
                [...computedNode.properties].forEach((prop) => {
                    observersNode.value.properties.push(prop);
                });
                siblings.splice(computedIndex, 1);
            }

            // TODO: wacth的部分不能同时放到新建的observers下
            // if (watchIndex > -1) {
            //     const watchNode = siblings[watchIndex].value;
            //     watchNode.properties.forEach((prop) => {
            //         observersNode1.value.properties.push(prop);
            //     });
            //     siblings.splice(watchIndex, 1);
            // }
        }
    }
};
