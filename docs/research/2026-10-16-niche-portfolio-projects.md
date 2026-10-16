# Portföy sitesini güçlendirecek niş fikirler

**Araştırma tarihi:** 16 Ekim 2026  
**Araştırma sorusu:** Mevcut kişisel siteyi, kendi karakterini koruyarak hangi işlevsel ve etkileyici dokunuşlar güçlendirir?  
**Yöntem:** Çalışma ağacındaki uygulama ve dokümantasyon incelendi; GitHub depolarının README/kod ve güncel API metaverileri, ayrıca Tor Project ve GitHub'ın resmî belgeleri karşılaştırıldı. Yeni kod eklenmedi, test çalıştırılmadı.

## Projeyi doğru tanımlamak

Bu site, Onur'un kişisel imzasını sade, erişilebilir ve mahremiyete dikkat eden bir arayüzde çalışan yayın ve kimlik altyapısıyla birlikte sunuyor. Yeni bir özellik ya mevcut kimlik/yayın akışını anlamlı biçimde tamamlamalı ya da ziyaretçinin gördüğü canlı verinin ne anlama geldiğini daha açık anlatmalı.

Çalışma ağacında görülen ana parçalar:

- Ana sayfa X, GitHub ve Spotify verilerini sunucu tarafında alıp yerel HTML olarak sunuyor. GitHub tarafındaki GitShow HTML ayrıştırıcısı ve X için kullanılan FxEmbed dış bağımlılıkları kırılganlık riski taşıyor; önbellek ve hata durumları mevcut.
- Spotify bölümü, yalnızca site açıkken gözlenen dinlemeyi gösterebiliyor; bu tüm dinleme geçmişi değil. Çalışma ağacındaki mevcut kullanıcı değişikliği bu gözlemleri Vercel'de özel Blob alanında kalıcı tutmayı hedefliyor.
- PGP kimlik sayfaları, imzalı hesap bağlantıları ve imza doğrulaması mevcut. Log yazıları sürüm, içerik özeti, PGP imzası ve OpenTimestamps kanıtı taşıyor. RSS içeriği de imzalanabiliyor.
- Monero bağış akışı kapsamlı biçimde geliştirilmiş olsa da gerçek ağ ve üretim doğrulama adımları belgelerde açık. Henüz canlı ödeme hizmeti veya başarılı tahsilat iddiası gibi sunulmamalı.
- Örnek/test amaçlı bir Log kaydı var; RSS yazı kümesi boş. Dolayısıyla içerik sayfaları için boş bir vitrin açmak veya örnek metni gerçek proje gibi sunmak doğru olmaz.
- Tor/I2P adresleri için ayarlar mevcut olsa da yayımlanmış ve doğrulanmış alternatif adres yok. Vercel dağıtımı kendi başına bir Tor onion servisi sağlamıyor.

## Sıralı öneriler

Puanlar 1–5 aralığında editoryal değerlendirmedir; GitHub popülerliği veya kullanıcı verisi değildir.

| Öncelik | Fikir                                                 | Uyum | Ziyaretçiye fayda | Efor | Hazırlık                          |
| ------- | ----------------------------------------------------- | ---: | ----------------: | ---: | --------------------------------- |
| 1       | **Gerçek bir “bu site nasıl çalışıyor?” vaka yazısı** |    5 |                 5 |  1–2 | Hemen; içerik hazır olduğunda     |
| 2       | **Ana sayfada veri tazeliği ve gözlem sınırı**        |    5 |                 4 |    2 | Hemen incelenebilir               |
| 3       | **İmzalı kimlik ve alternatif adres manifesti**       |    5 |                 4 |  3–4 | Gerçek onion/I2P adresinden sonra |
| 4       | **PGP anahtar geçiş geçmişi**                         |    4 |                 4 |  2–3 | Gerçek anahtar rotasyonunda       |

### 1. Portfolyonun kendisini kanıtlı vaka yazısına dönüştür

En kuvvetli ve düşük eforlu adım, bu sitenin gerçek bir iş olarak anlatılması. Kısa bir vaka yazısı şu soruları yanıtlayabilir: hangi ihtiyaç çözüldü, hangi özellikler gerçekten çalışıyor, hangi tasarım kararları neden alındı, hangi parçalar deneysel veya henüz üretimde değil? Örneğin imzalı yayın akışının bayt düzeyinde neyi doğruladığı ve Monero tarafında hangi üretim kontrollerinin kaldığı dürüstçe gösterilebilir.

Bu, boş “projelerim” galerisi veya uydurma metrik gerektirmeden ziyaretçiye etkileyici teknik derinlik sunar. Yazı hazır olduğunda mevcut Log/RSS/imza altyapısına bağlanabilir. Önceki 15 Ekim araştırması zaten `/work`, `/notes`, kaynak Markdown ve bağlantı sayfası gibi içerik odaklı yolları ele almış; bunları yeni fikir diye yeniden satmıyorum. Bu önerinin farklı yanı, genel içerik alanı kurmak yerine mevcut çalışan portfolyoyu somut ve sınırları açık tek bir vaka olarak yayımlamak.

