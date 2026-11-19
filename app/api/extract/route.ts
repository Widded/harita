import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PROMPT = `Fotoğraftaki koordinat tablosunu oku. Sadece İTRF sütunlarını kullan:
Y değeri yaklaşık 400000 (300000-500000), X değeri yaklaşık 4500000 (4000000-4700000) aralığındadır.
İMAR sütunlarını yok say.
Her satır için nokta numarasını (örn. "1", "27", "P.4779") ve İTRF Y, X değerlerini 2 ondalıkla al.
Yalnızca şu biçimde JSON döndür: {"rows":[{"no":"1","y":404661.38,"x":4545929.42}]}
Okuyamadığın satırı atla.`;

export async function POST(req: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GROQ_API_KEY tanımlı değil (.env.local veya Vercel ortam değişkenleri)." },
      { status: 500 },
    );
  }

  const form = await req.formData();
  const image = form.get("image");
  if (!(image instanceof File)) {
    return NextResponse.json({ error: "Görsel bulunamadı." }, { status: 400 });
  }

  const data = Buffer.from(await image.arrayBuffer()).toString("base64");
  const model = process.env.GROQ_MODEL ?? "qwen/qwen3.8-27b";

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: `data:${image.type || "image/jpeg"};base64,${data}` } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300);
    if (res.status === 429) {
      return NextResponse.json(
        { error: "Groq dakikalık sınırı aşıldı (ücretsiz planda ~3 fotoğraf/dk). Biraz bekleyip tekrar deneyin." },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: `Groq hatası (${res.status}): ${detail}` }, { status: 502 });
  }

  const json = await res.json();
  const text: string = json.choices?.[0]?.message?.content ?? "";

  let parsed: { rows?: unknown };
  try {
    parsed = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { error: "Görseldeki tablo okunamadı, daha net bir fotoğraf deneyin." },
      { status: 422 },
    );
  }

  const rows = Array.isArray(parsed.rows) ? parsed.rows : [];
  return NextResponse.json({ rows });
}
