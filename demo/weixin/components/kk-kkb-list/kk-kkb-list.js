const global = getApp().globalData;

import { util_request } from '../../util.js';

/**
 * kkb充值档位列表
 */
Component({
    properties: {
        // 传入的充值档位原始data数据
        rechargeData: {
            type: Object,
            value: {},
        },
        // 最多显示档位个数
        maxCount: {
            type: Number,
            value: 6,
        },
        isVip: {
            type: Boolean,
            value: false,
        },
    },
    data: {
        list: [], // 充值档位列表
        aItem: {}, // 选中的充值档位
    },
    attached() {
        // 初始化充值档位列表信息
        if (Object.keys(this.properties.rechargeData).length > 0) {
            this.setData({
                list: this.formatList(this.properties.rechargeData),
                aItem: this.properties.rechargeData[0],
            });
            return false;
        }

        this.getRechargeList();
    },
    methods: {
        getKkbListApi() {
            const url = '/v2/kb/recharge_good/list_h5';
            const method = 'get';
            const host = 'pay';
            const data = {
                from: global.payfrom,
            };
            return util_request({
                url,
                method,
                host,
                data,
            });
        },
        formatList(data) {
            let { recharges = [] } = data;

            // 充值信息
            recharges = recharges[0] ? recharges[0] : {};
            const { recharge_goods = [] } = recharges;

            // 格式化充值列表 S
            recharge_goods.forEach((item) => {
                item.realPrice = item.real_price / 100;
                item.words_info = item.words_info ? item.words_info : { explain_text: '' };
            });

            return recharge_goods
                .sort((a, b) => {
                    return a.sequence - b.sequence;
                })
                .slice(0, 6);
        },

        // 获取充值档位列表
        async getRechargeList() {
            try {
                const { code = 0, data = {} } = await this.getKkbListApi();
                if (code == 200) {
                    const rechargeList = this.formatList(data);
                    this.setData({
                        list: rechargeList,
                        aItem: rechargeList[0],
                    });
                    this.triggerEvent('handleItemChange', { activeItem: rechargeList[0] });
                }
            } catch (err) {
                // console.log('获取充值档位接口异常');
            }
        },

        // 点击充值档位
        handleClick(e) {
            const { index = 0, id = 0 } = e.currentTarget.dataset;
            if (id == this.data.aItem.id) {
                return false;
            }
            const aItem = this.data.list[index];
            this.setData({
                aItem,
            });
            // 档位变更
            this.triggerEvent('handleItemChange', { activeItem: this.data.list[index] });
        },
    },
});