**Ölçüt:** Okur birkaç dakika içinde hangi parçaların gerçek, nasıl doğrulandığı ve hangi iddiaların henüz yapılmadığını anlayabiliyor mu?

### 2. Canlı bölümlere hafif bir tazelik ve kapsam etiketi ekle

Ana sayfanın X, GitHub ve Spotify bölümleri dış kaynaklara dayanıyor. Her birinin yanında küçük, metinsel bir durum bilgisi; son başarılı güncelleme zamanı, önbellekten geldiği bilgisi ve kaynak geçici olarak erişilemediğinde son verinin eski olabileceği açıklaması sunabilir. Spotify geçmişinin yanına “bu site açıkken gözlenen parçalar” gibi kısa bir açıklama koymak da listenin tam hesap geçmişi sanılmasını önler.

Var olan verinin güncelliğini ve kapsamını ziyaretçiye anlatan, sade görsel dile uyabilecek küçük bir güven özelliği. Durum bilgisi kaynak başına yerel ve okunabilir HTML olmalı; üçüncü taraf analitik veya ek izleme gerektirmiyor. Kesin zaman/saklama ayrıntıları mevcut cache davranışı ve Vercel Blob değişikliğiyle birlikte teyit edilmeli.

**Ölçüt:** Kaynak hata verdiğinde veya içerik önbellekten sunulduğunda ziyaretçi bunu yanlışlıkla güncel veri sanmıyor mu?

### 3. İmzalı kimlik ve alternatif erişim manifesti

İleriye dönük en özgün teknik fikir, mevcut PGP kimlik beyanlarını gerçek alternatif site kökenleriyle ilişkilendiren küçük, sürümlü ve imzalı bir manifest. İzin verilen içerik; kanonik site adresi, PGP parmak izi, imzalı sosyal hesap bağlantıları ve yalnızca gerçekten işletilen clearnet/onion/I2P adresleri olabilir. Manifest indirilebilir, imza mevcut anahtarla doğrulanabilir ve içindeki adresler makinece okunabilir olmalı.

Gerçek bir onion kopyası işletildiğinde clearnet HTTPS sayfalarında `Onion-Location` başlığı yayımlamak Tor Browser'ın onion eşini fark etmesine yardımcı olabilir. Tor Project bunun için HTTPS üzerinden servis edilen clearnet sayfası ve geçerli `.onion` adresi şartı koyuyor; onion sayfasının kendisinden bu başlıkla yönlendirme yapılmamalı. Başlık onion hedefinin işletildiğini bildirir, PGP kimliğini veya bağımsız olarak sahipliği kanıtlamaz; imzalı manifest bu ayrımı açıklamalı. [Tor Project: Onion-Location](https://community.torproject.org/onion-services/advanced/onion-location/) · [Tor Project: Onion Service HTTPS](https://community.torproject.org/onion-services/advanced/https/)

GitHub'da `bitcart/bitcart` ödeme uygulamasının [HTTP ara katman yazılımı](https://github.com/bitcart/bitcart/blob/6388adcf017907d975eed4ed4a1b975d5e120059/api/middleware/onion.py) onion hostname tanımlı ve istek clearnet üzerinden geldiğinde `Onion-Location` ekliyor. Buradan alınacak ders başlığı yalnızca gerçek onion hedefi ve ayarlı bir host adı varken üretmek; adres yokken örnek veya varsayılan adres göstermemek.

**Önemli sınır:** Şimdilik bu bir hemen yapılacak iş değil. Site belgelerinde yayımlanmış onion/I2P adresi yok. Önce Vercel'den bağımsız, işletilecek gerçek hedef, TLS/erişim kararı, izleme ve güncelleme sorumluluğu belirlenmeli. Bu altyapı olmadan sadece manifest/başlık eklemek yanlış bir erişilebilirlik iddiası olur.

### 4. Anahtar rotasyonu zamanı geldiğinde imzalı geçiş zinciri

Mevcut kimlik sayfaları geçerli PGP anahtarını ve imza doğrulamayı gösteriyor, ancak zaman içinde eski ve yeni parmak izlerinin güven ilişkisini gösterecek bir kamuya açık rotasyon zinciri belgelerde görünmüyor. Bir sonraki gerçek anahtar değişiminde, eski ve yeni anahtarlarla imzalanmış kısa bir geçiş bildirisi; her iki parmak izi, geçiş tarihi, eski imzaların nasıl doğrulanacağı ve yeni anahtarın hangi tarihten itibaren kullanılacağıyla yayımlanabilir. Arşivlenmiş tarihsel imzalar korunmalı; güncel anahtar bilgisi ayrı ve belirgin kalmalı.

