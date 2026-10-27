# onur.af ⁜ Witness & Annotation Protocol

**Implementation plan · v1.0 · 27 October 2026**

## 1. Amaç

onur.af'ın mevcut Log yayın sistemine, görüntülenmeleri ölçen ve bu ölçümlerin geçmişini kriptografik olarak denetlenebilir kılan bir altyapı eklemek.

Sistem üç yetenekten oluşacak:

1. **Witness:** Her Log için aynı tarayıcı fingerprint'inin yalnızca ilk ziyaretini saymak.
2. **Statistics & Attestation:** İstatistikleri mevcut `/verified#stats` bölümünde göstermek; kabul edilen ziyaretleri OpenTimestamps kanıtlarına bağlamak.
3. **Annotation:** Okurların yazının belirli metin aralıklarına anotasyon iliştirebilmesini sağlamak.

Bunlar bağımsız ama uyumlu modüller olacak. Witness altyapısı, Log imzalarını veya mevcut yayın iş akışını değiştirmeyecek. Annotation sistemi, witness kimliklerini kullanmayacak.

### Ürün ilkeleri

- Log, tek kanonik yayın modelidir. Alternatif makale kataloğu oluşturulmaz.
- Like, yıldız, oy, klasik yorum dizisi veya etkileşim puanı eklenmez.
- Mevcut imzalı Markdown, PGP imzaları, OpenTimestamps makbuzları ve yayın manifestleri değişmez.
- Veri ilkesi, okunabilirlikten daha fazla bilgiyi toplamamaktır.
- Analitik arayüzü anlaşılır ve tanıdık olabilir. Farklılaşma, gereksiz görsel deneylerde değil veri modelindedir.
- Ölçülen bir değer ile kriptografik olarak doğrulanan bir değerin kapsamı açıkça ayrılır.
- Site, JavaScript veya analitik kullanılmasa da okunabilir kalır.

## 2. Adresler ve gezinme

Mevcut adresler korunacak.

| Adres                           | Görev                              |
| ------------------------------- | ---------------------------------- |
| `/log/{id}`                     | Makalenin güncel sürümü            |
| `/log/{id}/verified`            | Makalenin tüm doğrulama bilgileri  |
| `/log/{id}/verified#stats`      | Görüntülenme istatistikleri        |
| `/log/{id}/verified#timestamps` | Mevcut zaman damgası bölümü        |
| `/log/{id}/verified?v=N`        | Belirli revizyonun yayın kanıtları |

`#stats` yeni bir route değildir; mevcut Verified sayfasında gerçek bir HTML bölümüdür.

Log başlığının altındaki metadata satırına sade bir bağlantı eklenir:

**`1,284 views`**

Bağlantı doğrudan `/log/{id}/verified#stats` adresine gider. Kullanıcı önce boş bir dashboard'a veya farklı bir uygulamaya yönlendirilmez.

`#stats`, bütün Log'a ait ömür boyu istatistikleri gösterir. `?v=N` sorgu parametresi ise yalnızca yayın kanıtlarının seçili revizyonunu etkiler. Bu iki kapsam birbirine karıştırılmaz.

## 3. Görüntülenme semantiği

### 3.1. Bir görüntülenme ne zaman sayılır?

Varsayılan kural:

> Bir Log için, ölçüme katılan aynı fingerprint'ten gelen ilk kabul edilmiş ziyaret bir view oluşturur. Sonraki ziyaretler toplamı artırmaz.

Örneğin:

- Aynı Log'u aynı tarayıcıdan 20 kez açmak: 1 view.
- Aynı tarayıcıda önce v1'i, sonra v2'yi okumak: 1 view.
- Başka bir Log'u okumak: o Log için ayrı 1 view.
- Yeni bir fingerprint veya algoritma değişikliği: eşleştirilemezse yeni view oluşabilir.

Bu, benzersiz insan sayısı değildir. FingerprintJS'in doğruluk ve kararlılık sınırları nedeniyle **tahmini tekil tarayıcı ölçümü** olarak tanımlanır.

### 3.2. İlk ziyaretin koşulları

