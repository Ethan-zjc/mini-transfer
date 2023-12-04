let _state = null;
const _subjects = []; // 存储页面实例对象
const _observers = []; // 存储状态响应器

const _Store = { createStore, connect, deleteStore, setState, getState };

function deleteStore(key) {
    if (_state) {
        _state[key] = null;
        _observers.forEach((observer) => {
            observer();
        });
    }
}

function createStore(state) {
    _state = Object.assign({}, state);
    return _Store;
}

function connect(mapStateToData, mapMethodToPage) {
    // mapStateToData 接收 state 参数，且必须返回一个绑定对象，key 会被绑定到 page 实例的 data 中
    const dataMap = mapStateToData ? mapStateToData(_state) : {};

    // mapMethodToPage 接收 setState 和 state 参数，且必须返回一个绑定对象，key 会被绑定到 page 实例上
    const methodMap = mapMethodToPage ? mapMethodToPage(setState, _state) : {};

    return function (pageObject) {
        // 遍历绑定 data
        for (const dataKey in dataMap) {
            if (pageObject.data) {
                // 覆盖
                pageObject.data[dataKey] = dataMap[dataKey];
            } else {
                // 新建
                pageObject.data = {
                    [dataKey]: dataMap[dataKey],
                };
            }
        }

        // 遍历绑定 method
        for (const methodKey in methodMap) {
            pageObject[methodKey] = methodMap[methodKey];
        }

        // 对 onLoad 进行拦截
        const onLoad = pageObject.onLoad;
        pageObject.onLoad = function (event) {
            // 存储 page 实例和事件响应器，两者保持同步，一个实例对应一个响应器
            if (_subjects.indexOf(this) == -1) {
                // 首次load 修改data
                this.setData(mapStateToData ? mapStateToData(_state) : dataMap);
                _subjects.push(this);
                _observers.push(() => {
                    // mapStateToData 生成新的 mapData，并使用 setData 更新page状态
                    this.setData(mapStateToData ? mapStateToData(_state) : {});
                });
            }
            // 触发原有生命周期函数
            onLoad && onLoad.call(this, event);
        };

        const onShow = pageObject.onShow;
        pageObject.onShow = function () {
            // 挂载私域内容
            onSyCopyUrl(this.options || {});
            onShow && onShow.call(this);
        };

        // onUnload 同理
        const onUnload = pageObject.onUnload;
        pageObject.onUnload = function () {
            // 注销私域内容
            offSyCopyUrl();

            // 注销响应器
            if (_subjects.indexOf(this) === -1) {
                _subjects.splice(-1, 1);
                _observers.splice(-1, 1);
            }
            onUnload && onUnload.call(this);
        };
        return pageObject;
    };
}

function setState(state) {
    _state = Object.assign(_state, state);
    _observers.forEach((observer) => {
        observer();
    });
}

function getState() {
    return _state;
}

// 私域相关内容，只针对白名单生效，拦截onload、unload生明周期
function onSyCopyUrl(event) {
    if (getApp().globalData.sySign) {
        let params = [];
        event = event || {};
        Object.assign(event, { locate: `kksy_${getApp().globalData.sySign}` });
        for (let key in event) {
            params.push(`${key}=${event[key]}`);
        }
        wx.onCopyUrl(() => {
            return { query: params.join("&") };
        });
    }
}

function offSyCopyUrl() {
    if (getApp().globalData.sySign) {
        wx.offCopyUrl();
    }
}

module.exports = _Store;
