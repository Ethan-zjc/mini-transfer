/**
 * 通用弹窗层
 * @param
 * @param
 * **/
const computedBehavior = require('miniprogram-computed');

Component({
    behaviors: [computedBehavior],
    properties: {
        noMask: {
            type: Boolean,
            value: false,
        },
        maskClose: {
            type: Boolean,
            value: false,
        },
        dialogName: {
            type: String,
            value: '',
        },
        marginTop: {
            type: Number,
            value: 0,
        },
    },
    data: {
        timer: null,
        animationStatus: 'enter',
    },
    computed: {
        maskAnimationName(data) {
            return 'mask-' + data.animationStatus;
        },
        scaleAnimationName(data) {
            return 'scale-' + data.animationStatus;
        },
    },
    methods: {
        close(payload) {
            if (this.data.timer) return;
            if (this.properties.maskClose) {
                this.setData({
                    animationStatus: 'leave',
                });
            }

            this.data.timer = setTimeout(() => {
                clearTimeout(this.data.timer);
                this.data.timer = 0;
                this.triggerEvent('closed', {
                    name: this.properties.dialogName || '',
                    payload,
                });
            }, 100);
        },
        onMask() {
            this.close();
        },
        catchReturn() {},
    },
});
