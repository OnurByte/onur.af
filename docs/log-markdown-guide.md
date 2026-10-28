# Log yazım rehberi: Markdown, tipografi ve görselleştirme

Bu rehber, sitedeki Log yazılarının `body` alanı için geçerli olan Markdown
sözdizimini ve yayın kurallarını açıklar. İşaretlenen özellikler genel
Markdown'dan değil, bu deponun kullandığı gerçek Log ayrıştırıcısından alınmıştır.

## Hızlı başlangıç

Yazıyı UTF-8 kodlamalı, düz bir `.md` dosyasında yaz. YAML front matter, HTML,
JSON kaçışları veya siteye özgü bir şablon ekleme. Yazı gövdesi doğrudan
`log:new` komutuna verilir:

```sh
bun run log:new "Yazı başlığı" "Kısa özet." article.md metadata.json
```

Komut, Markdown gövdesini `src/content/log.json` içine taslak olarak ekler.
`metadata.json` zorunludur; en küçük geçerli dosya `{}` olur. Dil, kategori,
kapak ve kaynak listesi isteğe bağlıdır. Taslak klasörü şöyle düzenlenebilir:

```text
article.md
metadata.json
public/media/request-flow.svg
```

Bu komut yalnızca yerel taslağı kaydeder; bir önizleme veya yayın komutu değildir.
İmzasız yeni kayıt, tam yayın build'inde bilerek reddedilir. Rehberdeki örnekleri
çalıştırmak için mevcut imzalı bir yazının gövdesini değiştirme.

Yayınlama ve imzalama adımları için [Log ve kimlik kanıtları](log-and-proofs.md)
rehberine bak.

## İçerik kuralları

- Gövde boş olamaz ve en fazla 200.000 karakter olabilir.
- Başlık bir satırda olmalı; en fazla 200 karakter olabilir.
- Özet boş olamaz; en fazla 4.000 karakter olabilir. RSS ve arama sonuçlarında
  kullanıldığı için yazının konusunu tek başına anlatmalı.
- Başlık, özet, gövde ve o revizyona ait metadata imzalanan içeriğin parçasıdır.
  Yayınlanmış revizyonu düzenleme; düzeltme için yeni bir revizyon ekle.
- `article.md` içinde JSON biçiminde `\n`, `\"` gibi kaçışlar yazma. Bunları
  `log:new` kendisi JSON'a dönüştürür.
- Markdown gövdesi site tarafından sunulurken HTML'e dönüştürülür. İndirilen
  kanonik Markdown ise özgün metni korur.

## Desteklenen Markdown

İşlemci CommonMark, GitHub Flavored Markdown (GFM), GFM dipnotları ve matematik
için KaTeX kullanır.

### Paragraflar ve satır sonları

Paragrafları boş satırla ayır. Tek satır sonunun yeni paragraf oluşturduğuna
güvenme. Görsel olarak ayrı bir bölüm gerekiyorsa boş satır kullan.

```markdown
İlk paragraf.

İkinci paragraf.
```

### Başlıklar

Başlık boyutu seçmek için Markdown seviyesini kullan; `font-size`, CSS sınıfı
veya HTML etiketi yazma. Makale başlığı `metadata.json` içine değil, komutun ilk
parametresine verilir. Gövdede aynı başlığı tekrar etme.

`#` ile `######` arasında altı seviye desteklenir. Sayfanın yazı başlığı zaten
`h1` olduğu için gövdenin `# Başlık` satırı ekranda ikinci seviye başlığa
dönüştürülür. Genelde gövdede `##` ile başla ve alt başlık seviyelerini sırayla
ilerlet.

```markdown
## Sorun

### Gözlem

## Çözüm
```

Başlıklara otomatik bağlantı kimliği verilir; aynı metindeki başlıklar benzersiz
kimlik alır. Yazı uzunsa bu başlıklar İçindekiler gezinmesinde görünür. Bir
başlığa bağlantı vermek için oluşan kimliği kullan:

```markdown
[Sonuçlara git](#results)
```

