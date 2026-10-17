# Log yazım rehberi: Markdown standartları

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
`metadata.json` zorunludur ve 1–5 kanonik etiket içermelidir. Dil, kapak ve
kaynak listesi isteğe bağlıdır:

```sh
bun run log:new "Yazı başlığı" "Kısa özet." article.md metadata.json
```

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
[Çözüme git](#cozum)
```

Türkçe karakterler ve noktalama işaretleri kimlik oluşturulurken sadeleştirilir;
karmaşık kimlikleri elle tahmin etmek yerine sayfada oluşan başlık bağlantısını
kopyala.

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
renklendirme için bir ipucudur; kod çalıştırılmaz.

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

Komut satırındaki başlık ve özet dışında yalnızca `language`, `tags`, `cover` ve
`sources` alanları kabul edilir. Örnek:

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

- `language`: `tr`, `en` veya `en-GB` biçiminde dil kodu.
- `tags`: `src/content/log-tags.json` içindeki kanonik slug'lardan 1–5
  benzersiz değer. Sözlük `development`, `web`, `privacy`, `cryptography`,
  `pgp`, `identity` ve `ai` etiketlerini içerir; serbest metin kabul edilmez.
- `cover`: `src`, `alt`, `width`, `height` ve isteğe bağlı `caption` içerir.
  Kapak boyutları gerçek görselle birebir eşleşmelidir.
- `sources`: yazının sonunda açılabilir kaynak listesidir; gövde içi dipnotla
  aynı şey değildir.

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
