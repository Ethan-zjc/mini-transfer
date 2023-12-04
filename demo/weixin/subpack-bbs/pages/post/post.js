// subpack-bbs/pages/post.js
import { global, prevPage, transNum, formatTime, showToast, hideToast, kksaTrack, feedTrack, util_action, util_transNum, util_getUrlQuery } from "../common/subapp";
import { getPostDataApi, getPostMoreApi, postPraiseApi, getRelevanceApi } from "./api";

/**
 * 帖子类型 structureType
 * 0: 长文混排展示类型
 * 1: 直播帖
 * 5: 短视频展示类型
 * 6: 结构化视频展示类型  1009691826807898544
 * 7: 结构化展示图集类型  1047176128650805472
 * 8: 结构化长图展示类型  1047234672074948832
 * 11: 对话小说展示类型
 */

/**
 * 帖子详情内容类型list（content{type}）
 * 1、文字；2、图片；3、视频；4、音频；5、直播；6、动图
 */

Page({
    /**
     * 页面的初始数据
     */
    data: {
        postId: "",
        ipxFixed: 0,
        pageTitle: "帖子详情",
        pageTitleSign: "post_title",
        isWifi: false,
        showFixed: false,
        swiperCurrent: 0,
        controls: false, // 全屏时显示控制栏等信息
        videoStatus: true, // 播放/暂停状态
        channel: "wechat",
        direction: "vertical", // 全屏时视频的方向vertical/horizontal
        objectFit: "fill", // contain
        postDetails: {}, // 帖子详情数据
        since: 0,
        suspendAnimation: false,
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        // console.log(global, 7777, options);
        let { id } = options,
            { openId } = global;
        Object.assign(this.data, {
            postId: id,
        });

        // 识别二维码进入重置postId
        if (options.q) {
            const str = decodeURIComponent(options.q);
            const postId = util_getUrlQuery(str, "id") || "";
            const qrcodeSign = util_getUrlQuery(str, "qrcode") || "";
            const subType = util_getUrlQuery(str, "subType") || "";
            options.id = postId;
            options.SubType = subType;
            this.data.postId = postId;
            this.data.qrcodeSign = qrcodeSign;
        }

        // 初次进入执行
        if (openId) {
            this.onHome({ options });
        } else {
            global.openIdCallback = () => {
                this.onHome({ options });
            };
        }

        // 访问发现页埋点使用
        global.enterPostPage = true;
        global.backBubbleData = {
            page: "PostPage",
            show: false,
            type: "顶部导航",
        };

        setTimeout(() => {
            this.setData({
                suspendAnimation: true,
            });

            // 私域内容初始化
            this.onSyCopyUrl(options);
        }, 100);
        kksaTrack("SocialPost", {
            PostID: id,
        });
    },

    // 初始化
    onHome({ options } = {}) {
        const { id, detail, source = -1, terminal = "", origin = 1, SubType = -1, SourceMini = -1, ShareExperiment } = options;
        const { name } = prevPage();
        const { scene, iPhoneX, channel, screenRpxRate, systemInfo } = global;
        const initInfo = {
            channel,
            nonstopPage: !name,
            ipxFixed: iPhoneX ? Math.ceil(34 * screenRpxRate) + 90 : 90,
            miMode: !systemInfo.model ? "" : systemInfo.model.toLocaleLowerCase().includes("mi") && channel == "qq" ? "miMode" : "",
        };
        this.setData(initInfo);

        // 分享进入埋点
        if (!name) {
            console.log("分享卡片进入时的场景值区分卡片和app", scene);
            this.shareCardEnter({
                scene,
                source: source * 1,
                origin: origin * 1,
                terminal,
                SubType,
                ShareExperiment,
                SourceMini: SourceMini * 1,
            });
        }

        // 初始化数据，图集数据&推荐数据
        if (detail) {
            this.setData(
                {
                    postDetails: JSON.parse(decodeURIComponent(detail)),
                },
                () => {
                    this.getPostData(id)
                        .then(() => {
                            hideToast();
                        })
                        .catch(() => {});
                    this.getPostMore(id);
                }
            );
        } else {
            this.getPostData(id)
                .then(() => {
                    hideToast();
                })
                .catch(() => {});
            this.getPostMore(id);
        }

        // 关联专题&推荐相关数据
        this.getRelevance(id);
    },

    /**
     * 网络检查
     */
    watchNetwork() {
        return new Promise((resolve) => {
            wx.getNetworkType({
                success: (res) => {
                    // 返回网络类型, 有效值：
                    // wifi/2g/3g/4g/unknown(Android下不常见的网络类型)/none(无网络)
                    this.data.isWifi = res.networkType == "wifi";
                },
                complete: () => {
                    resolve();
                },
            });
        });
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {
        this.videoContext = wx.createVideoContext("myVideo");
    },
    getRelevance(id) {
        const { gender = 0 } = wx.getStorageSync("globalObj") || {};
        getRelevanceApi({ postId: id, gender }).then((res) => {
            const { related_topic } = res.data;

            if (related_topic) {
                related_topic.favCount = related_topic.favourite_count ? util_transNum(related_topic.favourite_count) : 0;
            }

            this.setData({
                relatedTopic: related_topic || null,
            });
        });
    },
    getPostData(id) {
        return new Promise((resolve, rejecct) => {
            getPostDataApi({ postId: id })
                .then((res) => {
                    // 格式化帖子详情部分数据
                    console.log("帖子详情页", res);
                    this.postDeatilFormat(res.data);
                    resolve();
                })
                .catch((res) => {
                    hideToast();
                    console.log("详情接口超时和其他报错兼容处理", res, 4444444);
                    const { code, message } = res;
                    showToast({ title: message, duration: 3000 });
                    rejecct();
                });
        });
    },
    getPostMore(id, more) {
        const { since } = this.data;
        this.data.loading = true;
        getPostMoreApi({ postId: id, since })
            .then((res) => {
                // 格式化猜你想看部分数据
                // console.log("猜你想看详情页", res);
                this.moreDataFormat(res.data, more);
                this.data.loading = false;
            })
            .catch((res) => {
                hideToast();
                this.data.loading = false;
                const { message } = res;
                showToast({ title: message, duration: 3000 });
            });
    },
    postDeatilFormat(res) {
        const { post } = res,
            { user } = post;
        // 格式化数据
        this.setData(
            {
                showFixed: true,
                postDetails: this.formatObj({ post, user, detail: true }),
            },
            async () => {
                console.log("dangqian", this.data.postDetails);
                this.data.pageTitle = this.data.postDetails.title;
                this.data.pageTitleSign = "post_title";
                // wx.setNavigationBarTitle({ title: this.data.postDetails.title });
                this.setData({ pageTitle: this.data.postDetails.title });

                // 视屏帖自动播放
                if (this.data.postDetails.structureType == 6) {
                    await this.watchNetwork();
                    if (!this.data.isWifi) {
                        // 当前为非WiFi环境，请注意流量使用
                        showToast({ title: "当前为非WiFi环境，请注意流量使用" });
                    }
                }
            }
        );
    },

    /**
     * @param {*} res
     * since: 分页使用
     * universalModels: 更多帖子数组
     * postContentLinesLimit:
     * isNewData:
     */
    moreDataFormat(res, more) {
        const { since, universalModels } = res;
        this.data.since = since; // 滚动底部获取更多使用

        const list = universalModels.map((item) => {
            const { post } = item,
                { user } = post;
            return this.formatObj({ post, user, detail: false });
        });

        if (more && since == -1 && !list.length) {
            // 无更多数据
            this.setData(
                {
                    noMore: true,
                },
                () => {
                    showToast({ title: "没有更多了～" });
                }
            );
            return;
        }

        // 通用组件形式
        console.log("这里是card数据", list);
        this.setData({
            postMoreList: list,
            // showFixed: true
        });
    },
    formatObj({ post, user, detail } = {}) {
        const { screenRpxRate } = global;
        let defaultCover;
        if (post.structureType == 6) {
            defaultCover = post.content.filter((item) => item.type == 3)[0];
        }
        const obj = {
            id: post.idString,
            title: post.title || "帖子详情",
            cardTitle: post.editorTitle || post.title || post.summary,
            structureType: post.structureType,
            createTime: this.releaseTimeFormat(post.createTime), // formatTime(post.createTime, 'yyyy-MM') , // 帖子创建时间
            isLiked: post.isLiked, // 是否已点赞
            likeCount: post.likeCount,
            strLikeCount: post.strLikeCount, // 点赞数量
            strViewCount: post.strViewCount, // 帖子观看人数
            recommendReason: post.recommendReason, // 推荐原因
            recommendIcon: post.recommendIcon, // 推荐icon
            authorInfo: {
                nickname: user.nickname,
                id: user.id,
                vip_type: user.vip_type,
                vip_icon: user.vip_icon,
                avatar_url: user.avatar_url,
                followStatus: user.followStatus,
                user_role_mark: user.user_role_mark,
            },
            recommendCover:
                post.structureType == 6
                    ? {
                          content: defaultCover.webpCoverUrl, // 静态图thumbUrl，动态图webpCoverUrl
                          define: defaultCover.thumbUrl,
                          height: defaultCover.height,
                          width: defaultCover.width,
                      }
                    : post.recommendCover
                    ? post.recommendCover
                    : {
                          content: "",
                          height: 109,
                          width: 162,
                      }, // 帖子类型等于7也没有
            content: post.content,

            // 1、文字；2、图片；3、视频
            // 6、视频 7、图集 8、长图
            richText:
                post.content
                    .filter((item) => item.type == 1)
                    .map((item) => item.content)
                    .join("") || "",
            labels: post.labels.map((item) => item.name),
        };
        if (obj.recommendCover) {
            obj.imgHeight = Math.ceil((obj.recommendCover.height * 350) / obj.recommendCover.width);
            // obj.imgHeight = Math.ceil((obj.recommendCover.height * 350) / obj.recommendCover.width / screenRpxRate)
        }

        // 1009691826807898544
        if (post.structureType == 6) {
            const arry = post.content.filter((item) => item.type == 3) || [];
            obj.videoData = arry.length ? arry[0] : {};
            obj.videoData.height = Math.round((arry[0].height * 750) / arry[0].width / screenRpxRate);
        } else if (post.structureType == 7) {
            const arry = post.content.filter((item) => item.type == 2) || [];
            // 避免图集多张执行多次，只执行第一次, 方便测试只拿当前页面详情的
            if (detail && arry.length) {
                console.log("输入的arry", arry);
                const { atlasHeight, atlasLists } = this.formatAtlas(arry);
                obj.atlasHeight = atlasHeight; // 容器高度
                obj.atlasLists = atlasLists.length > 20 ? atlasLists.slice(0, 20) : atlasLists;
                // 添加图集容器宽度，高度atlasContainer: {width, height}
                console.log("图集数据格式化", atlasHeight, atlasLists);
            }
        } else if (post.structureType == 8) {
            // 1047234672074948832
            const arry = post.content.filter((item) => item.type == 2) || [];
            obj.longPics = arry.map((item) => {
                let height = (item.height * 750) / item.width;
                let data = Object.assign(item, {
                    height: Math.round(height),
                });
                return data;
            });
        }

        return obj;
    },

    /**
     * 格式化图集内容
     * 根据图集首张图片确定容器高度
     * 最小高度：422，最大高度：1068无刘海；1246有刘海，一般高度：790， 容器宽度100%
     *
     */
    formatAtlas(arry) {
        // 容器和图片展示规则rules, 统一图片单位转换为rpx
        let cheight; // 容器宽高
        const { height, width } = arry[0],
            { iPhoneX, screenRpxRate } = global;
        if (width < 200) {
            cheight = 422;
        } else {
            // 图片宽度大于200按照图片宽高度比确定容器高度
            const aspectRatio = width / height;
            if (aspectRatio <= 750 / 1068) {
                cheight = 1068;
            } else if (aspectRatio > 750 / 1068 && aspectRatio <= 16 / 9) {
                cheight = Math.ceil((height * 750) / width); // 1068; // 容器高度自适应,计算自适应的容器高度
            } else {
                cheight = 422;
            }
        }

        arry.forEach((item) => {
            const {
                w,
                h,
                exceedH = false,
                offsetY = 0,
            } = this.pictureRules({
                width: item.width,
                height: item.height,
                cheight,
            });
            item.height = h;
            item.width = w;
            item.exceedH = exceedH; // 是否显示展示全部
            item.offsetY = offsetY; // 偏移截取
        });

        // 需要的结果: 确定容器的大小及数组中每张图片的展示规则
        return { atlasHeight: cheight, atlasLists: arry };
    },

    // 图片规则
    pictureRules({ width, height, cheight }) {
        let w = 750,
            h,
            offsetY = 0,
            exceedH;
        if (width <= 100) {
            w = w / 2;
            h = Math.ceil((w * height) / width); // 自适应, 同比例
        } else if (width < 200) {
            w = (w * 2) / 3;
            h = Math.ceil((w * height) / width); // 自适应, 同比例
        } else {
            let contRatio = w / cheight,
                picRatio = width / height;
            if (picRatio > contRatio) {
                // 图片的“宽:高”>容器的“宽:高”，横向自适应填满，上下留白
                h = (w * height) / width; // 自适应, 同比例
            } else if (picRatio == contRatio) {
                // 图片的“宽:高”=容器的“宽:高”，填满屏幕
                h = cheight; // 同容器高度
            } else if (picRatio > contRatio * 0.6666 && picRatio < contRatio) {
                // 容器的“宽:高”*0.6666<图片的“宽:高”<容器的“宽:高”，填满屏幕，纵向居中截取（图片“高/宽”大于容器“高/宽”的1.1倍，则显示“查看完整图片”）
                h = (w * height) / width; // 同容器高度, 使用相对位置
                offsetY = h >= cheight ? Math.ceil((h - cheight) / 2) : 0;
                exceedH = picRatio > contRatio * 1.1;
            } else if (picRatio <= contRatio * 0.6666) {
                // 图片的“宽:高”≤容器的“宽:高”*0.6666，填满屏幕，从图片头部的“容器高度*1.5”范围内，按居中截取（需显示“查看完整图片”）
                h = (w * height) / width; // 自适应, 同比例
                offsetY = Math.ceil((0.5 * cheight) / 2);
                exceedH = true;
            }
        }
        return { w, h, offsetY, exceedH };
    },

    // 发布时间格式化
    releaseTimeFormat(time) {
        let timeStr,
            curData = new Date().getTime(),
            curDay = new Date().getDate(),
            curYear = new Date().getFullYear(),
            date = new Date(time),
            oneminute = 1 * 60 * 1000,
            diff = curData - time;

        if (diff < oneminute) {
            // 小于1分钟
            timeStr = "刚刚";
        } else if (diff >= oneminute && diff < 60 * oneminute) {
            timeStr = `${Math.floor(diff / oneminute)}分钟前`;
        } else if (diff >= 60 * oneminute && date.getDate() == curDay) {
            timeStr = `${Math.floor(diff / (oneminute * 60))}小时前`;
        } else if (diff <= 48 * 60 * oneminute) {
            timeStr = `昨天 ${formatTime(time, "hh:mm")}`;
        } else if (curYear == date.getFullYear()) {
            timeStr = `${formatTime(time, "MM-dd")}`;
        } else {
            timeStr = `${formatTime(time, "yyyy-MM-dd")}`;
        }
        return timeStr;
    },

    // 图集/轮播
    swiperChange(e) {
        const { current } = e.detail;
        this.setData({
            swiperCurrent: current,
        });
    },
    // 预览图集
    atlasPreviewImgs(e) {
        const { image } = e.currentTarget.dataset;
        const { atlasLists } = this.data.postDetails;
        const arryImgs = atlasLists.map((item) => item.content);
        wx.previewImage({
            current: image, // 当前显示图片的http链接 String
            urls: arryImgs, // 需要预览的图片http链接列表 Array
        });
    },

    /**
     * 视屏贴相关
     */
    bindplay() {
        console.log("视频播放时触发");
        // this.videoControl(true);
    },
    bindpause() {
        console.log("视频暂停时触发");
        this.videoControl(false);
    },
    bindended() {
        console.log("视频播放完成时触发");
    },
    videoControl(status) {
        this.setData(
            {
                videoStatus: status,
            },
            () => {
                status ? this.videoContext.play() : this.videoContext.pause();
            }
        );
    },
    changePlayStatus() {
        const { videoStatus } = this.data;
        if (videoStatus) {
            this.videoContext.pause();
        } else {
            this.videoContext.play();
        }
        this.setData({
            videoStatus: !videoStatus,
        });
    },
    bindVideoFullScreen() {
        this.videoContext.requestFullScreen();
    },
    async bindfullscreenchange(event) {
        const { fullScreen } = event.detail,
            { objectFit } = this.data;
        this.setData({
            controls: fullScreen,
            objectFit: objectFit.includes("fill") ? "contain" : "fill",
        });

        if (!fullScreen) {
            await this.watchNetwork();
            if (this.data.isWifi && this.data.videoStatus) {
                this.videoControl(true);
            } else {
                this.videoControl(false);
            }
        } else {
            this.videoControl(true);
        }
    },
    bindVideoEnterPictureInPicture() {
        console.log("进入小窗模式");
    },
    bindVideoLeavePictureInPicture() {
        console.log("退出小窗模式");
    },
    videoErrorCallback(e) {
        console.log("视频错误信息:");
        console.log(e.detail.errMsg);
    },

    /**
     * 页面滚动监听改变title
     */
    onPageScroll(e) {
        const { suspendAnimation, channel } = this.data;
        if (suspendAnimation && channel == "qq") {
            this.setData(
                {
                    suspendAnimation: false,
                },
                () => {
                    setTimeout(() => {
                        this.setData({
                            suspendAnimation: true,
                        });
                    }, 1000);
                }
            );
        }

        if (JSON.stringify(this.data.postDetails) == "{}") {
            // wx.setNavigationBarTitle({ title: "帖子详情" });
            this.setData({ pageTitle: "帖子详情" });
            return;
        }
        this.getRect();
    },
    getRect() {
        const query = wx.createSelectorQuery().select("#more-list");
        if (!query) {
            return;
        }
        query
            .boundingClientRect((rect) => {
                // console.log(rect)
                const { pageTitle, postDetails, pageTitleSign } = this.data,
                    { title } = postDetails;
                if (rect.top <= -50) {
                    if (pageTitle.includes("猜你想看") && pageTitleSign.includes("post_more")) {
                        return;
                    }
                    this.setData({ showFixed: false });
                    // wx.setNavigationBarTitle({ title: "猜你想看" });
                    // this.data.pageTitle = "猜你想看";
                    this.setData({ pageTitle: "猜你想看" });
                    this.data.pageTitleSign = "post_more";
                } else {
                    if (pageTitle.includes(postDetails.title) && pageTitleSign.includes("post_title")) {
                        return;
                    }
                    this.setData({ showFixed: true });
                    // wx.setNavigationBarTitle({ title: title ? title : "帖子详情" });
                    // this.data.pageTitle = title || "帖子详情";
                    this.setData({ pageTitle: title || "帖子详情" });
                    this.data.pageTitleSign = "post_title";
                }
            })
            .exec();
    },

    /**
     * 页面点赞
     */
    clickPraise(e) {
        const { userId } = global;
        const { id, isLiked, likeCount } = this.data.postDetails;

        if (!userId) {
            wx.navigateTo({ url: "/pages/login/login" });
            return false;
        }
        postPraiseApi({ postId: id, isRemove: isLiked }).then((res) => {
            console.log(res);
            const { code } = res;
            if (code == 200) {
                this.setData({
                    ["postDetails.isLiked"]: !isLiked,
                    ["postDetails.strLikeCount"]: transNum(likeCount + (isLiked ? -1 : +1)),
                });

                this.data.postDetails.likeCount = isLiked ? likeCount - 1 : likeCount + 1; // 真实值
            }
        });
    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {},

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {
        this.offSyCopyUrl();
    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {
        const { postId } = this.data;
        // wx.startPullDownRefresh();
        this.data.since = 0;
        this.selectComponent("#waterfall").reset();
        showToast({ title: "加载中...", type: "loading", mask: true, duration: 3000 });
        this.getPostData(postId)
            .then(() => {
                hideToast();
                wx.stopPullDownRefresh();
            })
            .catch(() => {
                wx.stopPullDownRefresh();
            });
        this.getPostMore(postId);
    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {
        // 加载中或无更多数据
        if (this.data.loading || this.data.noMore) {
            return;
        }
        this.getPostMore(this.data.postId, true);
    },

    /**
     * 用户点击页面内分享按钮
     */
    shareClick() {
        this.shareReport({ pageType: 4, btnclick: true, SubType: this.data.postDetails.structureType }); // 按钮点击进入
    },

    /**
     * 用户分享卡片进入
     * @param {*} [{scene, source, origin, terminal, ShareExperiment}={}]
     *
     */
    shareCardEnter({ scene, source, origin, terminal, SubType = "", SourceMini, ShareExperiment } = {}) {
        const origins = [1007, 2003, 2016, 1036];
        // 点击分享卡片进入,判断场景值是否为app进入
        if (origins.includes(scene)) {
            this.shareReport({
                origin,
                source,
                share: true,
                type: 1,
                SubType,
                fromapp: scene == 1036 || !terminal,
                terminal,
                SourceMini,
                ShareExperiment,
            });
        }

        // 扫描分享海报进入
        if ([1012, 1013].includes(scene)) {
            // 上报内容
            console.log("分享海报上报");
            this.trackPoster({
                source,
                type: 4,
                SubType,
                fromapp: true,
                terminal,
            });
        }
    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage(e) {
        // 微信只有分享好友，shareTarget默认为3,补充分享微信朋友圈
        const { channel } = global;
        const { from, shareTarget = 3 } = e,
            { postId } = this.data;
        const origin = from == "menu" ? 2 : 1;
        this.shareReport({
            type: 4,
            trigger: true,
            origin,
            source: shareTarget,
            SubType: this.data.postDetails.structureType,
        });

        // 分享上报数据组
        feedTrack("Share", {
            ShareContentType: 4,
            SubjectID: postId,
        });

        return {
            title: "帖子详情",
            path: `/subpack-bbs/pages/post/post?id=${postId}&source=${shareTarget}&origin=${origin}&terminal=${channel}&SubType=${this.data.postDetails.structureType}${
                global.sySign ? "&locate=kksy_" + global.sySign : ""
            }`,
            // imageUrl: '',
        };
    },

    /**
     * share = false, 从分享卡片进入小程序标识别
     * trigger = false, 选择分享平台标识
     * pageType = 1, 1详情页，2专题页, 3活动, 4帖子页
     * fromapp = false, app分享标识
     * origin = '', 按钮分享、三个点分享
     * source = -1, 分享到哪个平台
     * btnclick = false,
     * terminal = 'wechat', 来源终端
     * ShareExperiment = '',
     * postType = 0 帖子类型
     */
    shareReport({
        share = false,
        trigger = false,
        pageType = 4,
        fromapp = false,
        origin = "",
        source = -1,
        SubType = "",
        btnclick = false,
        SourceMini = -1,
        terminal = "wechat",
        ShareExperiment = "",
    } = {}) {
        let eventName;
        const { channel } = global,
            { postId } = this.data;
        const dataTrack = {
            SubType: SubType * 1,
            SourcePlatform: channel,
            ShareContentType: pageType,
            ButtonLocation: fromapp ? 0 : origin ? origin * 1 : 1, // 漫画底部分享， 来源如果是app，为未知0, 分享卡片过来在参数中拿
            SubjectID: postId,
        };

        // 判断分享卡片进入
        if (share) {
            // 转换SourceMini
            let appToSource = {
                1: 3,
                2: 4,
                3: 0,
                4: 1,
                0: -1,
            };
            eventName = "OpenShareMiniprogram";
            dataTrack.Source = fromapp ? (SourceMini >= 0 && SourceMini <= 4 && appToSource[SourceMini] >= -1 ? appToSource[SourceMini] : SourceMini * 1) : source * 1;
            dataTrack.ShareTerminal = fromapp ? "APP" : terminal;
            dataTrack.ShareExperiment = ShareExperiment ? decodeURIComponent(ShareExperiment).split(",") : []; // 实验标识
        }
        // 选择渠道
        if (trigger) {
            eventName = "ShareChannelSelection";
            dataTrack.Source = fromapp ? -1 : source * 1;
        }
        if (btnclick) {
            eventName = "ClickShareButton";
        }

        console.log("上报的属性1213", eventName, dataTrack, 88888);
        kksaTrack(eventName, dataTrack);
    },

    // 回到首页
    toHome() {
        wx.switchTab({
            url: "/pages/find/find",
        });
    },

    // 刷新新瀑布流
    update() {
        this.data.id = 1;
        // 重置瀑布流组件
        this.setData({ loaded: false });
        this.selectComponent("#waterfall").reset();
        let list = this.getMockData();
        this.setData({ list });
    },
    onLoadingChange(e) {
        this.setData({
            waterfallLoading: e.detail,
        });
    },

    /**
     * 返回首页
     */
    goHomeFun() {
        global.backBubbleData = {
            page: "PostPage",
            show: false,
            type: "左下角引导条",
        };
        wx.switchTab({
            url: "/pages/find/find",
        });
    },
    navHeightFun(e) {
        const { height } = e.detail;
        this.setData({
            navHeight: height,
        });
    },
    readTopic(e) {
        const { type, id } = e.currentTarget.dataset;
        this.postPageClick();
        util_action({ type, parentid: id });
    },

    // 页面点击埋点
    postPageClick() {
        kksaTrack("PostPageModuleClick", {
            ModuleName: "",
            ModuleType: "单个漫画推荐",
            ModelClkItem: "漫画推荐-内容",
            PostID: this.data.postId,
        });
    },

    // 分享海报埋点上报
    trackPoster({ type = 4, fromapp = false, source = -1, SubType = "", terminal = "wechat" }) {
        const { postId, qrcodeSign, userInfo } = this.data;
        const data = {
            SubType: SubType ? SubType * 1 : -1,
            ShareContentType: type,
            SubjectID: postId,
            Source: fromapp ? -1 : source,
            ShareTerminal: fromapp ? "APP" : terminal,
            IsLogin: !!userInfo,
            QRcode: qrcodeSign,
        };
        kksaTrack("OpenShareMiniprogram", data);
    },

    onSyCopyUrl(event) {
        if (global.sySign) {
            let params = [];
            event = event || {};
            Object.assign(event, { locate: `kksy_${global.sySign}` });
            for (let key in event) {
                params.push(`${key}=${event[key]}`);
            }
            wx.onCopyUrl(() => {
                return { query: params.join("&") };
            });
        }
    },
    offSyCopyUrl() {
        if (global.sySign) {
            wx.offCopyUrl();
        }
    },
});
