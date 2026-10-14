# Portfolio: ölçüye dayalı görsel analiz

15 Ekim 2026. İncelenen mevcut çalışma ağacı; önceki link/buton düzeltmeleri dahil.

## Kapsam ve kanıt

- Canlı tarayıcıda 5 sayfa × 7 hedef genişlik: /, /pgp, /rss, /donate, /404; 320, 375, 620, 621, 768, 1280, 1440 px. Bazı tarayıcı ölçümleri viewport ölçeklemesi nedeniyle 376/622/1441 CSS px olarak raporlandı; bunlar tam sayı breakpoint testi sayılmadı.
- Projenin mevcut 50 Playwright testi kurulu Chromium ile geçti. Bunlar light/dark erişilebilirlik, 320–1280 px geometri, ödeme durumları, arama ve kopyalama davranışlarını kapsıyor. Ödeme durumları sentetik; gerçek ödeme yapılmadı.
- İlk test çalıştırması beklenen Chromium 1248 bulunamadığı için başlamadı; CHROME_PATH ile mevcut Chromium 1243 kullanılarak başarılı çalıştırma yapıldı.
- Build başarılı. Bu analiz turunda ürün kodu değiştirilmedi.

## Bulgular

### 1. Küçük ekranda footer merkezi yanlış

320 px genişlikte TOR/I2P grubunun merkezi 172 px; sayfanın merkezi 160 px. Sapma +12 px.

Neden: `1fr auto 1fr` grid kenar sütunlarının otomatik minimumları eşit değil. Sol grup 92 px, orta grup 112 px, Donate yaklaşık 66 px. Kullanılabilir alan 280 px. Tam merkezli tek satır için gereken minimum:

`2 × max(92, 66) + 112 + 2 × 4 = 304 px`

304 > 280 olduğundan bu ölçülerle gerçek merkezleme ve taşmasız tek satır aynı anda sağlanamaz. Sadece `minmax(0,1fr)` yazmak çakışmayı çözmez.

Öneri: çok dar ekranda orta grubun ikonlarını orantılı küçültüp her hedefi 44 px genişliğinde tutmak; üç grubun arasındaki boşluğu 4 px yapmak. Orta grup 92 px olur: `184 + 92 + 8 = 284`. Bu nedenle grup içi boşluğu dar ekranda 0 px yaparak 88 + 88 + 8 = 272 px simetrik bütçe oluşturmak gerekir. İkon oranını `object-fit:contain` ile korumak. Daha geniş ekran mevcut optik ölçüleri kullanabilir.

### 2. Breakpoint aralığında gerçek hizalama hatası

Canlı tarayıcıda innerWidth 620 raporlanırken `(max-width:620px)` ve `(min-width:621px)` sorgularının ikisi de false döndü. Kesirli CSS viewport genişliği iki eşik arasında kalabiliyor.

Bu durumda header x=24 px, main x=20 px: 4 px fark. Tam 620 ve 621 px Playwright testleri bu aralığı yakalamıyor.

Öneri: tüm ana konteynerler için aynı taban ölçüsü ve aynı media query kullanmak. Tek eşik, örneğin tabanda 20 px kenar boşluğu, `min-width:621px` üzerinde 24 px. Header/main/footer aynı tanımdan beslenmeli.

### 3. Kontrollerin yükseklikleri uyumsuz

Masaüstünde input yaklaşık 53.76 px, Copy butonu 48.21 px. CSS metrikleri input için 13.6 px font / 21.76 px satır, buton için 16 px / 22.4 px. Tarayıcı zoom ve border yuvarlaması bu geometrilere ek kesirler getiriyor.

RSS mobilde iki buton dikey olduğu için grid satırı yaklaşık 104 px; input varsayılan stretch nedeniyle aynı yüksekliğe uzuyor. Tek satırlık URL kutusu gereksiz büyük görünüyor.

Öneri: tek satır input ve butonlar 48 px border-box; 1 px açık border; 24 px satır yüksekliği; sabit/hesaplanabilir padding. Tek satırlık alan `align-self:start`; butonlar sağda kendi sütununda. Textarea yüksekliği içerikle belirlenmeye devam etmeli.

