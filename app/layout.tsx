import "./globals.css";

export const metadata = {
  title: "Kontrol Ölçü Çizelgesi",
  description: "Koordinat tablosundan poligon ve detay noktaları kontrol ölçü çizelgesi üretir.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
