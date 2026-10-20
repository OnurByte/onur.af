# Onur portfolyosu: tasarım anlayışı ve kullanım araştırması

19 Ekim 2026. Bu belge bir araştırma ve tasarım önerisidir; uygulanmış bir arayüz veya kullanıcı araştırmasının sonucu değildir.

## Kapsam ve dayanak

İstek: portfolyonun tech/cypherpunk ruhunu, kullanılan araçları ve kişisel yaklaşımı daha anlaşılır kılmak; kullanım rahatlığını ve tasarım bütünlüğünü geliştirmek; Log üzerinde kişisel bir giriş düşünmek. İnceleme bu portfolyonun kendi içeriğine, `brand.md` ve tasarım belgelerine dayanır. Başka kişisel projelerden biyografi veya araç listesi çıkarılmaz.

11 GitHub deposunun ilgili yerleşim kaynakları veya belgeleri incelendi. Örnekler, farklı tasarım amaçlarını karşılaştırmak için seçildi; bütün GitHub portfolyolarını temsil eden istatistiksel bir örneklem değiller. Yıldız sayısı kullanılabilirlik kanıtı sayılmadı. Kaynak bağlantıları belgenin sonunda incelenen commitlere sabitlendi.

Portfolyonun canlı ana sayfası, antfu.me ve Still demosu görsel olarak incelendi. AstroPaper demosu SSL protokol hatası nedeniyle açılamadı; onun değerlendirmesi kaynak koduna dayanıyor. Diğer örnekler için çalışır demo, mobil davranış veya performans testi yapılmış gibi bir sonuç çıkarılmıyor.

## Portfolyonun mevcut tasarım fikri

Marka belgesindeki bağımsızlık, düşünmek, üretmek ve sorumluluk almak çizgisi; mevcut mottolar, PGP kimliği, imzalı Log, RSS ve Monero işlevleriyle somutlaşıyor. Kullanıcının tech/cypherpunk tanımı bu seçimlerle tutarlı. Henüz çalışmayan TOR/I2P bağlantılarından kullanılabilir hizmet veya anonimlik garantisi çıkarılamaz.

README'nin A Cypherpunk's Manifesto bölümünü özellikle öne çıkarması da açık bir içerik tercihi. Portfolyonun yerel yayın, bağımsız doğrulama ve taşınabilir kanıt belgeleriyle birlikte okunduğunda tasarıma çevrilebilecek ilke, ziyaretçinin neyi paylaşacağını ve hangi kaynağa güveneceğini değerlendirebilmesi. Bu yüzden anahtar indirme, kopyalama, kaynak bağlantısı ve kanıtı inceleme gibi küçük işlemlerin rahatlığı, sitenin düşünsel ruhunun da bir parçası. Astro/TypeScript/StyleX ise sitenin doğrulanmış yapım araçları; kişisel günlük araç seti hakkında daha geniş bir iddia sağlamıyor.

Görsel temel zaten belirli: monokrom, Helvetica, ortak 960 px hizalama, yaklaşık 65 karakterlik okuma sütunu, makine verilerinde monospace, ölçülü kenarlıklar, sabit geometriler. İnce cam navbar ve mühürler bu sakin düzenin kişisel ayrıntıları. Bir terminal temasının tüm görsel sözlüğünü taşımak mevcut tasarım yönünü değiştirir; araştırma bunu gerektirmiyor.

Ana sayfanın şu anki anlatı sırası motto → en yeni üç Log kaydına kadar → dış kaynak bölümleri. Motto bir dünya görüşüne işaret ediyor. Hemen ardından gelen kayıt ise güncel bir konuya giriyor. Arada, bu kişinin hangi tercihlerle üretim yaptığını açıklayan bağ eksik. Bu bir içerik ve hiyerarşi gözlemidir; ziyaretçilerin gerçekten ne kadar zorlandığı ölçülmedi.

