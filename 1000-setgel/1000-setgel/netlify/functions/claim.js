import { db, json, clean, clampCount, isUuid, AMOUNT } from "../lib/db.js";

// Хандивлагч "Шилжүүлсэн" гэж мэдэгдэнэ → админ баталгаажуулах жагсаалтад орно.
//   POST { name, message, count }  → { id }
//   GET  ?id=...                   → { status }   (хандивлагчийн утас баталгаажсан эсэхийг асууна)
export default async (req) => {
  if (req.method === "GET") {
    const id = new URL(req.url).searchParams.get("id");
    if (!isUuid(id)) return json({ error: "id буруу" }, 400);
    const { data } = await db.from("donations").select("status").eq("id", id).maybeSingle();
    return json({ status: data?.status || "not_found" });
  }

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body = {};
  try { body = await req.json(); } catch {}
  if (body.website) return json({ id: null }); // honeypot: робот бөглөдөг далд талбар

  const name = clean(body.name, 40);
  const message = clean(body.message, 60);
  const count = clampCount(body.count, 20);
  if (!name) return json({ error: "Нэрээ оруулна уу" }, 400);

  const { data, error } = await db
    .from("donations")
    .insert({ name, message, amount: AMOUNT * count, method: "bank", status: "pending" })
    .select("id")
    .single();
  if (error) return json({ error: "Хадгалж чадсангүй. Дахин оролдоно уу." }, 500);
  return json({ id: data.id });
};

export const config = { path: "/api/claim" };
