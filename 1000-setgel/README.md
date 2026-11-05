# 1000 СЭТГЭЛ — LIVE хандивын систем

ШУТИС ДаТС-ийн Оюутны зөвлөлд зориулсан, Урлагийн их наадмын хандивын систем.
Хандив орж ирэх бүрд LIVE дэлгэц дээр нэг зүрх нэмэгдэнэ.

```
Оюутан /donate → QPay QR-аар 1,000₮ төлнө
        → QPay callback  ─┐
        → утас 3с тутам   ├→ сервер QPay-ээс төлбөрийг ДАХИН шалгана
                          ┘   → Supabase: donations.status = 'paid' (нэг удаа)
                              → trigger → supporters мөр нэмнэ
                              → Realtime → LIVE дэлгэц +1 ❤
```

## Хуудсууд

| Хаяг | Юу вэ |
|---|---|
| `/` | LIVE дэлгэц (проектор). Neon тоолуур, 1000 зүрх, QR, сүүлийн дэмжигчид |
| `/donate` | Оюутны утсан дээрх хандивын хуудас (QPay + дансны мэдээлэл) |
| `/admin` | Жагсаалт, тайлан, CSV, дансаар орсон хандивыг гараар нэмэх |

## Файлын бүтэц

```
public/            вэб хуудсууд (index, donate, admin, style.css, config.js, logo.png)
netlify/functions/ сервер функцууд (create-invoice, qpay-callback, check-payment, admin)
netlify/lib/       QPay ба Supabase туслах код
supabase/schema.sql өгөгдлийн сангийн схем
```

## Суулгах алхам

### 1. QPay merchant эрх
QPay-тэй гэрээ байгуулж **username, password, invoice_code** авна.
Эхлээд sandbox (`https://merchant-sandbox.qpay.mn`) дээр туршина.
QPay-ээс өгсөн API баримт бичигтэй `netlify/lib/qpay.js`-ийн endpoint, талбаруудыг заавал тулгаж шалгаарай.

### 2. Supabase
1. supabase.com дээр шинэ төсөл үүсгэнэ.
2. **SQL Editor** → `supabase/schema.sql`-ийг бүтнээр нь хуулж ажиллуулна.
3. **Project Settings → API**-аас `Project URL`, `anon` key, `service_role` key-г авна.

### 3. Тохиргоо
`public/config.js`-д **зөвхөн** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `DONATE_URL`-г бичнэ.
(`service_role` түлхүүрийг энд хэзээ ч бүү тавь.)

### 4. Netlify
1. Энэ хавтсыг GitHub руу оруулаад Netlify дээр **Add new site → Import** хийнэ
   (эсвэл `npm i` → `npx netlify deploy --prod`).
2. **Site configuration → Environment variables**-д `.env.example`-ийн бүх утгыг оруулна.
   `SITE_URL`-д Netlify-ийн өгсөн хаягийг (жишээ `https://1000setgel.netlify.app`) бичнэ.
3. Дахин deploy хийнэ.

### 5. Турших
1. `/donate` нээж sandbox дээр 1,000₮ төлнө.
2. `/` LIVE дэлгэц дээр +1 ❤ гарч байгааг шалгана.
3. `/admin`-д нууц үгээрээ орж бүртгэлийг харна.

Локал дээр: `npm i` → `.env.example`-ийг `.env` болгон хуулж бөглөөд → `npm run dev`.
(QPay callback локал хаяг руу ирэхгүй тул утасны 3 секундын шалгалт ажиллана.)

## Аюулгүй байдал

- Callback-д **итгэхгүй**: сервер QPay-ээс өөрөөс нь `payment/check` хийж баталгаажуулна.
- Нэг төлбөр 2 удаа тоологдохгүй: `status<>'paid'` нөхцөлтэй update + `qpay_payment_id UNIQUE` + `supporters.donation_id UNIQUE`.
- `donations` хүснэгтийг гаднаас уншиж болохгүй (RLS). LIVE дэлгэц зөвхөн `supporters` (нэр, мэндчилгээ)-ийг уншина.
- Дэлгэц дээр нэр нууцлагдана: `Э.Оюун` → `Оюу-Э**`.
- Админ API нууц үгээр хамгаалагдсан. Хүчтэй нууц үг тавиарай.

## Дансаар орсон хандив
Банкны шилжүүлэг автоматаар илрэхгүй. Админ банкны хуулгаас **"1000 СЭТГЭЛ"** утгатай гүйлгээг шалгаад
`/admin` → "Дансаар орсон гүйлгээ нэмэх" хэсгээр нэмнэ (3,000₮ бол 3 гэж бичнэ → 3 зүрх).

## Зорилгын тоо, дүнг өөрчлөх
`public/config.js` → `GOAL`, `AMOUNT`; сервер талд `DONATION_AMOUNT` орчны хувьсагч.
