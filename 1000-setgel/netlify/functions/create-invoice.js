import { db, json, AMOUNT } from "../lib/db.js";
import { createInvoice } from "../lib/qpay.js";

const clean = (s, max) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, max);

export default async (req) => {
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  let body = {};
  try { body = await req.json(); } catch {}
  const name = clean(body.name, 40);
  const message = clean(body.message, 60);

  // 1) Хандивыг "pending" төлөвтэй бүртгэнэ
  const { data: d, error } = await db
    .from("donations")
    .insert({ name, message, amount: AMOUNT, method: "qpay", status: "pending" })
    .select("id")
    .single();
  if (error) return json({ error: "Бүртгэл үүсгэж чадсангүй" }, 500);

  // 2) QPay нэхэмжлэх үүсгэнэ
  try {
    const site = (process.env.SITE_URL || "").replace(/\/$/, "");
    const callbackUrl = `${site}/api/qpay-callback?id=${d.id}&key=${encodeURIComponent(process.env.CALLBACK_SECRET)}`;
    const inv = await createInvoice({
      senderInvoiceNo: d.id,
      amount: AMOUNT,
      description: "1000 СЭТГЭЛ хандив",
      callbackUrl,
    });

    await db.from("donations").update({ qpay_invoice_id: inv.invoice_id }).eq("id", d.id);

    return json({
      id: d.id,
      amount: AMOUNT,
      qr_image: inv.qr_image,          // base64 PNG
      short_url: inv.qPay_shortUrl,
      urls: (inv.urls || []).map((u) => ({ name: u.name, description: u.description, logo: u.logo, link: u.link })),
    });
  } catch (e) {
    console.error(e);
    await db.from("donations").update({ status: "expired" }).eq("id", d.id);
    return json({ error: "QPay нэхэмжлэх үүсгэж чадсангүй. Дахин оролдоно уу." }, 502);
  }
};

export const config = { path: "/api/create-invoice" };
