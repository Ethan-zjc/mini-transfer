/**
 * 发布订阅集合
 * subscribe: 用来订阅要回调的事件, {key}事件的标识符,{fn}回调函数
 * publish: 发布事件方法，用来通知订阅的事件
 * remove: 事件删除，传入key值（fn选填）
 */
class Events {
    constructor() {
        this.msg = {};
    }
    subscribe(key, fn) {
        if (typeof fn != "function") return;
        if (!this.msg[key]) this.msg[key] = [];
        this.msg[key].push(fn);
    }
    publish() {
        let key = Array.prototype.shift.call(arguments);
        let callBack = this.msg[key];

        if (!callBack || !callBack.length) return;

        callBack.forEach((item) => {
            item.apply(this, arguments);
        });
    }
    remove(key, fn) {
        let fns = this.msg[key];
        if (!fns || !fns.length) return;
        if (!fn) {
            delete this.msg[key];
        } else {
            for (let i = 0; i < fns.length; i++) {
                let _item = fns[i];
                if (_item === fn || _item.fn === fn) {
                    fns.splice(i, 1);
                    break;
                }
            }
        }
    }
}

export default Events;
