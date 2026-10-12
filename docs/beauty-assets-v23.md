# 鉴颜值 v23 配饰佩戴特写

生成方式：内置 `image_gen`，分别生成两张图片。未使用 CLI 或 Python 修改图像；生成后原样复制进工程。

## 最终素材

| 文件 | 尺寸 | 内容与对应商品 |
| --- | --- | --- |
| `public/assets/beauty-earring-detail-v23.png` | 1448 × 1086（4:3） | 成人耳部局部，白色小圆珍珠、香槟金耳钉，匹配 `earrings` 商品 |
| `public/assets/beauty-necklace-detail-v23.png` | 1448 × 1086（4:3） | 成人颈部与锁骨局部，白色小圆珍珠吊坠、香槟金细链，匹配 `style` 商品 |

设计用途：在配饰区域左右并列展示两个横向卡片，取代高大的整张人像。两图均不包含眼睛、鼻子、嘴巴、下巴等面部特征，无文字、品牌、水印或边框。已查看生成结果，耳钉与项链均清晰可见，珠宝形态与现有 `beauty-products-v22.png` 最后一行商品一致。

## 最终提示词：耳钉

```text
Use case: photorealistic-natural. Asset type: a landscape 4:3 accessory wearing-detail photo for a compact luxury beauty UI card, displayed around 160 by 120 px. Create one polished natural editorial jewelry photograph, not a collage. Subject: a small round ivory-white pearl stud earring with a subtle champagne-gold setting, worn in one adult woman's ear. Frame an extreme close-up of only the ear, the pearl stud, a little dark brown hair tucked behind the ear, and a tiny amount of neck behind the ear. The pearl stud should be prominent and crisp, around 7 mm apparent real-world size, simple spherical white pearl, no stones, no dangling element. Composition: ear and pearl elegantly centered, horizontal 4:3. Absolutely no face: do not show eyes, nose, lips, mouth, cheek, chin, jawline, or facial profile at any edge. Choose a rear-side ear angle and tight crop so the face is entirely outside the frame. Skin texture should remain natural with refined soft light. Soft warm gray/greige neutral studio background where visible, restrained cream/champagne palette, subtle pearl luster and delicate gold reflections. No text, label, border, watermark, extra jewelry or accessories. This is a worn product photograph; keep focus and visual hierarchy on the earring.
```

## 最终提示词：项链

```text
Use case: photorealistic-natural. Asset type: landscape 4:3 jewelry wearing-detail photo for a compact luxury beauty UI card, displayed at about 160 by 120 px. Create one natural editorial product photograph, not a collage. Subject: a fine champagne-gold cable-chain necklace worn on an adult woman's neck and collarbones, with a single small round ivory-white pearl pendant attached with a minimal simple polished gold bail. Pearl apparent real-world diameter about 7 mm, simple pearl sphere, no diamonds, no other charms, no extra necklaces. Necklace is the exact focal subject. Composition: horizontal 4:3 close-up from just below the base of the neck to the upper chest, enough of the delicate chain visible on both sides to form an elegant centered shallow V and show how the pendant sits beneath the collarbone. Crop strictly below the chin: do not show any chin, jawline, lips, nose, eyes, ears, face or facial features. Only neck base, collarbones, pearl necklace and a subtle off-white neckline at bottom edge if necessary. Match refined cream, warm-gray and champagne tones, natural light-medium skin texture, soft flattering studio window light, restrained luminous pearl highlight and gold reflections. Clean beauty editorial photography, realistic skin and fine chain details, shallow depth of field but keep whole necklace legible. Background where visible warm pale greige. No text, logo, label, border or watermark. The composition must remain clear when small.
```

## 生成来源

- 耳钉：`/Users/lunewang/.codex/generated_images/01a12f09-4a40-7f51-b163-ebc29f923e84/exec-b941f68b-fcac-457e-a322-d33c755c290f.png`
- 项链：`/Users/lunewang/.codex/generated_images/01a12f09-4a40-7f51-b163-ebc29f923e84/exec-83b2a8df-e3d4-4810-8a9d-109ffe6b98b2.png`
