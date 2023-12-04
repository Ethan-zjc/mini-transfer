const app = getApp();
const global = app.globalData;
const { connect } = app.Store;
const { globalImgs } = require("../../../cdn.js");

import { util_request, util_action } from "../../../util.js";

const page = {
    data: {
        globalImgs,
        listTitle: "",
        offset: 1,
        limit: 10,
        list: [],
        error: false,
        empty: false,
        loading: true,
        finished: false,
        running: false,
        isLogin: false,
        isFirst: true,
        tagActive: 0,
        tagId: 0,
        tagList: [],
    },
    onLoad() {
        this.data.isFirst = true;
        this.getList();
    },
    onShareAppMessage() {},
    // 触底回调
    onReachBottom() {
        const { finished } = this.data;
        if (!finished) {
            this.getList();
        }
    },
    // 加载数据
    getList() {
        if (this.data.running) {
            return false;
        }
        this.data.running = true;
        this.setData({
            loading: true,
        });
        util_request({
            url: `/v2/checkin/api/mini/${global.channel}/benefit/discovery/list`,
            data: {
                tag_id: this.data.tagId,
                page: this.data.offset,
            },
        })
            .then((res) => {
                const { data = {} } = res;
                const { title = "新用户免费看", topic_category_list: catList = [] } = data;
                const tagId = this.data.tagId;

                if (this.data.isFirst) {
                    wx.setNavigationBarTitle({ title });
                    this.data.isFirst = false;
                    let topicList = [];
                    let tagList = [];
                    catList.forEach((item) => {
                        const title = item.title;
                        const length = title.length;
                        tagList.push({
                            length: length > 2 ? 3 : 2,
                            id: item.tag_id,
                            title: title.slice(0, 3),
                        });
                        if (item.tag_id == tagId) {
                            topicList = item.topic_list || [];
                        }
                    });
                    this.setData(
                        {
                            tagList: tagList.slice(0, 21),
                        },
                        () => {
                            this.getData(topicList, catList.length);
                        }
                    );
                } else {
                    const find = catList.find((item) => item.tag_id == tagId) || {};
                    const topicList = find.topic_list || [];
                    this.getData(topicList, catList.length);
                }
            })
            .catch(() => {
                this.setData({
                    error: true,
                    loading: false,
                });
            });
    },
    getData(topicList, catIndex) {
        this.data.running = false;

        if (catIndex < 1) {
            this.setData({
                empty: this.data.list.length == 0,
                finished: true,
                loading: false,
            });
            return false;
        }

        const list = topicList.map((item) => {
            return {
                des: item.popularity_text || "",
                id: item.id,
                title: item.title,
                img: item.vertical_image_url,
                uuid: `${Date.now().toString(36)}_${item.id}_${Math.random().toString(36)}`,
            };
        });
        this.setData({
            list: this.data.list.concat(list),
        });

        const empty = this.data.list.length == 0;
        const offset = empty ? -1 : this.data.offset + 1;
        const finished = !empty && list.length < 7;

        this.data.offset = offset;

        this.setData({
            loading: !finished,
            error: false,
            empty,
            finished,
        });
    },
    // 跳转专题
    action(e) {
        const { id, index } = e.currentTarget.dataset;
        util_action({ type: 68, id: "", parentid: id });
        app.kksaTrack("NewUserPageClk", {
            TriggerPage: "新手福利落地页",
            ButtonName: "新手福利页面按钮",
        });
    },
    tapTag(e) {
        const { id, index } = e.currentTarget.dataset;
        if (index == this.data.tagActive) {
            return false;
        }
        this.data.offset = 1;
        this.data.tagId = id;
        this.setData(
            {
                list: [],
                tagActive: index,
            },
            () => {
                this.getList();
            }
        );
    },
};

const ConnectPage = connect(
    ({ userInfo, follows, pageTrigger, recMap }) => {
        return { userInfo, follows, pageTrigger, recMap };
    },
    (setState, _state) => ({
        setFollows(id, newVal) {
            const follows = _state.follows;
            follows[id] = newVal;
            setState({ follows });
        },
    })
)(page);

Page(ConnectPage);
