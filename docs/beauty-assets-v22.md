# 鉴颜值 v22 图片资产

生成日期：2026-10-10。

## 生成方式与范围

使用 Codex 内置 `image_gen` 工具；未调用 CLI 或外部 API。生成图片已复制到工程，保留旧版图片。原图均为工程已有的虚构成人模特演示素材，配饰图片用于展示预设人物佩戴所推荐商品的效果，不代表对任意上传照片进行实时试戴。

## 商品图集

- 文件：`public/assets/beauty-products-v22.png`
- 版式：4 列 × 3 行，1448 × 1086 px；每格 362 × 362 px。
- CSS：`background-size: 400% 300%`。列位置依次为 0%、33.333333%、66.666667%、100%；行位置依次为 0%、50%、100%。
- 无品牌字样、文字、价格或水印；象牙色背景、统一柔光。

| 行 | 列 | 商品 |
|---|---|---|
| 1 | 1 | hair / 护发精油 |
| 1 | 2 | brow / 眉笔 |
| 1 | 3 | eye / 四色眼影 |
| 1 | 4 | eyeliner / 深棕眼线笔 |
| 2 | 1 | lashes / 自然分段假睫毛 |
| 2 | 2 | base-dry / 保湿粉底 |
| 2 | 3 | base-normal / 轻透粉底 |
| 2 | 4 | base-oily / 持妆粉底 |
| 3 | 1 | blush / 蜜桃腮红 |
| 3 | 2 | lip / 玫瑰豆沙口红 |
| 3 | 3 | earrings / 小圆珍珠耳钉 |
| 3 | 4 | style / 珍珠吊坠细链 |

## 配饰佩戴图

五张单人胸像，按原双联图右侧人物保持面部、肤色、年龄和妆发；双耳佩戴小圆白珍珠耳钉，香槟金细链配单颗圆白珍珠吊坠。两款首饰与图集第 3 行第 3、4 格一致。保留原有衣服，仅作为肖像背景，不输出服装推荐。

| 档位 | 编辑目标 | 输出 |
|---|---|---|
| natural | `public/assets/beauty-portrait-natural-v2.png` 右侧人物 | `public/assets/beauty-accessory-natural-v22.png` |
| fresh | `public/assets/beauty-portrait-fresh-v2.png` 右侧人物 | `public/assets/beauty-accessory-fresh-v22.png` |
| radiant | `public/assets/beauty-portrait-radiant-v2.png` 右侧人物 | `public/assets/beauty-accessory-radiant-v22.png` |
| spotlight | `public/assets/beauty-portrait-spotlight-v2.png` 右侧人物 | `public/assets/beauty-accessory-spotlight-v22.png` |
| icon | `public/assets/beauty-portrait-icon-v2.png` 右侧人物 | `public/assets/beauty-accessory-icon-v22.png` |

输出尺寸均为 1122 × 1402 px，单人竖幅。推荐以完整竖幅或接近 4:5 的容器展示，避免裁掉耳饰、项链。

## 人工视觉检查

已通过 `view_image` 查看商品图集以及五张落盘后的佩戴照：

- 图集 12 格顺序与品类正确；眼妆含分段假睫毛，三款粉底包装可区分。
- 五张佩戴照均为单人，无 before/after 分隔、文字或贴纸。
- 两耳珍珠耳钉和单颗珍珠项链可见，形状、珠色及金属色与推荐商品一致。
- 原人物的脸部特征、发色、发长与自然皮肤纹理在视觉上保留；图像生成存在细节重绘，不作为精确人脸身份测量结果。

## 最终提示词

### 商品图集