- Yalnızca kanonik `/log/{id}` sayfasında ölçüm başlatılır.
- Sayfa görünür durumda olmalı ve gerçek bir belge açılışı gerçekleşmiş olmalı.
- Link önizlemeleri, RSS istekleri, `.md` indirmeleri, Verified ekranları ve arama botlarının normal HTTP istekleri view oluşturmaz.
- İzin veya geçerli ölçüm koşulları yoksa ziyaret sayılmaz.
- Ziyaret için zorunlu kaydırma, belirli süre bekleme veya makaleyi bitirme koşulu bulunmaz.

Başarılı sayım `first_seen_at` zamanını veritabanında sabitler. Sonraki ziyaretlerde bu tarih güncellenmez.

### 3.3. Dönem metrikleri

`All-time unique` tüm tarih boyunca kabul edilmiş tekil fingerprint sayısıdır.

`7 days`, `30 days` ve özel tarih filtreleri ise yalnızca **ilk sayılma tarihi** ilgili döneme düşen kayıtları hesaplar.

Bu nedenle yedi günlük benzersiz ziyaretlerin toplamı ile aynı yedi gündeki bütün sayfa açılışlarının sayısı birbirine eşit olmak zorunda değildir.

Tüm raporlarda gün sınırı UTC olarak tanımlanır. Kullanıcıya yerel saat gösterilebilir ama raporun zaman dilimi açıkça belirtilir.

## 4. FingerprintJS mimarisi

Kullanılacak paket: `@fingerprintjs/fingerprintjs`.

Kütüphane npm bağımlılığı olarak yüklenir ve sitenin kendi derlenmiş JavaScript paketinden sunulur. Üçüncü taraf CDN veya harici fingerprint API'sine bağımlılık eklenmez.

İstemcinin gönderdiği minimum veri:

- Log ID
- Fingerprint `visitorId`
- Fingerprint algoritma sürümü
- Gerekliyse ölçüm izni durumu
- İsteğe bağlı, ilk girişe ait referrer hostname

Fingerprint bileşenlerinin tamamı, tam User-Agent dizisi, ekran boyutu, IP adresi veya sayfa üzerinde yapılan hareketler kalıcı analitik kayıtlarına alınmaz.

### Sunucuda tekilleştirme

Sunucu, gizli bir anahtar kullanarak Log'a özgü HMAC üretir.

Bu değer başka Log'lardaki ziyaret kimlikleriyle ortak bir tanımlayıcı olarak kullanılmaz.

Önerilen model:

**`witness_subjects`**

- `id`: sunucu içi rastgele UUID
- `log_id`
- `first_seen_at`
- `first_revision`
- `event_id`
- `source_category`
- `referrer_hostname` (varsa)

**`witness_aliases`**

- `log_id`
- `subject_id`
- `fingerprint_generation`
- `witness_hmac`
- Unique `(log_id, fingerprint_generation, witness_hmac)`

`witness_aliases`, algoritma sürümleri arasında geçiş için kullanılır. Böylece gelecekte fingerprint değişimlerini yönetmek adına yayınlanmış istatistik kayıtlarını yeniden yazmak gerekmez.

Birden fazla eşzamanlı isteğin aynı kimliği oluşturmasını önlemek için PostgreSQL transaction, benzersizlik kısıtları ve gerektiğinde transaction-scoped kilitleme kullanılacaktır. Uygulama seviyesinde `SELECT` ardından koşulsuz `INSERT` yeterli kabul edilmez.

### Fingerprint sürüm geçişleri

FingerprintJS güncellendiğinde aynı tarayıcı farklı bir `visitorId` üretebilir.

Bu nedenle güncelleme:

1. Eski ve yeni sürümün test ortamında karşılaştırılması.
2. Gerekirse geçiş döneminde iki sürümün birlikte çalıştırılması.
3. Yeni HMAC alias'ının mevcut subject'e bağlanması.
4. Tekilleştirme sonuçlarının istatistiksel olarak değerlendirilmesi.
5. Eski sürümün kontrollü kaldırılması.

adımlarını içerecek.

Sürüm geçişi sorunu çözülemiyorsa kayıp hassasiyet gizlenmeyecek; ölçüm metodolojisinin geçmişine kaydedilecek.

## 5. Verified Statistics arayüzü

Mevcut `verified.astro` sayfasına yeni `WitnessStats.astro` bileşeni eklenecek.

Bölümün ana içeriği:

### Birincil metrikler

