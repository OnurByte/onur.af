# Onur: GitHub araştırması ve eklenebilecek fikirler

15 Ekim 2026. Üç `gpt-6-luna` araştırma worker'ı ve ana araştırmacının kaynak kontrolleriyle hazırlandı. Bu belge bir uygulama değişikliği veya bağımlılık kurma kararı değildir.

## Sitenin ruhu

Bu site, bir kişinin düşüncesini ve kendi kararının sorumluluğunu taşıyan bir imza gibi çalışıyor. Saf siyah/beyaz, Helvetica, geniş boşluk, tek motto ve az sayıda açık eylem bunun görsel karşılığı. PGP, RSS, Tor/I2P ve Monero ise bağımsızlık fikrini işlevle bağlıyor. Teknoloji listesi veya hacker dekoru değiller.

Bu okuma `brand.md`, `docs/design.md`, README, ana sayfa, layout, arama, feed ve bağlantı koduyla ve mevcut yerel ana sayfa ekran görüntüsüyle karşılaştırıldı. Canlı dağıtım web aracıyla açılamadı; mevcut üretim dağıtımının ayrıca görsel olarak doğrulandığı iddia edilmiyor.

Mevcut gerçekler: ana sayfa yalnızca motto gösteriyor; yazı/proje koleksiyonu yok; RSS öğesiz; Ctrl+K araması mevcut kamu sayfalarını yerel filtreliyor. Tor/I2P adresleri yapılandırılmamışsa devre dışı gösteriliyor. Site Astro 7.3.8 / StyleX, Node/Vercel sunucu adaptörleri kullanıyor; tamamen statik bir dağıtım değil. `.node-version` 26.4.0.

**Önerim:** Aynı sade girişin arkasına kişinin ürettiklerini, kararlarını ve seçtiği kaynakları koymak. Öncelik görsel bileşen sayısını artırmak değil, keşfedilecek gerçek malzeme üretmek.

## Seçilen küçük hazineler

Yıldız, lisans ve son push bilgileri 15 Ekim 2026'da GitHub REST API üzerinden okundu. Push tarihi bakım kalitesi veya güvenlik garantisi değildir. Kodların projede çalıştırıldığı ya da entegrasyon testi yapıldığı iddia edilmiyor.

