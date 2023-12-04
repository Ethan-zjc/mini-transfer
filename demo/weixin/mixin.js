// 仅在QQ环境下引入，用于支持Page构造器简单支持behaviors
const nativePage = Page;

// /原生Page属性
const properties = ["data", "onLoad", "onReady", "onShow", "onHide", "onUnload", "onPullDownRefresh", "onReachBottom", "onShareAppMessage", "onPageScroll", "onTabItemTap"];

// 改写qq下Page构造器
Page = (options) => {
    const mixins = options.behaviors;
    if (Array.isArray(mixins)) {
        Reflect.deleteProperty(options, "mixins");
        merge(mixins, options);
    }
    nativePage(options);
};

// 合并mixins属性到Page的options中
function merge(mixins, options) {
    mixins.reverse().forEach((mixin) => {
        if (Object.prototype.toString.call(mixin).slice(8, -1) === "Object") {
            for (let [key, value] of Object.entries(mixin)) {
                if (key === "data") {
                    options.data = Object.assign({}, value, options.data);
                } else if (properties.includes(key)) {
                    let native = options[key];
                    options[key] = function (...args) {
                        value.call(this, ...args);
                        return native && native.call(this, ...args);
                    };
                } else {
                    for (let [child_key, child_value] of Object.entries(mixin.methods)) {
                        let native = options[child_key];
                        options[child_key] = function (...args) {
                            child_value.call(this, ...args);
                            return native && native.call(this, ...args);
                        };
                    }
                }
            }
        }
    });
}