- **Unique views:** Seçili dönemde ilk kez sayılan ziyaretler.
- **All-time witnesses:** Bütün Log geçmişindeki tekil kayıtlar.
- **First-time views:** Günlük ilk ziyaretlerin zaman serisi.
- **Annotations:** Yayınlanmış ve görünür anotasyon sayısı; annotation sistemi etkinleştirildikten sonra.

### Trafik analizi

- İlk ziyaretlerin günlük dağılımı.
- Referrer hostname veya sadeleştirilmiş trafik kaynağı.
- İlk görülen revizyonun dağılımı.
- En yüksek ilk ziyaret sayısına sahip günler.

Referrer boşsa `Direct / unknown` olarak raporlanır. Kaynağı bilinmeyen bir ziyarete tahmini kaynak atanmaz. URL path, query string ve kullanıcıya özel bağlantı parametreleri toplanmaz.

### Kanıt durumu

- **Recorded:** Veritabanına kabul edilen kayıtlar.
- **Sealed:** Merkle partisine alınmış kayıtlar.
- **Bitcoin verified:** Bağımsız Bitcoin doğrulamasından geçmiş kayıtlar.
- **Pending:** Henüz tamamlanmamış kanıtlar.
- **Last checkpoint:** Son yayımlanan batch ve UTC zamanı.

`Recorded`, `Sealed` ve `Bitcoin verified` sayıları birbirlerinin yerine gösterilmez.

### Etkileşim

- Varsayılan dönem: 30 gün.
- Dönem seçimi: 7 gün, 30 gün, 90 gün, tüm zamanlar.
- Günlük çizgi grafik.
- Referrer için sade yatay çubuk grafik.
- Kanıt durumu için metinle desteklenmiş tek ilerleme çubuğu.
- `Download evidence`, `Methodology` ve `Verify independently` bağlantıları.

Grafik kütüphanesi zorunlu değildir; küçük ve erişilebilir bir SVG çözümü yeterliyse tercih edilir. Tablolar ve sayılar JavaScript kapalıyken de SSR üzerinden okunabilmelidir.

İstatistik veritabanı erişilemiyorsa sayfa **`Statistics unavailable`** gösterir; `0 views` göstermez. Diğer yayın kanıtları çalışmaya devam eder.

### Tasarım kuralları

- Mevcut Helvetica, StyleX, siyah-beyaz renk sistemi ve genişlik ölçüleri korunur.
- Yeni tasarım sistemi, paralel navbar veya ikinci scroll yöneticisi kurulmaz.
- `#stats` başlığı mevcut ScrollRail tarafından keşfedilir.
- Grafikler dekoratif animasyon kullanmaz.
- Kanıt detayları aşamalı olarak açılır; herkesin Merkle ağacını anlaması beklenmez.
- Örnek veya sentetik veriler production ekranına taşınmaz.

## 6. Witness olay protokolü

Her yeni kabul edilmiş tekil ziyaret için rastgele bir `event_id` ve kriptografik nonce oluşturulur.

Olayın kanonik kaydında:

- Format sürümü
- Event ID
- Log ID
- İlk görülen revizyon
- İlk ziyaret günü
- Rastgele nonce

yer alır.

Bu kayıt kanonik biçimde serileştirilip SHA-256 ile hash'lenir. Kanonikleştirme algoritması ve hash girdisinin bayt dizilimi açıkça tanımlanır ve protokol sürümüyle dondurulur.

**Fingerprint, IP, HMAC anahtarı ve referrer ayrıntıları kamuya açık olay kayıtlarına dahil edilmez.**

Olay kaydı, kabul edildiği anda dayanıklı veritabanına yazılır. İstatistik toplamı da aynı transaction'ın sonucu olmalıdır. OTS servisinin yavaşlığı veya erişilememesi canlı sayımı bloke etmez.

### İdempotency

İlk ziyarette sunucu kısa ömürlü bir işlem anahtarıyla aynı kabul isteğinin tekrarını tanıyabilmelidir.

Bağlantı kesildikten sonra tekrar gönderilen aynı istek ikinci event oluşturmamalıdır.

Önceden sayılmış başka bir ziyarete ait olay kimliği veya makbuz erişim anahtarı yalnızca fingerprint biliniyor diye üçüncü taraflara açıklanmaz.

## 7. Merkle ve OpenTimestamps

