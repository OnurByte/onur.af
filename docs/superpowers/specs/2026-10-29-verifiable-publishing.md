# onur.af ⁜ Verifiable Publishing Protocol

29 Ekim 2026 ⁜ Mimari araştırma ve uygulama planı ⁜ Kod değişikliği yok

Bu araştırmanın sonucu olarak dört ayrı özellik yerine, onur.af'ın mevcut Log sisteminin üzerine kurulacak tek bir yayın ve referans protokolü öneriyorum.

Temel prensip:

Bir metin yayımlandıktan sonra yalnızca okunabilen değil; geçmişine erişilebilen, belirli pasajlarına atıfta bulunulabilen, başka sistemlere taşınabilen ve bağımsız olarak denetlenebilen bir kaynak olmalı.

Bunun için mevcut PGP, OTS, Log revision, Quote ve Annotation sistemleri korunmalı. Yeni protokoller bunların yerine geçmemeli.

## 1. Mimari karar

Immutable Publication

Signed Markdown ⁜ PGP ⁜ Manifest ⁜ OTS

Temporal Layer

Memento

Hangi tarihte hangi sürüm?

Reference Layer

STAM + Web Annotation

Hangi sürümün hangi pasajı?

Interaction Layer

Webmention

Kim, nerede referans verdi?

Transparency Layer

Sigsum

Yayın kanıtı dışarıdan gözlemlendi mi?

Katmanların her biri kendi doğrulama ve hata durumuna sahip. Birinin arızalanması diğerlerinin kanıtlarını geçersiz kılmıyor.

### İlk araştırma bulgusu: mevcut modelde korunması gereken üç sözleşme var

1. `src/portfolio/log-publications.ts` zaten sıralı, PGP imzalı ve hash-zincirli manifestler üretiyor. Eski manifestlerin baytları değiştirilmemeli.
2. `src/portfolio/annotations/protocol.ts` mevcut `onur-text-v1` metin koordinatlarını UTF-16 ile tanımlıyor. Var olan anotasyonlar ve alıntı bağlantıları başka bir koordinat sistemine sessizce geçirilmemeli.
3. `src/pages/log/[id].astro` güncel Log'u sunarken `LogArticle.astro` geçmiş revizyonları da aynı belgeye ekliyor. Bu sayfa bir Memento olarak kullanılmamalı, çünkü tarihsel tek bir durumu değil, değişebilen birleşik bir sunumu gösteriyor.

Üçüncü nokta özellikle önemli. RFC 7089'a göre `Memento-Datetime` başlığı, dönen kaynağın temsil ettiği tarihsel durumun artık değişmeyeceğine ilişkin bir taahhüt anlamına geliyor. Mevcut canlı Log arayüzünü olduğu gibi Memento ilan etmek bu sözleşmeyi ihlal edebilir.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.rfc-editor.org&sz=32)

rfc-editor.org

## 2. Öncelik sıfır: Değişmez metin koordinatları

Bu, diğer üç sistemden önce çözülmesi gereken teknik mesele.

Mevcut quote URL biçimi:

`/log/{id}/quote/v{revision}-{start}-{end}`

Anotasyonlarda ise `onur-text-v1`, `TextQuoteSelector` ve `TextPositionSelector` kullanılıyor. Sorun yalnızca UTF-16 ile Unicode codepoint farkı değil. Metnin DOM üzerinden çıkarılması; Markdown renderer, footnote, matematik ve oluşturulan yardımcı öğeler değiştiğinde farklı sonuçlar verebilir.

### Önerdiğim sözleşme

Her revizyonun bir Text Projection kimliği olmalı. Protokol şu bilgileri ayrı ayrı tanımlamalı:

| Alan                        | Anlamı                                   |
| --------------------------- | ---------------------------------------- |
| `revisionHash`              | İmzalı Markdown'un SHA-256 değeri        |
| `projectionVersion`         | Metin çıkarma ve normalizasyon kuralları |
| `projectionHash`            | Çıkarılan metnin hash'i                  |
| `start`, `end`              | Belirlenmiş sürümdeki UTF-16 aralığı     |
| `exact`, `prefix`, `suffix` | Bağlamlı metin eşlemesi                  |

Bu yeni bir kaynak kodu şeması değil, uygulanmasını önerdiğim veri sözleşmesi.

Eski `v1-start-end` bağlantıları çalışmaya devam etmeli. Yeni bir projection sürümü gerekirse eski bağlantıların anlamını değiştirmek yerine eski çözümleyici korunmalı.

### W3C ile birleştirme

