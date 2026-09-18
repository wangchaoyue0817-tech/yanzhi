# Design QA — 图灵鉴X

**Comparison target**
- Approved direction: latest single-row slender-card mock, exec-0f95e188-361b-4a6d-be83-386852bfd150.png (853 × 1844).
- User corrections supersede image: exactly five visible categories, three compact question rows, retain original expert page.
- Browser implementation: http://127.0.0.1:8796/, Codex in-app browser, 390 × 844 CSS viewport. Reference and implementation emitted together in the final visual comparison tool result. Reference has the same portrait ratio; visually normalized to phone width. UI capture at 1x, reference approx 2.19x.
- Also checked 320 × 667 and desktop framed layout. On short screens content scrolls vertically; composer stays visible. No horizontal page overflow.

**Findings and repairs**
- [P1, fixed] WELCOME gradient initially appeared as a rectangular fill because CSS background shorthand reset clipping. Restored text clipping explicitly. Verified with final screenshot and computed background-clip: text.
- [P2, fixed] Source SVG viewBoxes included excess inset; increased icon container optical size so category visuals are readable.
- [P2, fixed] Restored original expert navigation metrics/background and original expert content. Script comparison confirms expert HTML identical; original stylesheet preserved verbatim.
- [P3] Category icons intentionally reuse supplied original SVGs, rather than the generated mock's dimensional icon approximations. Banner uses generated raster artwork. No placeholder artwork.

**Fidelity surfaces**
- Typography: PingFang/system sans serif, compact labels; gold/lilac welcome gradient preserved. Less promotional, more compact hierarchy than image, following request for breathing space.
- Spacing/layout: one row of five narrow cards, shallow arc; central focus, side cards at lower scale; banner below; three question rows; persistent composer. No two-row card grid.
- Colors/tokens: #050810 deep navy, #8B5CF6 and #C9A0FF violet family, #F5C542 gold. Dimmed rims and glow intentionally reduce density.
- Assets: original supplied category SVGs; generated optical ring banner present, sharp and correctly cropped. No external runtime/CDN dependency.
- Copy: no '探索鉴定技能', '全部技能', or '你还可以这样问' headings; full list available via original '开启技能'. Banner copy is illustrative. Demo response explicitly states no actual AI/order integration.

**Interaction verification**
- Manually advanced 20 times through the browser: all 20 distinct skills visited, wrapping to start; five card faces exposed at any time.
- Card selection visibly marks selected skill and updates composer capsule; clear control works.
- All-skills popup displays 20 original items and closes correctly.
- Banner pagination tested through first and third pages; current accessible slide updates.
- Consultation input/send tested; user message and honest demo response render.
- Local image picker tested using banner artwork; thumbnail appears and removal works. No image transmitted.
- Expert tab switched and visually inspected; original content and agreement retained.
- Pause/resume control and reduced-motion behavior implemented. Swipe uses pointer distance threshold to avoid accidental selection.
- Console error/warning logs checked: empty.
- Original expert markup SHA256: ec1e3ff76ee4314245febd807bece5e8662129cf19a746912904ab88f61e9603.

**Limits**
Browser viewport testing is not a physical WeChat-device test. This is a static hosted webpage demo, not a deployed WeChat mini-program. Real AI appraisal, billing, and expert order flows are out of scope.

final result: passed
