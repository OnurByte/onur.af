# Minimalist site / digital garden araştırması

**Tarih:** 15 Ekim 2026  
**Amaç:** Mevcut Onur kimliğine yakın, az yıldızlı kişisel siteler, dijital bahçeler ve küçük web deneylerinden somut tasarım/içerik kararları çıkarmak. Bu bir tema veya kod kopyalama listesi değildir.

## Mevcut sitenin referans çerçevesi

`README.md`, `brand.md`, `docs/design.md` ve `src/layouts/Layout.astro` şunları netleştiriyor: Onur kişisel bir imza; ana sayfa tek bir mevcut mottodan birini taşır; görsel dil siyah-beyaz, geniş boşluklu ve gösterişsizdir; OS tema tercihi kullanılır; PGP, RSS, TOR, I2P ve Monero mevcut oldukları ölçüde gerçek işlevleriyle sunulur. Üçüncü taraflara bağımlılığı azaltmak, doğrulanmış olmayan mahremiyet/güvenlik vaadi vermemek ve henüz içerik yokken proje/not vitrini açmamak da temel kısıtlardır. Yeni bir fikir; bu kişisel sesi, açık sayfa düzenini, erişilebilirliği ve mevcut içerik gerçekliğini korumalıdır.

GitHub repo metrikleri, `pushed_at`, varsayılan dal ve lisans durumu GitHub REST repo kayıtlarından 15 Ekim 2026 tarihinde okundu. README ve belirtilen kaynak dosyaları GitHub API dosya içeriği uçlarından ayrıca açıldı. Yıldız sayıları anlık değerlerdir; zamanla değişir.

## En yararlı dört referans

### 1. gevhaz/hugo-theme-notrack — mahremiyet ve statik yayınlama için en yakın ilke örneği

