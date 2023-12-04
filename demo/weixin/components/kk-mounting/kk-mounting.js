/**
 * kk-mounting 吸顶组件
 * @param {Boolean} isShowMountingEle: 强制显示吸顶,默认不展示 可选值:true/false
 * @param {Number} scrollTop: 滚动多少需要吸顶显示；如果isShowMountingEle:true,scrollTop失效
 * @param {Boolean} anamorphism: 是否开启渐变  可选值:true/false
 * @param {Number} scroll:设置滚动条的位置 默认值0
 * @param {Boolean} scrollAnimation:是否开启设置滚动条动画,默认不开启 可选值:true/false
 * @return {Function} onMountingState: 返回给父级吸顶状态变化 {state:true/false}
 * @return {Function} onMounting:滚动条变化返回给父级的数据变化{winH:滚动的位置,loading:是否可以加载数据,isMounting:吸顶的状态}
 * @return {Function} pulldown:向下滑动超出顶部时(scrollTop < 0)，返回给父级 {top:scrollTop}
 */

const computedBehavior = require("miniprogram-computed");

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },

    // 类似于mixins和traits的组件间代码复用机制
    behaviors: [computedBehavior],
    properties: {
        isShowMountingEle: {
            // 强制显示 默认不展示吸顶的内容框
            type: Boolean,
            value: false,
        },
        anamorphism: {
            // 是否开启渐变
            type: Boolean,
            value: false,
        },
        scrollTop: {
            // 滚动多少需要吸顶显示
            type: Number,
            value: 0,
        },
        scroll: {
            // 设置滚动条的位置
            type: Number,
            value: 0,
        },
        scrollAnimation: {
            // 是否开启设置滚动条动画  默认不开启
            type: Boolean,
            value: false,
        },
    },
    data: {
        isFixed: false, // 是否吸顶
        windowHeight: 0,
        height: 0, // 吸顶元素的高度
        reachtop: false,
    },

    // 检测数据吸顶变化
    watch: {
        isFixed(val) {
            // console.log('watch-isFixed',val);
            let event = "onMountingState"; // 返回给父级吸顶状态变化
            this.triggerEvent(event, { state: val }, { bubbles: true });
        },
    },
    attached() {
        this.getEleH(); //

        // 强制显示 默认不展示吸顶的内容框
        if (this.properties.isShowMountingEle) {
            this.setData({
                isFixed: true,
            });
        }
    },
    ready() {
        // 获取设备屏幕高度
        wx.getSystemInfo({
            success: (res) => {
                this.setData({ windowHeight: res.windowHeight }); // 获取设备高度
            },
        });

        this.setEvent({
            winH: 0,
            loading: false,
            isMounting: this.data.isFixed,
            top: 0, // 滚动条卷去的高度
        });
    },
    methods: {
        /**
         * ** setEvent 向父级组件传递信息
         * @loading:是否可以下拉加载
         * @isMounting:吸顶的状态
         * @winH本次触发的位置
         *
         * 父级接收:onMounting
         * **/
        setEvent({ loading = false, isMounting = false, winH = 0, top = 0 } = {}) {
            let event = "onMounting";
            this.triggerEvent(event, { winH, loading, isMounting, top }, { bubbles: true });
        },

        // scroll-view scroll事件  event:当前事件e
        onScroll(event) {
            // isShowMountingEle 强制显示 默认不展示吸顶的内容框
            const scrollTop = event.detail.scrollTop;
            let limitTop = this.properties.scrollTop; //
            if (scrollTop < 0) {
                // 向父级传递信息
                this.triggerEvent("pulldown", { top: scrollTop }, { bubbles: true });
            }

            if (limitTop && !this.properties.isShowMountingEle) {
                let anamorphism = this.properties.anamorphism; // 是否渐变
                let scroll = this.properties.scroll; // 动态设置滚动条

                if (anamorphism || scroll > 0) {
                    limitTop = limitTop - 10; // 适配渐变效果|动态设置滚动条
                }
                if (scrollTop > limitTop) {
                    // this.setData({isFixed: true},()=>{ this.getEleH(); });
                    if (!this.data.isFixed) {
                        this.setData({ isFixed: true }, () => {
                            this.getEleH();
                        });
                    }
                } else {
                    // this.setData({isFixed: false},()=>{ this.getEleH(); });
                    if (this.data.isFixed) {
                        this.setData({ isFixed: false }, () => {
                            this.getEleH();
                        });
                    }
                }
            }

            const height = this.data.windowHeight + scrollTop; // 屏幕高度+滚动的高度
            // 向父级组件传递信息
            this.setEvent({
                winH: event.detail.scrollHeight,
                loading: event.detail.scrollHeight - height <= 80,
                isMounting: this.data.isFixed,
                top: scrollTop, // 滚动条卷去的高度
            });
        },

        // 获取吸顶元素高度
        getEleH() {
            const _this = this;
            const query = wx.createSelectorQuery().in(this);
            query
                .select("#mounting")
                .boundingClientRect(function (res) {
                    // res.top // #the-id 节点的上边界坐标（相对于显示区域）
                    res = res ? res : {};
                    _this.setData({
                        height: res.height ? res.height : 0,
                    });
                })
                .exec();
        },
    },
});
