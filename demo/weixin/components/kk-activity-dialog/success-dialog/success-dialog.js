/**
 * success-dialog(成功弹窗/规则弹窗)[书架签到/任务中心新手任务]
 * @show ->       是否显示弹窗         必填      类型:布尔     false:不显示  true:显示  默认:不显示
 * @type ->       弹窗类型             必填     类型:字符串    type:sign->签到(签到弹窗)  task:->任务[日常任务](任务弹窗)  newTask:->新手任务(新手任务弹窗)
 * @title->       弹窗标题             非必填    类型:字符串    默认:''   如果传递了标题,覆盖默认标题
 * @isRule ->     是否为规则弹窗        非必填   类型:布尔      false:不是规则弹窗  true:是规则弹窗   默认:不是规则弹窗
 * @ruleList->    规则弹窗是数据        非必填    类型:数组     默认:[]
 * @clickMask ->  是否允许遮罩层,关闭弹窗 非必填  类型:布尔       false:不允许点击蒙层关闭弹窗  true:允许点击蒙层关闭弹窗   默认:不允许点击蒙层关闭弹窗
 * @subtitle ->  副标题内容(标题下方的小文子) 签到弹窗弹窗中  非必填   默认:''
 * @rewardType -> 显示奖励的icon  非必填  类型:数字  rewardType:0无图标 / 1(KKB图标) / 2(vip图标) / 3(优惠卷图标) / 4(福利礼包图标)
 * @content ->   如果是奖励弹窗的情况下使用  非必填    类型:字符串 默认:空字符
 * @btnName ->   按钮名称   非必填    类型:字符串 默认:如果是规则弹窗默认:知道了 成功弹窗默认:悄悄收下
 *
 * @return {Function} clickCallback 点击按钮(或者遮罩层的)返回回调 -> 以上参数会全部返回  注意:show=false(关闭弹窗)
 */
const app = getApp();
const global = getApp().globalData;

