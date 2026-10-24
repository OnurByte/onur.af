# Landing ruh ve uzunluk denetimi

Tarih: 2026-10-24. Kapsam: sahibin landing uzunluğu ve dolaylı anlatım şüphesini kaynak, marka kararları ve yerel tarayıcı ile incelemek. Salt okunur ürün denetimi; uygulama değişikliği yok. Bütçe: en fazla iki tur, tur başına üç hipotez. Üç ayrı `gpt-6-luna` worker: Critic, Engineer, Verifier; koordinatör kanıtları uzlaştırdı.

Hedef: HEAD `79bd487c3fe6edc0c0fb710f1c5d7ac0d1dee61d` + mevcut kapsamlı dirty checkout. HEAD tek başına incelenmedi. Mevcut Work, yayın, stil ve sağlayıcı değişiklikleri korundu. Önceki 10/20 ve 10/21 raporları tarihsel bağlamdır; güncel doğrulama yerine kullanılmadı. Özellikle Work sahibin onayladığı bir özellik.

## H1 / tur 1 / içerik hiyerarşisi / yüksek öncelik / yüksek güven

İddia: landing, seçilmiş bir giriş yerine farklı içerik kataloglarını ardışık sunuyor. Ziyaretçinin işleri, yazıları ve bağlantıları tarama mesafesi büyüyor.

Gözlem: `src/pages/index.astro:85` sonrasında Work, Technologies, en fazla üç Log ve HomeActivity geliyor. `src/components/WorkList.astro:8` bütün Work kayıtlarını gösteriyor. `src/components/Technologies.astro:9` sekiz kategori ve 33 araç tanımlıyor. Sağlayıcı başına sınırlar toplam sayfa bütçesi oluşturmuyor.

Engineer kararı: yapısal bütçe eksikliği doğrulandı. Bu tek başına işlevsel bug veya açık marka yasağı ihlali değil. `brand.md` araç listesi yasağı kişisel girişe ait; ayrı Technologies bölümüne otomatik uygulanamaz. Work kaldırılmalı sonucu çıkarılamaz.

Verifier: güncel checkout `bun run build` ile başarıyla derlendi (exit 0). Ardından `tests/browser/server.ts` loopback sunucusunda Chromium, light theme ölçümü yapıldı. 1440×900: belge 4118 px; Work başlığı y=667; Technologies başlığı y=1217; Tweets/Repositories y=2976; Connect bölümü y=3599. 390×844: belge 6190 px; Work y=839; Tweets y=4118; Repositories y=4750; Connect y=5366. Her ikisinde iki Work ve bir recent Log kartı var. Üç Log kodda üst sınırdır, mevcut kart sayısı değildir.

Ekran görüntüleri: `/tmp/onur-home-1440.png`, `/tmp/onur-home-390.png`. Koordinatör mobil tam sayfayı ayrıca inceledi. Mobil uzunluk yaklaşık 7,33 ekran yüksekliği; Connect başlangıcı 6,36 ekran yüksekliğinde. Bu koordinatlar kaydırma hareketi sayısı veya kullanıcı başarısızlık oranı değildir.

Karşı kanıt: içerikler gerçek ve mevcut ürün kararlarıyla ilişkili. Uzun bir kişisel site tek başına yanlış değildir. Katalog yerleşiminin ana akışı bastırması sahibin belirtilen kısa/doğrudan hedefiyle değerlendirilmiştir.

Patch/regresyon: yok. Bulguyu ayıran deney: aynı sayfa yüklemesinde yalnız Technologies bloğunu DOM üzerinden gizleyip yükseklik farkını ölçmek. Kontrollü sonuç: 1440×900 aynı yüklemede 4118 → 2631 px (−1487 px, %36,1); 390×844 aynı yüklemede 6190 → 3991 px (−2199 px, %35,5). Technologies kendi kutusu sırasıyla 1439 ve 2159 px; fark çevre boşluklarını da içeriyor. Connect y=3599 → 2112 ve y=5366 → 3166; mobilde yaklaşık 2,61 ekran yüksekliği yukarı taşınıyor. Bu deney kaynakları değiştirmedi; yalnız tarayıcı DOM görünürlüğü değişti. Kataloğun geometrik katkısını ayırır, ziyaretçi değerini kanıtlamaz.

Verdict: ölçülen uzunluk verified; önerilen yeniden sıralama uygulanmadı.

## H2 / tur 1 / anlatım / orta öncelik / orta güven

İddia: motto sonrası kişisel yaklaşım açıklaması, ilk somut iş örneğinden önce fazla kavramsal yük oluşturuyor.