Her ziyaretçi için ayrı Bitcoin işlemi yapılmayacak.

Her kabul edilen ziyaretin bağımsız olay taahhüdü bulunacak; olaylar planlanan aralıklarla Merkle partilerine alınacaktır.

Başlangıç sıklığı: **günde bir kez**.

### Batch oluşturma

1. Henüz mühürlenmemiş olaylar transaction içinde seçilir.
2. Deterministik sıralama ve yaprak hash algoritması uygulanır.
3. Merkle root oluşturulur.
4. `batch_id`, önceki batch hash'i, toplam olay adedi ve root içeren değişmez manifest hazırlanır.
5. Manifest, yayınların ana PGP özel anahtarından ayrı bir çevrim içi anahtarla imzalanır.
6. Merkle root OpenTimestamps takvimine gönderilir.
7. Gelen pending makbuz dayanıklı depoya kaydedilir.
8. Daha sonra receipt upgrade ve Bitcoin doğrulaması gerçekleştirilir.

Batch'in yayınlanması, olayların seçimden sonra kaybolmasına izin vermemelidir. Worker kapanması, database kopması veya OTS isteğinin yarıda kalması aynı batch'i iki kez saymamalıdır.

### Her ziyaretçiye ait makbuz

Bir ziyaretin indirilebilir makbuzu şu içerikleri bağlayacak:

- Event ID ve olay taahhüdü
- Merkle dahil edilme yolu
- Batch manifesti ve imzası
- Batch root
- OpenTimestamps `.ots` kanıtı
- Doğrulama durumu

Makbuz başlangıçta provisional olabilir. Günlük batch tamamlandıktan sonra Merkle yolu, Bitcoin onayı tamamlandıktan sonra da yükseltilmiş `.ots` kanıtı sunulur.

**`Pending` hiçbir zaman `Bitcoin verified` olarak gösterilmez.**

### Denetlenebilir toplam

Herkese açık batch manifestleri ve kimlik içermeyen olay taahhütleri üzerinden bağımsız bir doğrulayıcı:

- Merkle dahil edilmelerini kontrol edebilmeli.
- Batch zincirinin sürekliliğini kontrol edebilmeli.
- Yayımlanan olay adedini yeniden hesaplayabilmeli.
- Günlük dağılımları yayımlanan olay kayıtlarından doğrulayabilmeli.
- Bitcoin zaman damgasını ayrıca doğrulayabilmeli.

Bunun için yalnızca toplam sayının hash'ini yayımlamak yeterli değildir. Denetim kapsamına giren minimum olay kayıtları da yeniden sayılabilir biçimde erişilebilir olmalıdır.

Bu yine de gerçek insanların sayıldığını veya sunucunun hiçbir olayı atlamadığını kanıtlamaz. Kanıtın amacı **sonradan değişiklik tespitini ve yayımlanmış toplamların tutarlılığını** sağlamaktır.

### Düzeltmeler ve silme

Bir sayaç düzeltmesi veya veri silme talebi nedeniyle yayımlanmış toplam değişecekse eski batch silinmez. Yeni, gerekçesi belirtilmiş bir düzeltme kaydı yayımlanır.

Böylece geçmiş kanıtlar geçersiz kılınmadan güncel istatistik mantıksal olarak düzeltilebilir.

Kamuya açık kayıtlardaki bilgilerin kişisel veri içermediği varsayılmayacak; kayıt formatı, anonimlik ve saklama politikası ayrıca incelenecek.

## 8. Kriptografik anahtar ayrımı

Mevcut onur.af yayın anahtarları değiştirilmeyecek.

- **Owner PGP key:** Log yayınlarının ve kimlik beyanlarının otoritesi.
- **Witness signing key:** Canlı istatistik batch'lerini imzalamak için ayrı anahtar.
- **HMAC secret:** Fingerprint tekilleştirmesi için yalnızca sunucuda bulunan gizli anahtar.
- **Annotation keys:** Okurların anotasyon sahipliği için kullandığı, sistemlerden bağımsız anahtarlar.

Ana yayın PGP özel anahtarı hiçbir zaman canlı görüntülenme endpoint'ine, Vercel environment'ına veya istatistik worker'ına taşınmaz.