GitHub'daki [`siketyan/pgp-key-transition`](https://github.com/siketyan/pgp-key-transition) bunun somut bir örneğini içeriyor: bildiride eski ve yeni anahtarın parmak izleri yer alıyor ve README iki anahtarla imzalandığını söylüyor. Depo 0 yıldızlı ve lisans bildirmiyor; bu nedenle kod/paket seçimi olarak değil, dar bir belge biçimi örneği olarak değerlendirildi. Daha kurumsal prosedür karşılaştırması için [Apache anahtar geçiş rehberi](https://infra.apache.org/key-transition.html) mevcut.

Bugün geçiş kaydı üretmeye gerek yok. Geçerli anahtar 15 Ekim 2026'da oluşturulmuş ve yaklaşık iki yıllık geçerlilik süresiyle görünüyor; rotasyon gündemi yaklaşınca mevcut imza sistemiyle bir geçiş akışı tasarlamak daha anlamlı.

## Bilerek önermediklerim

- **Yeni “kanıt gezgini”:** PGP, Log sürüm geçmişi, imza indirmeleri, OTS kayıtları ve doğrulama mevcut. Yeniden paketlemek keşfedilebilirliği iyileştirebilir; fakat tek başına yeni özellik gibi sunulursa tekrar olur. Önce vaka yazısı ve mevcut doğrulama bağlantılarının bulunabilirliği ele alınmalı. OpenTimestamps'in kendi sitesi zaten damgalama/doğrulama arayüzü sağlıyor; [istemci deposu](https://github.com/opentimestamps/opentimestamps-client) yerel Bitcoin Core ile bağımsız doğrulamayı tarif ediyor.
- **GitHub Artifact Attestations ile sitenin her derlemesini imzalama:** GitHub bunu çalıştırılabilir yazılım paketleri için tavsiye ediyor; tekil dokümantasyon/görsel dosyaları veya sık test derlemeleri için tavsiye etmiyor. Bu portfolyo için ziyaretçiye katacağı değer düşük; yanlış bir güvenlik garantisi algısı doğabilir. [GitHub'ın kapsam ve sınırları](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- **Deprem küresi, erişilebilir rota haritası veya genel görsel demo:** İlgi çekici olabilir ancak mevcut kişisel kimlik/yayın sistemiyle doğal bağ kurmuyor. Araştırmanın önceki sürümündeki bu fikirler başka bir proje vitrini içindi; mevcut siteyi güçlendirme talebine yanıt değiller.
- **Yeni bağış durum panosu veya canlı tahsilat iddiası:** Dağıtım, gerçek ağ ve kurtarma doğrulamaları tamamlanmadan ödeme akışını üretimdeymiş gibi göstermek doğru değil.
- **İçerik olmadan `/work`, `/notes`, `/links` açmak:** Önceki site araştırmasında zaten ele alındı; gerçek içerik ve seçki oluşmadan boş rota yayımlamak fayda sağlamıyor.

## Sonuç

**Önerilen sıra:** önce mevcut sitenin gerçeklerini ve sınırlarını anlatan tek bir vaka yazısı; ardından canlı bölümlerin güncellik/kapsam etiketleri; daha sonra gerçekten yayımlanan alternatif erişim adresleri varsa imzalı manifest ve Tor keşif başlığı; anahtar rotasyonu geldiğinde imzalı geçiş zinciri.

Bu sıralama ziyaretçiye daha anlaşılır bir portfolyo sunuyor ve ileri fikirleri gerçek altyapı oluşana kadar bekletiyor. En gösterişli sonuç onion/I2P kimliğini PGP imzasıyla ilişkilendiren manifest olabilir; uygulanabilirliği adreslerin gerçekten işletilmesine bağlı. Bu nedenle rapor, hemen geliştirme talebi yerine koşullu bir yol haritası sunuyor.

## Araştırma kaynakları

- [Tor Project — Onion-Location](https://community.torproject.org/onion-services/advanced/onion-location/)
- [Tor Project — HTTPS for your Onion Service](https://community.torproject.org/onion-services/advanced/https/)
- [GitHub — `siketyan/pgp-key-transition`](https://github.com/siketyan/pgp-key-transition)
- [Apache — PGP key transition](https://infra.apache.org/key-transition.html)
- [GitHub — `bitcart/bitcart` onion ara katmanı](https://github.com/bitcart/bitcart/blob/6388adcf017907d975eed4ed4a1b975d5e120059/api/middleware/onion.py)
- [GitHub — OpenTimestamps client](https://github.com/opentimestamps/opentimestamps-client)
- [GitHub Docs — Artifact attestations](https://docs.github.com/en/actions/concepts/security/artifact-attestations)
- Önceki repo içi araştırma: [kişisel siteler, yayınlama ve küçük araçlar](../github-research-2026-10-15.md)
