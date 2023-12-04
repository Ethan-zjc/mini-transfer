/**
 * 会员权益
 * **/
const images = {
    vip1_1: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_1_02eb219.png",
    vip1_2: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_2_e447016.png",
    vip1_3: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_3_e8fca64.png",
    vip1_4: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_4_b129267.png",
    vip1_5: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/1_5_b607de2.png",
    vip2_1: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/2_1_8d38fbe.png",
    vip2_2: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/2_2_5a3209a.png",
    vip2_3: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/2_3_f4cebc6.png",
    vip2_4: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/2_4_dabfb07.png",
    vip2_5: "https://static3w.kuaikanmanhua.com/assets/img/remote_images/vipcenter/2_5_4704b8e.png",
};
Component({
    data: {
        candyList: [
            ["每日礼包", "作品限免", "会员折扣", "提前阅读", "签到特权"],
            ["会员弹幕", "卡券特权", "会员挂件", "免费代金券", "尊贵身份"],
        ],
        images,
    },
});
