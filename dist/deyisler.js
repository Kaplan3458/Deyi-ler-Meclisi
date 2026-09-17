/*
  YENİ DEYİŞ EKLEME
  Aşağıdaki örneklerden birini kopyalayın. Her kayıtta benzersiz bir "id",
  başlık, mahlas ve tam metin bulunmalıdır. Mahlas bilinmiyorsa "Bilinmiyor"
  yazmak yerine kaydı doğrulayana kadar yayımlamamanız önerilir.
*/

window.DEYISLER = [
  {
    id: "ornek-deyis-kaydi",
    baslik: "Örnek Deyiş Kaydı",
    mahlas: "Doğrulanacak Mahlas",
    tur: "Deyiş",
    konular: ["örnek", "arşiv"],
    metin: `Bu alan, elinizde doğruluğu kontrol edilmiş
deyiş metinleriyle değiştirilecektir.

Her kıtayı boş bir satırla ayırabilir,
mahlas dizesini metne aynen ekleyebilirsiniz.`,
    not: "Bu yalnızca sitenin görünümünü göstermek için eklenmiş örnek kayıttır; yayına çıkmadan önce silinmelidir."
  },
  {
    id: "ikinci-ornek-kaydi",
    baslik: "İkinci Örnek Kayıt",
    mahlas: "Doğrulanacak Mahlas",
    tur: "Nefes",
    konular: ["örnek", "birlik"],
    metin: `Başlıkların alfabetik dizilişi,
Türk alfabesine göre otomatik yapılır.

Arama; başlığı, metni, mahlası
ve konu etiketlerini birlikte tarar.`,
    not: "Bu örnek de gerçek arşiv içeriği eklendiğinde kaldırılmalıdır."
  }
];
