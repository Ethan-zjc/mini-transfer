/**
 * 特殊弹幕气泡-背景拉伸
 * 用于页面: controller
 * @author chenxin
 */
import { setcanvasComIns, onDetached } from "./index";

Component({
    data: {
        style: "",
    },
    methods: {
        updateSize(width, height) {
            return new Promise((resolve) => {
                this.setData(
                    {
                        style: `width:${width}px;height:${height}px`,
                    },
                    () => {
                        wx.nextTick(() => {
                            resolve();
                        });
                    }
                );
            });
        },
    },
    lifetimes: {
        ready() {
            setcanvasComIns(this);
        },
        detached() {
            onDetached();
        },
    },
});
