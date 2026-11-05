import { createClient } from "@supabase/supabase-js";

export const AMOUNT = Number(process.env.DONATION_AMOUNT || 1000);

// service_role түлхүүр: RLS-ийг тойрно, тиймээс зөвхөн сервер талд ашиглана.
export const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

export const isUuid = (s) => typeof s === "string" && /^[0-9a-f-]{36}$/i.test(s);

export const clean = (s, max) =>
  String(s ?? "")
    .replace(/[\u0000-\u001f<>]/g, "")
    .trim()
    .slice(0, max);

export const clampCount = (n, max = 100) => Math.max(1, Math.min(max, parseInt(n, 10) || 1));
