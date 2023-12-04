const getQuestions = () => {
    return [
        {
            type: 'list',
            name: 'project',
            message: '请选择要迁移的项目',
            default: 'weixin',
            choices: [
                {
                    name: '微信',
                    value: 'weixin',
                },
            ],
        },
        {
            type: 'input',
            name: 'entry',
            message: '请输入待迁移文件路径:',
            default: '/weixin/components/kk-cover',
        },
        {
            type: 'checkbox',
            name: 'target',
            message: '请选择要迁移的目标项目',
            default: ['baidu', 'qq', 'douyin'],
            choices: [
                {
                    name: '百度',
                    value: 'baidu',
                },
                {
                    name: 'QQ',
                    value: 'qq',
                },
                {
                    name: '快手',
                    value: 'ks',
                },
                {
                    name: '抖音',
                    value: 'douyin',
                },
                {
                    name: '支付宝',
                    value: 'alipay',
                },
            ],
        },
        {
            type: 'input',
            name: 'rules',
            message: '请输入自定义规则路径(规则文件夹):',
            default: './wx2Config',
        },
        {
            type: 'input',
            name: 'output',
            message: '请输入输出文件路径文件路径(默认不填写,输出到每个taget对应相应文件中):',
            default: '',
        },
    ];
};
module.exports = {
    getQuestions,
};
