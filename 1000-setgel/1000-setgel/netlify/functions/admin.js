import { db, json, clean, clampCount, isUuid, AMOUNT } from "../lib/db.js";
import { timingSafeEqual } from "node:crypto";

function authorized(req) {
  const given = Buffer.from(req.headers.get("x-admin-key") || "");
  const real = Buffer.from(process.env.ADMIN_PASSWORD || "");
  return real.length > 0 && given.length === real.length && timingSafeEqual(given, real);
}

export default async (req) => {
  if (!authorized(req)) return json({ error: "Нууц үг буруу" }, 401);

  // Жагсаалт + статистик
  if (req.method === "GET") {
    const { data, error } = await db
      .from("donations")
      .select("id,created_at,paid_at,name,message,amount,method,status")
      .order("created_at", { ascending: false })
      .limit(3000);
    if (error) return json({ error: error.message }, 500);
    const { data: stats } = await db.rpc("get_stats");
    return json({ rows: data, stats: stats?.[0] || { hearts: 0, supporters: 0 } });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let b = {};
  try { b = await req.json(); } catch {}

  // 1) Хандивлагчийн мэдэгдлийг баталгаажуулах (банкны апп-аас мөнгө орсныг харсны дараа)
  if (b.action === "confirm") {
    if (!isUuid(b.id)) return json({ error: "id буруу" }, 400);
    const patch = { status: "paid", paid_at: new Date().toISOString() };
    if (b.count) patch.amount = AMOUNT * clampCount(b.count);
    const { data, error } = await db
      .from("donations").update(patch).eq("id", b.id).eq("status", "pending").select("id");
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, changed: data.length }); // changed=0 → аль хэдийн баталгаажсан
  }

  // 2) Мөнгө ороогүй/хуурамч мэдэгдлийг цуцлах
  if (b.action === "reject") {
    if (!isUuid(b.id)) return json({ error: "id буруу" }, 400);
    const { error } = await db.from("donations").update({ status: "expired" }).eq("id", b.id).eq("status", "pending");
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  }

  // 3) Мэдэгдэлгүйгээр орсон гүйлгээг шууд нэмэх
  if (b.action === "add") {
    const name = clean(b.name, 40);
    if (!name) return json({ error: "Нэр эсвэл гүйлгээний утга оруулна уу" }, 400);
    const { data, error } = await db
      .from("donations")
      .insert({
        name, message: clean(b.note, 60), amount: AMOUNT * clampCount(b.count),
        method: "bank", status: "paid", paid_at: new Date().toISOString(),
      })
      .select("id").single();
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true, id: data.id });
  }

  return json({ error: "Үйлдэл буруу" }, 400);
};

export const config = { path: "/api/admin" };
