---
title: "Kurtosis Tabanlı Kanal Dikkat Mekanizması ile Bulanıklığa Dayanıklı Nesne Tespiti"
description: "Yüksek lisans tez çalışmam: bulanık görüntülerde nesne tespiti için önerilen yöntem."
pubDate: "2026-05-01"
heroImage: ""
---

Nesne tespiti, bilgisayarlı görü alanının en temel problemlerinden biridir. Gerçek dünya uygulamalarında — güvenlik kameraları, otonom araçlar, insansız hava araçları — görüntüler sıklıkla bulanık olarak elde edilir. Hareket bulanıklığı, odak dışı kalma veya atmosferik koşullar, derin sinir ağlarının performansını ciddi biçimde düşürebilir.

## Neden Kurtosis?

İstatistikte kurtosis, bir dağılımın "sivrilik" derecesini ölçen dördüncü istatistiksel momenttir. Doğal görüntülerin öznitelik dağılımları yüksek kurtosis değeri gösterir; yani piksel değerleri merkeze yoğunlaşmış, uçlarda ise nadir ama belirgin değerler bulunur. Görüntüye bulanıklık uygulandığında ise merkezi limit teoremi gereği bu dağılım normalleşmeye başlar ve kurtosis değeri düşer.

Bu ilişki, bulanıklığın öznitelik kanalları üzerindeki etkisini doğrudan ölçebileceğimizi göstermektedir. Kurtosis düşüşü, bulanıklıktan etkilenen kanalların bir göstergesi olarak kullanılabilir.

## Önerilen Yaklaşım

Tez kapsamında geliştirilen yöntem, Faster R-CNN + ResNet-50 + FPN mimarisinin öznitelik piramidi katmanlarına yerleştirilen bir kanal dikkat modülü içermektedir. Bu modül, her kanal için anlık kurtosis değerini hesaplar ve öğrenilmiş bir referans kurtosis ile karşılaştırır. İki değer arasındaki fark (Δκ), o kanalın ne ölçüde bulanıklıktan etkilendiğini gösterir.

Bu fark bilgisi, kanallar arası ağırlıklandırma işlemine girdi olarak verilir. Bulanıklıktan az etkilenen kanalların katkısı artırılırken, çok etkilenenlerin katkısı baskılanır. Böylece ağ, bozulma altında bile anlamlı özniteliklere odaklanmayı öğrenir.

## Temel Bulgular

COCO veri seti üzerinde yürütülen deneyler, önerilen yöntemin standart baseline modeline kıyasla sentetik bulanıklık koşullarında daha kararlı bir performans sergilediğini ortaya koymaktadır. Özellikle pikselleştirme ve JPEG sıkıştırma gibi görsel bozulmalara karşı belirgin bir avantaj gözlemlenmektedir.

Kurtosis'in kanal dikkat mekanizmalarında kullanılması, bilinen kadarıyla literatürde daha önce ele alınmamış bir yaklaşımdır. SENet ve MCA gibi önceki çalışmalar sırasıyla birinci ve üçüncü momentleri kullanmış; dördüncü momenti ise gelecek çalışma olarak bırakmıştır.

## Sonuç

Bu çalışma, istatistiksel moment teorisinin fiziksel yorumlanmasından hareketle yeni bir dikkat mekanizması önerisine ulaşmaktadır. Kurtosis'in bulanıklıkla olan matematiksel ilişkisi, mimariye doğrudan yerleştirilen ve öğrenilebilir bir sinyal kaynağına dönüştürülmüştür. Çalışma hâlâ devam etmekte olup sonuçlar tez sürecinde raporlanacaktır.
