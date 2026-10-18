# Connect: köşe geometrisi, hover ve derinlik araştırması

18 Ekim 2026. Bu belge öneridir; hover veya köşe geometrisini değiştirmez. Kabul edilmiş 12 px kart / 8 px kontrol ölçüleri brand.md içinde kayıtlıdır.

## Mevcut yapının sınırları

Astro sunucu çıktısı ve StyleX kullanılıyor; statik SVG'ler Icon.astro üzerinden geliyor. Connect öğeleri geniş ve kısa; ikon, servis adı, nick ve bağımsız bir PGP bağlantısı içeriyor. Email ve XMPP adres tanımlanana kadar etkileşimsiz. Site monokrom; mevcut marka kuralı gölge, parıltı ve gradient kullanmıyor. Bu nedenle gölgeli veya ışıklı bir derinlik uygulaması ayrıca kabul edilmiş bir marka istisnası olmalı.

## Apple benzeri köşe ne anlama geliyor?

Apple, iOS uygulama ikonları için kare katmanlar ister; nihai köşe maskesini sistem uygular. Web'deki bir dikdörtgene radius eklemek bu sistem maskesinin birebir kopyası değildir. İkon maskesi, sürekli köşeli arayüz dikdörtgeni ve matematiksel squircle birbirine yakın kavramlar olsa da aynı şekil oldukları varsayılmamalı.

Kaynaklar:

- https://developer.apple.com/design/human-interface-guidelines/app-icons
- https://developer.apple.com/documentation/uikit/uicornerconfiguration-swift.struct
- https://github.com/rydmike/squircle_study — SwiftUI ile karşılaştırmalı eğri çalışması. Flutter uygulaması bizim Astro projesine doğrudan alınmaz; şekillerin aynı olmadığını anlamak için değerlidir.

## GitHub çözümlerinin karşılaştırması

| Proje                          | Sağladığı şey                                                              | Bu site için değerlendirme                                                                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| phamfoo/figma-squircle         | Genişlik, yükseklik, radius ve cornerSmoothing ile SVG path üretimi        | Kesin geometri gerektiğinde aday. Figma benzeri eğriyi iOS'un birebir maskesi olarak sunmamalıyız. Responsive ölçü ve gerçek border çizimi ayrıca çözülmeli.     |
| sanalabs/corner-smoothing      | figma-squircle tabanlı clip-path, DOM ve React kullanımı                   | Astro için DOM yolu değerlendirilebilir. Kırpma, PGP tikinin bağımsız hedefi ve klavye odağı üzerinde ayrıca denenmeli.                                          |
| bejarcode/cornerKit            | Sürekli köşe, otomatik ölçü takibi, SVG tabanlı border seçeneği            | Gerçek çizgili çerçeve için ilginç aday. Paket boyutu, uyumluluk ve performans rakamları proje sahibinin beyanıdır; bu araştırmada bağımsız benchmark yapılmadı. |
| mikhailmogilnikov/hyperellipse | CSS corner-shape için native yol ve desteklemeyen tarayıcılara JS fallback | Mevcut CSS'e yakın. Yalnız dört küçük öğe için ek geometri/fallback sistemi almadan önce ihtiyaç kanıtlanmalı.                                                   |
| nolimits4web/atropos           | Katmanlı 3D parallax, JavaScript ve web component desteği                  | İkonu öne, metni geriye koyan bir vitrin için güçlü; kısa iletişim linklerinde gereğinden fazla katman ve hareket getiriyor.                                     |
| micku7zu/vanilla-tilt.js       | İmlece bağlı perspective/tilt, isteğe bağlı glare ve gyroscope seçenekleri | Küçük eğim denemesi için aday. Glare ve jiroskop kapalı; yalnız hassas imleçte ve hareket azaltma tercihi kapalıyken kullanılmalı.                               |

Kaynaklar:

- https://github.com/phamfoo/figma-squircle
- https://github.com/sanalabs/corner-smoothing
- https://github.com/bejarcode/cornerKit
- https://github.com/mikhailmogilnikov/hyperellipse
- https://github.com/nolimits4web/atropos
- https://github.com/micku7zu/vanilla-tilt.js

## Uygulama seçenekleri

### A — Çizgi ve yüzey: ilk öneri

Ortak 8 px radius korunur. Destekleyen tarayıcılarda `corner-shape: superellipse(...)` ile daha akıcı köşe denenebilir; desteklemeyenlerde normal border-radius kalır. Bu Apple maskesinin birebir kopyası değildir. CSS Borders 4 taslağındaki yerel özellik gerçek border ve outline geometrisini de tanımlar; tarayıcı desteği uygulama sırasında doğrulanmalıdır.

Aktif bağlantıda hover: kenarlık `--border` renginden `--text` rengine yaklaşır, zemin `--surface` olur, yüzey 2 px yukarı çıkar. Geçiş yaklaşık 160 ms, basışta yüzey eski konumuna döner. Gölge olmadan hafif yükselme hissi verir; gerçek 3D değildir. Klavye odağı eşdeğer vurguyu alır. Hareket azaltma tercihinde transform/transition kapalı kalır. Hover dönüşümü yalnız `(hover: hover) and (pointer: fine)` altında çalışır.

Bu sayılar araştırmadan çıkan evrensel değerler değil, site için başlangıç önerisidir. Link olmayan Email/XMPP hareket etmez. PGP tikinin kendi hedefi korunur.

### B — İnce kabartma: küçük marka istisnası

A seçeneğine 1 px iç üst kenar ve 1–2 px nötr alt gölge eklenir. Hafif kabartma ve basma hissi verir. Monokrom kalır, fakat mevcut gölgesiz marka kuralını değiştirir. Açık ve koyu tema için ayrı kontrast kontrolü gerekir. Böyle bir istisna Connect ile sınırlı tanımlanmalı.

### C — Gerçek 3D eğim: önce küçük bir deneme

Yalnız hover sırasında en fazla yaklaşık 2 derece eğim, 800–1000 px perspective ve ikon üzerinde çok küçük derinlik ayrımı denenebilir. Metin katmanını sabit tutmak okunabilirliği korumaya yardımcı olur. Bu parametreler öneridir, uygulanmış veya doğrulanmış değildir.

PGP tiki ayrı bir bağlantı olduğundan yüzeyin dönüşümü onun hedefini de taşır; nick ve tik seçimi test edilmeli. Mobilde, klavye kullanımında, hareket azaltma tercihinde ve JavaScript yokken statik görünüm korunmalı. RAF döngüsü sürekli çalışmamalı; pointerleave, blur ve sayfa geçişinde temizlenmeli. Parıltı, otomatik salınım ve cihaz yönü takibi önerilmiyor.

## Sonuç

Bu yapı için önce A: güçlü kenarlık geri bildirimi, sakin 2 px yükselme ve kademeli sürekli köşe iyileştirmesi. Daha hissedilir bir derinlik istenirse B denenir. Atropos/Vanilla Tilt ancak gerçek katmanlı hareket tercih edilirse anlamlı; salt hover'ı canlandırmak için bağımlılık eklemeye gerek yok.

Kaynak: https://drafts.csswg.org/css-borders-4/#corner-shape

Uygulamadan sonra aynı satır genişlikleri, nicklerin bölünmemesi, tik bağlantıları, focus outline'ın kırpılmaması, mobil taşma, iki tema ve hareket azaltma davranışı tarayıcıda doğrulanmalı.
