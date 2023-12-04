Component({
    properties: {
        isVip: {
            type: Boolean,
            value: false,
        },
        rechargeInfo: {
            type: Array,
            value: [],
        },
        rechargeIndex: {
            type: Number,
            value: 1,
        },
    },
    methods: {
        handleTap(event) {
            const { index } = event.currentTarget.dataset || {};
            this.triggerEvent("onChange", { index });
        },
    },
});