Canlı görünümde Log kartı ile X/GitHub yüzeyleri güçlü çerçeveler ve metadata taşıyor. Ortak malzeme tutarlı; ancak içeriklerin farklı görevlerini ayrıca anlatmak gerekiyor: kişinin kendi sözü, uzun süre anlamlı kalan üretim, başka servislerdeki hareket ve iletişim aynı şeyleri sunmuyor. Hiyerarşi yalnız kartların eşit boyutlu olmasıyla kurulamaz.

## Akademik araştırmanın söylediği ve sınırı

### Düzen ve ifade ayrı değerlendirilmelidir

Lavie ve Tractinsky'nin dört çalışması, algılanan web estetiğinde düzen/açıklık ile yaratıcılık/özgünlük boyutlarını ayırıyor. Bu ayrım bu portfolyoya özellikle uygun: okunabilirlik ve yerleşim güçlendirilirken motto, mühür ve malzeme ayrıntıları karakter taşıyabilir. Algılanan estetik ile algılanan kullanılabilirlik ilişkisi, gerçek görev başarısına ilişkin nedensel kanıt değildir. [DOI kayıt sayfası, 2004](https://doi.org/10.1016/j.ijhcs.2003.09.002).

Moshagen ve Thielsch'in VisAWI çalışması sadelik, çeşitlilik, renklilik ve işçiliği ayrı estetik boyutlar olarak ele alır. Buradan bu siteye çıkarımım: sadelik tek başına yeterli bir değerlendirme değildir; yazı ölçeği, içerik geçişleri ve ayrıntıların birbirine oturması da önemlidir. Çalışma monokrom siteye renk ekleme veya her boyutu sınırsız artırma talimatı vermez. [Makale, 2010](https://www.uni-muenster.de/OWMS/uploads/drafts_thielsch/pdf/moshagen_2010.pdf).

### İlk izlenim araştırması bir sayfa reçetesi vermez

Tuch ve arkadaşları, 119 site ekran görüntüsü ve kısa gösterim süreleriyle görsel karmaşıklık ve alışılmış yapının estetik ilk izlenime etkisini araştırıyor. Düşük karmaşıklık ve yüksek prototipiklik örneklemde daha çekici bulunuyor. Bu sonuç, kullanıcının 50 milisaniyede biyografiyi anladığını veya bütün portfolyoların aynı düzene girmesi gerektiğini göstermez. Buradaki tasarım çıkarımı: tanıdık gezinme ve okunur metin düzeni korunurken özgünlük seçili ayrıntılarda yoğunlaştırılabilir. [Araştırma kaydı ve özet, 2012](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/).

### Yorum alanı ile işlem açıklığı birlikte kurulabilir