Component({
    options: {
        multipleSlots: true, // 在组件定义时的选项中启用多slot支持
        addGlobalClass: true, // 支持外部传入的样式
    },
    properties: {
        // 是否显示弹窗 false:不显示  true:显示  默认:不显示
        show: {
            type: Boolean,
            value: false,
        },

        // 弹窗类型 type 支持的值:sign->签到(签到弹窗)  task:->任务[日常任务](任务弹窗)  newTask:->新手任务(新手任务弹窗)
        type: {
            type: String,
            value: "sign",
        },

        // 弹窗标题,如果传递了,覆盖默认的标题
        title: {
            type: String,
            value: "",
        },

        // 是否为规则弹窗 false:不是规则弹窗  true:是规则弹窗   默认:不是规则弹窗
        isRule: {
            type: Boolean,
            value: false,
        },

        // 规则弹窗数据列表
        ruleList: {
            type: Array,
            value: [],
        },

        // 是否允许遮罩层,关闭弹窗 false:不允许点击蒙层关闭弹窗  true:允许点击蒙层关闭弹窗   默认:不允许点击蒙层关闭弹窗
        clickMask: {
            type: Boolean,
            value: false,
        },

        // 副标题内容(标题下方的小文子) 签到弹窗弹窗中
        subtitle: {
            type: String,
            value: "",
        },

        // 奖励的类型(显示奖励的icon):rewardType=0无图标 rewardType=1(KKB图标) rewardType=2(vip图标) rewardType=3(优惠卷图标) rewardType=4(福利礼包图标)
        rewardType: {
            type: Number,
            value: 0,
        },

        // 如果是奖励弹窗的情况下使用 默认:空字符
        content: {
            type: String,
            value: "",
        },

        // 按钮名称
        btnName: {
            type: String,
            value: "",
        },
    },
    data: {
        // 签到规则弹窗内容
        ruleTitle: "",
        // 奖励弹窗(奖励领取成功弹窗)
        success: {
            title: "", // 标题
            subtitle: "", // 副标题
        },
        btn: null, // 展示的按钮名称
        // 需要的弹窗icon 图标
        images: {
            successIcon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/success-dialog/success-icon_c2be5a2.png",
            successTitleBg: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/success-dialog/success-title-bg_06f87c8.png",
            kkb: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/success-dialog/kkb_acc5147.png",
            vip: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/success-dialog/vip_9a56a8f.png",
            coupon: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/success-dialog/coupon_e53de62.png",
            giftPack: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/success-dialog/gift-pack_2487f47.png",
        },
        networkType: true, // 默认有网络
    },
    observers: {
        show(val) {
            this.getNetworkType(); // 检测网络状态变化
            let { isRule } = this.data;
            if (isRule) {
                // 规则弹窗的情况
                this.setData({ btn: "知道啦" }); // 设置弹窗的确认按钮名称
            } else {
                // 正常奖励弹窗
                this.setData({ btn: "悄悄收下" }); // 设置弹窗的确认按钮名称
            }
        },

        // 是否为规则弹窗 false:不是  true:是规则弹窗   默认:不是规则弹窗
        isRule(val) {
            let type = this.data.type;
            if (val) {
                if (type == "sign") {
                    // 签到弹窗
                    this.setData({
                        ruleTitle: "签到规则",
                    });
                } else if (type == "task") {
                    // 任务(日常任务)弹窗
                    this.setData({
                        ruleTitle: "任务参与规则",
                    });
                } else if (type == "newTask" || type == "newtask") {
                    // 新手任务弹窗
                    this.setData({
                        ruleTitle: "参与规则",
                    });
                } else {
                    // console.error("当前弹窗组件 type的值只能为:sign->签到(签到弹窗)  task:->任务[日常任务](任务弹窗) newTask->新手任务(新手任务弹窗)");
                }
            } else {
                this.setData(
                    {
                        ruleTitle: "",
                    },
                    () => {
                        this.watchType(type);
                    }
                );
            }
        },

        // 弹窗类型 type 支持的值:sign->签到(签到弹窗)  task:->任务[日常任务](任务弹窗)  newTask:->新手任务(新手任务弹窗)
        type(val) {
            this.watchType(val); // 检测:弹窗类型变化设置领取成功弹窗标题
        },

        // 副标题数据发生变化,动态修改
        subtitle(val) {
            if (val) {
                this.setData({
                    "success.subtitle": val.replace(/<b[\s\S]*?(\/?)>/gi, '<b class="b">'),
                });
            }
        },
    },
    attached() {
        let { isRule } = this.data;
        if (isRule) {
            // 规则弹窗的情况
            this.setData({ btn: "知道啦" }); // 设置弹窗的确认按钮名称
        } else {
            // 正常奖励弹窗
            this.setData({ btn: "悄悄收下" }); // 设置弹窗的确认按钮名称
        }
    },
    methods: {
        // 检测:弹窗类型变化设置领取成功弹窗标题
        watchType(val) {
            let success = this.data.success;
            if (val == "sign") {
                success.title = "签到成功";
                this.setData({
                    success,
                });
            } else if (val == "sign" || val == "newTask" || val == "newtask") {
                success.title = "完成任务";
                this.setData({
                    success,
                });
            }
        },
        // setEvent 发送给父级页面的信息 clickCallback事件名称
        setEvent({ position } = {}) {
            let event = "clickCallback"; // 点击按钮或者遮罩层回调事件名称
            let sendData = {
                type: this.data.type, // 弹窗类型 type 支持的值:sign->签到(签到弹窗)  task:->任务(任务弹窗)
                isRule: this.data.isRule, // 是否为规则弹窗 false:不是  true:是规则弹窗   默认:不是规则弹窗
                clickMask: this.data.clickMask, // 是否允许遮罩层,关闭弹窗
                show: false, // 修改弹窗状态
                btnName: this.data.btn, // 如果是 type=sign(签到弹窗) 副标题使用(显示连续签到的天数)
                // 显示奖励的icon:rewardType=0无图标 rewardType=1(KKB图标) rewardType=2(vip图标) rewardType=3(优惠卷图标) rewardType=4(福利礼包图标)
                rewardType: this.data.rewardType,
                subtitle: this.data.success.subtitle, // 副标题
                content: this.data.content, // 传递的奖励内容
                position, // 点击(元素名称)的位置 btn/mask
            };
            this.triggerEvent(event, sendData, { bubbles: true, composed: true });
        },

        // 点击规则弹窗按钮 position点击的位置 btn/mask
        tapRulePopupBtn(e) {
            let { name } = e.currentTarget.dataset;
            if (name == "mask") {
                if (this.data.clickMask) {
                    // clickMask->true的情况允许点击遮罩层关闭弹窗
                    // 点击了按钮(点击知道了/悄悄收下按钮触发回调)
                    this.setEvent({ position: name });
                }
            } else {
                // 点击了按钮(点击知道了/悄悄收下按钮触发回调)
                this.setEvent({ position: name });
            }
        },

        // 查询网吧状态
        getNetworkType() {
            wx.getNetworkType({
                success: (res) => {
                    let type = res.networkType;
                    if (type === "unknown" || type === "none" || type === "2g") {
                        // 建议提示用户确认网络状态 && 无网络 && 弱网状态
                        this.setData({ networkType: false });
                    } else {
                        // 有网络状态
                        this.setData({ networkType: true });
                    }
                },
                fail: (err) => {
                    this.setData({ networkType: true });
                },
            });
        },
    },
});
