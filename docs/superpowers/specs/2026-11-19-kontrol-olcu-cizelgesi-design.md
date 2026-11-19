# Kontrol Ölçü Çizelgesi Üretici — Tasarım

Tarih: 2026-11-19

## Amaç ve neden

İfraz/tevhid işlerinde koordinat tablosundan (1. belge) "Poligon ve Detay Noktaları
Kontrol Ölçü Çizelgesi" (2. belge) elle hazırlanıyor. Her işte onlarca koordinat
elle kopyalanıyor, +0.01 farklar tek tek yazılıyor, toplam alınıyor. Yavaş ve hata
riski yüksek.

Site bunu saniyeler içinde üretsin: tablo yapıştır veya fotoğraf yükle → çizelge
hazır → Excel indir / kopyala.

## Kim için

Harita–kadastro işi yapan tek kullanıcı. Masaüstünde ve telefonda kullanılacak.

## Başarı ölçütü

Kullanıcı 1. belgedeki tabloyu verir, 10 saniye içinde 2. belgedeki çizelgeyi
(aynı değerlerle) alır. Koordinatta tek hane hatası olmadan.

## Girdi

**Görsel** (telefon fotoğrafı / ekran görüntüsü): kullanıcı fotoğrafta tablo kısmını
seçip kırpar (ve gerekirse 90° döndürür).

Okuma **tarayıcıda Tesseract.js (OCR)** ile yapılır: kırpım 2 kat büyütülür, OCR
metninden nokta no + İTRF Y/X üçlüsü çıkarılır (Y 6 hane, X 7 hane). Ondalığı
düşmüş değer onarılır ve satır şüpheli işaretlenir. Kullanıcı isterse "AI ile tekrar
oku" ile aynı görsel sunucuda Groq `qwen/qwen3.8-27b` ile okutulur ve satırlar
değiştirilir.

Okunan satırlar **düzenlenebilir tabloda** gösterilir. Kullanıcı gözle kontrol edip
"Hesapla" der; hesap ondan sonra yapılır.

> Tablo yapıştırma yolu kullanıcı isteğiyle kaldırıldı (2026-11-19).

## Dönüşüm kuralı

- Sıra: P noktaları önce, sonra normal (sayı) noktalar; her grup kendi içinde
  girdi sırasını korur.
- İlk **P** ile başlayan nokta **durulan nokta**dır. Durulan nokta **ilk satır
  olarak da yazılır** (2. görselde P.4779 ilk satır; fotoğrafta kesilmiş) ve
  `DUR. NOK` sütununda gösterilir. Diğer satırlar `BAK. NOK` sütunundadır.
- Kalan P noktaları satır olarak yazılır.
- P tanımı: numarası `P` ile başlayan her nokta (`P.4779`, `P4779`, `p.4779`).
  Girdide P noktası yoksa DUR. NOKTA satırı çıkmaz, kullanıcı uyarılır.
- `KONTROL Y/X` = İTRF değeri aynen, 2 hane.
- `YÜK. Y/X` = İTRF + 0.01.
- `FARK Y/X` = YÜK − KONTROL = 0.01.
- En altta `TOPLAM FARK Y` ve `TOPLAM FARK X` = satır sayısı × 0.01
  (nokta sayısı değişken; sabit değer yok).
- Hesaplar **santimetre cinsinden tam sayı** ile yapılır (değer × 100),
  kayan nokta hatası olmasın. Girdi 3 ondalıklı gelirse en yakın cm'e yuvarlanır
  ve tablo uyarı gösterir.

## Okuma kararları

- Fazla sütunlar (yükseklik H vb.) yok sayılır; yalnızca İTRF Y/X ve nokta no alınır.
- Görsel okumada nokta numarası da döner; kullanıcı tabloda satır ekleyip
  silebilir (model bir satırı atlarsa elle tamamlanır).
- Kopyala: sekme ayraçlı, ondalık nokta (`404661.38`). Türkçe Excel'de bu değerler
  metin olarak gelebilir; asıl yol Excel indirme.

## Çıktı

