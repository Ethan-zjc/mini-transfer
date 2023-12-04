const api = require("./api");

Page({
    data: {
        skeleton: true,
        loading: false,
        finished: false,
        page: 0,
        since: 0,
        limit: 20,
        rootComent: {},
        replyComment: [[]],
    },
    onLoad(e) {
        const { id } = e;
        this.data.commentId = id;
        this.initCommentDetail();
    },
    onShow() {},
    initCommentDetail() {
        const { commentId, loading, page, limit, since } = this.data;
        if (loading) return;
        this.setData({ loading: true });
        api.getCommentDetail({ commentId, since, limit, page }).then((res) => {
            // 格式化数据、筛选可用信息
            const { comment_floors = {}, down_since = 0 } = res.data || {};
            const { children_comments = [], root = {} } = comment_floors;
            const list = children_comments.map((item) => {
                const chunk = {
                    root: {
                        comment_type: item.comment_type,
                        content_info: item.content_info.map((item1, index1) => ({
                            ...item1,
                            show_img: index1 == item.content_info.findIndex((n) => n.type == 2),
                            show_voice: index1 == item.content_info.findIndex((n) => n.type == 4),
                        })),
                        content_type: item.content_type,
                        user: {
                            nickname: item.user.nickname,
                            avatar_url: item.user.avatar_url,
                        },
                        id: item.id,
                        likes_count: item.likes_count_info,
                    },
                };
                return chunk;
            });

            if (page == 0) {
                // 初始化，执行一次根评论
                const rootComent = {
                    id: root.id,
                    comment_type: root.comment_type,
                    content_info: root.content_info.map((item1, index1) => ({
                        ...item1,
                        show_img: index1 == root.content_info.findIndex((n) => n.type == 2),
                        show_voice: index1 == root.content_info.findIndex((n) => n.type == 4),
                    })),
                    content_type: root.content_type,
                    user: root.user,
                    likes_count: root.likes_count_info,
                };
                this.setData({
                    skeleton: false,
                    ["rootComent.root"]: rootComent,
                });
            }

            this.data.replyComment[page] = [];
            this.data.since = down_since;
            this.setData(
                {
                    [`replyComment[${page}]`]: list,
                },
                () => {
                    this.setData({ loading: false, finished: page != 0 && down_since == -1 });
                }
            );
        });
    },
    onReachBottom() {
        const { loading, finished, since = 0 } = this.data;
        if (loading || finished || since == -1) return;
        this.data.page++;
        this.initCommentDetail();
    },
    onShareAppMessage() {},
});
