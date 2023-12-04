/**
 * 会员中心充值成功弹窗
 **/
import { util_action } from '../../util.js';

const images = {
    popupTitle: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vip-center/vip-head_7f6f500.png',
    giveVip: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vip-center/give-vip-new_6e9409c.png',
    giveKkb: 'https://static3w.kuaikanmanhua.com/assets/img/remote_images/vip-center/give-kkb-new_205361f.png',
};
Component({
    properties: {
        vipInfo: {
            type: Object,
            value: {},
        },
        sucData: {
            type: Object,
            value: {},
        },
    },
    data: {
        images,
    },
    methods: {
        closeBtnTap() {
            this.triggerEvent('onClosePopup');
        },
        popBtnTap() {
            let chargeSuccessBannerData = this.data.sucData.bannerData || {};
            let action_target = chargeSuccessBannerData.action_target || null;
            if (action_target && action_target.action_type) {
                const { action_type: type, target_id: id, target_web_url: url } = action_target;
                util_action({ type, id, url });
            } else {
                this.triggerEvent('onClosePopup');
            }
        },
    },
});