Kimlikler başlık metninden türetilir; Türkçe karakterlerin Latin harflere
çevrileceğini varsayma. Karmaşık kimlikleri elle tahmin etmek yerine sayfada
oluşan başlık bağlantısını kopyala. Tarihçe revizyonlarında çakışmayı önlemek
üzere revizyon öneki eklenir.

### Vurgu ve satır içi kod

```markdown
_italik_ veya _italik_
**kalın** veya **kalın**
~~üzeri çizili~~
`satır içi kod`
```

Kod, komut, dosya adı ve kısa teknik değerlerde satır içi kod kullan. Uzun kodu
çitli kod bloğuna koy.

### Listeler

Sırasız listelerde `-`, `*` veya `+`; sıralı listelerde sayı ve nokta kullan.
Alt listeleri girintiyle göster. GFM görev kutuları da desteklenir:

```markdown
- İlk madde
- İkinci madde
  - Alt madde

1. Önce bunu yap
2. Sonra bunu yap

- [x] Tamamlandı
- [ ] Bekliyor
```

Görev kutuları yalnızca görsel durum göstergesidir; sayfada düzenlenebilir bir
form oluşturmaz.

### Tablolar

GFM tabloları desteklenir. Ayraç satırında `:` kullanarak sütun hizalamasını
belirtebilirsin:

```markdown
| Alan  |  Değer |       Not       |
| :---- | -----: | :-------------: |
| Dil   | Türkçe |   İçerik dili   |
| Sürüm |      2 | Güncel revizyon |
```

Tabloları küçük tut; uzun açıklamaları tablo hücrelerine sıkıştırmak yerine
başlık ve liste kullan.

### Bağlantılar

Standart Markdown bağlantıları, başvuru stili bağlantılar ve çıplak URL'ler
desteklenir:

```markdown
[Protokol belgesi](https://example.com/spec)

[Protokol belgesi][spec]

[spec]: https://example.com/spec

https://example.com
```

Bağlantı metni hedefi açıklasın; “buraya tıkla” gibi bağlam vermeyen metinlerden
kaçın. JavaScript gibi çalıştırılabilir bağlantı protokolleri güvenli nedenle
kabul edilmez. Yerel Log bağlantıları kökten başlar:

```markdown
[İlgili yazı](/log/yaziya-ait-uc-kelimeli-id)
[Etiket arşivi](/log/tag/etiket-slug)
```

Mevcut olmayan yerel Log veya etiket bağlantıları güncel yayını doğrularken
hata verir. Eski, arşivlenmiş revizyonlar önceki bağlantılarını korur.

### Alıntılar ve uyarı kutuları

Sıradan blok alıntılar desteklenir:

```markdown
> Bu bir alıntıdır.
>
> İkinci paragraf aynı alıntıya dahildir.
```

İlk satıra aşağıdaki işaretlerden birini yazarak özel kutu oluşturabilirsin:

```markdown
> [!NOTE]
> Bağlam veya kısa bir not.

> [!TIP]
> Uygulanabilir bir öneri.

> [!IMPORTANT]
> Gözden kaçmaması gereken bilgi.

> [!WARNING]
> Dikkat gerektiren olası sorun.

> [!CAUTION]
> Hata durumunda doğabilecek sonuç.

> [!SOURCE]
> [Birincil kaynak](https://example.com/spec)
```

Kutu türleri `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, `CAUTION` ve `SOURCE` ile
sınırlıdır. Ham HTML yazma; işaretler HTML kapatmasını desteklemez.

### Kod blokları

Üç ters tırnakla çevrili kod blokları ve dil etiketi desteklenir. Etiket
üretilen HTML'e dil sınıfı olarak eklenir; kod çalıştırılmaz. Şu anda Shiki,
Prism veya başka bir sözdizimi renklendiricisi yoktur. `ts`, `astro`, `json`,
`bash` ve `text` etiketleri yazılabilir; hepsi monokrom kod olarak görünür.

````markdown
```ts
const answer = 42;
```
````

Kod blokları kopyalanabilir. Kopyalanacak komutlarda istemci (`$`), terminal
çıktısı veya gizli anahtar yerine yalnızca gereken kodu göster. Token, parola,
özel anahtar veya kişisel erişim bilgisi yayımlama.

### Dipnotlar

GFM dipnot sözdizimi desteklenir. Dipnot işareti ve açıklaması aynı kimlikte
olmalı:

```markdown
Bu iddianın açıklaması dipnotta.[^1]

