import { db, json, AMOUNT } from "../lib/db.js";
import { timingSafeEqual } from "node:crypto";

function authorized(req) {
  const given = Buffer.from(req.headers.get("x-admin-key") || "");
  const real = Buffer.from(process.env.ADMIN_PASSWORD || "");
  return real.length > 0 && given.length === real.length && timingSafeEqual(given, real);
}

export default async (req) => {
  if (!authorized(req)) return json({ error: "Нууц үг буруу" }, 401);
  const url = new URL(req.url);

  // Жагсаалт + статистик
  if (req.method === "GET") {
    const status = url.searchParams.get("status");
    let q = db
      .from("donations")
      .select("id,created_at,paid_at,name,message,amount,method,status,qpay_invoice_id,qpay_payment_id")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (["pending", "paid", "expired"].includes(status)) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 500);

    const { data: stats } = await db.rpc("get_stats");
    return json({ rows: data, stats: stats?.[0] || { hearts: 0, supporters: 0 } });
  }

  // Дансаар орсон хандивыг гараар нэмэх
  if (req.method === "POST") {
    let body = {};
    try { body = await req.json(); } catch {}
    const name = String(body.name || "").trim().slice(0, 40);
    const count = Math.max(1, Math.min(100, parseInt(body.count, 10) || 1));
    const note = String(body.note || "").trim().slice(0, 60);
    if (!name) return json({ error: "Нэр эсвэл гүйлгээний утга оруулна уу" }, 400);

    const { data, error } = await db
      .from("donations")
      .insert({
        name,
        message: note,
        amount: AMOUNT * count,
        method: "bank",
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, id: data.id });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = { path: "/api/admin" };