Witness imza anahtarı döndürülürse eski imzaların doğrulanabilir kalacağı bir anahtar geçmişi tutulur. Bu anahtarların sahibi olduğuna ilişkin site beyanı, mevcut yayın kimliğinden ayrı ve açık bir yetki bağlamına sahip olur.

## 9. Metne bağlı anotasyon sistemi

Bu modül witness altyapısından bağımsız geliştirilecek.

Ziyaretçi bir Log içindeki metin aralığını seçtiğinde `Annotate` işlemi belirir.

Anotasyonlar yazının altında klasik yorum listesine dönüşmez. Seçildikleri metin bölgesinde, küçük işaretlerle erişilebilir olur.

### Anotasyon hedefi

Her anotasyon aşağıdaki kimliğe bağlanır:

- Log ID
- Değişmez revizyon numarası
- İmzalı revizyonun SHA-256 değeri
- `TextQuoteSelector` (`exact`, `prefix`, `suffix`)
- `TextPositionSelector` (`start`, `end`)
- Normalizasyon protokolü sürümü

W3C Web Annotation veri modelindeki seçim ilkeleri uygulanır.

Yeni bir Log revizyonu yayımlandığında anotasyon eski revizyondaki yerini korur. Metin yeni revizyonda birebir bulunmuyorsa yanlış bir cümleye taşınmaz; eski revizyondan erişilebilir kalır.

### Kimlik ve düzenleme

Anotasyon için klasik hesap açma zorunlu değildir.

İstemcide oluşturulan bir Ed25519 anahtarı, anotasyon sahibinin düzenleme ve geri çekme işlemlerini yetkilendirmek için kullanılabilir.

- Private key tarayıcıda kalır.
- Public key yazarlık tanımlayıcısıdır.
- Anahtar dışa aktarma seçeneği sunulur.
- Witness fingerprint'i anotasyon kimliği değildir.
- Aynı ziyaretçinin hangi Log'ları okuduğu ile anotasyonları tek bir kayıt üzerinden eşleştirilmez.

### Yayın ve moderasyon

Anotasyonlar otomatik olarak kamusal hâle gelmez; moderasyon ve kötüye kullanım denetimi bulunur.

İlk sürüm:

- Kısa düz metin notu.
- HTML ve çalıştırılabilir içerik yok.
- İç içe yanıt zinciri yok.
- Like ve vote yok.
- Anotasyon başına sabit bir uzunluk sınırı.
- Anahtar ve istek bazlı oran sınırlaması.
- Yayından kaldırma ve kötüye kullanım bildirimi.
- Moderasyon geçmişi ile kullanıcıya açık görünürlük durumu ayrımı.

Anotasyonlar ileride kendi değişmez revizyon kayıtlarına ve OTS partilerine sahip olabilir. Ancak bu, Witness Stats'ın yayına alınması için ön koşul değildir.

## 10. API ve dosya yerleşimi

### Yeni uygulama modülleri

Önerilen yapı:

- `src/portfolio/witness/`: protokol tipleri, kanonik serileştirme, HMAC, Merkle ve doğrulama.
- `src/server/witness/`: PostgreSQL deposu, kabul işlemleri, istatistik sorguları, worker işlemleri.
- `src/client/witness.ts`: FingerprintJS'in koşullu çalıştırılması ve ziyaret talebi.
- `src/components/WitnessStats.astro`: Verified istatistik arayüzü.
- `src/pages/api/witness/`: ziyaret, istatistik ve makbuz endpoint'leri.
- `scripts/witness-*.ts`: batch oluşturma, upgrade, doğrulama, denetim ve bakım.
- `tests/witness/`: protokol, veritabanı, güvenlik ve entegrasyon testleri.

Anotasyonlar kendi `src/portfolio/annotations/`, istemci ve sunucu modüllerine ayrılır.

### Endpoint sözleşmesi

| Endpoint                              | Görev                                             |
| ------------------------------------- | ------------------------------------------------- |
| `POST /api/witness`                   | İlk ziyareti kabul et veya tekrar olduğunu bildir |
| `GET /api/witness/stats/{logId}`      | Herkese açık aggregate istatistik                 |
| `GET /api/witness/batches/{id}`       | Batch manifesti                                   |
| `GET /api/witness/batches/{id}/proof` | OpenTimestamps makbuzu                            |
| `GET /api/witness/receipts/{id}`      | Yetkili olay makbuzu                              |
| `GET /api/annotations?log=...&v=...`  | Revizyona ait görünür anotasyonlar                |
| `POST /api/annotations`               | Metin aralığına yeni anotasyon gönder             |

