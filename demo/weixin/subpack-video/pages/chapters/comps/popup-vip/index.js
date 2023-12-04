Component({
    data: {
        weakenText: "取消",
        buttons: [
            {
                text: "立即开通",
                type: "confirm",
            },
        ],
    },
    methods: {
        tapButton(e) {
            const { type, text } = e.currentTarget.dataset;
            this.triggerEvent("buttontap", {
                type,
                text,
            });
        },
    },
});
