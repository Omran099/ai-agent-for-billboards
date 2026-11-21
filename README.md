# AI Agent for Billboards

Agent بيستلم فكرة تصميم وقياسات، وبيطلّع تصاميم البيلبورد بكل القياسات، وبيحرّكهم (موشن) للشاشات الديجيتال.
مبني لبراند **Leaders**، وبيشتغل لأي براند تاني بإضافة مجلد `brand/<slug>/`.

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
- `brand/leaders/brand.json` + `assets/logo.png` و`logo-white.png`: الهوية الرسمية (هلق في قيم مؤقتة).
- `config/sizes.json`: القياسات الحقيقية.