[^1]: Kaynağı veya ek açıklamayı buraya yaz.
```

Dipnotlar açıklama içindir. Sayfa altındaki **Sources** listesine numaralı
bağlantı oluşturmak için aşağıdaki kaynak metadata'sını kullan.

### Matematik

Satır içi matematikte tek `$`, ayrı denklem satırında `$$` kullanılır. Denklem
KaTeX ile sunucuda HTML ve erişilebilir MathML olarak oluşturulur.

```markdown
Einstein bağıntısı $E = mc^2$ satır içinde görünür.

$$
\sum_{n=1}^{\infty} \frac{1}{n^2} = \frac{\pi^2}{6}
$$
```

Bu, tam bir LaTeX belgesi değil, KaTeX matematik sözdizimidir. Hatalı matematik
yayını geçersiz kılar. Kod blokları ve kod içi değerler matematik olarak
yorumlanmaz. Para işareti matematik açıcı gibi görünüyorsa kaçır:

```markdown
Fiyat: \$5
```

KaTeX'te güvenilmeyen HTML, harici görsel ve bağlantı komutları devre dışıdır.

### Görseller

Görseller için Markdown biçimini kullan. Gövde içindeki her görsel açıklayıcı
`alt` metni taşımalı:

```markdown
![İmzayı doğrulayan açık anahtarı gösteren diyagram](/media/signature-flow.webp)
![Grafik başlığı](https://images.example.com/chart.png)
```

Yerel dosyaları `public/` altına koy; örneğin `public/media/chart.webp` için
Markdown yolu `/media/chart.webp` olur. Yerel mutlak yol veya HTTPS adresi
kullan. `http:`, protokol göreli (`//host/...`) ve kimlik bilgisi içeren URL'ler
kabul edilmez. Gövde görselleri için harici HTTPS kaynakları derleme sırasında
indirilmez.

Görsel yalnızca dekoratifse boş alt metni açıkça belirt:

```markdown
![](/media/ornament.webp 'decorative')
```

Yerel gövde görselleri derleme sırasında doğrulanıp uygun WebP türevlerine
dönüştürülür; SVG, GIF ve animasyonlu dosyalar özgün biçiminde kalır. Görsel
bulunamazsa veya yolu `public/` dışına çıkarsa derleme başarısız olur.

## Font, ölçü ve yerleşim

Bu değerler taslak yazarının seçtiği ayarlar değil, sitenin ortak tipografi
sistemidir. Font indirme, Google Fonts bağlantısı veya yazı başına tema ekleme.
Arayüz ve metin ailesi `Helvetica Neue`, `Helvetica`, `Arial`, `sans-serif`
sırasını kullanır. Kod ailesi `ui-monospace`, `SFMono-Regular`, `Menlo`,
`Monaco`, `Consolas`, `Liberation Mono`, `Courier New`, `monospace` olur.
Font dosyası bulunmayan cihazda sıradaki yerel font kullanılır.

| İçerik                            | Mevcut görünüm                                          | Nasıl yazılır?               |
| --------------------------------- | ------------------------------------------------------- | ---------------------------- |
| Makale başlığı                    | 36–48 px aralığında responsive, ağırlık 500, satır 1.15 | `log:new` başlık parametresi |
| Ana bölüm                         | 24 px, ağırlık 500, satır 1.3                           | `## Results`                 |
| Alt bölüm                         | 20 px, ağırlık 500, satır 1.4                           | `### Cold start`             |
| Daha küçük bölüm                  | 18 px, ağırlık 500, satır 1.4                           | `#### Sample conditions`     |
| En derin başlıklar                | 16 px, ağırlık 500, satır 1.6; h6 yardımcı tonda        | `#####` / `######`           |
| Makale gövdesi                    | 16 px, satır 1.8                                        | Normal paragraf              |
| Kalın / italik                    | 700 ağırlık / italik                                    | `**important**` / `_term_`   |
| Kod bloğu                         | 14 px, yerel monospace, yatay taşma kendi içinde        | Çitli blok                   |
| Satır içi kod                     | Çevresindeki yazının 0.875 katı                         | Ters tırnak                  |
| Kaynak, dipnot, görsel açıklaması | 14 px yardımcı metin                                    | Metadata / dipnot            |

Ölçüler tarayıcının varsayılan 16 px kök boyutuna göredir. Kullanıcının font
büyütmesi desteklenir; yazıya sabit yüksekliğe sahip metin kutuları ekleme.
Makale sütunu en fazla 592 px genişliğindedir. Ana sayfa çerçevesinin 960 px
olması, makale görselinin de 960 px görüneceği anlamına gelmez.

Paragraflar arasında genelde 16 px, ana bölümler öncesinde mobilde 40 px /
masaüstünde 48 px, alt bölümler öncesinde 32 px boşluk vardır. Bu boşluklar için
boş paragraf, art arda `br` veya görünmez karakter ekleme. Monokrom renkler
sistem temasından gelir; açıklamaları yalnız renk farkına dayandırma.

## Grafik, diyagram ve görselleştirme

### Hangi biçimi kullanmalıyım?

| İhtiyaç                                   | Bu sitede kullanılacak biçim                                                       |
| ----------------------------------------- | ---------------------------------------------------------------------------------- |
| Birkaç sayıyı kesin olarak karşılaştırmak | Markdown tablosu                                                                   |
| Mimari, imza akışı veya süreç diyagramı   | Yerel SVG, PNG veya WebP görsel                                                    |
| Ölçüm grafiği                             | Dışarıda üretilmiş statik görsel + metin/tabloyla açıklama                         |
| Denklem                                   | KaTeX matematik bloğu                                                              |
| Terminal çıktısı veya kısa akış taslağı   | `text` kod bloğu                                                                   |
| Etkileşimli grafik veya hesaplayıcı       | Ayrı Astro bileşeni + TypeScript + StyleX geliştirmesi; Markdown özelliği değildir |

`mermaid` etiketi şu an diyagram çizmez; normal kod bloğu gösterir. MDX,
React/JSX, `<Chart />`, `<svg>` veya `<iframe>` gövde içinde bileşen olarak
çalıştırılmaz. Hazır bir React grafik örneğini yazıya yapıştırma. Mevcut Log
modeli bu bileşenleri mount etmez. Etkileşim gerekiyorsa önce ayrı bir ürün
özelliği olarak destek tasarlanmalıdır; yazı gövdesi aynı imzalı Markdown
sınırını korur.

### Statik grafik hazırlama

1. Grafiğin cevaplayacağı soruyu bir cümleyle yaz.
2. Ölçümse ortamı, tarihi, örnek sayısını, birimi ve hesaplama yöntemini belirt.
3. Eksenleri, serileri ve önemli noktaları açıkça etiketle; yalnız renk kullanma.
   Monokrom çizgi, kesikli çizgi, işaret biçimi ve doğrudan etiket kullan.
4. 592 px makale sütununda ve 375 px mobil ekranda okunabilirliğini kontrol et.
   Büyük dosyada küçük harf kullanıp küçültülünce okunmasını bekleme.
5. PNG/WebP için gerekirse görünür ölçünün yaklaşık iki katı piksel üret.
   SVG çizimlerde `viewBox` ve doğru en-boy oranı kullan. Gereksiz gömülü font,
   script, yabancı kaynak ve `foreignObject` ekleme.
6. Dosyayı örneğin `public/media/request-flow.svg` olarak kaydet.
7. Anlamlı alt metin ve hemen altında sonucu açıklayan bir paragraf ekle.
   Kritik sayıları görselin içinde bırakma; metin veya tabloda da sun.

```markdown
## Request flow

![A request passes through cache lookup, rendering and response delivery.](/media/request-flow.svg)

The cache lookup happens before rendering. A miss continues to the renderer;
a hit returns the saved response directly. Measurement conditions are listed
in Sources [1].
```

Bu yol bir örnektir; görsel dosyası gerçekten eklenmeden yayınlama.
Gövde görselinin `title` alanı görsel altı açıklama üretmez. Açıklama istiyorsan
sonraki paragrafta yaz; kapakta `caption` metadata'sı vardır.

### Tema ve dosya seçimi

Yazı görselleri ayrı `<img>` olarak yüklenir; sayfanın `currentColor` değerini
otomatik devralmaz. Şeffaf siyah çizimli SVG koyu zeminde kaybolabilir. İki
temada da okunabilen beyaz/siyah nötr bir zemin ve yeterli kontrast seç;
grafikteki etiketleri gerçek mobil ölçüde kontrol et. Görselin kendi içinde
renk kullanmak, sayfa fontunu veya temasını değiştiren CSS ekleme hakkı vermez.

Yerel raster görseller küçültülüp WebP türevleri üretilir; büyütülmez. Responsive
varyantlar 480 / 960 / 1440 ve en çok 1920 px sınırındaki uygun genişliklerden
seçilir. SVG ve animasyonlar türetilmeden korunur. Büyük GIF'i sıradan bir
performans grafiği için kullanma. Dış HTTPS görselleri otomatik indirilmez veya
optimize edilmez; erişilebilirlikleri dış sunucuya bağlıdır. Kendi kanıt
niteliğindeki grafiğini yerel dosya olarak saklamak daha denetlenebilirdir.

Kapak ile gövde görseli ayrı seçimlerdir. Sırf sosyal kartı doldurmak için
ilgisiz kapak ekleme; kapak varsa gerçek boyutlarını metadata'ya yaz. Site
paylaşım kartını otomatik üretir, bunu makalenin temsilî kapak fotoğrafı olarak
ilan etmez. İmzalı medya kapsamının ayrıntıları için
[taşınabilir Log kanıtlarını](portable-log-proofs.md) oku.

## Sources metadata ve numaralı atıflar

Bir revizyona ait **Sources** listesi Markdown gövdesinde değil,
`metadata.json` içindeki `sources` alanında tanımlanır. Gövdede `[1]`, `[2]`
biçiminde liste sırasına göre atıf ver:

```markdown
Protokol bu davranışı tanımlar [1]. İkinci kaynak farklı bir yöntemi açıklar [2].
```

```json
{
  "sources": [
    { "title": "Protokol belirtimi", "url": "https://example.com/spec" },
    { "title": "İlgili Log yazısı", "url": "/log/ilgili-yazi-id" }
  ]
}
```

Kaynak başlığı boş olamaz ve en fazla 300 karakter olabilir. URL yerel kök yolu
veya HTTP(S) adresi olabilir; kullanıcı adı/parola içeren adresler kabul
edilmez. En fazla 100 kaynak eklenebilir. `[1]` işaretleri sıradan metin
düğümlerinde dönüştürülür; mevcut bağlantıların ve kodun içindeki işaretler
değiştirilmez. Karşılık gelen kaynak yoksa işaret düz metin kalır.

Sources metadata'sı da imzalanır. Yayından sonra kaynak eklemek, kaldırmak veya
düzenlemek yeni revizyon gerektirir. Sources listesi boşsa sayfada boş başlık
veya yer tutucu gösterilmez.

## Metadata.json biçimi

Komut satırındaki başlık ve özet dışında `visibility`, `language`, `tags`,
`cover` ve `sources` alanları kabul edilir. `visibility` yazının tamamına,
diğerleri ilk revizyona aittir. Örnek:

```json
{
  "language": "tr",
  "tags": ["cryptography", "identity"],
  "cover": {
    "src": "/media/signature-flow.webp",
    "alt": "İmzayı doğrulayan açık anahtarı gösteren diyagram",
    "caption": "Açık anahtarla imza doğrulama",
    "width": 1200,
    "height": 800
  },
  "sources": [
    { "title": "Protokol belirtimi", "url": "https://example.com/spec" }
  ]
}
```

- `visibility`: `public` veya `unlisted`. Verilmezse `public` kabul edilir.
  `unlisted`, dizinlerden gizler; erişim kontrolü değildir, URL'yi bilen okuyabilir.
- `language`: `tr`, `en` veya `en-GB` biçiminde dil kodu; verilmezse `en`.
  Site kontrolleri İngilizce kalır; bu alan makale içeriğinin dilini belirtir.
- `tags`: `src/content/log-tags.json` içindeki kanonik slug’lardan 0–12
  benzersiz değer. Sözlük `development`, `web`, `privacy`, `cryptography`,
  `pgp`, `identity` ve `ai` etiketlerini içerir; serbest metin kabul edilmez.
- `cover`: `src`, `alt`, `width`, `height` ve isteğe bağlı `caption` içerir.
  Kapak boyutları gerçek görselle birebir eşleşmelidir.
- `sources`: yazının sonunda açılabilir kaynak listesidir; gövde içi dipnotla
  aynı şey değildir.

Kategori görünümünde `⟐ Development` gibi bir önek kullanılır. JSON'a `⟐` veya
`#` yazılmaz; yalnızca `development` slug'ı eklenir. Aynı kategori slug'ını bir
revizyonda tekrarlama.

Yeni revizyonda metadata alanları otomatik devralınmaz. Bir alanı korumak
istiyorsan yeni `metadata.json` dosyasına tekrar ekle.

## Desteklenmeyen veya kaçınılması gerekenler

- Ham HTML, JSX, `<iframe>`, `<script>` ve özel CSS işlenmez; HTML gövdeye
  güvenli biçimde kaçırılır.
- Markdown içinde keyfi HTML özellikleriyle resim, video veya etkileşimli
  bileşen eklemeye çalışma.
- KaTeX içinde harici bağlantı/görsel oluşturmaya çalışma.
- Görselde açıklayıcı alt metni atlama; yalnız dekoratif görselde yukarıdaki
  `"decorative"` işaretini kullan.
- Yayınlanmış bir başlık, özet, Markdown veya metadata'yı doğrudan değiştirme.
  Değişiklik imzayı geçersiz kılar; yeni revizyon yayımla.

## Yazım ve son kontrol listesi

Bu bölüm editoryal öneridir; sözdizimi doğrulayıcısının zorunlu tuttuğu kurallar
değildir.

- Başlığı somut ve kolay taranır tut; özette yazının ne kattığını tek başına
  açıkla.
- Paragraflarda tek ana fikir taşı; konuyu değiştirdiğinde yeni paragraf aç.
- Başlıkları belge yapısını göstermek için kullan; yalnızca yazıyı büyütmek
  amacıyla başlık ekleme.
- İddia, tanım veya ölçüm başka bir kaynağa dayanıyorsa doğrudan bağlantı veya
  Sources atfı ver.
- Kod bloğuna gereken en küçük tekrar üretilebilir örneği koy; dil etiketini
  belirt.
- Görseli yazı içinde açıkla; alt metni yalnızca görünüşü değil, anlamlı
  içeriği tarif etsin.
- Taslağı imzalamadan önce yerel bağlantıları, görselleri, başlık seviyelerini,
  denklem ve dipnotları kontrol et.
- İçerik doğrulaması için `bun run check`, tam yayın derlemesi için
  `bun run build` kullan. Yayından sonra içeriği düzenleme; düzeltme için yeni
  sürüm oluştur.

## Kopyalanabilir başlangıç şablonu

`article.md`:

````markdown
The first paragraph states the result and why it matters.

## Problem

Describe the observed behavior and the evidence [1].

## Approach

Explain the decision, including relevant limits.

```ts
const result = await runExperiment();
```

## Results

| Metric       | Measurement | Conditions    |
| ------------ | ----------: | ------------- |
| Sample count |          20 | Local fixture |

These are placeholder values; replace them with your actual measurements.

## Limits

State what the experiment does and does not establish.
````

`metadata.json`:

```json
{
  "language": "en",
  "tags": ["development"],
  "sources": [
    {
      "title": "Experiment methodology",
      "url": "https://example.com/methodology"
    }
  ]
}
```

Örnek adresleri, kodu ve sayıları gerçek içeriğe göre değiştir. Makale
kontrolleri İngilizcedir; farklı dilde yazıyorsan `language` alanını doğru gir.

## Önizleme, doğrulama ve yayın

İçeriği kaydetmeden önce Markdown'ın ayrıştırılmasını, başlıklarını ve görsel
başvurularını yerelde kontrol edebilirsin:

```sh
bun -e 'import { readFile } from "node:fs/promises"; import { renderLogContent } from "./src/portfolio/log-markdown"; const result = renderLogContent(await readFile("article.md", "utf8")); console.log(JSON.stringify({ headings: result.headings, images: result.images, links: result.links }, null, 2));'
```

Bu kontrol imza oluşturmaz, dosya yazmaz, görsellerin varlığını doğrulamaz ve
bir tarayıcı önizlemesi yerine geçmez. `sources` atıflarının gerçek sayısını,
metadata'yı ve medya yollarını ayrıca kontrol et. Kaynaklar ile tam içerik
modeli `log:new` / yayın build'inde doğrulanır.

Yeni taslak kaydetme:

```sh
bun run log:new "A concrete title" "A standalone summary of the result." article.md metadata.json
```

Komutun verdiği üç kelimelik ID'yi sakla. Henüz imzalanmamış taslak tam
build'de başarısız olabilir; bu bir Markdown font hatası değildir. Hazır
olduğunda, güvenilir kendi yerel ortamında ve özel anahtarla yayın hazırlama:

```sh
bun run log:publish generated-threeword-id
```

`generated-threeword-id` yer tutucudur; gerçek üretilmiş ID'yi kullan.
Bu komut imzalama ve yayın kanıtı hazırlama yapar; sırf görsel önizlemek için
çalıştırma. `SITE_URL` şu an kullanılan gerçek Vercel origin'i olmalı;
satın alınmamış gelecekteki domaini aktif canonical adres olarak yazma.
Komut, tek başına dış servislere dağıtım veya deploy anlamına gelmez.

Hazırlanmış içerik için:

```sh
bun run check
bun run build
bun test tests/log-content.test.ts tests/log.test.ts
bun run dev
```

Tarayıcıda `/log/<gerçek-id>` adresini 375 px ve geniş ekranda, açık ve koyu
temada kontrol et. Başlık sırası, satır taşması, kod kopyalama, tablo kaydırma,
görsel alt metni, kaynak bağlantısı ve History revizyonlarını gözden geçir.
Deploy/push ayrı işlemdir. Yayınlanmış metin veya görselde düzeltme gerekiyorsa
eski imzalı sürümü ezme; yeni revizyon oluştur.

## Uygulama teknolojisi sınırı

Makale gövdesi Markdown, metadata JSON, bileşenler `.astro`, uygulama mantığı
TypeScript ve sunum tanımları `src/styles/*.ts` içinde StyleX'tir. React/TSX,
MDX veya Tailwind sınıfları eklenmez. React/Tailwind teknoloji ikonları bu
kütüphanelerin uygulama bağımlılığı olduğu anlamına gelmez.

Log'un üretilmiş HTML'i `log-presentation.ts` üzerinden derlenmiş StyleX
sınıflarını alır; bu sınıfları yazar elle eklemez. Üst seviye geometri ve
başlık/kaynak yerleşimi `log-layout.ts`, gövde sunumu `log-content.ts` içindedir.
`global.css` tarayıcı reseti, ortak tema tokenları ve global erişilebilirlik
kuralları için altyapı dosyasıdır; KaTeX'in kendi CSS'i de matematik dizgisi
üçüncü taraf varlığıdır. Bunlar Tailwind değildir ve makale içinden düzenlenmez.
Stil ekleyecek geliştirici [StyleX rehberini](stylex.md) izlemelidir.