2. görseldeki formun tamamı üretilir (Excel'e basılmaya hazır düzen):

**Başlık:** "POLİGON VE DETAY NOKTALARI / KONTROL ÖLÇÜ VE HESAP ÇİZELGESİ",
sol üstte "Tapu ve Kadastro Genel Müdürlüğü" alanı.

**Sütunlar (soldan sağa, başlıklar formdaki gibi):**
P. NO · DUR. NOK · BAK. NOK · YATAY AÇI · DÜŞEY AÇI · İNDRG. KENAR ·
KONTROL Y (m) · Yük. Y · KONTROL X (m) · Yük. X · YÜKSEKLİK H (cm) ·
Yük. H (cm) · FARKLAR Y · FARKLAR X · FARKLAR H

Doldurulanlar: P. NO, DUR. NOK (durulan nokta, her satırda), BAK. NOK,
KONTROL Y/X, Yük. Y/X, FARKLAR Y/X. Boş bırakılanlar (kaynakta yok): yatay/düşey
açı, indirgenmiş kenar, yükseklik H, Yük. H, FARKLAR H — kullanıcı gerekirse
Excel'de elle doldurur.

**Alt bölüm:** FARKLAR toplam satırı (0.10) · ORTALAMA FARKLAR (δy.δx, δs) ·
HATA SINIRI (δy.δx: Max±10cm, Max±15cm; δs: +7cm, +10cm) · KONTROL MÜHENDİSİ
(İSİM / TARİH / İMZA) · YÜKLENİCİ · POLİGON · DETAY · "Yük: hesaplanmış olan
değeri ifade eder." notu. İsim/imza alanları boş bırakılır (elle imzalanır).

- Ekranda aynı tablo + **Kopyala** (panoya TSV; Excel'e direkt yapışır).
- **Excel indir** → tek sayfa `.xlsx`, birleştirilmiş başlık hücreleri, sütun
  genişlikleri, 2 ondalık gerçek sayılar.

## Kapsam dışı (bilinçli)

- PDF / yazdırma ayarı, imza ve hata sınırı **değerlerinin** otomatik doldurulması
  (hata sınırı metni formda sabit yazılı olarak durur).
- İMAR → İTRF dönüşümü (İTRF baz alınıyor).
- Kullanıcı hesabı / giriş, geçmiş kayıt listesi.

## Yaklaşımlar

- **A) Tek HTML dosyası:** kurulum yok ama fotoğraf için API anahtarı tarayıcıda
  açığa çıkar. Elendi.
- **C) Excel makrosu (VBA):** hızlı ama fotoğraf ve telefon yok, site değil. Elendi.
- **B) Küçük Next.js uygulaması:** tek sayfa + tek API route. Fotoğrafı sunucu
  okur, anahtar sunucuda kalır. Vercel'e deploy edilir, telefondan açılır.
  **Seçildi.**

## Teknik kararlar (yapımcının kararı)

- Next.js (App Router, TypeScript), tek sayfa, tek API route: `POST /api/extract`.
- Görsel okuma: Groq `qwen/qwen3.8-27b`, anahtar `GROQ_API_KEY` ortam
  değişkeninde, model adı `GROQ_MODEL` ile değiştirilebilir. Ekstra SDK yok,
  OpenAI uyumlu REST çağrısı. Görsel istemcide kırpılır/döndürülür.
- Excel: tarayıcıda SheetJS ile üretilir (sunucuda dosya yok).
- Kopyalama: `navigator.clipboard` ile TSV.
- Hesap istemcide; sunucu yalnızca görsel okur.
- Doğrulama: her satırda nokta no dolu, Y ve X sayı olmalı. Olmayan/şüpheli satır
  tabloda işaretlenir, "Onayla" o satır düzeltilmeden çalışmaz.
- Barındırma: Vercel. Giriş koruması yok (tek kullanıcı); paylaşılacaksa sonra
  basit şifre eklenir.

## Kabul kriterleri

1. `1.jpeg` yüklenip tablo kısmı kırpılınca `2.jpeg`'deki formla aynı yapıda
   10 satırlı çizelge çıkar; tüm farklar 0.01, toplam 0.10; P.4779 ilk satırda ve
   DUR. NOK sütununda.
2. Kırpılmış görselden okunan satırlar 1.jpeg ile aynı (gerekirse elle düzeltilir).
3. Excel dosyası Excel'de açılır; sayılar sayı olarak, 2 ondalık görünür; sütun ve
   alt bölüm düzeni 2. görselle uyumlu.
4. Sonuç tablosu kopyalanıp Excel'e yapıştırıldığında hücreler sütunlara oturur.
5. Telefon tarayıcısında kullanılabilir.

## Test malzemesi

`1.jpeg` ve `2.jpeg` proje kökünde; okuma ve hesap testleri bunlarla yapılır.

## Yapımcıya bırakılanlar

- Dosya/bileşen düzeni, stil, dil tonu (arayüz Türkçe).
- Kırpma arayüzünün ayrıntısı, vision promptu ve model adı.
- Testler: hesap fonksiyonu için birim test (fark, toplam, durulan nokta ayrımı,
  cm yuvarlama).
