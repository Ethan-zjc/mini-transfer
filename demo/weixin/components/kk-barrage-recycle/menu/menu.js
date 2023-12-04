/**
 * 弹幕菜单
 * @author chenxin
 */
const { channel } = getApp().globalData;
import { util_request, util_showToast, util_feedTrack } from '../../../util.js';

Component({
    data: {
        left: 0,
        top: 0,
        animClass: '',
        _timer: 0,
        _oldShow: false,
        hidden: true,
    },
    properties: {
        danmuData: {
            type: Object,
            value: {
                index: 0,
                danmuId: '',
                editable: false,
                top: 0,
                left: 0,
                height: 0,
            },
        },
        show: {
            type: Boolean,
            value: false,
        },
        comicId: {
            type: Number,
            value: 0,
        },
        topicId: {
            type: Number,
            value: 0,
        },
        comicTitle: {
            type: String,
            value: '',
        },
        topicTitle: {
            type: String,
            value: '',
        },
    },
    observers: {
        show(val) {
            if (val === this.data._oldShow) {
                return;
            }
            this.data._oldShow = val;
            if (val) {
                this.showMenu();
                return;
            }
            this.hideMenu();
        },
    },
    methods: {
        showMenu() {
            this.data._timer = setTimeout(() => {
                this.data._timer = 0;
                this.setData({ animClass: 'leave', hidden: true });
            }, 5000);
            // 弹幕以中心点定位
            // 弹幕定位实现：坐标仍作用于左上角，同时增加translate3d(-50%, -50%, 0)
            // 弹幕菜单水平方向和弹幕中心对齐，垂直方向紧随弹幕
            const { left, top, height } = this.data.danmuData;
            const { screenRpxRate, screenWidth } = getApp().globalData;
            const menuWidth = 208 / screenRpxRate;
            let menuLeft = left - menuWidth / 2;
            if (menuLeft < 0) {
                menuLeft = 0;
            }
            if (menuWidth + menuLeft > screenWidth) {
                menuLeft = screenWidth - menuWidth;
            }
            let menuTop = parseFloat(top) + parseFloat(height) / 2;
            this.setData({
                left: menuLeft,
                top: menuTop,
                animClass: 'enter',
                hidden: false,
            });
        },
        hideMenu() {
            if (this.data._timer) {
                clearTimeout(this.data._timer);
            }
            this.setData({ animClass: 'leave' });
        },
        onTransitionEnd() {
            if (this.data.animClass === 'leave') {
                this.triggerEvent('leave');
                this.setData({ hidden: true, animClass: '' });
            }
        },
        interact(e) {
            const { interactType } = e.currentTarget.dataset;
            const { danmuId } = this.data.danmuData;
            // 菜单消失
            this.setData({ animClass: 'leave' });
            // 弹幕消失
            this.triggerEvent('hidebarrage', {
                ...this.data.danmuData,
                action: 'interact',
            });
            util_request({
                url: `/v1/danmu/mini/${channel}/interaction`,
                method: 'post',
                data: { danmu_id: danmuId, interaction_type: interactType },
            })
                .then(() => {
                    let msg = '踩成功';
                    if (interactType === 1) {
                        const tips = ['点赞成功', '点赞能让我变大', '感谢点亮'];
                        const index = Math.floor(Math.random() * 3);
                        msg = tips[index] || '点赞成功';
                    }
                    util_showToast({
                        title: msg,
                        position: { bottom: '320rpx' },
                    });
                })
                .catch(({ message }) => {
                    util_showToast({
                        title: message,
                        position: { bottom: '320rpx' },
                    });
                });
            if (interactType === 1) {
                util_feedTrack('like', {
                    TriggerPage: 'ComicPage',
                    LikeObject: '弹幕',
                    Action: '点赞',
                    ComicID: this.data.comicId,
                    ComicName: this.data.comicTitle,
                    TopicID: this.data.topicId,
                    TopicName: this.data.topicTitle,
                });
                // 神策点赞上报
                getApp().kksaTrack('Like', {
                    TriggerPage: 'ComicPage', // 触发页面
                    LikeObject: '弹幕' || '', // 点赞对象
                    Action: '点赞', // 点赞/取消点赞
                    ComicID: this.data.comicId || '', // 漫画ID
                    ComicName: this.data.comicTitle || '', // 漫画名称
                    TopicID: this.data.topicId || '', // 专题id
                    TopicName: this.data.topicTitle || '', // 专题名称
                });
            }
        },
        del() {
            const { danmuId } = this.data.danmuData;
            // 菜单消失
            this.setData({ animClass: 'leave' });
            // 弹幕消失
            this.triggerEvent('hidebarrage', {
                ...this.data.danmuData,
                action: 'del',
            });
            util_request({
                url: `/v1/danmu/mini/${channel}/delete`,
                method: 'post',
                data: { danmu_id: danmuId, user_id: getApp().globalData.userId },
            })
                .then(() => {
                    util_showToast({
                        title: '删除成功',
                        position: { bottom: '320rpx' },
                    });
                })
                .catch(({ message }) => {
                    util_showToast({
                        title: message,
                        position: { bottom: '320rpx' },
                    });
                });
        },
    },
});