Canlı olay kabulü POST üzerinden yapılmalı. GET endpoint'lerinin hiçbirisi görüntülenme sayısını artırmamalı.

İstatistik yanıtları cache süresi ve veri tazeliği bakımından açık bir sözleşmeye sahip olacak. Kişiye özgü makbuz yanıtları `no-store` kullanacak.

## 11. Veri gizliliği ve güvenlik sınırları

### Veri saklama

- Ham fingerprint kalıcı depoda tutulmaz.
- Fingerprint tekilleştirme HMAC değerleri public kanıtlara girmez.
- Tam IP ve User-Agent analitik tablolarında tutulmaz.
- Referrer query string ve path saklanmaz.
- Makbuz erişim token'ları loglara yazılmaz.
- Analitik, ödeme veritabanının yetkileriyle çalışmaz.
- Yedekleme ve veri silme politikası ayrıca belgelenir.

Ömür boyu tekilleştirme, uzun süreli bir takma adlı tanımlayıcı tutmayı gerektirir. Bu yüzden `indefinite retention` kararı sessizce varsayılmayacak; hukuki dayanak, saklama süresi ve silme sonrası tekrar sayılma davranışı ürün politikasında açıklanacaktır.

Fingerprint ölçümünün kişisel veri ve cihaz erişimi mevzuatı bakımından değerlendirilmesi gerekir. Gereken koşullarda açık izin alınacak. İzin vermeyen kişinin makale erişimi kısıtlanmayacak.

### Kötüye kullanım

Sunucu tarafında:

- İstek boyutu sınırı.
- Şema doğrulama.
- İstek hız sınırlaması.
- Geçersiz Log ID reddi.
- Bot ve otomatik trafik için ihtiyatlı filtreleme.
- Tekrar oynatılan isteklerin ikinci olay oluşturmaması.
- PostgreSQL transaction güvenliği.
- HMAC secret rotasyonu ve kurtarma prosedürü.
- Worker için tek aktif batch oluşturucu.
- İstatistik çıktılarında kişisel veri sızıntısı testleri.

FingerprintJS istemcide çalıştığından, kötü niyetli bir ziyaretçi sahte `visitorId` gönderebilir. Bu yüzden sistem botlara karşı kusursuz tekilleştirme iddiasında bulunmayacak.

## 12. Uygulama aşamaları

### Faz A. Veri sözleşmesi ve arayüz

Teslimatlar:

- Kesin metrik tanımları.
- `#stats` bölümünün Verified sayfasına eklenmesi.
- Log metadata'sına views bağlantısı.
- SSR destekli boş / unavailable / disabled durumları.
- Responsive, erişilebilir grafik ve tablo yapısı.
- Mevcut ScrollRail, `#timestamps` ve revizyon navigasyonu için regresyon testleri.

Bu aşamada gerçek analitik açılmaz. Sentetik test verileri yalnızca izole fixture'larda kullanılır.

### Faz B. Witness motoru

Teslimatlar:

- FingerprintJS istemcisi.
- PostgreSQL tabloları ve migration.
- Atomik ilk ziyaret kaydı.
- Log başına benzersizlik.
- İlk ziyaret revizyonu ve günlük istatistikler.
- Referrer kaydı.
- Sürüm alias altyapısı.
- Ölçüm izni ve gizlilik kontrolleri.
- Güvenlik testleri.

Bu aşamada kriptografik batch henüz oluşturulmasa da sayım güvenilir şekilde çalışmalı. Protokol başlamadan önce üretilen kayıtlar, daha sonra kanıtlanmış gibi geriye dönük etiketlenmemeli.

### Faz C. Witness Attestation

Teslimatlar:

- Olay formatı ve kanonik hash.
- Deterministik Merkle batch.
- İmzalı batch manifesti.
- OTS stamp / upgrade / verify işlemleri.
- Her olay için dahil edilme kanıtı.
- Kanıt indirme.
- Public checkpoint geçmişi.
- İdempotent worker.
- Kesinti sonrası güvenli kurtarma.
- Bağımsız doğrulama komutu.