Gözlem: `src/portfolio/introduction.ts:4` son imzalı Log revizyonunun tamamını kullanıyor. `src/content/log.json:56` giriş kaydı iki paragraf, 86 kelime ve 496 karakter. Koordinatör `bun` ile `trim().split(/\s+/).length` hesabını çalıştırdı (exit 0); worker'ın 94 kelime tahmini düzeltilmiştir. Metin ilk cümlede “I write software” diyor, devamında araç kontrolü, mahremiyet ve imzalı yayınları anlatıyor. Tarih ve Verified bağlantısı da girişte bulunuyor.

Engineer kararı: içerik kaynağı bağı doğrulandı; ziyaretçinin mesajı anlayamadığı iddiası belirsiz. Metin marka ruhuyla uyumlu. Dolaylılık, ziyaretçi araştırması olmadan kesin hata diye sunulamaz.

Ters deney: mevcut ve kısa varyantla beş saniye sonrası “Onur ne yapıyor, burada ne bulabilirim?” yanıtlarını karşılaştırmak. Bu kullanıcı deneyi yapılmadı. İmzalı gövdeyi değiştirmeden ayrı landing özeti düşünülürse doğrulama etiketinin hangi içeriği doğruladığı açık tutulmalı; imzalı eski baytlar yeniden yazılmamalı.

Patch/test: yok. Verdict: not-applicable; editoryal öneri, kullanıcı etkisi belirsiz.

## H3 / tur 1 / kabul ölçütü önerisi / süreç riski / yüksek güven

İddia: bileşenleri doğrulayan kabul yaklaşımı, sayfanın toplam öncelik ve uzunluğunu korumuyor.

Gözlem: `tests/browser/home-introduction.pw.ts` metin, geometri, JavaScript olmadan içerik ve proof bağlantısını; `tests/browser/home-embeds.pw.ts` kaynak yerleşimi ve sağlayıcı davranışını; Work testleri içerik ve kaynakları denetliyor. İncelenen testlerde sayfa genelinde editoryal bütçe kabulü bulunmadı. `brand.md` kısa/doğrudan yaklaşımı söylüyor; ayrıntılı yerleşim kararları ve yeni Work eklenmesi toplam landing seçkisine dönüştürülmemiş.

Engineer kararı: kapsam boşluğu doğrulandı. Testlerin başarılı olması mesaj hiyerarşisinin başarılı olduğunu kanıtlamaz. Bu bulgu tek başına yeni bir piksel yüksekliği testi yazmayı gerektirmez; önce hangi içeriğin landing'de zorunlu olduğu tanımlanmalı.

Karşı kanıt: mevcut testler kendi teknik kapsamları için anlamlı. Work eklenmesi bilinçli. Belgelerden bir cümleyi bağlamından koparıp bütün alt bölümleri yasaklamak yanlış olur.

Patch/test: yok. Verdict: not-applicable; kaynak üzerinden doğrulanan süreç önerisi.

## Önerilen yön

Motto ve kişisel sesi koru. Kısa girişten hemen sonra mevcut iki Work örneğini göster. 33 araçlık katalogu ana akıştan çıkarma veya ayrı erişilebilir alana taşıma seçeneğini önce dene; boşlukları sıkıştırmak ilk çözüm olmasın. Logs için küçük seçkiyi koru. Connect'i uzun sosyal akışları okumayı gerektirmeden erişilebilir kıl; mevcut Connect yerleşimi belgelenmiş olduğu için bu bilinçli tasarım değişikliği olarak ele alınmalı. Tweets, repository akışı ve Spotify'ın tamamını landing'de tutmak yerine ikincil erişim düşün.

Bu bir satış hunisi önerisi değildir. Öncelik kişinin ne ürettiğini görüp isteyerek derinleşmek; yeni sloganlar, iddialar veya sürekli CTA eklemek değil.

## Sınırlar ve kontroller

Build başarılı; `git diff --check` başarılı. Tam test/check paketi bu salt okunur denetimde yeniden çalıştırılmadı. Gerçek ziyaretçi testi, production ölçümü, iki temanın karşılaştırılması yapılmadı. Yerel fixture sentetik gateway kullanır; provider içeriği adapter/cache üzerinden değişebilir, tamamen sabit provider fixture olduğu iddia edilmez. Masaüstü ve mobil ilk taramada rastgele motto farklıydı; sayfa yükseklikleri kontrollü A/B kıyası değildir. Ödeme, yayın, imzalama veya deployment yapılmadı. Build üretimleri uygulama kaynak değişikliği olarak sunulmadı.

Başlangıç ve mevcut dirty dosya envanteri aşağıdadır. Bu dosyaların var olan değişiklikleri denetime ait değildir.

