# 微信小程序说明文档

## 开发需要
IDE下载地址：[https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
开发文档地址：[https://developers.weixin.qq.com/miniprogram/dev/framework/](https://developers.weixin.qq.com/miniprogram/dev/framework/)  
开通权限：@吕鑫

## 应用信息
主体：快看
类型：漫画
应用名：快看漫画
appid：wxc8e78566bddcb277
包ID（package-Id）：com.kuaikan.main


## 文件结构

```
├── behaviors           # 代码共享模块
├── common              # 公共模块
│   ├── js              # 公共js模块
│   └── ***.scss        # 公共css
├── components          # 存放小程序组件
├── images              # 存放资源图片
├── miniprogram_npm     # npm依赖资源包
├── pages               # 统一存放项目页面级代码
├── static_npm          # 静态npm sdk资源
├── subpack-activity    # 活动分包页面级代码
├── subpack-auxiliary   # 其他分包页面级代码
├── subpack-bbs         # 社区分包页面级代码
├── typings             # ts相关声明文件
|-- app.js              # 小程序全局入口
|-- app.json            # 小程序结构配置文件
|-- app.wxss            # 全局样式
|-- cdn.js              # 静态cdn图片地址
|-- gs.js               # 防刷
|-- mixin.js            # 混淆方法
|-- package.json        # 义项目需要的各种模块及配置信息
|-- project.config.json # 小程序配置文件
|-- store.js            # 小程序全局共享数据
|-- util.js             # 小程序工具库
```