Gaver, Beaver ve Benford belirsizliği kişisel yorum ve ilişki kurmak için bir tasarım kaynağı olarak tartışır; iyi tanımlanmış görevleri engellememesi gerektiğini de belirtir. Bu deneysel bir web dönüşüm çalışması değildir. Portfolyoya çıkarımım: motto ve mühür izleyiciye yorum alanı bırakabilir. Bir hesap adına, doğrulama rozetine veya tarihe tıklanınca ne olacağı ise anlaşılmalıdır. [Northumbria University yayın kaydı ve kabul edilmiş yazar nüshası, CHI 2003](https://researchportal.northumbria.ac.uk/en/publications/ambiguity-as-a-resource-for-design/).

### Karmaşıklık yalnız öğe sayısıyla açıklanamaz

Rosenholtz, Li ve Nakano görsel kalabalığı çeşitli görüntü ölçüleriyle ele alır ve görsel aramayla ilişkisini inceler. Bu sitede bir karmaşıklık skoru hesaplanmadı. Tasarım açısından çıkarım: siyah beyaz arayüzde de büyük servis ikonları, eşit güçlü çerçeveler, rozetler ve metadata birbirleriyle yarışabilir. Çözüm her öğeyi kaldırmak yerine ağırlıkları ve grupları düzenlemek olabilir. [Özgün araştırmanın özeti, 2007](https://pubmed.ncbi.nlm.nih.gov/18217832/).

### Bağlantı, devamında ne olduğunu sezdirir

Pirolli'nin bilgi arama modeli, insanların hedefleri doğrultusunda bağlantı çevresindeki ipuçlarından yararlanmasını açıklar. Bu portfolyoya çıkarımım: Log başlığı, kısa açıklama ve açık bağlantı metni, ziyaretçinin nereye devam edeceğini değerlendirmesine yardım eder. Bütün seçenekleri Find içinde toplamak veya her eylemi büyük düğmeye çevirmek bu çalışmanın gereği değildir. [DOI kayıt sayfası, 2005](https://doi.org/10.1207/s15516709cog0000_20).

### Sakinlik, dikkatin önceliklerini düzenler

Weiser ve Brown'un calm technology yaklaşımı merkez ve çevre dikkat arasında geçişi tartışan kavramsal bir metindir. Buradan Spotify ve güncel hareketler için çıkarımım: bu bilgiler sayfaya hayat katabilir; kişinin tanıtımıyla sürekli aynı dikkat düzeyini talep etmeleri gerekmez. Temel gezinmeyi saklamak sakinlik sağlamaz. [Özgün metnin yeniden yayımı, 1995](https://calmtech.com/papers/designing-calm-technology).

Vignelli'nin tipografi, hizalama ve boşluk yaklaşımı ayrıca yararlı bir tasarım referansıdır; deneysel UX kanıtı olarak kullanılmamalıdır. Buradaki yorumum, boşluğun öğelerin ilişkisini göstermesi gerektiği: mottoyla açıklaması yakın, farklı bölümler daha belirgin ayrılabilir. Her şeyi geniş boşluklarla uzaklaştırmak ilişkiyi zayıflatabilir. [The Vignelli Canon](https://www.rit.edu/vignellicenter/sites/rit.edu.vignellicenter/files/documents/The%20Vignelli%20Canon.pdf).

Bu kaynakların hiçbiri bu portfolyo için bilimsel olarak ideal bir kelime sayısı, köşe yarıçapı, animasyon süresi veya evrensel bölüm sırası belirlemiyor.

## GitHub karşılaştırması: tasarım yapısı

### Yaygın şablon aileleri

**AstroPaper:** giriş, açıklama, seçilmiş yazılar ve son yazıları ayırıyor. Ana sayfa kaynağında seçilmiş içerik güncel listeden ayrıca süzülüyor. Aktarılabilecek fikir, kişinin girişine ve editoryal seçimine ayrı yer vermek. Onur'un ana sayfasını yayın hacmi etrafında kurmak için bir gerekçe oluşturmuyor.

**AstroWind:** başlık, alt açıklama ve eylemler ayrıştırılmış; ardından özellikler, istatistikler, FAQ ve tekrar eden çağrılar geliyor. Buradaki faydalı yapı, metinlerin farklı işlerini ayırması. Ürün satışı için kurulan ikna sırası ve sosyal kanıt modülleri, bu kişisel sayfanın içerik ihtiyacıyla örtüşmüyor. Depo eski onwidget adresinden arthelokyo sahibine yönlendi; kaynak tablosu mevcut sahibini kullanıyor.

**Brittany Chiang v4:** kişi adı, rol ve açıklama girişte belirgin; metin genişliği sınırlı. Bu açıklık aktarılabilir. İncelenen sürümün tam ekran hero yaklaşımı ve aşamalı giriş hareketleri, bu portfolyoda içeriğe erişim mesafesini artırabilir. Bu değerlendirme v4 kaynağına aittir; tasarımcının bugünkü sitesinin hükmü değildir.

**Bartosz Jarocki CV:** Summary, Experience, Skills ve Projects gibi sonlu gruplar, dar sütun ve yazdırma düzeni kullanıyor. Command menu tamamlayıcı. Bilgiyi kısa ve taranabilir gruplara ayırma fikri yararlı. İşe alım için oluşturulmuş özgeçmiş sıralaması, Onur'un kişisel dünya görüşünü açıklayan bir ana sayfanın yerine geçmez.

**Cactus:** kısa kişisel girişin ardından sabitlenmiş içerik, son yazılar ve notlar geliyor. Tarih ve başlığın ayrı hizalanması, kompakt içerik dizini için iyi bir mekanik. Kaynaktaki içerik adetleri tasarım doğrusu sayılmamalı; Onur'un mevcut içerik miktarı ve amacı belirleyici olmalı.

### Kişisel ve daha özel tasarım yaklaşımları

**Anthony Fu:** en güçlü aktarım adayı, kimlikle yapılan işler arasında cümle içinde ilişki kurması. Proje, yazı, araç ve kişisel uğraş bağlantıları bir anlatının parçaları. Onur için karşılığı, araçları marka logoları halinde sergilemekten önce hangi tercihi mümkün kıldıklarını anlatmak. Anthony'nin görevleri, başarıları veya geniş gezinme yapısı Onur'a taşınamaz.

**Still:** kaynakta isteğe bağlı ana sayfa metni, yazı listesinden önce normal makale içeriği olarak işleniyor. Kişisel giriş için ayrıca kart veya dashboard gerekmediğini gösteren yalın bir yapı. Gözlenen demoda görünür H1 ve üst gezinme bulunmaması, minimalist görünümü otomatik erişilebilirlik örneği saymamamız gerektiğini gösteriyor.

**Quartz:** incelenen varsayılan dal v5. Belgelerde sayfa türüne göre yerleşim, minimal/tam genişlik düzenleri ve reader mode ayrımı var. Aktarılabilecek fikir, ana sayfa, okuma ve teknik doğrulama sayfalarının aynı yoğunluğa zorlanmaması. Graph görünümü bir topluluk eklentisi; Onur'un teknik kimliğinin kendiliğinden bir bilgi grafiği gerektirdiği sonucuna varılamaz. Gerçek bağlantılı içerik ihtiyacı oluşursa değerlendirilir.

**The Monospace Web:** satır yüksekliği ve karakter ölçülerine dayalı güçlü bir ritim kuruyor. Buradan makine verileri, tarihler ve kısa teknik satırlar için disiplin alınabilir. Tüm gövdeyi monospace yapmak, Helvetica tabanlı mevcut kimliği değiştirir. Teknik karakter tek bir yazı ailesine bağlı değildir.

**Simple.css:** semantik öğeler ve ortak içerik sütunu etrafında küçük bir temel kuruyor. Yararlı ders, her içerik için ayrı bileşen ve çerçeve gerekmemesi. Mevcut StyleX sisteminin üzerine yeni bir temel CSS paketi veya örneğin renkleri eklenmesi gerekmiyor.

**Hugo Terminal:** Fira Code, sıcak vurgu rengi, köşeli geometri ve belirgin eylem stilleriyle tutarlı bir sözlük kullanıyor. Aktarılabilecek şey bu tutarlılık; terminal görünümü tech/cypherpunk kimliği için zorunlu bir işaret değil. Onur'un PGP, imza ve RSS davranışları zaten daha somut bir kimlik dili sağlıyor.

## Üç uygulanabilir tasarım yönü

| Yön                          | Ana düzen                                                                          | Uyum ve bedel                                                                                                                                             |
| ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kişisel metinle açılan sayfa | Motto, kısa açık metin, Log, mevcut kaynaklar ve iletişim                          | Mevcut sakin tasarım ve kişisel sese en yakın. Metin editörlüğü gerektirir; kısa fakat genel geçer bir biyografiye dönüşmemeli.                           |
| Kişisel dashboard/bento      | Giriş ve etkinlikler farklı ağırlıkta modüller                                     | Güncel kullanım izlerini görünür kılar. Eşit güçlü kutular ve eşit yükseklik zorlaması kişiyi servislerin gerisine itebilir; mobil sıra ayrıca kurulmalı. |
| Teknik kişisel dizin         | Kısa bakış açısı, işler/yazılar/araçlar için kompakt satırlar, kimlik bağlantıları | Doğrudan ve taranabilir. İnsanî tonu zayıflatabilir; her bilgiye teknik etiket vermek açıklığı azaltabilir.                                               |

Önerim ilk yön. İkinci yönün mevcut servis yüzeyleri ve üçüncünün kısa teknik satırları gerektiği yerde kullanılabilir. Bu, yeni bir tema seçmekten çok var olan dilde anlamsal ağırlıkları düzenleme kararıdır.

## Log üzerinde önerilen girişin görevi

Giriş çerçevesiz, mevcut metin hizasında yer almalı. Mottoya ait bir açıklama paragrafı gibi gruplanmalı; Log başlamadan bölüm ayrımı görünmeli. Başlangıç taslağı için iki veya üç kısa cümle yeterli bir editoryal hedef olabilir; bu sayı araştırmayla kanıtlanmış bir optimum değildir.

Metnin sırası:

1. Ne üretmeye, incelemeye veya kurcalamaya yöneldiğin.
2. Araç seçimlerinde bağımsızlık, mahremiyet ve kontrolün senin için anlamı.
3. Bu yaklaşımın sitedeki gerçek karşılıkları: yazılar, üretim ve gerekliyse araçlara bağlanan bir geçiş.

Birinci tekil kişi ve İngilizce arayüz dili korunmalı. Yeni bir slogan eklemek yerine açıklayıcı kişisel metin yazılmalı. Kullanıcının söylemediği uzmanlık, meslek, geçmiş, günlük araç veya başarı eklenmemeli. PGP/RSS/Monero'nun sitede kullanılması, bunların bütün kişisel araç setini temsil ettiğini de kanıtlamaz.

Araç anlatımı için iyi birim **araç + kullanım nedeni + ilgili çıktı/bağlantı**. Sadece isim ve logo ziyaretçiye hangi işi yaptığını anlatmaz. Az sayıda örnek girişe doğal biçimde bağlanabilir; ayrıntılı bir `/uses` sayfası ancak gerçek liste ve açıklamalar hazır olduğunda anlamlıdır. Ana sayfaya boş bir araç vitrini eklemek önerilmiyor.

## Bu portfolyoya özgü tasarım ayrıntıları

**Açık alan ile çerçeveye farklı görevler ver:** kişinin girişini açık tipografiyle sun; dış servis verilerinin mevcut çerçevelerini sınır/bağlam olarak kullan. Böylece aynı kenarlık sayısını artırmadan anlamsal hiyerarşi oluşur. Log kartının kişisel mühürü korunabilir; onun ağırlığı servis ikonlarıyla birlikte değerlendirilmelidir.

**Başlıklar gezinmenin yerini tarif etsin:** ana sayfadaki Log alanı şu anda erişilebilir bir bölüm etiketi taşıyor, görünür başlığı yok. Giriş eklendiğinde küçük bir görünür Log başlığı kişisel metinden kayıtlara geçişi açıklayabilir. Kart başlıklarıyla semantik başlık sırası birlikte düzenlenmeli; yalnızca görsel boyut üzerinden H etiketi seçilmemeli.

**Güncellik ile temsil gücünü ayrı düşün:** otomatik son üç kayıt, güncelliği sunuyor. Seni en iyi anlatan tek bir yazı daha güçlü giriş noktası olabilir. Seçilecek içerik gerçekten mevcutsa değerlendirilmeli; yeni bir Featured bölümü eklemek tek başına değer yaratmaz. Son kayıtlar bütünüyle kaldırılmak zorunda değil.

**Boşluğu ilişki için kullan:** motto ve açıklama birbirine ait okunmalı; Log ve servis alanları farklı bölümler olarak ayrılmalı. Mevcut 4 px ölçek ve 65ch sütun bu düzeni kurmaya yeter. Tam ekran hero ya da yeni dev başlık gerektiren bir bulgu yok.

**Profil ve kanıt aynı hedef gibi davranmasın:** kaynak başlıklarındaki AccountLink varsayılan olarak PGP hesap sayfasına giderken Connect hesap adı gerçek profile gidiyor. Aynı tür hesap adı için tek anlam seçilmeli; yanındaki kanıt rozeti ayrı hedef olarak kalabilir. Tarihin zaman damgası kanıtına götürdüğü durum da tıklama beklentisi açısından açıklanmalı. Kriptografik imza içeriğin doğruluğuyla aynı iddia değildir.

**Mobilde süsün metne maliyetini değerlendir:** Log kartındaki 72 px mühür sütunu metadata ve özet boyunca yer kaplıyor. Dar ekranda bu, okuma alanını küçültüyor. Mühür üst satıra veya ayrı bir hizaya alınabilir; doğrudan kaldırmak ya da özeti daha çok kesmek ilk seçenek olmamalı. Bu koddan görülen bir yerleşim riski; mobil görev testi sonucu değil.

**Servis sırasını varsayılan ziyaretçi profiline bağlama:** X veya GitHub'ın önce gelmesi, hangi keşif yolunun öne çıkarılacağına dair editoryal karar. Kullanıcının işe alım hedefi bildirmediği yerde “projeler her zaman önce” kuralı koymak gerekmez. İki sütunun eşit görsel ağırlığı da içeriklerinin aynı önemde olduğu anlamına gelmez.

**Find tamamlayıcı kalsın:** temel Log ve iletişim yolları görünür olarak izlenebilmeli. Kısayollar bilen kullanıcıya hız sağlar; gezinmenin anlamını açıklamak için ön koşul olmamalı.

**Doğal okuma davranışına alan aç:** genel metin seçme ve bağlam menüsü engeli, okuyucunun alıntılama/çeviri/arama alışkanlıklarını etkileyebilir. Teknik bağımsızlık ve kullanıcı kontrolü çizgisiyle birlikte yeniden değerlendirilmeye değer. Mevcut özel kaydırma için de kullanıcı ölçümü olmadan “bozuk” veya “daha rahat” hükmü verilemez; yerel kaydırma başlangıç referansı olabilir.

## Tasarımın değerlendirme ölçütü

Sonraki bir taslak şu somut görevlerle değerlendirilebilir: kişi ve yaklaşımı anlatabilme; Log'u bulma; bir hesabın profiline gitme; onun kimlik kanıtını ayrıca bulma; bir yazıyı okuma; takip veya iletişim yolunu seçme. Görev başarısı ve yanlış hedefe tıklamalar, estetik değerlendirmeden ayrı tutulmalı.

Kişilik değerlendirmesinde de yalnız “güzel mi?” sorusu yeterli değil: sakin, kişisel, teknik, bağımsız ve özenli hislerinin hangi öğelerden geldiği sorulabilir. İfadenin anlaşılmasını ve işlemlerin açıklığını ayrı incelemek, mottoların kişisel tonunu gereksiz yere silmeyi önler.

Bu araştırmada kullanıcı testi veya ürün testi çalıştırılmadı; ölçülmüş iyileşme oranı yok. Öneri, kaynak karşılaştırması ve portfolyonun kendi tasarım niyeti üzerinden çıkarıldı. Sonuç: kısa kişisel anlatı, açık bölüm ilişkileri ve tutarlı eylem anlamları; mevcut tipografi, mühür ve teknik işlevlerle birlikte geliştirilmelidir.

## İncelenen GitHub kaynakları

Aşağıdaki bağlantılar hareketli dal adları yerine araştırma sırasında incelenen commitleri kullanır. Quartz için ilgili belgeler; diğerleri için yerleşim, içerik veya stil kaynakları incelendi. Açık kaynak lisansı metin, görsel ve marka varlıklarının tümünün yeniden kullanılabileceği anlamına gelmez; burada kod veya kişisel içerik kopyalanmadı.

| Depo                              | Dal / commit          | İncelenen kaynak                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BartoszJarocki/cv                 | main / `1ab0b9b6d0`   | [src/app/page.tsx](https://github.com/BartoszJarocki/cv/blob/1ab0b9b6d026c64603269bc5c483369001764f44/src/app/page.tsx)                                                                                                                                                                                                                                                                                              |
| antfu/antfu.me                    | main / `e3ff044232`   | [pages/index.md](https://github.com/antfu/antfu.me/blob/e3ff0442327a24b1f389982a19ec8aca704d9245/pages/index.md)                                                                                                                                                                                                                                                                                                     |
| arthelokyo/astrowind              | main / `14e1a691f8`   | [src/pages/index.astro](https://github.com/arthelokyo/astrowind/blob/14e1a691f80548dcc36370847b1a02c0d0b12821/src/pages/index.astro); [src/components/widgets/Hero.astro](https://github.com/arthelokyo/astrowind/blob/14e1a691f80548dcc36370847b1a02c0d0b12821/src/components/widgets/Hero.astro)                                                                                                                   |
| bchiang7/v4                       | main / `539cef0bf6`   | [src/components/sections/hero.js](https://github.com/bchiang7/v4/blob/539cef0bf60cad438499a69d76dba2c27cc16c9a/src/components/sections/hero.js); [src/components/sections/about.js](https://github.com/bchiang7/v4/blob/539cef0bf60cad438499a69d76dba2c27cc16c9a/src/components/sections/about.js)                                                                                                                   |
| chrismwilliams/astro-theme-cactus | main / `728f1f4eeb`   | [src/pages/index.astro](https://github.com/chrismwilliams/astro-theme-cactus/blob/728f1f4eeb80208398649261d7635f311cafa011/src/pages/index.astro); [src/components/layout/Header.astro](https://github.com/chrismwilliams/astro-theme-cactus/blob/728f1f4eeb80208398649261d7635f311cafa011/src/components/layout/Header.astro)                                                                                       |
| jackyzha0/quartz                  | v5 / `97a2d05f80`     | [docs/layout.md](https://github.com/jackyzha0/quartz/blob/97a2d05f80c4c50534959b1d0d41cc4b3895625e/docs/layout.md); [docs/features/graph view.md](https://github.com/jackyzha0/quartz/blob/97a2d05f80c4c50534959b1d0d41cc4b3895625e/docs/features/graph%20view.md); [docs/features/reader mode.md](https://github.com/jackyzha0/quartz/blob/97a2d05f80c4c50534959b1d0d41cc4b3895625e/docs/features/reader%20mode.md) |
| kevquirk/simple.css               | main / `b6eab64c47`   | [simple.css](https://github.com/kevquirk/simple.css/blob/b6eab64c47692afd18c50bab0d5e656fd51d1695/simple.css)                                                                                                                                                                                                                                                                                                        |
| owickstrom/the-monospace-web      | main / `6992b7c1a9`   | [src/index.css](https://github.com/owickstrom/the-monospace-web/blob/6992b7c1a9051bbf969fc491c1af775a36d59449/src/index.css); [demo/index.md](https://github.com/owickstrom/the-monospace-web/blob/6992b7c1a9051bbf969fc491c1af775a36d59449/demo/index.md)                                                                                                                                                           |
| panr/hugo-theme-terminal          | master / `8ef994c0e0` | [assets/css/main.css](https://github.com/panr/hugo-theme-terminal/blob/8ef994c0e0303861b1204d1248541af06c9bfea6/assets/css/main.css); [layouts/_default/baseof.html](https://github.com/panr/hugo-theme-terminal/blob/8ef994c0e0303861b1204d1248541af06c9bfea6/layouts/_default/baseof.html)                                                                                                                         |
| satnaing/astro-paper              | main / `35cfa7fbe0`   | [src/pages/index.astro](https://github.com/satnaing/astro-paper/blob/35cfa7fbe0b897306d27670d3819e55d5205f3dd/src/pages/index.astro)                                                                                                                                                                                                                                                                                 |
| wjianbo/zola-theme-still          | main / `8396636a19`   | [templates/index.html](https://github.com/wjianbo/zola-theme-still/blob/8396636a1972500e147067c05640eed79b65ba5b/templates/index.html)                                                                                                                                                                                                                                                                               |
