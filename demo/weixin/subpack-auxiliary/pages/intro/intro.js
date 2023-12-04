Page({
    onLoad(opts) {
        const { type } = opts;
        let title = "";
        let src = "";
        let height = 0;
        let list = [];
        switch (type) {
            case "iosinvest":
                src = "https://static3w.kuaikanmanhua.com/assets/img/wechatmini/vip-ios-step_02c3faf.png";
                height = 1158;
                break;
            case "hrneitui":
                title = "快看！快来，内推了！";
                src = "https://static3w.kuaikanmanhua.com/assets/img/test/yang-750-60_abc8966.jpg";
                height = 4035;
                break;
            case "coupon":
                title = "代金券使用说明";
                list = [
                    {
                        question: "1. 什么是代金券？",
                        answer: "代金券是快看推出的专属福利道具，在快看APP内购买付费章节时可用代金券抵扣部分KK币，这部分KK币由快看替用户支付。一张代金券可多次使用直至代金券内KK币全部用光。代金券的使用和抵扣情况可在“我的钱包—明细”中查看。",
                    },
                    {
                        question: "2. 如何获得代金券？",
                        answer: "平台会不定期开展赠送代金券的活动，要多多关注哦。",
                    },
                    {
                        question: "3. 如何使用代金券？",
                        answer: "a 代金券只能对指定漫画使用。\nb 当用户账户存在可使用代金券时，购买漫画时会自动勾选当前最高抵扣比例的代金券进行抵扣。\nc 代金券仅限领取时的账号使用，不可提现，买卖，兑现，转赠他人。",
                    },
                    {
                        question: "4. 什么是代金券抵扣比例？",
                        answer: "a 代金券为快看为每个用户提供的补贴金额，在购买漫画时按当前可用的最高抵扣KK币比例进行抵扣，每个抵扣比例可使用次数是固定的，当某一抵扣比例的使用次数用光后可继续使用下一档位的抵扣比例继续抵扣。\nb 代金券抵扣比例详情可到“代金券—优惠规则”中查看。",
                    },
                    {
                        question: "5. 什么是已失效代金券？",
                        answer: "代金券作为福利道具存在有效期，到期后失效。",
                    },
                ];
                break;
        }
        wx.setNavigationBarTitle({ title });
        this.setData({ type, src, height, list });
    },
});