```text
Use case: product-mockup.
Asset type: ecommerce product sprite atlas for a beauty recommendation application.
Create a professional photorealistic studio product catalog image in exact 4 columns by 3 rows: 12 equal SQUARE cells in a 4:3 landscape canvas. 1600x1200 or larger. No gaps, no margins, no visible grid lines, no divider lines. Each cell has the SAME very pale warm ivory background, the same diffuse soft shadow and light from top-left. Each cell contains exactly one centered product or product set, completely contained with 14% safe padding on all sides, small enough to fit in square crop. Product object occupies about 68% of cell height. Premium understated cosmetics, creamy neutral packaging and champagne gold metal details. No words, labels, lettering, numbers, logos, watermark or decorative props anywhere.
Exact reading order left to right top to bottom:
Row 1 col 1: a glass amber hair treatment oil bottle with champagne gold pump, clear amber oil.
Row 1 col 2: a slim cool grey-brown dual-ended eyebrow pencil with one cap alongside, sharpened brown tip and small spoolie.
Row 1 col 3: an open square four-pan eye shadow compact, four warm apricot and cocoa shades.
Row 1 col 4: a slender dark brown liquid eyeliner pen with fine felt tip and cap alongside.
Row 2 col 1: a transparent rectangular lash tray with two orderly rows of individual natural wispy black false eyelash clusters.
Row 2 col 2: a round glass moisturizing foundation pump bottle with ivory beige liquid, pale rose cap.
Row 2 col 3: a rectangular glass lightweight foundation pump bottle with natural beige liquid, brushed champagne cap.
Row 2 col 4: a frosted glass matte longwear foundation pump bottle with beige liquid, soft charcoal cap.
Row 3 col 1: an open round blush compact with soft peach powder.
Row 3 col 2: a rose-bean-paste colored lipstick bullet extended from matte nude rose tube, matching cap alongside.
Row 3 col 3: a symmetrical pair of small round white pearl stud earrings (one 5mm pearl on each earring) in subtle champagne gold setting, front view and slightly angled side view; plain pearls without diamond or flower decorations.
Row 3 col 4: a very fine champagne gold chain necklace arranged in a clean U shape with ONE small spherical white pearl pendant on a tiny simple gold bail, matching the pearl studs in the previous cell. No second chain, no coin pendant.
Visual emphasis: precise equal cell alignment, consistent backgrounds, high-end natural catalog photography. Every cell independently usable as a square product thumbnail.
```

### 配饰佩戴照

以下提示词分别用于 natural、fresh、radiant、spotlight、icon 五张图。每次第一输入为对应原双联图；第二输入固定为本版本商品图集。

```text
Use case: identity-preserve.
Asset type: single portrait showing recommended jewelry for beauty report.
Input image 1 is the EDIT TARGET: a diptych showing the same adult woman before and after. Select ONLY THE WOMAN IN THE RIGHT HALF as the identity/face/makeup/hair-length reference; output one single portrait of that exact right-half woman, not a diptych.
Input image 2 is the JEWELRY PRODUCT REFERENCE: use ONLY the pair of small round white pearl stud earrings in bottom row column 3 and thin champagne gold chain with a single white pearl pendant in bottom row column 4.
Primary edit: show the same adult woman in one front-facing relaxed shoulders-and-upper-chest studio portrait, wearing exactly that matching pearl jewelry: one small round white pearl stud on each ear, subtly set in champagne gold; one delicate champagne-gold chain with a single small round white pearl pendant (not a flat coin) centered just below the collarbones. Remove her existing flat coin necklace and replace with referenced pearl pendant necklace. Tuck a little hair behind BOTH ears so both pearl studs are plainly visible, keep the rest of her existing hair and hairstyle. Jewelry is correctly scaled and realistically attached.
Invariants: preserve the right-hand woman's exact face, eye shape, nose, lips, facial proportions, skin tone, age, expression, natural skin pores, hair color/length, and existing plain top. No face reshaping, no skin whitening, no excessive retouching, no enlarged eyes.
Composition: single person centered, nearly frontal, frame from above head down to upper chest; BOTH ears and full necklace visible, collarbones visible where reference top permits. 4:5 portrait composition with breathing room, premium natural editorial portrait in softly lit pale grey studio, realistic photographic texture.
No text, no labels, no split screen, no before/after, no collage, no arrows, no stickers, no watermark, no extra necklaces, no second person.
```