W3C Web Annotation veri modeli, metin aralığı dışında `TimeState` de tanımlıyor. Bu özellik, bir anotasyonun kaynağın hangi tarihsel durumuna ait olduğunu belirtmesini sağlıyor; `sourceDate` ve `cached` gibi alanları var.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.w3.org&sz=32)

w3.org

+1

Burada Memento ile doğrudan birleşme mümkün:

- Anotasyon, imzalı revizyonun kimliğini ve hash'ini taşır.
- `TimeState`, o revizyonun tarihsel temsilini gösterir.
- Memento URL'si, başka bir anotasyon istemcisinin aynı sürümü bulmasını sağlar.
- Text selector, o sürümün içindeki belirli pasajı tanımlar.

STAM ise bu veriyi işlemek için referans model olur. [STAM](https://github.com/annotation/stam?utm_source=chatgpt.com) metin aralıklarını kaynak metinden ayrı tutmayı, üst üste binen seçimleri ve anotasyonlar arası ilişkileri destekliyor.

Tercihim: STAM Rust kütüphanesini canlı Astro/TypeScript sunucusuna zorla bağlama. Önce W3C JSON-LD dışa aktarımını eksiksizleştir, STAM'in metin bütünlüğü ve seçim modellerini uyumluluk testlerinde referans al.

### Kabul kriterleri

- Emoji, birleşik karakterler, Türkçe karakterler, RTL yazı, KaTeX, footnote ve bağlantı içeren örneklerin tamamında aynı metin aralığı seçilmeli.
- Bir renderer güncellemesi eski alıntıların anlamını değiştirmemeli.
- İki aynı cümle farklı yerlerde bulunuyorsa yanlış eşleştirme yapılmamalı.
- Eski anotasyonlar başka bir revizyona kendiliğinden taşınmamalı.
- JavaScript kapalıyken quote sayfası hedef metni göstermeye devam etmeli.
- Farklı cihazda içe aktarılan anotasyon aynı revizyonu ve pasajı göstermeli.

İncelemede ayrıca gördüğüm bir nokta: `management.ts` içinde anotasyon anahtarları ve notları dışa aktarma/içe alma veri işlevleri mevcut. Ancak `docs/witness-protocol.md`, editörde bunlara ait menü bulunmadığını söylüyor. Dolayısıyla taşınabilirlik için sıfırdan yedek formatı tasarlamak yerine, mevcut mekanizmanın güvenli kullanıcı akışını ve farklı cihazlarda kurtarma testlerini tamamlamak daha mantıklı.

## 3. Memento ⁜ Kesin URL ve HTTP tasarımı

Araştırma referansları: [RFC 7089](https://www.rfc-editor.org/rfc/rfc7089.html?utm_source=chatgpt.com), [pywb](https://github.com/webrecorder/pywb?utm_source=chatgpt.com) ve [MemGator](https://github.com/oduwsdl/MemGator?utm_source=chatgpt.com).

Üç uygulama yaklaşımı arasından onur.af için ayrı TimeGate + sabit Memento URL'leri modelini seçiyorum.

| Yaklaşım                                                  | Değerlendirme                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Canlı Log'un `Accept-Datetime` ile farklı HTML döndürmesi | Mevcut Astro sayfası ve cache davranışını karmaşıklaştırır              |
| Ayrı TimeGate'in 200 HTML döndürmesi                      | Çalışır, ancak tarihsel temsilin sabit URL'sini ayrıca yönetmek gerekir |
| Ayrı TimeGate'in 302 ile değişmez revizyona yönlendirmesi | Tercih edilen                                                           |

### URL sözleşmesi

Aşağıdaki yollar öneridir; repoda şu anda mevcut değiller.

| URL                        | Görev                          |
| -------------------------- | ------------------------------ |
| `/log/{id}`                | Güncel Log, değişmez permalink |
| `/log/{id}/timegate`       | Tarihe göre sürüm seçimi       |
| `/log/{id}/timemap`        | Standart Memento TimeMap       |
| `/log/{id}/memento/v{n}`   | Tarihsel temsil                |
| `/log/{id}/verified?v={n}` | Mevcut kriptografik doğrulama  |
| `/proofs/{id}-v{n}.md`     | Mevcut tam imzalı Markdown     |

Böylelikle `verified` ile `memento` farklı işler yapmaya devam ediyor. Birincisi kanıtı, ikincisi tarihsel belgeyi temsil ediyor.

### TimeGate'in davranışı

Birkaç kararı özellikle sabitlemek gerekir:

- İstenen tarih UTC temelli, geçerli HTTP-date formatında olmalı.
- Geçerli tarih verildiğinde o tarihten geç olmayan en yeni arşiv durumunu seçmesini öneriyorum.
- İlk bilinen durumdan daha eski bir tarih için yanlışlıkla gelecekteki sürümü sunmamalı; açık bir bulunamadı yanıtı vermeli.
- Geçersiz tarih, sessizce bugünkü tarihe dönüştürülmemeli.
- `HEAD` ve `GET`, aynı tarih seçim mantığını kullanmalı.
- TimeGate yanıtı `Vary: Accept-Datetime`, `Location` ve ilgili `Link` başlıklarını doğru üretmeli.
- Sabit Memento kaynağı `Memento-Datetime` ve `original` ilişkisini sunmalı; `Accept-Datetime` değerine göre içeriğini değiştirmemeli.

RFC, en yakın veya geçmişteki en yakın sürümü seçme gibi algoritmalara izin veriyor. Buradaki son-önceki-sürüm kuralı, onur.af için benim önerdiğim deterministik politika.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.rfc-editor.org&sz=32)

rfc-editor.org

### Daha zor mesele: yayın tarihi ve arşiv tarihi

Bunlar birbirine karıştırılmamalı.

`publishedAt`, içerikte belirtilen ve imzalanan yayın tarihi.

`archivedAt`, tarihsel temsilin gerçekten dondurulup kayda alındığı zaman.

Geçmişte yayımlanmış bir Log'un bugünden oluşturulan arşivi, geçmişte aynı HTML'nin gerçekten sunulduğunun bağımsız kanıtı değildir.

Bu yüzden eski revizyonları geriye dönük Memento olarak göstermek için iki farklı kavram korunmalı: reconstructed historical revision ve captured historical representation.

Yeni yayınlarda arşivleme adımı aynı publication transaction içinde hazırlanabilir. Eski yayınlarda ise ilk yakalama zamanı açık biçimde korunmalı; `publishedAt` ile sahte bir arşiv zamanı üretilmemeli.

### Arşiv içeriği

Tarihsel HTML'nin değişmez olduğunu iddia etmek için yalnızca metni sabitlemek yetmez. O HTML'ye bağlı görseller, içerik konumu ve tarihsel gösterim sözleşmesi de tanımlanmalı.

En uygun model:

- Dışarıdan gelen dinamik istatistikler, canlı anotasyonlar ve Webmention'lar tarihsel HTML'nin içine gömülmez.
- Tarihsel metnin kendisi, varsa orijinal medya hash'leriyle birlikte korunur.
- Güncel `History` arayüzü sabit Memento'ya bağlantı verir.
- Eski bir Memento açıldığında okur `Current revision` üzerinden bugünkü Log'a dönebilir.
- Tarihsel kanıtlar mevcut `/verified` yolundan sunulmaya devam eder.

Kaynağın tarihsel temsili ile bu kaynağa bugün verilen yorumlar ayrı yaşam döngülerine sahip olur.

### Memento kabul testleri

Bir zaman dizisinde v1, v2 ve v3 bulunduğunu düşün. V2 yayımlanmadan bir saniye önceki istek doğru tarihsel durumu; v2 arşivlendikten sonraki istek v2'yi seçmeli. Zaman dilimi farkları sonucu değiştirmemeli.

Ayrıca aynı Memento URL'si iki farklı deploy sonrasında aynı tarihsel temsilin anlamını korumalı. Yanlış `Vary` nedeniyle CDN veya tarayıcı cache'i bir okuyucuya başka tarih için seçilmiş sonucu vermemeli.

Memento'yu uygulamak için pywb veya MemGator'ı sunucuda çalıştırmaya gerek yok. pywb arşiv koleksiyonları ve replay için, MemGator ise birden fazla arşivin zaman dizinlerini toplamak için tasarlanmış. onur.af'ın kendi revizyon kaynağı bulunduğundan küçük bir Astro adaptörü yeterli olabilir.

## 4. Webmention ⁜ Gelen referans protokolü

Kaynaklar: [W3C Webmention](https://www.w3.org/TR/webmention/?utm_source=chatgpt.com) ve [Webmention Rocks testleri](https://github.com/aaronpk/webmention.rocks?utm_source=chatgpt.com).

### Önerilen veri modeli

Bir gelen Webmention'ın temel kimliği:

`(source URL, target URL)`

Bunun yanında doğrulama sonucu, son kontrol zamanı, yönlendirmeden sonra alınan kaynak URL, içerik özeti ve moderasyon durumu tutulmalı.

Hedefler iki ayrı sınıfta çözümlenmeli:

Article mention

`/log/{id}`

Log'un bütününe verilen referans.

Passage mention

`/log/{id}/quote/vN-start-end`

İmzalı bir revizyonun belirli pasajına verilen referans.

Bir kaynak ikisine de atıf yapıyorsa iki farklı hedef ilişkisi bulunabilir. Fakat aynı source-target çifti için yeni bildirimler ayrı ayrı çoğaltılmamalı.

### Durum makinesi

Queued

Fetching

Validated

Doğrulama başarılıysa, gösterim kurallarına göre yayınlanabilir.

Başarısız veya daha sonra değişen kaynaklar için:

Rejected

Unreachable

Removed

`Unreachable` ile `Removed` ayrılmalı. Kaynağa geçici olarak ulaşılamaması, bağlantının gerçekten silindiği anlamına gelmiyor.

W3C, aynı source-target çiftinin güncellenebilmesini, tekrar bildirimlerinin idempotent olmasını ve kaynak artık hedefe bağlantı vermiyorsa kayıtların kaldırılabilmesini öneriyor.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.w3.org&sz=32)

w3.org

### Alıntılarda neden ayrı URL önemli?

`#fragment` içeren bağlantılarda fragment HTTP isteğiyle sunucuya gönderilmez. Webmention POST içindeki hedef değerinde korunabilir; ancak bunun doğru ele alınması alıcının uygulamasına bağlıdır.

Mevcut quote URL'lerin hedef aralığını path üzerinde tanımlaması daha sağlam bir temel oluşturuyor.

Örneğin harici bir site şu adrese bağlantı verdiğinde:

`https://onur.af/log/{id}/quote/v2-40-170`

Alıcı, bu hedefin gerçekten var olan bir revizyon ve geçerli bir metin aralığı olduğunu kendi sunucusunda kontrol edebilir.

### Güvenlik kararı

Mevcut `src/portfolio/public-request.ts` zaten public HTTPS, DNS kontrolü, socket pinning, redirect ve response-size sınırlamaları içeriyor. Gelen Webmention doğrulaması için yeniden kullanılabilecek bir temel.

Fakat inbound endpoint'e yeni sınırlar gerekli:

| Kontrol           | Kural                                               |
| ----------------- | --------------------------------------------------- |
| Target allowlist  | Yalnızca kabul edilen kanonik Log ve Quote URL'leri |
| Source fetch      | SSRF kontrollü, bounded GET                         |
| Response parsing  | Küçük ve desteklenen içerik türleri                 |
| Deduplication     | Veritabanı unique constraint                        |
| Retries           | Sınırlı, idempotent ve gecikmeli                    |
| Content rendering | Harici HTML doğrudan çalıştırılmaz                  |
| Moderation        | Kaynak bazlı engelleme ve görünürlük kontrolü       |
| Revalidation      | Bağlantı kaldırıldığında durum güncellenir          |

Ek olarak, ilk sürümde gelen kaynağın tüm yazısını kopyalamak gereksiz. Kaynak başlığı, URL ve kısa doğrulanmış bir alıntı yeterli olabilir.

`noindex` olan veya `unlisted` Log'lar için de ayrı karar gerekli. Doğrudan erişilebilir olmak, otomatik olarak dış referansları herkese listeleme izni anlamına gelmiyor. Başlangıçta yalnızca listelenmiş kamusal Log'lara izin vermeyi öneriyorum.

### Kabul kriteri

[Webmention Rocks](https://webmention.rocks/?utm_source=chatgpt.com) test paketi temel protokol uyumluluğunda kullanılmalı. Ayrıca ayrı adversarial testler gerekiyor: DNS rebinding, private IP yönlendirmesi, büyük HTML, bozuk URL encoding, tekrar bildirimleri, `410 Gone`, bağlantı kaldırılması, aynı kaynakta iki quote URL ve arşivlenmiş revizyona gelen referans.

Dağıtım modeli: Gönderimden bağımsız PostgreSQL depolaması ve asenkron doğrulama. Mevcut `log:distribute` işleyişi değişmeyecek. Receiver kapalıyken Log, Quote, RSS ve PGP çalışmaya devam edecek.

## 5. Sigsum ⁜ Yayın şeffaflığı için kesin mimari

İncelediğim kaynaklar:

[sigsum-go](https://github.com/sigsum/sigsum-go?utm_source=chatgpt.com) ⁜ [sigmon](https://github.com/florolf/sigmon?utm_source=chatgpt.com) ⁜ [Torchwood](https://github.com/FiloSottile/torchwood?utm_source=chatgpt.com) ⁜ [C2SP Witness Protocol](https://c2sp.org/tlog-witness?utm_source=chatgpt.com).

Burada en önemli tasarım kararı şu:

Sigsum, mevcut PGP imzasını doğrulamanın başka bir yolu değil; hangi yayın kanıtlarının kamuya açık kayda alındığını ve bunun bağımsız tanıklarca gözlemlendiğini denetleme sistemi olmalı.

### 5.1. Neyi Sigsum'a kaydedeceğiz?

Mevcut `log-publication-vN.json` manifestinin tam baytları otorite olmaya devam etmeli.

Her yeni edisyon için ayrıca, onur.af'a özgü sürümlenmiş bir transparency statement hazırlanmasını öneriyorum.

| Alan                      | Bağlayacağı bilgi               |
| ------------------------- | ------------------------------- |
| Format version            | onur.af transparency sözleşmesi |
| Site origin               | `https://onur.af`               |
| Publication sequence      | İmzalı manifest edisyonu        |
| Manifest SHA-256          | Tam kanonik manifest baytları   |
| PGP root fingerprint      | Yayın otoritesi                 |
| Previous manifest SHA-256 | Mevcut yayın zinciriyle ilişki  |

Bu statement, mevcut imzalı manifestin içine eklenmemeli. Ayrı ve değişmez bir türetilmiş kanıt olmalı.

Sigsum submitter anahtarı bu statement'ın digest'ini, Sigsum'un belirlediği Ed25519 imzalama formatıyla kaydeder. Doğrulayıcı statement'ın hash'ini ve manifestle ilişkisini ayrı kontrol eder.

Böylelikle eski `onur.log.proof.v2` veya publication manifest formatını değiştirmeye ihtiyaç kalmaz.

Sigsum leaf protokolündeki checksum hesaplaması da dikkat gerektiriyor: uygulamanın gönderdiği 32 baytlık `message` ayrıca Sigsum tarafından hash'leniyor. Uygulama düzeyindeki hash ile Sigsum leaf checksum'ını aynı değer gibi karşılaştırmak hatalı olur. [Log protocol specification](https://github.com/sigsum/sigsum/blob/main/log.md?utm_source=chatgpt.com).

### 5.2. Anahtarların yetki ayrımı

PGP Publication Key

Log içeriğini, manifestleri ve Sigsum submitter kimliğine ait yetki beyanını imzalar. Web sunucusunda bulunmaz.

Sigsum Submitter Key

Yalnızca dış şeffaflık kaydı için kullanılır. Tek başına yeni Log yayımlama yetkisi vermez.

Sigsum Rate-limit Key

Public log'a gönderim yetkilendirmesi içindir. Domain TXT kaydı ve submit token mekanizmasıyla ilişkilidir.

External Witness Keys

Dış operatörlerin tuttuğu anahtarlar. onur.af bunları üretmez veya kendi tanıklığını bağımsız gibi göstermez.

Mevcut Witness Stats anahtarı bunların hiçbirinde yeniden kullanılmamalı.

Bu ayrım sayesinde yayın imzası, analitik kanıtı ve harici şeffaflık kanıtı birbirinin yetkilerini devralmaz.

### 5.3. Trust policy seçimi

Sigsum'un resmî rehberi test policy'leriyle production policy'lerini ayırıyor. Desteklenen araçlar birden fazla log ve witness için kural tanımlayabiliyor.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://www.sigsum.org&sz=32)

sigsum.org

Benim seçimim, Sigsum'un bakımını yaptığı production policy ailesinden başlayıp kullanılan sürümü açıkça sabitlemek.

Ancak doğrulama açısından üç ayrı veri korunmalı:

1. Kullanılan trust policy'nin tam sürümü veya içeriği.
2. Policy'nin checksum'ı ve güvenilen log/witness anahtarları.
3. Proof'un hangi policy altında başarıyla doğrulandığı.

Bu ayrım, ileride Sigsum'un tanık kümesi değiştiğinde eski proof'ların doğrulanması için önemli.

Örneğin iki yıl sonra sitenin güncel policy'si farklı olabilir. Eski bir Log için eski policy'nin otomatik olarak geçersizleşmesi istenmez. Bununla birlikte eski policy'yi sınırsız güvenli saymak da doğru değildir; güven politikalarının geçerlilik ve emeklilik geçmişi ayrı tutulmalı.

### 5.4. Witness yeterli, monitor gerekli mi?

Evet, ikisi farklı görev yapıyor.

C2SP'nin tanık protokolü, witness'ın önceki checkpoint ile yenisi arasındaki tutarlılığı denetleyip yeni checkpoint'i imzalamasını tanımlıyor. Böylece belirli split-view saldırılarını önlemek için kullanılan kanıtlar güçleniyor.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://c2sp.org&sz=32)

C2SP

Monitor ise belirli submitter anahtarlarıyla yapılan imzalama faaliyetlerini izler.

Birisi yetkisiz biçimde Sigsum submitter anahtarını kullanırsa, monitor beklenmedik leaf'i tespit edebilir. Fakat bunun için gerçekten çalışan ve kayıt geçmişini izleyen bir monitor gerekir.

Burada önemli bir olgunluk sınırı da var: C2SP witness protokolü, monitor'lerin eski veya ayrılmış bir görünümle kandırılmasını önlemeye yönelik mekanizmanın bir bölümünü hâlâ tartışma konusu olarak belgeliyor. Dolayısıyla Sigsum'un bütün split-view/güncellik problemlerini koşulsuz çözdüğünü iddia etmemek gerekiyor.&#x20;

[image](https://www.google.com/s2/favicons?domain=https://c2sp.org&sz=32)

C2SP

### 5.5. Benim önerdiğim monitor mimarisi

Başlangıçta `sigmon` referans alınabilir. Ancak monitor'ü Vercel deployment'ının içine yerleştirmezdim.

Bağımsız izleme şu özellikleri taşımalı:

- onur.af web uygulaması kapalıyken de çalışabilmeli.
- İzlenen son checkpoint'i kendi kalıcı depolamasında saklamalı.
- Yeni leaf'leri sıra kaybetmeden kontrol etmeli.
- Beklenmedik Sigsum submitter imzasını bildirmeli.
- Log'un sağladığı ağaç geçmişinin tutarlılığını izlemeli.
- Uyarının bağımsız bir iletişim kanalına ulaşmasını sağlamalı.

Tek başına aynı GitHub hesabında çalışan bir Action, güçlü bağımsız tanıklık anlamına gelmez. Web sitesiyle aynı yetkilere bağlı bir monitor, ortak hesap ele geçirilmesine karşı sınırlı koruma sağlar.

Bu nedenle ilk aşamada monitor çalışıyor demek yerine gerçek bağımsız çalışma ve veri saklama koşullarını kabul kriteri yapardım.

### 5.6. Proof yaşam döngüsü

Not submitted

Dış kayıt yok

Submission pending

Henüz proof yok

Logged

Inclusion + quorum verified

Externally observed

Bağımsız monitor kanıtı mevcut

Verification failed

Kanıt reddedildi

Sigsum'da ilk `202 Accepted` yanıtı, yaprağın kalıcı ve doğrulanmış biçimde log'a dahil edildiğini kanıtlamaz. Kullanıcıya `Logged` göstermek için geçerli inclusion proof ve istenen witness quorum'unun doğrulanması gerekiyor. [Sigsum protokolü](https://github.com/sigsum/sigsum/blob/main/log.md?utm_source=chatgpt.com).

### 5.7. Mevcut arşivle entegrasyon

Mevcut Log arşivinde imzalı Markdown, OpenPGP imzaları, publication history ve OTS receipt'leri korunuyor.

Sigsum kanıtlarını mevcut dosyaların yerine koymadan ayrı bir transparency evidence paketi olarak eklerdim.

Önerilen dosya ailesi:

| Dosya                      | İçerik                                          |
| -------------------------- | ----------------------------------------------- |
| `publication-vN.sigsum`    | Sigsum proof                                    |
| `publication-vN.statement` | Sigsum'a bağlanan uygulama beyanı               |
| `policy`                   | Doğrulama politikası                            |
| `key-authority.asc`        | Submitter anahtarının PGP ile yetkilendirilmesi |
| `monitor-checkpoint`       | Varsa bağımsız gözlemci kaydı                   |

Bu isimler öneri; mevcut repo dosyaları değil.

Sigsum kanıtı sonradan gelirse eski imzalı dosya değişmez. Yeni kanıt pakete eklenir. Paket tekrar üretildiğinde mevcut kanıtların hash'leri kontrol edilir.

### 5.8. Zorunlu adversarial testler

| Saldırı / hata                                           | Beklenen sonuç                                                    |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| Manifestte tek bayt değişiklik                           | PGP veya Sigsum binding reddeder                                  |
| Farklı edisyona ait Sigsum proof                         | Reddedilir                                                        |
| Witness imzası eksik                                     | Quorum sağlanmıyorsa reddedilir                                   |
| Policy sessizce değiştirilmiş                            | Önceden sabitlenen policy ile uyuşmaz                             |
| Eski geçerli manifest sunuluyor                          | Bağımsız güncellik/checkpoint karşılaştırması varsa tespit edilir |
| Sigsum servisi erişilemiyor                              | Log okunur; dış tanıklık pending kalır                            |
| Submitter key ele geçirilmiş                             | İzleniyorsa beklenmedik kullanım tespit edilebilir                |
| PGP ile imzalanmış ama Sigsum'a girilmemiş yeni manifest | Sıkı transparency politikasında kabul edilmez                     |
| Gözlemci uzun süre çalışmamış                            | Güncel gözlem iddiası verilmez                                    |

Son iki satır özellikle önemli. Sigsum'un gerçek güvenlik değeri, doğrulayıcının onu hangi koşullarda zorunlu tuttuğuna bağlı.

## 6. Dört protokolün birlikte yayın akışı

Mevcut `log:publish` işlemini merkezde tutardım.

Önerilen publication pipeline

1 ⁜ Local publication

Signed revision + manifest + OTS preparation

2 ⁜ Immutable presentation

Frozen text projection + Memento resource

3 ⁜ Verification and deployment

Current signed-content gates + production deployment

4a ⁜ Distribution

Outbound Webmention + inbound reference availability

4b ⁜ Transparency

Sigsum submit + proof + monitor

Burada external Webmention ve Sigsum işlemlerini yerel publication transaction'ın zorunlu parçası yapmazdım.

Aksi hâlde bir üçüncü taraf servisinin kesintisi yüzünden yerel imzalama veya yayın hazırlama başarısız sayılabilir.

Bunun yerine ayrı, tekrar çalıştırılabilir ve kalıcı durum tutan dağıtım işlemleri gerekir.

Bunun karşılığında yayının geçerli olmasıyla dışarıdan tanıklanmış olması farklı durumlar hâline gelir. Kullanıcı arayüzü de bu ayrımı doğru yansıtmalı.

## 7. Uygulama planı ve geçiş kapıları

Bu sırayı öneriyorum. Önceki aşama kabul edilmeden sonraki aşamanın üretimde etkinleştirilmesi gerekmiyor.

## 01

Text Identity & Projection

Önce mevcut Quote, Annotation ve LogRevision metin çıkarımını tek bir sözleşmeyle hizala.

İncelenecek: `log-quote.ts`, `log-markdown.ts`, `annotations/protocol.ts`, `api/annotations/index.ts`, `LogRevision.astro`.

Kabul: Aynı revizyon bütün render yollarında aynı metin kimliğine ve koordinatlara sahip. Eski bağlantılar korunuyor.

## 02

Temporal Publication

Immutable snapshot, TimeGate, TimeMap, doğru HTTP başlıkları ve mevcut History arayüzüne bağlantılar.

İncelenecek: `log.ts`, `LogArticle.astro`, `LogRevision.astro`, `docs/log-and-proofs.md`, routing ve build adımları.

Kabul: RFC 7089 davranışları, zaman aralığı sınırları, cache ve immutable snapshot testleri geçiyor.

## 03

Webmention Receiver

Gelen referansların doğrulanması, quote hedefleri, tekrar kontrol ve güvenli görüntüleme.

İncelenecek: `webmention.ts`, `public-request.ts`, `LogArticle.astro`, Quote route ve PostgreSQL servisleri.

Kabul: Webmention Rocks uyumluluğu, SSRF testleri, idempotency ve kaldırılan bağlantıların yaşam döngüsü.

## 04

Portable Annotation Identity

JSON-LD TimeState, güvenli anahtar yedeği, başka cihazdan geri yükleme ve isteğe bağlı kriptografik kimlik doğrulama.

İncelenecek: `annotations/management.ts`, `web-annotation.ts`, `client/annotations.ts` ve annotation API.

Kabul: Yedek başka cihazda çalışıyor; private key açıkta kalmıyor; PGP key possession doğrulanmadan Verified etiketi üretilmiyor.

## 05

Sigsum Proof Experiment

Bir test publication manifesti üzerinde ayrı signing key, production policy değerlendirmesi, inclusion proof ve çevrimdışı doğrulama.

İncelenecek: `log-publications.ts`, `publication-checkpoints.ts`, `log-bundle.ts`, verifier ve key history.

Kabul: Proof bütünlüğü, yanlış policy reddi ve eski PGP/OTS kanıtlarıyla birlikte doğrulama.

## 06

External Witness Operations

Bağımsız monitor, güven politikası geçmişi, kalıcı checkpoint ve hata bildirimleri.

Kabul: Web uygulamasından bağımsız izleme gerçekten çalışıyor; kesinti, beklenmedik leaf ve stale checkpoint senaryoları sınanıyor.

### Yayına alma ve geri dönüş

Geçişin güvenli olması için her katman ilk aşamada opsiyonel etkinleştirilmeli.

| Sorun                             | Geri dönüş                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Memento yanıtları yanlış          | TimeGate kapatılır; eski Log/History korunur                                  |
| Webmention spam veya SSRF açığı   | Inbound kabulü kapatılır; kayıtlar incelenir                                  |
| Annotation projection uyumsuzluğu | Eski projection resolver korunur; yeni sürüm kullanımı durdurulur             |
| Sigsum gönderimi başarısız        | Yayın durur değil, transparency pending kalır                                 |
| Monitor güvenilir değil           | External observation iddiası kaldırılır, eldeki doğrulanmış proof'lar korunur |

En önemli geri dönüş kuralı: Bir protokolü devre dışı bırakmak için daha önce imzalanmış baytların değiştirilmesi gerekmemeli.

## 8. Arayüzde nasıl görünmeli?

Burada mevcut `brand.md` ve `docs/design.md` çizgisinden çıkmaya gerek yok.

## Build something useful

17 Oct 2026

⁜

v2

⁜

Verified

The first version of an idea is easy to settle for. But there is usually another question worth asking before calling it done...

History

2 revisions

v1

v2

Compare

Referenced elsewhere

Dış referans varsa ilgili pasajda veya bu bölümde gösterilir.

Publication evidence

PGP ⁜ OTS ⁜ Sigsum

Önerilen bilgi hiyerarşisi; canlı istatistik veya doğrulanmış Sigsum durumu gösterilmiyor.

Mevcut seçim toolbar'ı korunmalı. Webmention için metin seçimine üçüncü bir eylem eklenmesine gerek yok.

Okuyucu metni seçer, Quote bağlantısını kopyalar, kendi sitesinde kullanır. onur.af gelen Webmention'ı ilgili pasajla ilişkilendirir.

Yani yeni özellik, okurun üzerine yeni bir UI yüklemiyor.

## 9. Araştırmadan çıkan en kritik riskler

| Risk                                                         | Etkisi                                      | Öncelik |
| ------------------------------------------------------------ | ------------------------------------------- | ------- |
| Farklı render yollarının farklı metin çıkarması              | Yanlış Quote veya Annotation hedefi         | Kritik  |
| Geçmiş HTML'nin gerçek immutable snapshot olmaması           | Memento iddiasının bozulması                | Kritik  |
| Sigsum key ve policy güveninin aynı web sunucusuna dayanması | Bağımsız doğrulamanın zayıflaması           | Kritik  |
| Çalışmayan veya bağımsız olmayan monitor                     | Beklenmedik imzaların fark edilmemesi       | Yüksek  |
| Webmention'da SSRF ve spam                                   | Sunucu güvenliği ve içerik kalitesi         | Kritik  |
| Annotation private key yedeğinin korunmaması                 | Kimlik kaybı veya anahtar ifşası            | Yüksek  |
| Çok sayıda yeni sayfa ve kontrol eklenmesi                   | onur.af'ın sade yayın deneyiminin bozulması | Orta    |

Bir somut kod inceleme bulgusu daha var: `api/annotations/index.ts`, metni üretirken `renderLogContent(revision.body, '', 0)` kullanıyor; mevcut Log/Quote render yollarında ise kaynak sayısı gibi parametreler farklı aktarılabiliyor. Bunun gerçekten farklı metin ürettiğini doğrulamadım, fakat projection testlerinin özellikle bu yolları karşılaştırması gerekiyor.

## Sonuç

Ben projeyi şu öncelikle güçlendirirdim:

Önce metnin kimliğini dondur, sonra zamansal erişimi kur, ardından dış referansları kabul et ve en sonunda yayın zincirini bağımsız tanıklığa bağla.

Sigsum için de bütün özellikleri bir kerede üretime taşımak yerine yalnızca bir gerçek manifest edisyonu üzerinde uçtan uca deneme yapmak daha güvenli. Bu denemede dış trust policy, geçerli inclusion proof, en az bir bağımsız doğrulayıcı ve monitor davranışı kanıtlanmadan kullanıcıya `Externally verified` gösterilmemeli.

Bu tasarımın farkı, dört yeni protokol eklemekten ziyade mevcut yayınların birbirleriyle tutarlı, taşınabilir ve daha az güven varsayımına bağımlı hâle gelmesi.

Kod yazmadım veya repoda değişiklik yapmadım.
