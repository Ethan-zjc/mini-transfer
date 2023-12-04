/**
 * dialog组件
 * weui组件引用
 */

Component({
    options: {
        multipleSlots: true,
        addGlobalClass: true,
    },
    properties: {
        title: {
            type: String,
            value: "",
        },
        content: {
            type: String,
            value: "",
        },
        extClass: {
            type: String,
            value: "",
        },
        maskClosable: {
            type: Boolean,
            value: false,
        },
        mask: {
            type: Boolean,
            value: true,
        },
        show: {
            type: Boolean,
            value: false,
            observer: "showChange",
        },
        buttons: {
            type: Array,
            value: [],
        },
        buttonGetPhoneNumber: {
            type: Boolean,
            value: false,
        },
        buttonShare: {
            type: [Object, String],
            value: "",
        },
    },
    data: {
        innerShow: false,
    },
    ready: function ready() {
        let buttons = this.data.buttons;
        let len = buttons.length;
        buttons.forEach(function (btn, index) {
            if (len === 1) {
                btn.className = "weui-dialog__btn_primary";
            } else if (index === 0) {
                btn.className = "weui-dialog__btn_default";
            } else {
                btn.className = "weui-dialog__btn_primary";
            }
        });
        this.setData({
            buttons: buttons,
        });
    },

    methods: {
        buttonTap(e) {
            let index = e.currentTarget.dataset.index;

            this.triggerEvent("buttontap", { index: index, item: this.data.buttons[index] }, {});
        },
        buttonShareTap(e) {
            let item = e.currentTarget.dataset.item;
            this.triggerEvent("buttontap", { index: 0, item }, {});
        },
        getPhoneNumber(e) {
            let detail = {};
            if (e.detail.errMsg == "getPhoneNumber:ok") {
                detail = {
                    getPhoneNumberAuth: true,
                    errMsg: e.detail.errMsg,
                    phone_data: e.detail.encryptedData,
                    phone_iv: e.detail.iv,
                };
            } else {
                /*
                 ** 'getPhoneNumber: ok' or 'getPhoneNumber:fail user deny'
                 **  String or undefined
                 **  String or undefined
                 */
                detail = {
                    getPhoneNumberAuth: false,
                    errMsg: e.detail.errMsg,
                    phone_data: "",
                    phone_iv: "",
                };
            }
            this.triggerEvent("getphonenumber", detail);
        },
        close() {
            let data = this.data;
            if (!data.maskClosable) {
                return;
            }
            this.setData({
                show: false,
            });
            this.triggerEvent("close", {}, {});
        },
        stopEvent() {},
    },
});
