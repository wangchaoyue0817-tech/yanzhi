# 鉴颜值 v2 图像资产

## 高清独立肖像（第15版已采用）

原 atlas 保留作为 identity reference。为避免局部裁切和海报导出时分辨率不足，使用内建 image_gen 的 identity-preserve 编辑模式，以原 atlas 的对应列为人物身份参考，独立生成以下 5 个双栏肖像。全部实测为 **1536 × 1024**；按左右各一半裁切后，每人 **768 × 1024**。左侧是日常状态，右侧是妆发优化，未改变人物身份、服装和拍摄方向。已目视检查人物一致性、前后差异、无文字、两栏完整及真实皮肤纹理。

| 文件 | 身份参考 | 尺寸 |
| --- | --- | --- |
| `public/assets/beauty-portrait-natural-v2.png` | LEFTMOST column 1, long dark loose hair and light cream round-neck top | 1536 × 1024 |
| `public/assets/beauty-portrait-fresh-v2.png` | column 2, short dark chin-length bob, gray-taupe round-neck sweater | 1536 × 1024 |
| `public/assets/beauty-portrait-radiant-v2.png` | CENTER column 3, medium wavy brown hair, dusty mauve round-neck top | 1536 × 1024 |
| `public/assets/beauty-portrait-spotlight-v2.png` | column 4, shoulder-length straight brown hair, muted blue-gray round-neck top | 1536 × 1024 |
| `public/assets/beauty-portrait-icon-v2.png` | RIGHTMOST column 5, long black straight hair, light cream square-neck top | 1536 × 1024 |

### natural 最终提示词

```text
Use case: identity-preserve. Create a higher-resolution two-photo makeup makeover diptych using the attached contact sheet as IDENTITY REFERENCE. Extract and faithfully recreate only the adult fictional East Asian woman in the LEFTMOST column 1, long dark loose hair and light cream round-neck top. Do NOT use any other woman's identity.
Create one landscape image with EXACTLY TWO equal edge-to-edge halves, target 1536x1024 or higher in exact 3:2 aspect ratio. Each half is a portrait crop with same original 3:4 portrait ratio, the woman's entire top of head and upper chest visible, eyes aligned at the same height and head exactly the same size in both halves. Frame tightly enough for facial detail yet preserve full hairstyle and necklace area, just as in the input. NO margin, NO gap, NO dividing line, NO text, NO labels, NO borders, NO caption, NO watermark. Pale warm gray studio backdrop. The input is the identity reference, not a collage layout to copy.
LEFT HALF: same woman as the TOP ROW in the specified reference column, same shirt, natural daily face, realistic pores and skin texture, original hairstyle, calm closed-mouth expression, direct front view.
RIGHT HALF: EXACT SAME woman as left, matching age, skin tone, face shape, eye shape and size, nose, pose, camera angle, expression, shirt, soft lighting and head scale. Only cosmetics and hairstyle have changed: softly defined longer eyebrow tails, refined warm brown eye makeup with fine brown eyeliner, realistic rosy-brown lipstick, soft natural blush and light even base makeup retaining pores, more voluminous polished hair in the same length, delicate gold pendant necklace. Match the intended changes visible in BOTTOM ROW of the same reference column. Give visible attainable makeup changes and polished hair, NOT identity change, skin lightening, face reshaping or age reduction. Preserve photographic detail at high resolution for a beauty report's zoomed eye/lip crops and a 1080-wide export poster. Photorealistic studio photography.
```

### fresh 最终提示词

```text
Use case: identity-preserve. Create a higher-resolution two-photo makeup makeover diptych using the attached contact sheet as IDENTITY REFERENCE. Extract and faithfully recreate only the adult fictional East Asian woman in the column 2, short dark chin-length bob, gray-taupe round-neck sweater. Do NOT use any other woman's identity.
Create one landscape image with EXACTLY TWO equal edge-to-edge halves, target 1536x1024 or higher in exact 3:2 aspect ratio. Each half is a portrait crop with same original 3:4 portrait ratio, the woman's entire top of head and upper chest visible, eyes aligned at the same height and head exactly the same size in both halves. Frame tightly enough for facial detail yet preserve full hairstyle and necklace area, just as in the input. NO margin, NO gap, NO dividing line, NO text, NO labels, NO borders, NO caption, NO watermark. Pale warm gray studio backdrop. The input is the identity reference, not a collage layout to copy.
LEFT HALF: same woman as the TOP ROW in the specified reference column, same shirt, natural daily face, realistic pores and skin texture, original hairstyle, calm closed-mouth expression, direct front view.
RIGHT HALF: EXACT SAME woman as left, matching age, skin tone, face shape, eye shape and size, nose, pose, camera angle, expression, shirt, soft lighting and head scale. Only cosmetics and hairstyle have changed: softly defined longer eyebrow tails, refined warm brown eye makeup with fine brown eyeliner, realistic rosy-brown lipstick, soft natural blush and light even base makeup retaining pores, more voluminous polished hair in the same length, delicate gold pendant necklace. Match the intended changes visible in BOTTOM ROW of the same reference column. Give visible attainable makeup changes and polished hair, NOT identity change, skin lightening, face reshaping or age reduction. Preserve photographic detail at high resolution for a beauty report's zoomed eye/lip crops and a 1080-wide export poster. Photorealistic studio photography.
```

