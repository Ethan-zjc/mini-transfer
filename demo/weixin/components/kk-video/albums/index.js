import { getDetailList } from "../player/api.js";
import { util_feSuffix } from "../../../util.js";
Component({
    properties: {
        videoId: {
            type: String,
            value: "",
        },
        chapterId: {
            type: String,
            value: "",
        },
    },
    data: {
        topHeight: 100,
        visible: false,
        oriPos: "",
        list: [],
        active: 0,
        isScroll: false,
        seasonList: [],
        seasonActive: 0,
        seasonNext: 0,
        seasonPrev: 0,
        seasonNextEnd: false,
        seasonPrevEnd: false,
    },
    attached() {
        this.initRect();
        this.initData();
    },
    methods: {
        initRect() {
            if (!wx.getMenuButtonBoundingClientRect) {
                return;
            }
            const menuButton = wx.getMenuButtonBoundingClientRect();
            const { height, top } = menuButton;
            this.setData({
                topHeight: height + top,
            });
        },
        async initData() {
            let count = 0;
            const finish = () => {
                const { chapterId } = this.properties;
                const oriPos = this.formatPos();
                this.setData({
                    isScroll: true,
                    active: chapterId,
                    oriPos,
                });
            };
            const deep = async () => {
                const { seasonNextEnd, seasonPrevEnd } = this.data;
                let type = "";
                if (!count) {
                    type = "normal";
                } else if (!seasonNextEnd) {
                    type = "down";
                } else if (!seasonPrevEnd) {
                    type = "up";
                }
                count++;
                if (type) {
                    await this.getList(type);
                    const total = this.formatTotal();
                    if (total < 8) {
                        deep();
                    } else {
                        finish();
                    }
                } else {
                    finish();
                }
            };
            deep();
        },
        async getList(type = "normal") {
            const { videoId, chapterId } = this.properties;
            const { seasonNext, seasonPrev } = this.data;
            let params = {
                album_id: videoId,
            };
            if (["normal"].includes(type)) {
                Object.assign(params, {
                    chapter_id: chapterId,
                    is_season: false,
                });
            } else if (["down"].includes(type)) {
                Object.assign(params, {
                    season: seasonNext,
                    is_season: true,
                });
            } else if (["up"].includes(type)) {
                Object.assign(params, {
                    season: seasonPrev,
                    is_season: true,
                });
            }
            return new Promise(async (resolve) => {
                const res = await getDetailList(params);
                const { data = {} } = res;
                const { posts = [], season_list: seasonData = [] } = data;
                const { videoList } = this.formatDetail(posts);
                const seasonList = this.formatSeason(seasonData, params);
                const seasonObj = this.getSeason(seasonList);
                const group = {
                    ...seasonObj,
                    list: videoList,
                };
                const options = {
                    visible: true,
                };
                if (["down", "normal"].includes(type)) {
                    Object.assign(options, {
                        list: [...this.data.list, group],
                    });
                } else if (["up"].includes(type)) {
                    Object.assign(options, {
                        list: [group, ...this.data.list],
                    });
                }
                this.setSeason(seasonList, type);
                this.setData(options, () => {
                    resolve();
                });
            });
        },
        // 格式化详情接口数据
        formatDetail(chapters) {
            const { chapterId } = this.properties;
            let activeIndex = 0;
            let videoList = chapters.map((item, index) => {
                const userAuth = item.user_read_auth || {};
                const chapterAuth = item.post_auth || {};
                const priceInfo = {
                    readAuth: userAuth.can_read || false,
                    isVip: chapterAuth.vip_exclusive || false,
                    isBuy: userAuth.buy || false,
                };
                const disabled = !priceInfo.readAuth;
                const isVip = priceInfo.isVip || false;
                const pic = item.image_url || "";
                const id = item.id || "";
                const short = index + 1;
                if (chapterId == id) {
                    activeIndex = index;
                }
                return {
                    id,
                    title: item.title || "",
                    short: short < 10 ? `0${short}` : short,
                    pic: util_feSuffix({ src: pic, width: 150, quality: false }),
                    disabled,
                    priceInfo,
                    isVip,
                    isPay: disabled,
                    buyIcon: isVip ? (disabled ? "lock" : "unlock") : priceInfo.isBuy ? "unlock" : "lock",
                    posId: `item_${id}_index`,
                };
            });
            return {
                videoList,
                activeIndex,
            };
        },
        formatPos() {
            const { chapterId } = this.properties;
            const { list } = this.data;
            const parentList = list.map((item) => item.list);
            const groupList = [].concat.apply([], parentList).filter((item) => !!item);
            const index = groupList.findIndex((item) => item.id == chapterId);
            const posId = index > 0 ? groupList[index - 1].posId : "";
            return posId;
        },
        formatSeason(catalogs, params) {
            const { is_season, season } = params;
            let list = catalogs;
            if (is_season) {
                list = this.data.seasonList.map((item) => {
                    if (item.season == season) {
                        item.focus = true;
                    } else {
                        item.focus = false;
                    }
                    return item;
                });
            } else {
                this.data.seasonList = catalogs;
            }
            return list;
        },
        getSeason(catalogs) {
            let active = 0;
            let list = catalogs.map((item, index) => {
                if (item.focus) {
                    active = index;
                }
                return {
                    season: item.season,
                    title: item.title,
                };
            });
            return list[active] || {};
        },
        formatTotal() {
            const { list } = this.data;
            let num = 0;
            for (let i = 0; i < list.length; i++) {
                const { list: childList = [] } = list[i];
                const len = childList.length;
                num += len;
            }
            return num;
        },
        setSeason(catalogs, type) {
            const len = catalogs.length - 1;
            const findIndex = catalogs.findIndex((item) => item.focus);
            const seasonNextEnd = findIndex < len ? false : true;
            const seasonNext = !seasonNextEnd ? catalogs[findIndex + 1].season : 0;
            const seasonPrevEnd = findIndex > 0 ? false : true;
            const seasonPrev = !seasonPrevEnd ? catalogs[findIndex - 1].season : 0;
            if (["down", "normal"].includes(type)) {
                this.data.seasonNextEnd = seasonNextEnd;
                this.data.seasonNext = seasonNext;
            }
            if (["up", "normal"].includes(type)) {
                this.data.seasonPrevEnd = seasonPrevEnd;
                this.data.seasonPrev = seasonPrev;
            }
        },
        handleClose() {
            this.setData(
                {
                    visible: false,
                },
                () => {
                    let timer = setTimeout(() => {
                        clearTimeout(timer);
                        this.triggerEvent("onClose");
                    }, 300);
                }
            );
        },
        tapItem(event) {
            const { index, key, id } = event.currentTarget.dataset || {};
            const { list } = this.data;
            const { list: childList = [] } = list[key] || {};
            const item = childList[index] || {};
            this.setData({
                active: id,
            });
            this.triggerEvent("onChange", {
                index,
                albumsItem: item,
            });
        },
        handleLoadDown() {
            if (this.data.seasonNextEnd) {
                return false;
            }
            this.getList("down");
        },
        handleLoadUp() {
            if (this.data.seasonPrevEnd) {
                return false;
            }
            this.getList("up");
        },
    },
});
