const global = getApp().globalData;
const api = require("../comment-list/api");
const { commentImgs } = require("../../../cdn.js");

Component({
    properties: {
        show: {
            type: Boolean,
            value: false,
        },
        mask: {
            type: Boolean,
            value: false,
        },
        comicId: {
            type: [String, Number],
            value: "",
        },
    },
    data: {
        offset: 0,
        limit: 20,
        page: 0,
        order: "score",
        loading: false,
        finished: false,
        activeType: 0,
        commentList: [[]],
        commentImgs,
    },
    attached() {
        this.initFormatData();
        setTimeout(() => {
            const { iPhoneX } = global;
            this.setData({
                iPhoneX,
                showTrans: true,
            });
        }, 50);
    },
    methods: {
        initFormatData() {
            const { comicId, loading, offset, limit, order, page, osince = 0 } = this.data;
            if (loading) {
                return;
            }
            this.setData({ loading: true });
            api.getCommentList({ comicId, offset: osince || 0, limit, order }).then((res) => {
                // 格式化数据、筛选可用信息
                const { comment_floors = [], since = 0, normal_total = 0, total = 0 } = res.data || {};
                const list = comment_floors.map((item) => ({
                    id: item.root.id,
                    show_more: item.show_more,
                    children_total: item.children_total,
                    root: {
                        id: item.root.id,
                        comment_type: item.root.comment_type,
                        content_info: item.root.content_info.map((item1, index1) => ({
                            ...item1,
                            show_img: index1 == item.root.content_info.findIndex((n) => n.type == 2),
                            show_voice: index1 == item.root.content_info.findIndex((n) => n.type == 4),
                        })),
                        content_type: item.root.content_type,
                        user: item.root.user,
                        likes_count: item.root.likes_count_info,
                    },
                    children_comments: item.children_comments.map((item1) => ({
                        comment_type: item1.comment_type,
                        content_info: item1.content_info.map((item2, index2) => ({
                            ...item2,
                            show_img: index2 == item1.content_info.findIndex((n) => n.type == 2),
                            show_voice: index2 == item1.content_info.findIndex((n) => n.type == 4),
                        })),
                        content_type: item1.content_type,
                        user: {
                            nickname: item1.user.nickname,
                        },
                        id: item1.id,
                        replied_comment_id: item1.replied_comment_id,
                    })),
                }));

                this.data.commentList[page] = [];
                this.data.osince = since;
                this.setData(
                    {
                        // normalTotal: total,
                        [`commentList[${page}]`]: list,
                    },
                    () => {
                        this.setData({ loading: false, finished: page != 0 && since == -1 });
                    }
                );
            });
        },

        // 切换列表类型
        changeTypes(e) {
            const { type } = e.currentTarget.dataset;
            Object.assign(this.data, {
                page: 0,
                osince: 0,
                loading: false,
                finished: false,
                order: type == 1 ? "time" : "score",
                limit: this.data.limit,
            });
            this.setData(
                {
                    offset: 0,
                    commentList: [[]],
                    activeType: parseInt(type),
                },
                () => {
                    // 重新拉取数据
                    this.initFormatData();
                }
            );
        },

        // 触底加载更多方法
        scrolltolower() {
            const { loading, finished, osince = 0 } = this.data;
            if (loading || finished || osince == -1) {
                return;
            }
            this.data.page++;
            this.initFormatData();
        },
        closeHalf() {
            this.triggerEvent("closeHalf");
        },
        preventClose() {},
    },
});
