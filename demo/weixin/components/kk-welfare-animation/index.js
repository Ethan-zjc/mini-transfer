const app = getApp();
const global = app.globalData;
const { customImgs } = require("../../cdn.js");

Component({
    data: {
        customImgs,
        total: 24, // 总图片数量
        imgMap: {}, // 图片地址集合
    },
    attached() {
        this.init();
    },
    methods: {
        init() {
            this.createSelectorQuery()
                .select("#welfare-canvas")
                .fields({
                    node: true,
                    size: true,
                })
                .exec(this.setCanves.bind(this));
        },
        setCanves(res) {
            const width = res[0].width;
            const height = res[0].height;
            const canvas = res[0].node;
            const ctx = canvas.getContext("2d");
            // canvas.width = width;
            // canvas.height = height;
            const dpr = global.systemInfo.pixelRatio;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            ctx.scale(dpr, dpr);

            // 设置图片，图片全部加载完成后，开启动画
            const imgGroup = [];
            for (let i = 0; i < 24; i++) {
                let imgIndex = i < 10 ? `0${i}` : i;
                this.data.imgMap[i] = canvas.createImage();
                this.data.imgMap[i].src = customImgs[`ctm-t${imgIndex}`];
                this.data.imgMap[i].onload = () => {
                    imgGroup.push(1);
                    if (imgGroup.length == this.data.total) {
                        this.setAnimation(canvas, ctx, width, height);
                    }
                };
            }
        },
        setAnimation(canvas, ctx, width, height) {
            const { total, imgMap } = this.data;
            let xIndex = 0;
            let renderLoop = (timestamp, elapsed) => {
                // 控制每秒30帧
                if (elapsed > 1000 / 30) {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(imgMap[xIndex], 0, 0, width, height);
                    xIndex++;
                    xIndex %= total;
                    elapsed = 0;
                }
                canvas.requestAnimationFrame((_timestamp) => renderLoop(_timestamp, elapsed + _timestamp - timestamp));
            };
            canvas.requestAnimationFrame((timestamp) => renderLoop(timestamp, 0));
        },
    },
});