### radiant 最终提示词

```text
Use case: identity-preserve. Create a higher-resolution two-photo makeup makeover diptych using the attached contact sheet as IDENTITY REFERENCE. Extract and faithfully recreate only the adult fictional East Asian woman in the CENTER column 3, medium wavy brown hair, dusty mauve round-neck top. Do NOT use any other woman's identity.
Create one landscape image with EXACTLY TWO equal edge-to-edge halves, target 1536x1024 or higher in exact 3:2 aspect ratio. Each half is a portrait crop with same original 3:4 portrait ratio, the woman's entire top of head and upper chest visible, eyes aligned at the same height and head exactly the same size in both halves. Frame tightly enough for facial detail yet preserve full hairstyle and necklace area, just as in the input. NO margin, NO gap, NO dividing line, NO text, NO labels, NO borders, NO caption, NO watermark. Pale warm gray studio backdrop. The input is the identity reference, not a collage layout to copy.
LEFT HALF: same woman as the TOP ROW in the specified reference column, same shirt, natural daily face, realistic pores and skin texture, original hairstyle, calm closed-mouth expression, direct front view.
RIGHT HALF: EXACT SAME woman as left, matching age, skin tone, face shape, eye shape and size, nose, pose, camera angle, expression, shirt, soft lighting and head scale. Only cosmetics and hairstyle have changed: softly defined longer eyebrow tails, refined warm brown eye makeup with fine brown eyeliner, realistic rosy-brown lipstick, soft natural blush and light even base makeup retaining pores, more voluminous polished hair in the same length, delicate gold pendant necklace. Match the intended changes visible in BOTTOM ROW of the same reference column. Give visible attainable makeup changes and polished hair, NOT identity change, skin lightening, face reshaping or age reduction. Preserve photographic detail at high resolution for a beauty report's zoomed eye/lip crops and a 1080-wide export poster. Photorealistic studio photography.
```

### spotlight 最终提示词

```text
Use case: identity-preserve. Create a higher-resolution two-photo makeup makeover diptych using the attached contact sheet as IDENTITY REFERENCE. Extract and faithfully recreate only the adult fictional East Asian woman in the column 4, shoulder-length straight brown hair, muted blue-gray round-neck top. Do NOT use any other woman's identity.
Create one landscape image with EXACTLY TWO equal edge-to-edge halves, target 1536x1024 or higher in exact 3:2 aspect ratio. Each half is a portrait crop with same original 3:4 portrait ratio, the woman's entire top of head and upper chest visible, eyes aligned at the same height and head exactly the same size in both halves. Frame tightly enough for facial detail yet preserve full hairstyle and necklace area, just as in the input. NO margin, NO gap, NO dividing line, NO text, NO labels, NO borders, NO caption, NO watermark. Pale warm gray studio backdrop. The input is the identity reference, not a collage layout to copy.
LEFT HALF: same woman as the TOP ROW in the specified reference column, same shirt, natural daily face, realistic pores and skin texture, original hairstyle, calm closed-mouth expression, direct front view.
RIGHT HALF: EXACT SAME woman as left, matching age, skin tone, face shape, eye shape and size, nose, pose, camera angle, expression, shirt, soft lighting and head scale. Only cosmetics and hairstyle have changed: softly defined longer eyebrow tails, refined warm brown eye makeup with fine brown eyeliner, realistic rosy-brown lipstick, soft natural blush and light even base makeup retaining pores, more voluminous polished hair in the same length, delicate gold pendant necklace. Match the intended changes visible in BOTTOM ROW of the same reference column. Give visible attainable makeup changes and polished hair, NOT identity change, skin lightening, face reshaping or age reduction. Preserve photographic detail at high resolution for a beauty report's zoomed eye/lip crops and a 1080-wide export poster. Photorealistic studio photography.
```

### icon 最终提示词

```text
Use case: identity-preserve. Create a higher-resolution two-photo makeup makeover diptych using the attached contact sheet as IDENTITY REFERENCE. Extract and faithfully recreate only the adult fictional East Asian woman in the RIGHTMOST column 5, long black straight hair, light cream square-neck top. Do NOT use any other woman's identity.
Create one landscape image with EXACTLY TWO equal edge-to-edge halves, target 1536x1024 or higher in exact 3:2 aspect ratio. Each half is a portrait crop with same original 3:4 portrait ratio, the woman's entire top of head and upper chest visible, eyes aligned at the same height and head exactly the same size in both halves. Frame tightly enough for facial detail yet preserve full hairstyle and necklace area, just as in the input. NO margin, NO gap, NO dividing line, NO text, NO labels, NO borders, NO caption, NO watermark. Pale warm gray studio backdrop. The input is the identity reference, not a collage layout to copy.
LEFT HALF: same woman as the TOP ROW in the specified reference column, same shirt, natural daily face, realistic pores and skin texture, original hairstyle, calm closed-mouth expression, direct front view.
RIGHT HALF: EXACT SAME woman as left, matching age, skin tone, face shape, eye shape and size, nose, pose, camera angle, expression, shirt, soft lighting and head scale. Only cosmetics and hairstyle have changed: softly defined longer eyebrow tails, refined warm brown eye makeup with fine brown eyeliner, realistic rosy-brown lipstick, soft natural blush and light even base makeup retaining pores, more voluminous polished hair in the same length, delicate gold pendant necklace. Match the intended changes visible in BOTTOM ROW of the same reference column. Give visible attainable makeup changes and polished hair, NOT identity change, skin lightening, face reshaping or age reduction. Preserve photographic detail at high resolution for a beauty report's zoomed eye/lip crops and a 1080-wide export poster. Photorealistic studio photography.
```