Bu aşamada proof coverage metrikleri aktifleşir.

### Faz D. Public Analytics Audit

Teslimatlar:

- Yayınlanan kayıtları yeniden sayan bağımsız denetleyici.
- Batch sürekliliği kontrolü.
- Günlük aggregate karşılaştırması.
- Bozuk veya eksik kanıtların açık raporlanması.
- Düzeltme / suppression kayıtları.
- CSV/JSON dışa aktarma.
- Metodoloji belgesi.

Bu aşamadan sonra istatistikler için `Auditable` ifadesi kullanılabilir. Bu ifade her ziyaretin gerçekliğinin kanıtlandığı anlamına gelmez.

### Faz E. Anchored Annotations

Teslimatlar:

- Metin seçimi.
- W3C selector kaydı.
- İmzalı revizyona bağlama.
- Anonim yazarlık anahtarları.
- Anotasyon saklama ve moderasyon.
- Revizyon değişiminde hedef kararlılığı.
- Mobil metin seçimi ve erişilebilirlik.
- Yayımlanmış anotasyon adedinin stats'a entegrasyonu.

Anotasyon zaman damgalama sistemi daha sonra ayrı bir faz olarak genişletilebilir.

## 13. Kabul testleri

Ürün, aşağıdaki testler geçmeden tamamlanmış kabul edilmeyecek.

### Sayım

- Aynı fingerprint, aynı Log, 100 eşzamanlı istek: yalnızca 1 view.
- Aynı fingerprint, iki farklı Log: her biri için 1 view.
- Aynı fingerprint, v1 ardından v2: toplam hâlâ 1.
- Aynı isteğin ağ hatası nedeniyle tekrarı: ikinci event yok.
- Başarısız veritabanı işlemi: başarı yanıtı yok.
- Fingerprint algoritma geçişi: eski ve yeni alias tutarlılığı.
- JavaScript kapalı: Log okunabilir, otomatik fingerprint ölçümü yapılmaz.

### İstatistik

- Views bağlantısı tam olarak `/verified#stats` bölümüne ulaşır.
- `?v=N` seçimi genel ziyaret toplamını değiştirmez.
- Tarih filtreleri yalnızca `first_seen_at` üzerinden hesaplanır.
- Gün sınırları UTC'ye göre deterministiktir.
- Veri bulunmaması `0`; veri deposunun erişilememesi `Unavailable` olarak gösterilir.
- Referrer olmayan kayıtlar sahte kaynak bilgisi kazanmaz.
- Stats URL'sini açmak yeni view üretmez.

### Kanıt

- Her kabul edilen olay tam olarak bir batch'e dahil edilir.
- Batch tekrar çalıştırıldığında duplicate oluşmaz.
- Aynı event için yanlış Merkle yolu reddedilir.
- Değiştirilmiş manifest veya OTS makbuzu doğrulanmaz.
- Pending kanıt doğrulanmış olarak sunulmaz.
- Önceki checkpoint ile çelişen yeni batch zinciri reddedilir.
- Bir batch'in eksik veya bozuk olması mevcut Log PGP doğrulamasını etkilemez.
- İndirilen makbuzda fingerprint veya HMAC bulunmaz.

### Anotasyon

- Seçilen metin aralığı doğru revizyona bağlanır.
- Aynı ifade farklı konumlarda geçse bile yanlış yere otomatik iliştirilmez.
- Eski revizyona ait anotasyon sonraki revizyon tarafından yeniden yazılmaz.
- Anotasyon HTML enjeksiyonu oluşturamaz.
- Yetkisiz anahtar başka birinin anotasyonunu değiştiremez.
- Anotasyon kapatıldığında makale metninin özgün DOM içeriği bozulmaz.
- Mobil seçim ve klavye erişimi çalışır.

### Repo doğrulaması

Mevcut `bun run verify`, `bun run build`, `bun test`, tarayıcı testleri, imza doğrulamaları ve timestamp kontrol süreçleri geçmeye devam eder.

Özellikle mevcut `.md`, `.asc`, `.ots` ve yayın manifestlerinin bayt bütünlüğü korunur.

## 14. Operasyon ve dağıtım

