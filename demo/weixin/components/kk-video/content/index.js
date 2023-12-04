Component({
    properties: {
        params: {
            type: Object,
            value: {},
        },
        title: {
            type: String,
            value: "",
        },
        count: {
            type: Number,
            value: 0,
        },
        isTab: {
            type: Boolean,
            value: false,
        },
    },
    methods: {
        tapActive() {
            const { isTab } = this.properties;
            if (isTab) {
                this.triggerEvent("onAction");
            }
        },
    },
});
