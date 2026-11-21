# AI Agent for Billboards

Agent بيستلم فكرة تصميم وقياسات، وبيطلّع تصاميم البيلبورد بكل القياسات، وبيحرّكهم (موشن) للشاشات الديجيتال.
مبني لـ **Leaders** (الموزّع) وكل البراندات اللي وكيلة عليها. كل براند إلها مجلد `brands/<slug>/` فيه شاشاتها، والبوليسي، واللوغوهات، والتسلسل.

البراندات الموجودة: `dark-blue` (تجربة أولى، القيم لسا مؤقتة).

## كيف بيشتغل
1. **Key visual** بالـ AI (Higgsfield): صورة بدون أي نص.
2. **Layout engine** (`engine/`): بيحط النص العربي واللوغو والـ CTA بخطوط البراند على كل قياس، وبيرتّب العناصر حسب شكل القياس (ultrawide / wide / square / portrait).
3. **Motion** (`motion/`): بيحرّك اللوغو والنص وبيعمل zoom على الصورة. أو بيركّب النص فوق فيديو مولّد بالـ AI. التسليم MP4.
4. **After Effects** (`ae/`): المرحلة الجاية، قوالب AE ورندر تلقائي عن طريق nexrender.

## تشغيل
```bash
npm install
npm run render -- briefs/example.json            # كل القياسات PNG
npm run motion -- briefs/example.json            # فيديوهات للشاشات الديجيتال
npm run render -- briefs/example.json --sizes BB_12x4m,LED_1920x1080
```
النتائج بتنحفظ بـ `output/<brand>_<campaign>/`.

## شو لازم نعبّي
- `brands/leaders/`: لوغو ليدرز الرسمي.
- `brands/dark-blue/`: اللوغوهات، صور المنتجات، الشاشات، البوليسي، والتسلسل.
