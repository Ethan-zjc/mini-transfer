Component({
    data: {
        buttons: [
            {
                text: "我知道了",
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
