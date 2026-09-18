# 图灵鉴X · 首页源码（第 3 版）

基于用户提供的首页 HTML 开发。AI 首页采用单排五张卡片的弧形轮播，覆盖全部 20 个技能；专家页使用指定的新标题，并与 AI 页共用导航和蓝紫配色。

## 运行

无需安装第三方依赖。在项目目录运行：

```sh
python3 -m http.server 8796 --bind 127.0.0.1 --directory public
```

浏览器打开 http://127.0.0.1:8796/ 。专家页可直接访问 http://127.0.0.1:8796/?tab=expert 。

如已安装 Node.js，也可以用 `npm run dev` 启动相同服务（仍需 Python 3）。

## 构建与部署

运行 `npm run build`，将生成可部署到任意静态托管的 `dist` 文件夹。无需 npm install。`.openai/hosting.json` 是当前 Sites 部署配置，不是微信小程序配置。

## 文件说明

- `public/index.html`：首页结构、专家页内容、输入框与弹层。
- `public/original.css`：用户原始 CSS，作为样式基础保存。
- `public/app.css`：页面布局、轮播、输入区等基础样式。
- `public/spectral.css`：AI 页光感、两种模式共用的导航、紧凑布局及按钮细节。
- `public/expert-refinement.css`：专家页的标题、轨道、CTA、数据和协议区。
- `public/app.js`：卡片/Banner/话题轮播、技能选择、本地图片和演示咨询。
- `public/data.js`：原始技能数据及 SVG 数据。
- `public/assets/icon-map.js`：20 个技能的独立图标映射。
- `public/assets/`：三张 Banner、欢迎区轨道及图标；无需外部 CDN。
- `build.mjs`：把 public 复制为 dist 的静态构建脚本。
- `design-qa.md`：本版检查记录。

图标采用 Phosphor 与 Tabler 官方 SVG，来源和 MIT 许可保存在 `public/assets/icons/`。

## 本版修改

1. 全部卡片按钮统一为“去鉴定”，选中后仍保持该文案。
2. 三行话题更紧凑；Banner、话题和输入框整体上移。
3. 发送按钮改为蓝紫圆角按钮与细线上箭头。
4. AI/专家 Tab 使用相同尺寸、字体、渐变和选中样式。
5. 专家标题改为“资深专家线上鉴定 / 出具权威鉴定结论”，“线上鉴定”使用彩色渐变，并优化其他排布。
6. 已选技能的关闭按钮改为圆形细线叉号。

## 交互范围

支持轮播自动播放/暂停、左右滑动、方向键、20 项技能选择、话题填入、最多三张本地照片预览/移除、文本咨询演示及专家协议展示。

本源码是网页交互 Demo，不是真实 AI 鉴定服务，不创建订单、不收费，照片仅在本机预览。尚未接入真实后端，也不是已发布的微信小程序。专家服务文案来自用户素材及本轮指定文案。
