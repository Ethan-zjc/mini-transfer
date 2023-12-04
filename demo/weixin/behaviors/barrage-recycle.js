/**
 * 弹幕组件父组件必须引入
 * @author chenxin
 */

// 针对chromium内核优化,https://github.com/GoogleChrome/devtools-docs/issues/53
function setArgs(newArgs, oldArgs) {
    for (let i = 0, ii = oldArgs.length; i < ii; i++) {
        newArgs.push(oldArgs[i]);
    }
}

/**
 * 截流函数
 * @param fn {Function} 实际要执行的函数
 * @param delay {Number} 间隔执行时间，单位是毫秒
 * @param immediately {Number}
 * 是否需要立即执行一次，像lazyload这种情况，没必要设置true
 *
 * @return {Function}
 */
function throttle(fn, time, immediately) {
    let timer;
    let that = this;
    let args = [];
    let _arguments;
    let cacheExec = false;
    return function () {
        that = this;
        cacheExec = true;
        if (immediately && !timer) {
            setArgs(args, arguments);
            fn.apply(that, args);
            args = [];
            cacheExec = false;
        }
        if (!timer) {
            _arguments = arguments;
            timer = setTimeout(function () {
                setArgs(args, _arguments);
                if (cacheExec) {
                    fn.apply(that, args);
                    cacheExec = false;
                }
                args = [];
                timer = null;
            }, time);
        }
    };
}

import { util_action } from '../util.js';

module.exports = Behavior({
    data: {
        lastCreatedDanmu: {},
        barrageStatus: 0, // 0: 关闭弹幕；1: 打开弹幕
        barrageEditor: {
            editing: false,
            editingImageList: [],
            content: '',
            movableHeight: 0,
            realScrollTop: 0,
        },
        barrageScrollTop: 0, // throttle的scrollTop
        barrageRealScrollTop: 0, // 页面真实的scrollTop
        barrageContainerScrollHeight: 0,
        appealShown: false,
        barrageMenuShown: false,
        sendbarrageShow: 'block',
    },
    methods: {
        onScrollForBarrage: throttle(
            function (e) {
                const { scrollTop, scrollHeight } = e.detail;
                this.setData({ barrageScrollTop: scrollTop });
                if (scrollHeight !== this.data.barrageContainerScrollHeight) {
                    this.setData({ barrageContainerScrollHeight: scrollHeight });
                }
            },
            400,
            true
        ),
        updateBarrage(e) {
            this.setData(e.detail);
        },
        // position组件
        hideBrrageEditor(e) {
            this.setData({
                barrageEditor: {
                    editing: false,
                    editingImageList: [],
                    content: '',
                    movableHeight: 0,
                },
            });
            // 发送弹幕成功
            if (e.detail) {
                const danmu = e.detail;
                this.setData({ lastCreatedDanmu: danmu });
            }
        },
        // editor组件
        updateBarrageEditor(e) {
            this.setData({
                barrageEditor: Object.assign({}, this.data.barrageEditor, e.detail),
            });
        },
        showAppeal() {
            this.setData({ appealShown: true });
        },
        onAppealTap(e) {
            const { index } = e.detail;
            this.setData({ appealShown: false }, () => {
                if (index > 0) {
                    util_action({
                        type: 18,
                        url: 'https://www.kuaikanmanhua.com/webapp/mini/webapp_appeal_appeal.html',
                    });
                }
            });
        },
        hideBarrageMenu() {
            this.setData({ barrageMenuShown: false });
        },
    },
});
