// components/waterfall-item/waterfall-item.js
Component({
    /**
     * 组件的属性列表
     */
    properties: {
        itemData: {
            type: Object,
        },
    },

    /**
     * 组件的初始数据
     */
    data: {},

    /**
     * 组件的方法列表
     */
    methods: {
        actionPost(e) {
            const { id } = e.currentTarget.dataset;
            wx.redirectTo({
                url: `/subpack-bbs/pages/post/post?id=${id}&detail=${encodeURIComponent(JSON.stringify(this.data.itemData))}`,
            });
        },
        pariseClick(e) {
            const { id, isliked } = e.currentTarget.dataset;
            console.log(33333, e, id, isliked);
            this.triggerEvent("pariseTap", { id, isliked });
        },
    },
});
