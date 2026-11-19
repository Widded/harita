# Kontrol Ölçü Çizelgesi

Kadastro/ifraz koordinat tablosundan (İTRF) "Poligon ve Detay Noktaları Kontrol Ölçü ve Hesap Çizelgesi" üretir.

- **Girdi:** fotoğraf (önce tarayıcıda Tesseract OCR, şüpheli/eksik okumada Groq `qwen/qwen3.8-27b` yedeği)
  - Fotoğrafta tablo kısmını seçip kırpabilir, yan çekilmiş fotoğrafları döndürebilirsin; kırpma okuma doğruluğunu belirgin artırıyor.
- **Kural:** İlk P noktası durulan nokta; Kontrol = İTRF, Yük = İTRF + 0.01, Fark = 0.01, toplam = satır sayısı × 0.01
- **Çıktı:** ekranda form + Kopyala (TSV) + Excel indir (.xlsx)

## Çalıştırma

```bash
npm install
copy .env.example .env.local   # GROQ_API_KEY doldur
npm run dev                    # http://localhost:3000
```

Fotoğraf okuma tarayıcıda OCR ile çalışır; AI anahtarı gerekmez. "AI ile tekrar oku"
butonu Groq kullanır ve `GROQ_API_KEY` ister.
Ücretsiz Groq planı dakikada ~3 fotoğraf okur (görsel başına ~2000 girdi token'ı).
İlk OCR çalışmasında tarayıcı ~15 MB model indirir (sonra önbellekten okur).

## Test

```bash
npm test
```

## Yayın (Netlify)

Canlı: https://kadastro-harita.netlify.app

`main`'e push → GitHub Actions build alır ve Netlify'a deploy eder
(`.github/workflows/netlify.yml`). Gerekli secret'lar: `NETLIFY_AUTH_TOKEN`,
`NETLIFY_SITE_ID`. Ortam değişkeni: `GROQ_API_KEY`.

## Notlar

- Hesaplar santimetre cinsinden tam sayı ile yapılır.
- Yatay/düşey açı, indirgenmiş kenar ve yükseklik sütunları kaynakta olmadığı için boş kalır.
- Fotoğraftan okuma %100 doğru değildir; okunan satırlar onaydan önce elle düzeltilebilir.