### 4. PGP mobilde aşırı dar okuma kolonu

320 px'de key textarea genişliği yaklaşık 163 px, yatay padding toplam 32 px; metne kalan alan yaklaşık 131 px. Anahtar gövdesi yaklaşık 946 px yüksekliğe yayılıyor. Butonlar metnin üstüne binmiyor; ancak görsel denge zayıf.

Öneri: sağ aksiyon sütununda kompakt 14 px yazı ve 12 px yatay padding; metin alanında mobil padding 12 px. Yan yana metin/buton düzeni ve tam metin görünürlüğü korunmalı. Örnek hedef: yaklaşık 176 px metin kutusu + 12 px boşluk + 92 px aksiyon sütunu = 280 px.

### 5. Tipografi ve oranlar

Gövde 16 px, marka 40 px, başlık mobil 36 / masaüstü 48 px. Gövde line-height 1.6; prose 1.8; başlık 1.1. Boşluklar ağırlıkla 4 px katları. Bu taban zaten düzenli; tüm ölçüleri değiştirmek için kanıt yok.

Altın oran `φ=(1+√5)/2≈1.618034`.

- 960 / φ = 593.325 px. 4 px ritme yuvarlanmış okuma alanı 592 px; geometrik fark yaklaşık %0.22.
- Mevcut 65ch okuma alanı ölçülen fontla 577.87 px. φ referansından fark yaklaşık %2.60; ch genişliği platform fontuna bağlı.
- 16 × φ = 25.889 px. Mevcut gövde satırı 25.6 px; fark yaklaşık %1.12.

Altın oran bir kompozisyon referansıdır; her padding veya butona uygulanması daha iyi görünümü garanti etmez. 960 px ana çerçeve ve yaklaşık 592 px okuma alanı kullanılabilir; 4 px boşluk sistemi, tam hizalar ve okunabilirlik önceliklidir.

### 6. Testlerin mevcut sınırları

Mevcut suite footer orta grubunun merkezini, input/buton eşit yüksekliğini ve kesirli breakpoint aralığını doğrulamıyor. Testlerin geçmesi bu görsel kusurları dışlamıyor. Yeni doğrulama bu üç davranışı doğrudan ölçmeli.

## Uygulanabilir tasarım önerisi

- Sade siyah/beyaz görünüm; footer hover efekti yok.
- 960 px ortak konteyner, tek breakpoint tanımı; 20/24 px simetrik dış boşluk.
- Mevcut başlık ve marka ölçeği korunur; okuma alanı en fazla 592 px.
- Spacing: 4, 8, 12, 16, 24, 32, 40, 56, 72, 104 px. Bunların aynı olması gerekmez; aynı işlev aynı ölçüyü kullanır.
- Input ve buton 48 px; dokunma alanı en az 44 × 44 px.
- Metin solda, butonlar sağda; arada 12 px. Mobilde sağ aksiyonlar dikey, kutular birbirinden bağımsız yükseklikte.
- 320 px footer simetrik bütçeye göre kompakt ikonlarla tam merkezlenir; daha geniş ekranın ikon ölçüleri korunur.
- Yalnızca bu ölçü değişiklikleri: shell.ts, pages.ts ve gerekirse ortak tasarım ölçülerini içeren küçük bir style modülü. İçerik/rota/ödeme davranışı değişmez.

## Kabul ölçütleri

1. Header/main/footer sol-sağ kenar farkı en fazla 0.5 CSS px; 404 sahnesi bilinçli merkezli istisna.
2. Footer orta grubunun merkez hatası en fazla 0.5 CSS px, kenar gruplarıyla çakışma yok.
3. Input/buton yükseklik farkı en fazla 0.5 CSS px; satır alanı uzamaz.
4. Metin/aksiyon kutuları arası 12 px, en fazla 0.5 px tarayıcı yuvarlama toleransı.
5. Yatay sayfa taşması yok; PGP anahtarı kesilmiyor.
6. 320, 375, 620, 621, 768, 1280, 1440 px; kısa ekran, light/dark, %100 ve kesirli zoom kontrolü.
7. Mevcut 50 tarayıcı testi ve build geçmeli. Yeni testler footer merkezi, kontrol yüksekliği ve ortak breakpoint ölçülerini doğrulamalı.