[Depo](https://github.com/gevhaz/hugo-theme-notrack) · [README](https://github.com/gevhaz/hugo-theme-notrack/blob/master/README.md) · [anasayfa şablonu](https://github.com/gevhaz/hugo-theme-notrack/blob/master/layouts/home.html) · [head şablonu](https://github.com/gevhaz/hugo-theme-notrack/blob/master/layouts/partials/head.html) · [GitHub repo verisi](https://api.github.com/repos/gevhaz/hugo-theme-notrack)

- **Yıldız / lisans / son push:** 59 yıldız; GPL-3.0; 22 Haziran 2025.
- **Doğrulama:** README, temayı “self-sufficiency and decentralization” odağıyla tanımlıyor ve varsayılan olarak üçüncü taraflardan varlık sunmadığını söylüyor. `head.html` kendi statik font ve Font Awesome CSS dosyalarını, içerikte üretilen stilleri ve mevcutsa alternatif feed formatlarını yüklüyor. `home.html` gerçek ana sayfa içeriği varsa gösteriyor; isteğe bağlı blog özetlerini ancak blog içeriği olduğunda ekliyor.
- **Alınabilecek fikir:** Harici font/CDN/script çağrılarını bilinçli biçimde sınırlamak; RSS gibi açık yayın kanallarını sayfanın içeriğiyle ilişkili, basit alternatif olarak korumak; ana sayfanın yazı listesini sadece yayınlanmış içerik varsa göstermesi.
- **Buraya uyumu:** Bağımsızlık ve “var olmayan bir şeyi varmış gibi göstermeme” yaklaşımı marka belgesiyle örtüşüyor. RSS zaten mevcut; yeni blog/notes bölümü eklemek için tek başına gerekçe değil.
- **Uyumsuzluk:** Tasarım siyah-beyaz değil; CSS’te mavi ve başka vurgu renkleri, serif yazı, justify metin ve dekoratif bileşenler mevcut. Bu nedenle görsel örnek veya tema adayı değil; yalnızca ilke ve yayınlama davranışı referansı. Lisans GPL-3.0; kod alınacaksa lisans yükümlülükleri ayrıca ele alınmalı.

### 2. owickstrom/the-monospace-web — küçük tasarım deneyi, ölçü ve sistem teması örneği

[Depo](https://github.com/owickstrom/the-monospace-web) · [README](https://github.com/owickstrom/the-monospace-web/blob/main/README.md) · [CSS](https://github.com/owickstrom/the-monospace-web/blob/main/src/index.css) · [GitHub repo verisi](https://api.github.com/repos/owickstrom/the-monospace-web)

- **Yıldız / lisans / son push:** 3.198 yıldız; MIT; 20 Ağustos 2025. Bu çalışma düşük yıldız koşulunun dışında kalıyor; doğrudan estetik ölçüt için karşılaştırma olarak tutuldu.
- **Doğrulama:** README bunu monospace Web üzerine bir tasarım deneyi olarak tarif ediyor. `src/index.css` açıkça siyah/beyaz renk tokenlarını `prefers-color-scheme: dark` ile değiştiriyor, metin genişliğini 80 karakterle sınırlıyor, mobilde ölçüyü daraltıyor ve boşluğu ölçülü bir satır aralığı üzerinden kuruyor. Aynı dosya JetBrains Mono’yu CDN’den alıyor.
- **Alınabilecek fikir:** Okunur bir maksimum metin genişliği ve renk değişimini yalnızca sistem tercihinden alan tema mekanizması. Bunlar Onur tasarım standardında zaten bulunan 65 karakter ve sistem teması kararlarıyla aynı yönde; yeni uygulama gerektirmiyor.
- **Buraya uyumu:** Monokrom ve sistem temalı CSS kanıtı. Tasarım tokenları yalın ve koddan okunabilir.
- **Uyumsuzluk:** Site tamamıyla monospace, başlıklar büyük harf, belirgin çift çizgiler ve yoğun doküman/deney sunumu kullanıyor. Mevcut Helvetica tabanlı kişisel imza ve az sayıda açık eylemle örtüşmüyor. CDN font yüklemesi de üçüncü taraf çağrılarını minimize etme amacıyla çelişiyor. Tüm web’i monospace’e çevirmek veya bileşen dilini kopyalamak önerilmez.

### 3. errbufferoverfl/garden.errbufferoverfl.me — içerik ve kişisel egemenlik bağı için incelendi

[Depo](https://github.com/errbufferoverfl/garden.errbufferoverfl.me) · [README](https://github.com/errbufferoverfl/garden.errbufferoverfl.me/blob/hugo/README.md) · [anasayfa kaynağı](https://github.com/errbufferoverfl/garden.errbufferoverfl.me/blob/hugo/index.qmd) · [lisans dosyası](https://github.com/errbufferoverfl/garden.errbufferoverfl.me/blob/hugo/LICENCE.md) · [GitHub repo verisi](https://api.github.com/repos/errbufferoverfl/garden.errbufferoverfl.me)

- **Yıldız / lisans / son push:** 11 yıldız; GitHub API lisansı `NOASSERTION` olarak gösteriyor, depodaki `LICENCE.md` CC BY-SA 4.0 metnini içeriyor; 14 Ekim 2024.
- **Doğrulama:** README, Quarto ve Obsidian temelli bir dijital bahçeyi anlatıyor; yarım kalmış notlar ve fikirlerin zaman içinde gelişmesini merkeze alıyor. `index.qmd` yazarın kendini tanıtmasını; gözetim kapitalizmine karşı duruş, sürdürülebilir yaşam ve peer-to-peer teknolojiler gibi gerçek ilgi alanlarıyla bağlıyor. Aynı ana sayfa profil bağlantıları ve sosyal ikonlar sunuyor; `about.template: trestles` seçimi hazır Quarto görünümüne dayanıyor.
- **Alınabilecek fikir:** Mahremiyet/bağımsızlık temasını sadece teknoloji bağlantılarıyla sınırlamayarak kişinin gerçek, kendi yazdığı düşünceleriyle ilişkilendirmek. Ayrıca dijital bahçenin ancak gerçekten yazılmış ve gelişen notlar varsa anlamlı olması.
- **Buraya uyumu:** İçerik düzeyindeki egemenlik, P2P ve gözetim karşıtı perspektif tematik yakınlık taşıyor. Marka belgesindeki “henüz bulunmayan yazı/proje vitrini oluşturma” sınırını doğrulayan karşı örnek: o sitede bahçe, çok sayıda mevcut notla gerekçelendirilmiş.
- **Uyumsuzluk:** Quarto/Obsidian yayın zinciri, sosyal profil yoğunluğu ve hazır profil şablonu Onur’un boşluklu, tek imzalı ve dar görevli sayfa yapısından farklı. Buradan yeni bir garden veya sosyal ikon ağı çıkarmak uygun değil. CC dosyası ve GitHub’ın lisans alanındaki belirsizlik nedeniyle kod/medya yeniden kullanımı ayrıca hak incelemesi gerektirir.

### 4. kyswtn/kyswtn.com — kişisel içerik sınıflandırması için, görsel örnek olarak değil

[Depo](https://github.com/kyswtn/kyswtn.com) · [README](https://github.com/kyswtn/kyswtn.com/blob/main/README.md) · [anasayfa kaynağı](https://github.com/kyswtn/kyswtn.com/blob/main/sites/www/src/pages/index.astro) · [GitHub repo verisi](https://api.github.com/repos/kyswtn/kyswtn.com)

- **Yıldız / lisans / son push:** 31 yıldız; repo kökünde lisans dosyası yok ve GitHub API lisans alanı boş; 4 Temmuz 2026.
- **Doğrulama:** README deponun bir kişisel altyapı monoreposu olduğunu, siteyi `sites/www` altındaki Astro projesinin ürettiğini, özel Obsidian notlarını içerik koleksiyonlarıyla yayınladığını ve self-hosted Umami analitik kullandığını anlatıyor. `index.astro` içeriği Posts, Projects ve Perusal bölümlerine ayırıyor; ayrıca daha sık kısa güncellemeler için `/micro` yoluna gönderiyor ve not kenarları/sidenotes kullanıyor.
- **Alınabilecek fikir:** Uzun yazı, kısa güncelleme ve okuma/inceleme listesi ayrı işlere hizmet edebilir; yayın sıklığı veya içerik miktarı artarsa içerik tiplerini ayırmak için işe yarar bir örnek. Şu anki Onur sitesinde bu bölümler için gerçek içerik ve kullanıcı ihtiyacı görünmüyor.
- **Buraya uyumu:** Tek kişinin gerçek içerikleri ve üretim işlerine sahip çıkması kişisel sesle uyumlu. Teknik altyapının siteyi barındıran kişiye ait olması özerklik perspektifinde anlamlı.
- **Uyumsuzluk:** Monorepo, Nix/Terraform/Vercel/Cloudflare, self-hosted analytics ve çok kolonlu/sidenote düzeni mevcut sitenin basit sayfa görevleri için orantısız. README projeyi “template değil, referans” olarak tanımlıyor; lisans dosyası yok. Bölüm yapısını veya altyapısını taşımayın.

## Diğer iki repo: değerlendirildi, tasarım adayı değil

### StrikingLoo/Personal-Wiki-Site-Setup

[Depo](https://github.com/StrikingLoo/Personal-Wiki-Site-Setup) · [README](https://github.com/StrikingLoo/Personal-Wiki-Site-Setup/blob/master/README.md) · [layout](https://github.com/StrikingLoo/Personal-Wiki-Site-Setup/blob/master/_layouts/default.html) · [CSS](https://github.com/StrikingLoo/Personal-Wiki-Site-Setup/blob/master/css/main.css) · [GitHub repo verisi](https://api.github.com/repos/StrikingLoo/Personal-Wiki-Site-Setup)

23 yıldız; API lisans alanı boş ve kökte LICENSE dosyası yok; son push 1 Ekim 2022. README Jekyll/GitHub Pages üstünde wiki, etiketli arama ve markdown notları vaat ediyor. Layout/CSS gerçekten Google Analytics scripti ve Google Fonts CDN’si yüklüyor; CSS açıkça yeşil/bej palet, ortalı başlık ve yüzde tabanlı genişlik kullanıyor. İyi fikir: etiket ve başlıkla not bulunabilirliği; mevcut sitenin hızlı, yerel olarak filtreleyen header araması zaten bu işi daha küçük kapsamda yapıyor. Eski, tracking içeren ve renkli şablon olduğu için alınacak görsel veya kod yönü yok.

### arkydon/arky-site

[Depo](https://github.com/arkydon/arky-site) · [README](https://github.com/arkydon/arky-site/blob/main/README.md) · [anasayfa template’i](https://github.com/arkydon/arky-site/blob/main/templates/index.html) · [renk/stil tokenları](https://github.com/arkydon/arky-site/blob/main/sass/_variables.scss) · [GitHub repo verisi](https://api.github.com/repos/arkydon/arky-site)

0 yıldız; API lisans alanı boş ve lisans dosyası yok; son push 9 Ekim 2026. README Zola tabanlı kişisel site/blog/journal/digital garden diyor ve tasarım için Gemini yardımı aldığını, içeriğin ise kendi yazısı olduğunu belirtiyor. `index.html` ana sayfası blog/notlar/about bağlantıları ve en son blog yazılarını gösteriyor; `_variables.scss` geniş renk paleti, gradient, kart gölgesi, 14 px radius ve çoklu font tanımlıyor. Yalnızca “kişinin kendi yazdığı içerikle kendi sitesi arasındaki ayrım” notu faydalı. Görsel kararları siyah-beyaz, gölgesiz açık düzenin tam tersidir; yapay biçimde blog/garden doldurmamak gerekir.

## Karar

En yakın referans `notrack`; fakat yalnızca üçüncü taraf yüklerini sınırlama ve içeriğe dayalı yayınlama ilkeleri için. Siyah-beyaz sistem teması ve metin genişliği yönü zaten Onur’un tasarım standardında karara bağlanmış; monospace deneyi bunu teyit ediyor, yeni tasarım yönü önermiyor. Diğer siteler içerik sınıflandırması veya mahremiyetin kişisel yazıyla bağını tartışmak için yararlı; bugünkü siteye yeni bir digital garden, blog, kart düzeni, sosyal ikon ağı veya altyapı katmanı eklemek için dayanak oluşturmuyor. PGP/TOR/I2P/Monero öğelerinin sade, gerçek ve işlevi açıklanmış bağlantılar olarak kalması araştırma bulgularıyla da tutarlı.