- 生成模式：内建 image_gen（新图生成，无输入参考图），未使用 CLI/API 回退。
- 肖像：`public/assets/beauty-portraits-v2.png`，实际输出 1717 × 916 像素，5 列 × 2 行。上行为原始日常状态，下行为同列同人的妆发优化。按每列宽度 1/5、每行高度 1/2 等比例裁切。工具未按提示词给出 3840 × 2048，但输出保持了相同画布比例及所需分格。人工检查了五列、两行及同列身份、姿态与服装一致性。
- 产品：`public/assets/beauty-products-v2.png`，1536 × 1024 像素，3 列 × 2 行。上排为眉笔、四色眼影、气垫；下排为口红、蓬松喷雾、项链。无品牌文字。人工检查了六个单品与独立分格。
- 原文件保留于 `/Users/lunewang/.codex/generated_images/01a0f1f2-4953-76d2-9617-63b5d62ef5a8/`。
- 肖像均为虚构成年人物；用于原型中预设场景。照片未按真实人物的美丑做评级。

## 肖像最终提示词

```text
Use case: photorealistic-natural
Asset type: high quality sprite atlas for a private makeup and hairstyle makeover prototype.
Create ONE contact sheet precisely five equal columns and two equal rows, edge-to-edge cells with absolutely NO gaps, margins, dividing borders, captions, letters, numbers or watermarks. Canvas target 3840x2048 pixels, every cell portrait format 768x1024. The left-to-right columns are five DIFFERENT fictional adult East Asian women aged 25-40. All five are naturally appealing individual people, not ratings or beauty stereotypes. The top row shows each person before styling, a natural daily face, with true skin texture, natural pores, understated clothing and pleasant relaxed closed-mouth expression. Five hair styles left to right: long dark loose hair; chin length dark bob; medium wavy dark brown hair; shoulder length straight dark brown hair; long black straight hair. Each panel is an identical straight-on head-and-upper-chest studio portrait, face fully visible, no hands, top of head fully visible, centered; eye line and nose line at consistent positions in every panel. Plain very pale warm-gray seamless background across all ten panels, soft frontal studio lighting, realistic color.
The bottom row is each EXACT SAME WOMAN as the top cell in that column, with identical identity, face shape, age, skin color, expression, pose, lighting, camera angle, head scale and same shirt. Bottom row makeover consists ONLY of visible polished natural cosmetics and hairstyle styling: gentle defined eyebrows with longer tails, tasteful brown eye shadow and fine brown eyeliner, rosy natural lipstick with softly defined lip edge, light even base makeup and subtle blush while retaining real skin texture, more voluminous styled hair preserving length, a thin minimal gold pendant necklace. Make the before/after changes visibly appreciable but attainable and unmistakably the same people. Never slim or reshape the face, never alter eye size or nose shape, never lighten skin or make people younger. All ten portrait crops must fit exactly in a rigid 5-by-2 grid. Photography, not illustration. No overlapping subjects, no props, no collage ornaments, no text.
```

## 产品最终提示词

```text
Use case: product-mockup
Asset type: six-item high-end e-commerce product photography sprite atlas for makeup prototype.
Create ONE image precisely three equal columns by two equal rows; six perfectly square independent cells on a landscape 1536x1024 canvas. Edge-to-edge cells, absolutely no gaps or outer margin, no visible grid lines. Each cell contains a SINGLE complete premium cosmetic or accessory product centered with generous clear space around its edges, never extending into another cell. Shared matte light champagne-beige background, subtle studio shadows, luxury editorial product lighting, photorealistic material quality.
Top row from left to right: (1) slim warm taupe-brown eyebrow pencil with matching cap positioned beside it, both entirely within same cell, no logo; (2) open square compact showing exactly four warm brown eye shadow shades, fine satin champagne case; (3) open ivory and pale-gold cushion foundation compact, round mirror and cushion visible, no text.
Bottom row from left to right: (4) open rose-brown lipstick in elegant gold and muted-mauve cylindrical case with lid beside it; (5) frosted pale champagne spray bottle with simple beige pump, styling volume spray; (6) a delicate thin gold chain necklace arranged in soft oval with small minimal oval pendant. Each item large enough for product detail view yet fully framed. Do not add humans, hands, face portraits, logos, letters, text, labels, numbers, watermarks, props, decorative typography or borders. No duplicate products. Exact 3x2 layout, six products only.
```
