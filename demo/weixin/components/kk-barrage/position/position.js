/**
 * 弹幕编辑组件
 * 用于页面: comic
 * @author chenxin
 */
const { channel, systemInfo, iPhoneX } = getApp().globalData;
const { windowWidth } = systemInfo;
import Base64 from "../../../common/js/base64";
import { util_request, util_showToast } from "../../../util.js";

Component({
    data: {
        barrageRect: { width: 10, height: 10, x: 0, y: 0 },
        opacity: 0, // hack：初始定位movable时，可以看到移动过程，透明处理
        _position: {},
        iPhoneX: iPhoneX,
    },
    properties: {
        barrageEditor: {
            type: Object,
            value: {
                content: "",
                editingImageList: [],
                movableHeight: 0,
                realScrollTop: 0,
            },
        },
        _comicId: {
            type: Number,
            value: 0,
        },
        userInfo: {
            type: Object,
            value: {},
        },
        _topicTitle: {
            type: String,
            value: "",
        },
        _comicTitle: {
            type: String,
            value: "",
        },
        _topicId: {
            type: String,
            value: "",
        },
    },
    observers: {
        "barrageEditor.content"(value) {
            if (!value) {
                return;
            }
            wx.nextTick(() => {
                const query = this.createSelectorQuery();
                query.select(".barrage-wrap").boundingClientRect();
                query.exec((res) => {
                    const { width, height } = res[0];
                    const { barrageEditor } = this.data;
                    this.setData(
                        {
                            barrageRect: {
                                width,
                                height,
                                x: Math.random() * windowWidth,
                                y: barrageEditor.movableHeight / 2 - height / 2,
                            },
                        },
                        () => {
                            this.setData({ opacity: 1 });
                        }
                    );
                });
            });
        },
    },
    methods: {
        noop() {},
        saveDanmu(data, imageData) {
            util_request({
                url: `/v1/danmu/mini/${channel}/send/safe`,
                method: "post",
                data,
                sign: true,
            })
                .then((res) => {
                    const { user = {} } = this.data.userInfo;
                    const danmu = Object.assign(
                        {},
                        data,
                        {
                            stay_time: 1.5,
                            extend_coefficient: 1,
                            user: {
                                id: user.id,
                                nickname: user.nickname,
                                avatar_url: user.avatar_url,
                                user_role: user.user_role === 1 ? "author" : "user",
                            },
                        },
                        res.data
                    );
                    this.report({
                        IsSendSuccess: 1,
                        ContentID: danmu.danmu_id,
                    });
                    this.triggerEvent("hide", {
                        danmuId: danmu.danmu_id,
                        danmuData: danmu,
                        imageData,
                    });
                })
                .catch(({ message }) => {
                    this.report({ IsSendSuccess: -1 });
                    util_showToast({
                        title: message,
                        position: { bottom: "320rpx" },
                    });
                    this.triggerEvent("hide");
                });
        },
        onBgTap() {
            if (!this.data.barrageEditor.content) {
                this.triggerEvent("hide");
            }
        },
        onChange(e) {
            this.data._position = e.detail;
        },
        onCancel() {
            this.report({ IsSendSuccess: 0 });
            this.triggerEvent("hide");
        },
        onConfirm() {
            const { x: left, y: top } = this.data._position;
            const { barrageEditor, _comicId, barrageRect } = this.data;
            const { editingImageList, content, realScrollTop } = barrageEditor;
            // 使用弹幕中心点定位
            const coordinateInView = {
                x: left + barrageRect.width / 2,
                y: top + barrageRect.height / 2,
            };
            const scrollPos = coordinateInView.y + realScrollTop;
            let i = 0;
            while (editingImageList[i].top > scrollPos || editingImageList[i].top + editingImageList[i].pxHeight < scrollPos) {
                i++;
            }
            const comicImage = editingImageList[i];
            const xPercent = coordinateInView.x / windowWidth;
            const yPercent = (scrollPos - comicImage.top) / comicImage.pxHeight;
            const danmuData = {
                comic_id: _comicId,
                image_key: comicImage.key,
                x_position: Number((comicImage.width * xPercent).toFixed(1)),
                y_position: Number((comicImage.height * yPercent).toFixed(1)),
                content,
                bubble_id: 0,
            };
            this.saveDanmu(danmuData, comicImage);
        },
        report(data) {
            const baseData = {
                TopicID: parseInt(this.data._topicId),
                TopicName: this.data._topicTitle,
                ComicID: parseInt(this.data._comicId),
                ComicName: this.data._comicTitle,
                ContentID: "0",
                TriggerPage: "ComicPage",
                IsSendSuccess: -1,
                SourcePlatform: channel,
            };
            Object.assign(baseData, data);
            const reportData = {
                distinct_id: getApp().globalData.userId,
                time: Date.now(),
                event: "BulletScreen",
                properties: baseData,
            };
            // 大数据上报
            try {
                util_request({
                    url: "/v1/app_data",
                    method: "post",
                    data: { data: Base64.encode(JSON.stringify(reportData)) },
                });
            } catch (e) {
                // do nothing
            }
            // 神策上报
            getApp().kksaTrack("BulletScreen", baseData);
        },
    },
});
