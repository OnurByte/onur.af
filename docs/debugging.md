# Debug kayıtları

Sunucu tanı kayıtları yerelde `.local/debug.log` dosyasına JSON Lines biçiminde
yazılır. Her satır ayrı bir JSON kaydıdır; dosya ilk olayda otomatik oluşturulur.
`.local/` Git dışında kalır ve ziyaretçiye sunulmaz.

```sh
tail -F .local/debug.log
```

## Seviyeler

- `info` / `http.redirect`: sondaki `/` işaretinin kanonik adrese 308 ile
  yönlendirilmesi. `Redirecting from /log/.../ to /log/...` tek başına hata değildir.
- `warn` / `http.response`: 4xx yanıtları, örneğin 404 veya reddedilen istek.
- `error` / `http.response`: dönen 5xx yanıtları.
- `error` / `http.exception`: middleware/SSR yürütmesinde yakalanan istisna.
- `warn` / `publication.unavailable`: yerel yayın işlemi nedeniyle geçici 503.
- `error` / `response.stream-error`: bağımsız Node sunucusunda gzip HTML akışının
  üretici hatası. Header gönderildiyse kayıtta 200 kalabilir; bu, gövdenin
  tamamının başarıyla ulaştığı anlamına gelmez. İstemci iptalinde kullanılan `ABORT_ERR` ve
  `ERR_STREAM_PREMATURE_CLOSE` kodları kaydedilmez.

```json
{
  "time": "2026-10-28T20:00:00.000Z",
  "level": "info",
  "event": "http.redirect",
  "method": "GET",
  "route": "/log/[id]",
  "status": 308
}
```

Kayıtta gerçek ziyaretçi URL'si yerine Astro'nun rota şablonu bulunur. Örneğin
`/contribute/[id]` yazılır; ödeme ID'si, query, IP, kullanıcı agent'ı, header,
cookie veya istek gövdesi kaydedilmez. Ham hata mesajı ve tam stack yazılmaz;
standart hata türü, izin verilen sistem/SQL hata kodu ve en fazla beş kaynak
konumu eklenir. Kaynak konumu kendi bilgisayarının mutlak yolunu içermez.

Hatanın saatini, rota şablonunu, HTTP durumunu ve varsa kaynak satırını birlikte
oku. `http.response` bir rotanın hata yanıtı döndürdüğünü gösterir; rotanın
bilerek genel hata cevabına dönüştürdüğü iç istisnayı geriye doğru çıkarmaz.

## Dosya sınırı ve ayarlar

Dosya yaklaşık 1 MiB sınırında `debug.log.1` olarak döndürülür; önceki yedek
üzerine yazılır. En çok güncel dosya ve bir önceki dosya saklanır. Yazmalar
aynı süreç içinde sıraya alınır; disk yavaşlarsa bekleyen kayıt sayısı 100 ile
sınırlanır ve fazlası atılır. Kayıtlar tanı amaçlıdır, eksiksiz denetim defteri
veya analitik değildir. Her istek dosya yazımı için en fazla 250 ms bekler; alttaki sınırlı yazma kuyruğu
sonradan tamamlanabilir. Vercel console kaydı disk kuyruğundan önce gönderilir.
Yazma hatası uygulama isteğini başarısız yapmaz;
console'a sabit bir uyarı düşer.

```dotenv
PORTFOLIO_DEBUG_ENABLED=1
PORTFOLIO_DEBUG_FILE=
```

`PORTFOLIO_DEBUG_ENABLED=0` tanı kaydını kapatır. `PORTFOLIO_DEBUG_FILE` isteğe
bağlı, sunucuya ait dosya yolu geçersiz kılmadır; boşsa varsayılan yol kullanılır.
Yolu `public/` altına koyma. Ortam ayarı değişince sunucuyu yeniden başlat.

Vercel dosyaları kalıcı veya bütün instance'lar arasında ortak değildir.
Varsayılan dosya `/tmp/onur-debug.log` olur; aynı güvenli kayıtlar Vercel Runtime
Logs'a da gönderilir. Repo içindeki `.local/debug.log` ile Vercel logları aynı
dosya değildir. Vercel kayıt saklama/erişim süresi platform ayarına bağlıdır.

## Kapsam

Bu kayıtlar istek middleware'i ve bağımsız Node HTML akışı içindir. Tarayıcıdaki
JavaScript hatalarını, build/CLI hatalarını veya process başlamadan önceki
çökmeleri otomatik toplamaz. Bunlar için tarayıcı Console, terminal çıktısı ve
Vercel build/runtime loglarını incele. Başarılı 2xx yanıtlar normalde dosyaya
kaydedilmez; debug için ziyaretçi takibi eklenmez.