Pixel-perfect burada belirli viewport/renderer koşullarında tutarlı geometri demektir. Farklı işletim sistemlerinde font rasterizasyonunun birebir aynı piksel üretmesi garanti edilemez.

## Uygulama sonrası doğrulama

Yukarıdaki bulgular düzeltme öncesi ölçümlerdir. Kullanıcının onayından sonra ortak ölçüler ve grid düzeni uygulandı.

| Gereksinim                            | Son durum / kanıt                                                                                                                   |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Ortak çerçeve                         | `--page-gutter` ve `--page-max-width` header, main ve footer tarafından kullanılıyor.                                               |
| Kesirli breakpoint hizası             | Canlı tarayıcıda iki eski sorgunun da false olduğu koşul yeniden üretildi: üç çerçevenin sol kenarı da 20 px. Önceki 4 px fark yok. |
| Altın oran referanslı okuma genişliği | Masaüstünde gerçek DOM ölçümü 592 px.                                                                                               |
| Tek satır alanlar ve butonlar         | RSS/PGP input ve butonları 48 px; Find, bağış seçenekleri, miktar input'u ve gönderme butonu da canlı mobil kontrolde 48 px.        |
| Yan yana düzen                        | RSS/PGP metin alanı solda, aksiyon sütunu sağda; yatay boşluk 12 px, üst kenarlar aynı hizada.                                      |
| RSS mobil stretch hatası              | URL alanı 48 px; ikinci buton sağ sütunda devam ediyor.                                                                             |
| PGP mobil metin alanı                 | 320 px'de yaklaşık 180 px genişlik; metin kesilmiyor. Uzun anahtar tam görünmesi için doğal yüksekliğe yayılıyor.                   |
| Footer merkezi                        | Mobil canlı ölçüm 0 px sapma. 320–1440 px, 360/361 sınırı ve iki tema testleri 0.5 px toleransla geçti.                             |
| Footer dokunma alanları               | Her hedef en az 44 × 44 px. Çok dar ekranda I2P görsel kutusu 44 px, daha geniş ekranda 64 px; orijinal en-boy oranı korunuyor.     |
| Footer hover                          | Eklenmedi; hover öncesi/sonrası arka plan değişmediğini doğrulayan testler geçti.                                                   |
| Kopyalama / arama / ödeme sayfaları   | Mevcut davranış testleri ve sentetik ödeme durumlarının geometri/erişilebilirlik testleri geçti.                                    |

Doğrulama sonuçları:

- Yeni testlerin düzeltme öncesi çalıştırması: 16 geometri hatası, 13 başarılı test. Footer sapması ve kontrol hizası hataları yakalandı.
- Son tarayıcı çalıştırması: **89 başarılı**, 0 başarısız; light/dark, 320, 360, 361, 375, 620, 621, 768, 1280, 1440 px ve kısa ekran kontrolleri dahil.
- `bun test`: **52 başarılı**, 8 mevcut skip, 0 başarısız.
- `bun run check`: 0 hata, 0 uyarı; 23 mevcut TypeScript hint'i.
- `bun run build`: başarılı.
- `bun run format:check` ve `git diff --check`: başarılı.
- Bağımsız salt okunur kod incelemesi: kritik/önemli bulgu yok. Önerilen 360/361 sınır testleri eklendi.

Son görünüm, `bun run test:browser` çalıştırıldığında şu yerel ekran görüntülerinde yeniden üretilebilir:

- PGP masaüstü: `/tmp/portfolio-precision-pgp-1280.png`
- PGP mobil: `/tmp/portfolio-precision-pgp-320.png`
- Ana sayfa mobil: `/tmp/portfolio-precision-home-320.png`
- Copied / Downloading geri bildirimi: `/tmp/portfolio-action-feedback.png`