| Kaynak                                                                        | Yıldız | Lisans       | Son push   | Buraya taşınabilecek fikir                                         |
| ----------------------------------------------------------------------------- | -----: | ------------ | ---------- | ------------------------------------------------------------------ |
| [queelius/sigmark](https://github.com/queelius/sigmark)                       |      0 | MIT          | 2026-04-24 | Yazıların indirilebilir, PGP imzalı kaynağı                        |
| [technicalpickles/Webring](https://github.com/technicalpickles/Webring)       |      1 | MIT          | 2026-09-04 | Harici widget JS olmadan kişisel siteler arasında dolaşım          |
| [kitschpatrol/astro-feed-kit](https://github.com/kitschpatrol/astro-feed-kit) |      8 | MIT          | 2026-10-14 | Yazıyı feed okuyucusunda bütünüyle okuyabilme                      |
| [mkdnsite/mkdnsite](https://github.com/mkdnsite/mkdnsite)                     |     12 | MIT          | 2026-05-05 | Aynı içeriğin HTML ve ham Markdown sunumu                          |
| [gevhaz/hugo-theme-notrack](https://github.com/gevhaz/hugo-theme-notrack)     |     59 | GPL-3.0      | 2025-06-22 | Dış varlık bağımlılığını azaltan, içeriğe göre açılan yayın yapısı |
| [k3rs3d/ringfairy](https://github.com/k3rs3d/ringfairy)                       |     95 | GPL-3.0      | 2026-03-06 | Veri dosyasından statik halka ve OPML üretimi                      |
| [cxro/astro-whono](https://github.com/cxro/astro-whono)                       |    174 | MIT          | 2026-10-08 | Uzun yazı ve kısa notları aynı kişisel yayın içinde ele alma       |
| [aartaka/tripod](https://github.com/aartaka/tripod)                           |      5 | BSD-2-Clause | 2022-09-21 | İçeriği farklı, yalın okuma kanallarına açma                       |
| [wxxb789/anc](https://github.com/wxxb789/anc)                                 |      0 | MIT (API)    | 2026-10-08 | Yayın öncesi içerik kümesi incelemesi ve katı çıktı şeması         |

### 1. En karakterli fikir: imzalı notlar

`sigmark`ın [Markdown işleyicisi](https://github.com/queelius/sigmark/blob/main/src/sigmark/markdown.py) ve [GPG katmanı](https://github.com/queelius/sigmark/blob/main/src/sigmark/gpg.py) açıldı. Gerçek detached imza ve normalize edilmiş gövde yaklaşımı var. Bunun Onur karşılığı: kısa bir teknik notun altında yalnızca `Source · Signature · PGP` bağlantıları. İsteyen dosyayı indirip yerelde doğrular; okuma sayfası kriptografi paneline dönüşmez.

**Sınır:** Araç yalnızca gövdeyi imzalıyor. Başlık, tarih ve diğer frontmatter alanları kapsam dışında. Görünürdeki bir etiket doğrulama kanıtı değildir; imzalanan baytlar ve doğrulama yolu açık olmalı. İlk tasarımda indirilen kaynak ile imzanın aynı kanonik içeriği temsil etmesi çözülmeli. Özel anahtarı web sunucusuna koymak yerine yerel imzalama, CI'da yalnızca doğrulama yaklaşımı tercih edilebilir.

Bu, ilk gerçek yazıdan sonra değerlendirilecek en ayırt edici özellik. Sıfır yıldızlı olması keşif değeri taşıyor; olgunluk kanıtı sayılmamalı.

### 2. En düşük bakım yükü: sade metin ve tam RSS

[mkdnsite README](https://github.com/mkdnsite/mkdnsite), HTTP Accept başlığına göre HTML/Markdown sunuyor. Onur için aynı fikri daha küçük uygulamak mümkün: `/notes/slug` yanında `/notes/slug.md`, sayfada `Source` bağlantısı. Mevcut Astro sunucusunda içerik müzakeresi de yapılabilir; bunun için ayrı mkdnsite sunucusu taşımak gerekmiyor. Ayrı URL, cache ve keşfedilebilirlik açısından daha basit bir başlangıç.

[astro-feed-kit](https://github.com/kitschpatrol/astro-feed-kit) tam içerikli RSS/Atom/JSON üretimini ve HTML temizliğini birlikte ele alıyor. Buradan alınacak esas davranış, notun tamamını RSS okuyucusunda sunmak. Üç formatı birden eklemek ilk adım için zorunlu değil. Mevcut feed şu an boş; önce gerçek içerik ve ona bağlanan RSS öğeleri gerekli.

Paket kendi README'sinde 1.0 öncesi genel kullanıma uygun olmadığını belirtiyor. Astro 7 ve Node `^24.16.0 || >=26.3.0` koşulları mevcut sürüm pinleriyle örtüşüyor; bu, Bun/build/dağıtım uyumluluğunun test edildiği anlamına gelmez. Şimdilik paket kurmak yerine uygulama kararları için referans almak daha güçlü seçim.

### 3. En insani ekleme: seçilmiş bağlantılar

[technicalpickles/Webring tasarımı](https://github.com/technicalpickles/Webring/blob/main/DESIGN.md) ve [karar kaydı](https://github.com/technicalpickles/Webring/blob/main/DECISIONS.md), üye sayfalarında JavaScript widget'ı gerektirmeyen bağlantı yaklaşımını açıklıyor. [ringfairy halka üreticisi](https://github.com/k3rs3d/ringfairy/blob/main/src/gen/webring.rs) ise üyelik listesinden önceki/sonraki sırasını oluşturuyor; [HTML üreticisi](https://github.com/k3rs3d/ringfairy/blob/main/src/gen/html.rs) OPML de üretiyor.

Buradaki öneri önce `/links`: gerçekten takip ettiğin 5–10 site, her biri için kendi sesinle tek cümle. Sahici bir topluluk varsa daha sonra webring. Halka kurmak tek kişinin alabileceği teknik bir kararın ötesinde, üyelik ve bakım ilişkisi gerektirir. Başka halkaya katılım bu araştırmada yapılmadı.

Mevcut dar mobil footer'a yeni ikon eklemek yerine aramadan ve uygun bir metin bağlantısından erişilebilir. OPML, aynı seçkinin RSS aboneliklerini dışa aktarabilir. Ziyaretçi tıklayana kadar üçüncü taraf içeriği yüklemek gerekmez. Linklerin güncelliğini korumak yine editoryal iş ister.

### 4. Sitenin kendi yapımını bir işe dönüştürmek

Bu doğrudan bir paket önerisi değil; kişisel site araştırmasından ve mevcut koddan çıkan editoryal sentez. İlk `/work` kaydı bu portfolyonun kendisi olabilir. Üç kısa bölüm yeterli: çözülen sorun, alınan karar, doğrulanmış sonuç. Örneğin yerel aramanın neden uzak arama servisi kullanmadığı veya Monero ödeme durumlarının nasıl sunulduğu.

Proje kartı galerisi, beceri yüzdeleri veya GitHub yıldız panosu gerekmiyor. Bir satırlık iş listesi ve her iş için okunabilir dosya, “The creator originates.” ifadesini somut üretimle ilişkilendirir. Kod/test kanıtı ile gerçek hizmetin çalışması ayrı anlatılmalı; sentetik ödeme testleri canlı tahsilat kanıtı değildir.

İlk gerçek metin hazır olduğunda `/work` veya `/notes` açılır. İçerik hazırlanmadan boş rota ve sahte örnek yazılar yayınlanmaz.

İkinci sıfır yıldızlı bulgu [anc](https://github.com/wxxb789/anc): release öncesinde yayın kümesini inceleme ve [üretilen veriyi katı şemayla doğrulama](https://github.com/wxxb789/anc/blob/main/src/lib/schema.ts) yaklaşımı ilginç. Önemli ayrım: ANC varsayılan olarak bütün Markdown notlarını yayımlıyor; `publish: false` ile dışarıda bırakılıyor. Onur için yalnızca açıkça yayımlanacak diye işaretlenen içerikleri almak bizim daha dar önerimizdir. Dışarıda bırakılmış notlara giden bağlantıların başlık/yol bilgisini de açığa çıkarmaması düşünülmeli. ANC henüz kararlı sürüme hazır olmadığını belirtiyor; tüm yayın motorunu taşımak önerilmiyor.

### 5. Küçük ama açıklayıcı bir colophon

`notrack`ın [head](https://github.com/gevhaz/hugo-theme-notrack/blob/master/layouts/partials/head.html) ve [home](https://github.com/gevhaz/hugo-theme-notrack/blob/master/layouts/home.html) şablonları, kendi varlıklarını sunma ve mevcut içerik üzerinden yayınlama için referans. Onur'da `/colophon`, mevcut README/brand kararlarının ziyaretçiye yarayan kısa karşılığı olabilir: sistem teması, yerel arama, RSS, kaynak depo ve gerçekten yayınlanmış alternatif erişim adresleri.

Bir yığın logosu veya “tam anonim/güvenli” iddiası eklenmez. İleride yazı sayfası oluşursa kısa bir yapım notu olarak orada da tutulabilir. `/now` ve `/uses` ancak güncel tutulacak kişisel malzeme varsa bundan sonra gelir.

## Neleri alt sıraya aldık?

- [pbogre/guestbook](https://github.com/pbogre/guestbook): 2 yıldız, lisans belirtilmemiş. İncelenen DB/handler/logger IP saklıyor ve logluyor. Ziyaretçi defteri fikri kişisel olsa da mevcut hali bu mahremiyet çizgisine uygun bir hazır çözüm değil.
- [benjifs/webmention-receiver](https://github.com/benjifs/webmention-receiver): 1 yıldız, MIT. Netlify Functions/Blobs, uzak URL doğrulama ve moderasyon gerektiriyor. Yazı ve gerçek dış bağlantılar oluşmadan yeni bir servis yüzeyi eklemek için zayıf gerekçe.
- [errbufferoverfl/garden.errbufferoverfl.me](https://github.com/errbufferoverfl/garden.errbufferoverfl.me): 11 yıldız. Mahremiyet/P2P içeriği yakın, Quarto/Obsidian arayüzünü taşımak gereksiz. API lisansı `NOASSERTION`; depodaki lisans metni ayrıca incelenmiş.
- [owickstrom/the-monospace-web](https://github.com/owickstrom/the-monospace-web): monokrom ölçü deneyi yararlı, 3.198 yıldızla küçük hazine değil. Mono font, yoğun çizgiler ve büyük harfleri Onur'a taşımak mevcut kimliği değiştirir.
- [kyswtn/kyswtn.com](https://github.com/kyswtn/kyswtn.com): 31 yıldız, açık lisans bulunamadı. Kısa/uzun içerik ayrımı öğretici; monorepo altyapısı ve analytics bu iş için fazla.
- Yeni komut paleti: mevcut Ctrl+K zaten bu işi yapıyor. Yeni sayfalar yayımlanınca mevcut indekse eklemek yeterli.
- Tripod/Gemini/Gopher: bağımsız web açısından ilginç; eski push tarihi ve ek protokol işletimi nedeniyle ilk adım değil. Önce aynı içeriğin ham metin çıktısı daha küçük ve faydası daha açık bir deneme.

## Öncelik önerisi

1. Portfolyonun kendi yapımına ait bir gerçek iş dosyası ve bir kısa üretim notu yaz.
2. Bunları mevcut dilde, düz listeden erişilen `/work` ve `/notes` içinde yayımla; RSS ve mevcut aramaya bağla.
3. Kaynak Markdown çıktısı ekle; ardından PGP imzasını kanonik içerik/yerel imzalama akışıyla değerlendir.
4. Gerçek seçkin hazırsa `/links` ve OPML ekle; uygun topluluk bulunursa webring.
5. Etkileşim ihtiyacı oluşursa misafir defteri/Webmention'a yeniden bak.

Ana sayfanın sessizliği korunabilir. Keşif yolu açık ve görünür olmalı; yalnızca klavye kısayolunu bilenlere bırakılmamalı. Yeni içerik yolları mevcut Find sonuçlarında görünürken, küçük bir metin gezinmesi de tasarım sırasında değerlendirilmeli. Footer'ın üç grup geometrisi sırf daha çok özellik sığdırmak için bozulmamalı.

## Araştırma izi

Üç worker'ın ayrıntılı kaynak, alternatif ve ödün notları:

- [Minimal kişisel siteler](research/2026-10-15-minimal-sites.md)
- [Kişisel egemenlik ve bağımsız web](research/2026-10-15-sovereign-web.md)
- [Küçük araçlar ve yayınlama](research/2026-10-15-quiet-tools.md)

Sentezde sürüm ve sunucu mimarisi mevcut repository dosyalarından yeniden kontrol edildi. Repo metrikleri için `https://api.github.com/repos/OWNER/REPO` kayıtları kullanıldı; web aramasının önbellek yıldız sayılarıyla fark olduğunda API gözlemi tercih edildi.