```text
 M .dependency-cruiser.cjs
 M .env.example
 M .github/workflows/ci.yml
 M .github/workflows/quality.yml
 M .gitignore
 M .prettierignore
 M README.md
 M bun.lock
 M docs/home-embeds.md
 M docs/integrated-publication.md
 M docs/log-and-proofs.md
 M docs/portable-log-proofs.md
 M docs/stylex.md
 M eslint-suppressions.json
 M eslint.config.mjs
 M knip.jsonc
 M package.json
 D src/client/gateway.ts
 M src/client/site.ts
 M src/components/LogArticle.astro
 M src/components/LogCard.astro
 M src/components/LogDiff.astro
 M src/components/LogRevision.astro
 M src/components/LogSources.astro
 M src/components/LogTags.astro
 M src/components/embeds/HomeEmbeds.astro
 M src/components/embeds/SpotifyEmbed.astro
 M src/content/home-embeds.ts
 M src/content/public-pages.json
 M src/content/schema.ts
 M src/layouts/Layout.astro
 M src/pages/contribute/[id].astro
 M src/pages/contribute/create.ts
 D src/pages/donate/[id].astro
 D src/pages/donate/create.ts
 D src/pages/donate/index.astro
 M src/pages/index.astro
 D src/pages/introduction/[file].ts
 D src/pages/introduction/verified.astro
 M src/pages/log/[id].astro
 M src/pages/log/tag/[tag].astro
 D src/pages/pgp/log/[id].ts
 M src/portfolio/embed-cache.ts
 M src/portfolio/home-embed-adapters.ts
 M src/portfolio/previews.ts
 M src/portfolio/search.ts
 M src/portfolio/seo.ts
 M src/portfolio/spotify-source.ts
 M src/styles/global.css
 M tests/browser/accessibility.pw.ts
 M tests/browser/action-feedback.pw.ts
 M tests/browser/contribute-openalias.pw.ts
 M tests/browser/home-embeds.pw.ts
 M tests/browser/home-introduction.pw.ts
 M tests/browser/log-publication.pw.ts
 M tests/browser/log.pw.ts
 M tests/browser/search-resilience.pw.ts
 M tests/browser/site-behavior.pw.ts
 M tests/checkout.test.ts
 M tests/embed-cache.test.ts
 M tests/home-embed-adapters.test.ts
 M tests/publish-pipeline.test.ts
 M tests/search.test.ts
 M tests/seo.test.ts
 M tests/spotify-recents.test.ts
 M tsconfig.json
?? .github/workflows/dependencies.yml
?? docs/audits/improvement-2026-10-21-legacy.md
?? docs/audits/portfolio-report-2026-10-21.md
?? docs/development.md
?? docs/superpowers/plans/2026-10-21-portfolio-evidence.md
?? docs/superpowers/specs/2026-10-21-portfolio-evidence-design.md
?? playwright.smoke.config.ts
?? scripts/build-evidence.ts
?? scripts/dependency-inventory.ts
?? scripts/measure-home.ts
?? scripts/publish-work.ts
?? src/client/build-evidence.ts
?? src/client/vitals-observer.ts
?? src/client/vitals.ts
?? src/components/EntryCard.astro
?? src/components/PublicationEvidence.astro
?? src/components/WorkList.astro
?? src/content/log-drafts.json
?? src/content/work.json
?? src/pages/vitals.json.ts
?? src/pages/work/
?? src/portfolio/build-evidence.ts
?? src/portfolio/vitals.ts
?? src/portfolio/work-publication.ts
?? src/portfolio/work.ts
?? src/server/donation-gateway.ts
?? src/server/source-snapshot.ts
?? src/styles/log-content.css
?? src/styles/log-layout.ts
?? src/styles/work.ts
?? tests/browser/core.smoke.ts
?? tests/browser/work.pw.ts
?? tests/build-evidence.test.ts
?? tests/source-snapshot.test.ts
?? tests/vitals.test.ts
?? tests/work.test.ts
```

Tüketilen bütçe: bir inceleme turu, üç hipotez; aynı hipotezin kontrollü ölçümü ve critic yeniden değerlendirmesi. Uygulanan veya çözüldüğü iddia edilen ürün değişikliği yok. Durma nedeni: istenen analiz tamamlandı; kalan kısa metin ve yerleşim önerileri ayrı uygulama kapsamı.

Critic son değerlendirmesi: ölçülen uzunluk ve Technologies katkısı doğrulandı; ziyaretçi üzerindeki olumsuz hiyerarşi etkisi tasarım hipotezidir. H3 ayrı ürün kusuru değil, kabul ölçütü önerisidir. Önerilen yeni sıralama henüz kullanıcıyla sınanmadı. Bloklayıcı itiraz yok.