Canlı Witness servisi varsayılan olarak kapalı bir feature flag ile geliştirilmeli. Migration ve anahtarlar hazır olmadan üretimde etkinleştirilmemeli.

Ayrı ortam değişkenleri:

- Witness feature flag
- Witness PostgreSQL bağlantısı
- HMAC secret ve secret sürümü
- Witness signing key
- OTS calendar yapılandırması
- Batch scheduling konfigürasyonu

Mevcut Monero ödeme kimlikleri ve veritabanı yetkileri Witness servisine aktarılmaz.

GitHub Actions'taki mevcut Log timestamp upgrade süreci aynen korunur. Witness batch işleyicisi ayrı operasyonel yaşam döngüsüne sahip olur.

Worker çalışmadığında ziyaretler kaybolmamalı; pending olarak kuyrukta kalmalı. Biriken işlerin güvenli tekrar işlenmesi mümkün olmalı.

İstatistik veritabanı ve batch makbuzları için yedekleme, geri yükleme ve restore sonrası doğrulama testleri yapılır.

## 15. Kapsam dışı

İlk sürümde aşağıdakiler geliştirilmeyecek:

- Ayrı analytics dashboard uygulaması.
- Beğeni, oy, takipçi veya kullanıcı puanı.
- Klasik yorum akışı ve thread sistemi.
- Ziyaretçiler arası sosyal profil grafiği.
- Konum, demografi veya cihaz fingerprint bileşenlerinin kamusal analizi.
- Reklam / pazarlama izleme altyapısı.
- Session replay veya davranış kaydı.
- Sahte canlı sayaç, tahmini kullanıcı sayısı veya veri yokken hazırlanmış grafik.
- Her ziyaret için ayrı Bitcoin işlemi.
- Log yayınlarını yeniden imzalama.
- Yayın PGP özel anahtarlarının sunucuya taşınması.

## 16. Tamamlanma tanımı

Bir özellik yalnızca arayüzü göründüğü için bitmiş sayılmaz.

Witness Protocol v1 tamamlandığında:

1. Bir Log'un tekil görüntülenme sayısı güvenilir biçimde hesaplanır.
2. Sayıya tıklamak mevcut Verified sayfasının `#stats` bölümünü açar.
3. Stats bölümü gerçek kayıtları anlaşılır grafiklerle gösterir.
4. Her kabul edilen ziyaret sonradan doğrulanabilir bir batch'e bağlanabilir.
5. Public checkpoint'ler üzerinden yayımlanmış olay toplamları bağımsız olarak yeniden hesaplanabilir.
6. Kesintiler, tekrarlar ve eksik Bitcoin doğrulamaları yanlış başarı iddiaları oluşturmaz.
7. Mevcut Log yayınları, PGP zinciri, kanıt indirmeleri ve bütünlük testleri değişmeden çalışır.
8. Kullanıcı hangi verilerin toplandığını, ne kadar saklandığını ve hangi iddiaların doğrulanabildiğini öğrenebilir.

Annotation modülü ayrıca kendi kabul testlerini geçerek etkinleştirilir.

## 17. Nihai mimari karar

**Witness Protocol, onur.af'ın yayın altyapısının bir uzantısıdır; sosyal etkileşim platformu değildir.**

Görüntülenme sayısı sıradan bir sayı olarak görünebilir. O sayının arkasındaki olay kayıtları, imzalı batch'ler ve OpenTimestamps kanıtları ise isteyen herkesin inceleyebileceği açık bir doğrulama katmanı oluşturur.

Yayın metninin bütünlüğü, ziyaret istatistiğinin bütünlüğü ve okurun anotasyon sahipliği birbirinden bağımsız güven sınırları olarak korunacaktır.

Bu ayrım, sistemin hem sade hem de teknik açıdan dürüst kalmasının temelidir.

## Owner amendment · 27 October 2026

The owner removed PGP approval and manual moderation from the annotation flow. Valid, browser-key-signed annotations publish automatically; edits publish immediately and withdrawals take effect immediately. No person needs to staff an approval queue. Keep plain-text rendering, revision binding, ownership verification, rate limits and signed abuse reports. This supersedes the original moderation requirement above.

The owner also removed the standalone `/witness` page. Explain view semantics in one sentence inside Statistics, keep title/description/date/revision together above Statistics, and present detailed statistics before bordered publication-proof sections using the existing site design language.
