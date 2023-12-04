Component({
    properties: {
        iPhoneX: {
            type: Boolean,
            value: false,
        },
        follows: {
            type: Object,
            value: {},
        },
        videoId: {
            type: [String, Number],
            value: 0,
        },
    },
    methods: {
        handleTap(event) {
            const { type = "" } = event.currentTarget.dataset;
            this.triggerEvent("onTools", {
                type,
            });
        },
    },
});
