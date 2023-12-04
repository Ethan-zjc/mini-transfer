/**
 * 监听器，用于监听模块曝光，返回索引值集合
 */
export default class BadIntersectionObserver {
    constructor(options) {
        this.$options = {
            context: null,
            selector: null,
            onEach: (res) => res.dataset,
            onFinal: () => null,
            relativeTo: null,
            threshold: 0.5,
            delay: 200,
            observeAll: false,
            initialRatio: 0,
            ...options,
        };
        this.$observer = null;
    }

    connect() {
        if (this.$observer) return this;
        this.$observer = this._createObserver();
        return this;
    }

    reconnect() {
        this.disconnect();
        this.connect();
    }

    disconnect() {
        if (!this.$observer) return;
        const ob = this.$observer;
        if (ob.$timer) clearTimeout(ob.$timer);
        ob.disconnect();
        this.$observer = null;
    }

    _createObserver() {
        const opt = this.$options;
        const observerOptions = {
            thresholds: [opt.threshold],
            observeAll: opt.observeAll,
            initialRatio: opt.initialRatio,
        };

        // 创建监听器
        const ob = opt.context ? opt.context.createIntersectionObserver(observerOptions) : wx.createIntersectionObserver(null, observerOptions);

        // 相交区域设置
        if (opt.relativeTo) ob.relativeTo(opt.relativeTo);
        else ob.relativeToViewport();

        // 开始监听
        let finalData = [];
        let isCollecting = false;
        ob.observe(opt.selector, (res) => {
            const { intersectionRatio } = res;
            const visible = intersectionRatio >= opt.threshold;
            if (!visible) return;

            const data = opt.onEach(res);
            finalData.push(data);

            if (isCollecting) return;
            isCollecting = true;

            setTimeout(() => {
                opt.onFinal.call(null, finalData);
                finalData = [];
                isCollecting = false;
            }, opt.delay);
        });
        return ob;
    }
}
