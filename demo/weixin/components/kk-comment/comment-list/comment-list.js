const api = require("./api");
const { commentImgs } = require("../../../cdn.js");

Component({
    properties: {
        comicId: {
            type: [String, Number],
            value: "",
        },
    },
    data: {
        commentImgs,
        commentList: [],
    },
    attached() {
        this.initFormatData();
    },
    methods: {
        initFormatData() {
            const { comicId } = this.data;
            api.getBaseCommentList({ comicId }).then((res) => {
                // 格式化数据、筛选可用信息
                const { comment_floors = [], since = 0, normal_total = 0 } = res.data || {};
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
                    children_comments: item.children_comments.map((item1, index1) => ({
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

                this.setData({
                    normal_total,
                    commentList: list,
                });
            });
        },
        checkMore() {
            this.triggerEvent("checkMore");
        },
    },
});
