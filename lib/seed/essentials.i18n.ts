// Localized overlay for the Essentials guide (lib/seed/essentials.ts). English
// stays the source; this file supplies ms/ar for the prose (category
// kicker/title/blurb and each place's `what`), plus shared price- and tag-phrase
// maps (those strings repeat across places). Place NAMES, `where` location
// strings, and hrefs are never translated. Resolution falls back to English per
// field via localizeEssentials().

import type { Locale } from "@/lib/i18n/config";
import { ESSENTIALS, type EssentialCategory } from "@/lib/seed/essentials";

interface CategoryText {
  kicker: string;
  title: string;
  blurb: string;
  /** Keyed by the English place name; value is the translated `what`. */
  what: Record<string, string>;
}

type CategoryOverlay = Partial<Record<Locale, CategoryText>>;

// Shared price-phrase translations (strings repeat across places).
const PRICE_I18N: Record<string, Partial<Record<Locale, string>>> = {
  Budget: { ms: "Jimat", ar: "اقتصادي" },
  Mid: { ms: "Sederhana", ar: "متوسط" },
  Cheap: { ms: "Murah", ar: "رخيص" },
  Wholesale: { ms: "Borong", ar: "بالجملة" },
  Premium: { ms: "Premium", ar: "فاخر" },
  "Second-hand": { ms: "Terpakai", ar: "مستعمل" },
  Free: { ms: "Percuma", ar: "مجاني" },
  "Free app": { ms: "Apl percuma", ar: "تطبيق مجاني" },
  "Free entry": { ms: "Masuk percuma", ar: "دخول مجاني" },
  "Free / low": { ms: "Percuma / murah", ar: "مجاني / منخفض" },
  "Free / RM2": { ms: "Percuma / RM2", ar: "مجاني / RM2" },
  Varies: { ms: "Berbeza-beza", ar: "متفاوت" },
  "No monthly fee": { ms: "Tiada yuran bulanan", ar: "بلا رسوم شهرية" },
  "Govt loan": { ms: "Pinjaman kerajaan", ar: "قرض حكومي" },
  "Student price": { ms: "Harga pelajar", ar: "سعر الطلاب" },
  "RM2.40 flat": { ms: "RM2.40 rata", ar: "RM2.40 ثابت" },
  "RM50 / month": { ms: "RM50 / bulan", ar: "RM50 / شهر" },
  "RM1–6 / trip": { ms: "RM1–6 / perjalanan", ar: "RM1–6 / رحلة" },
  "RM30–40 / month": { ms: "RM30–40 / bulan", ar: "RM30–40 / شهر" },
  "From RM20": { ms: "Dari RM20", ar: "من RM20" },
  "RM30–45 / month": { ms: "RM30–45 / bulan", ar: "RM30–45 / شهر" },
  "From RM89 / month": { ms: "Dari RM89 / bulan", ar: "من RM89 / شهر" },
  "RM1 (citizens)": { ms: "RM1 (warganegara)", ar: "RM1 (للمواطنين)" },
};

// Shared tag-phrase translations.
const TAG_I18N: Record<string, Partial<Record<Locale, string>>> = {
  "Delivery available": { ms: "Penghantaran tersedia", ar: "التوصيل متاح" },
  "Meet safely": { ms: "Berjumpa dengan selamat", ar: "قابِلهم بأمان" },
  "Pre-loved": { ms: "Terpakai", ar: "مستعمل" },
  "Cash only": { ms: "Tunai sahaja", ar: "نقدًا فقط" },
  "Open 24h": { ms: "Buka 24 jam", ar: "مفتوح 24 ساعة" },
  "Use vouchers": { ms: "Guna baucar", ar: "استخدم القسائم" },
  "Best value": { ms: "Nilai terbaik", ar: "أفضل قيمة" },
  "Split fares": { ms: "Kongsi tambang", ar: "اقتسام الأجرة" },
  "No contract": { ms: "Tiada kontrak", ar: "بلا عقد" },
  "Check coverage": { ms: "Semak liputan", ar: "تحقّق من التغطية" },
  "Split bills": { ms: "Kongsi bil", ar: "اقتسام الفواتير" },
  Bargain: { ms: "Tawar-menawar", ar: "ساوم" },
  "Student discount": { ms: "Diskaun pelajar", ar: "خصم طلابي" },
  Free: { ms: "Percuma", ar: "مجاني" },
  "24/7": { ms: "24/7", ar: "24/7" },
  "Ask first": { ms: "Tanya dahulu", ar: "اسأل أولًا" },
};

const OVERLAY: Record<string, CategoryOverlay> = {
  furnish: {
    ms: {
      kicker: "Hari pindah masuk",
      title: "Lengkapkan bilik anda",
      blurb:
        "Kebanyakan bilik pelajar datang separa berperabot, katil, almari, mungkin meja. Ini tempat untuk mengisi kekurangan tanpa merosakkan bajet semester pertama.",
      what: {
        IKEA: "Meja, tilam, lampu dan storan pasang-sendiri. Kedai Damansara dan Cheras ada tingkat pasar barang kecil murah berhampiran pintu keluar.",
        "Mr DIY":
          "Penyangkut, palam sambungan, kipas, peralatan dapur, kit pembersihan: barang harian, hampir selalu termurah di pusat beli-belah.",
        "Eco-Shop":
          "Semuanya RM2.40. Cawan, bakul, barang mandian, snek. Bagus untuk melengkapkan bilik dalam satu perjalanan.",
        "Mudah.my":
          "Pasaran terpakai terbesar Malaysia. Senior yang bergraduat menjual meja, peti sejuk dan kipas murah. Berjumpa di tempat awam untuk membayar.",
        "Shopee & Lazada":
          "Dalam talian untuk apa-apa yang besar atau membosankan, cadar, rak penyidai, peti sejuk mini. Perhatikan tarikh jualan 9.9 / 11.11 untuk diskaun sebenar.",
        "NSK / Nitori":
          "Nitori ialah rangkaian 'rumah berpatutan' Jepun (fikir MUJI bajet) untuk cadar dan storan yang tahan lebih daripada setahun.",
      },
    },
    ar: {
      kicker: "يوم الانتقال",
      title: "أثّث غرفتك",
      blurb:
        "تأتي معظم غرف الطلاب مفروشة جزئيًا، سرير وخزانة وربما مكتب. هذه أماكن تسدّ النقص دون إفساد ميزانية الفصل الأول.",
      what: {
        IKEA: "مكاتب ومراتب ومصابيح وتخزين بنظام التجميع الذاتي. يحتوي متجرا Damansara وCheras على طابق سوق للأشياء الصغيرة الرخيصة قرب المخرج.",
        "Mr DIY":
          "علّاقات، ووصلات كهرباء، ومراوح، وأدوات مطبخ، وأدوات تنظيف: الأشياء اليومية، شبه دائمًا الأرخص في المركز التجاري.",
        "Eco-Shop":
          "كل شيء بـ RM2.40. أكواب، وسلال، ومستلزمات حمّام، ووجبات خفيفة. مناسب لتجهيز غرفة في رحلة واحدة.",
        "Mudah.my":
          "أكبر سوق للمستعمل في ماليزيا. يبيع الخريجون مكاتب وثلاجات ومراوح بثمن رخيص. قابِلهم في مكان عام للدفع.",
        "Shopee & Lazada":
          "عبر الإنترنت لأي شيء ضخم أو ممل، أغطية سرير، ورفوف تجفيف، وثلاجات صغيرة. راقب تواريخ تخفيضات 9.9 / 11.11 للخصومات الحقيقية.",
        "NSK / Nitori":
          "Nitori سلسلة 'منزل ميسور' يابانية (تشبه MUJI الاقتصادي) لأغطية السرير والتخزين الذي يدوم أكثر من سنة.",
      },
    },
  },
  clothes: {
    ms: {
      kicker: "Pakaian",
      title: "Pakaian & asas",
      blurb:
        "Daripada blazer pembentangan kepada baju-T harian dan baju untuk Raya. Campuran di bawah merangkumi pakaian segera hinggalah kedai bundle tempat anda menggali permata.",
      what: {
        Uniqlo:
          "Pakaian asas yang ringkas dan dibuat baik yang tahan basuhan. Rak hujung musim dan pelepasan dalam talian ialah tempat pelajar benar-benar membeli.",
        "Brands Outlet":
          "Fesyen segera tempatan pada harga outlet, sepasang pakaian penuh bawah RM100. Kedai besar di kebanyakan pusat beli-belah.",
        "Padini Concept Store":
          "Jenama tempatan (Seed, Vincci, PDI) di bawah satu bumbung. Smart-casual yang sesuai untuk kelas dan temu duga.",
        "Jalan Tuanku Abdul Rahman":
          "Jalan tekstil lama, Kamdar dan deretan kedai kain dan baju. Tempat termurah untuk uruskan pakaian tradisional atau tempahan jahit.",
        "Bundle / thrift shops":
          "Kedai 'bundle' terpakai di seluruh KL dan PJ, denim dan baju-T vintaj mengikut kilogram. Kesabaran berbaloi.",
        "Shein / Zalora":
          "Dalam talian untuk pakaian tren dan kasut pada bajet ketat. Zalora menghantar lebih pantas dan pemulangan lebih mudah jika saiz tidak kena.",
      },
    },
    ar: {
      kicker: "خزانة الملابس",
      title: "الملابس والأساسيات",
      blurb:
        "من سترة العرض إلى القمصان اليومية وثوب العيد. تتراوح القائمة أدناه من أساسيات الموضة السريعة إلى متاجر 'bundle' حيث تنقّب عن الكنوز.",
      what: {
        Uniqlo:
          "أساسيات بسيطة ومتقنة الصنع تصمد أمام الغسيل. رفوف نهاية الموسم والتصفية عبر الإنترنت هي حيث يشتري الطلاب فعلًا.",
        "Brands Outlet":
          "موضة سريعة محلية بأسعار المنافذ، إطلالات كاملة بأقل من RM100. متاجر كبيرة في معظم المراكز التجارية.",
        "Padini Concept Store":
          "علامات محلية (Seed, Vincci, PDI) تحت سقف واحد. أناقة كاجوال تناسب المحاضرات والمقابلات.",
        "Jalan Tuanku Abdul Rahman":
          "شارع المنسوجات القديم، Kamdar وصفوف من محلات الأقمشة والأثواب. أرخص مكان لتدبير الزي التقليدي أو الخياطة.",
        "Bundle / thrift shops":
          "متاجر 'bundle' للمستعمل في أنحاء KL وPJ، جينز وقمصان قديمة بالكيلوغرام. الصبر يُكافأ.",
        "Shein / Zalora":
          "عبر الإنترنت لقطع الموضة والأحذية بميزانية ضيّقة. Zalora أسرع شحنًا وإرجاعها أسهل إن لم يناسب المقاس.",
      },
    },
  },
  groceries: {
    ms: {
      kicker: "Menyimpan stok",
      title: "Barangan runcit & rumah",
      blurb:
        "Beli-belah mingguan, snek lewat malam, atau hasil pasar untuk masak bersama. Pasar raya besar untuk asas, pasar basah dan pasar malam untuk segar dan murah.",
      what: {
        "Lotus's":
          "Bekas Tesco, pasar raya besar dengan barang asas termurah dan kad kesetiaan yang berbaloi.",
        Mydin:
          "Pasar raya tempatan terkenal dengan harga terendah untuk beras, minyak dan barang pukal rumah. Kuat dalam halal dan jenama bajet.",
        "AEON / AEON BiG":
          "Pasar raya pertengahan dalam kebanyakan pusat beli-belah. BiG ialah cabang pasar raya yang lebih murah; AEON ada hasil segar lebih baik.",
        "NSK Trade City":
          "Peruncit gudang gaya borong. Beli daging, sayur dan barang kering secara pukal; kongsi perjalanan dengan teman serumah untuk jimat.",
        "Pasar malam (night markets)":
          "Setiap kejiranan ada satu setiap minggu. Buah, sayur segar dan makan malam termasak termurah di Lembah Klang, bawa tunai dan beg.",
        "Jaya Grocer":
          "Pasar raya lebih elok untuk bila anda mahu snek import atau hadiah. Lebih mahal, tetapi yang dalam pusat beli-belah buka lewat.",
      },
    },
    ar: {
      kicker: "التخزين",
      title: "البقالة والمنزل",
      blurb:
        "تسوّق أسبوعي، أو وجبة خفيفة ليلية، أو حصاد من السوق للطبخ معًا. الأسواق الكبرى للأساسيات، والأسواق الطازجة والليلية للطازج والرخيص.",
      what: {
        "Lotus's":
          "Tesco سابقًا، سوق كبير بأرخص الأساسيات وبطاقة ولاء تستحق الحصول عليها.",
        Mydin:
          "سوق محلي معروف بأقل الأسعار للأرز والزيت ومستلزمات المنزل بالجملة. قوي في الحلال والعلامات الاقتصادية.",
        "AEON / AEON BiG":
          "سوق متوسط داخل معظم المراكز التجارية. BiG هو الذراع الأرخص؛ وAEON أفضل في المنتجات الطازجة.",
        "NSK Trade City":
          "بقّال على نمط المستودعات بالجملة. اشترِ اللحوم والخضار والسلع الجافة بكميات؛ اقتسم الرحلة مع رفاق السكن للتوفير.",
        "Pasar malam (night markets)":
          "لكل حيّ سوق أسبوعي. أرخص فاكهة وخضار طازجة وعشاء مطبوخ في وادي كلانغ، أحضِر نقدًا وكيسًا.",
        "Jaya Grocer":
          "السوق الأرقى حين تريد وجبات مستوردة أو دلالًا. أغلى، لكن فروع المراكز التجارية تفتح حتى وقت متأخر.",
      },
    },
  },
  food: {
    ms: {
      kicker: "Makan sedap dengan lebih jimat",
      title: "Makanan berbajet",
      blurb:
        "Anda boleh makan tiga kali sehari di Lembah Klang dengan kurang RM25 jika tahu tempatnya. Jawapan jujur hampir selalu gerai mamak atau nasi ekonomi terdekat.",
      what: {
        "Mamak stalls":
          "Buka 24/7, roti canai dari RM1.50, teh tarik, dan tempat belajar hingga lewat malam. Tulang belakang kehidupan pelajar di sini.",
        "Nasi campur / economy rice":
          "Tunjuk apa yang anda mahu, bayar ikut senduk. Sepinggan penuh nasi, sayur dan protein berharga RM6–10 di kebanyakan kedai.",
        "Campus cafeterias":
          "Makanan bersubsidi di kampus anda sendiri masih makanan panas termurah. Semak kafe fakulti, bukan hanya yang utama.",
        "Foodpanda & GrabFood":
          "Berbaloi untuk baucar dan hari penghantaran percuma 'pandapro' bila tidak sempat masak. Kongsi pesanan untuk capai minimum.",
        "Pasar malam dinner":
          "Mi goreng, ayam, apam balik, buah, makan malam pasar malam penuh bawah RM15, bungkus untuk bawa pulang.",
      },
    },
    ar: {
      kicker: "أكل جيّد بأقل تكلفة",
      title: "طعام بميزانية",
      blurb:
        "يمكنك تناول ثلاث وجبات يوميًا في وادي كلانغ بأقل من RM25 إن عرفت أين تبحث. الجواب الصادق غالبًا هو أقرب مطعم mamak أو كشك أرز اقتصادي.",
      what: {
        "Mamak stalls":
          "مفتوح 24/7، roti canai من RM1.50، وteh tarik، ومكان للدراسة حتى وقت متأخر. العمود الفقري لحياة الطلاب هنا.",
        "Nasi campur / economy rice":
          "أشِر إلى ما تريد، وادفع بالمغرفة. صحن كامل من الأرز والخضار والبروتين بـ RM6–10 في معظم المحلات.",
        "Campus cafeterias":
          "الوجبات المدعومة في حرمك ما زالت أرخص طعام ساخن تجده. تفقّد مقاهي الكليات، لا الرئيسي فقط.",
        "Foodpanda & GrabFood":
          "يستحق العناء للقسائم وأيام التوصيل المجاني 'pandapro' حين يتعذّر الطبخ. اقتسم الطلبات لبلوغ الحد الأدنى.",
        "Pasar malam dinner":
          "نودلز مقلية، ودجاج، وapam balik، وفاكهة، عشاء سوق ليلي كامل بأقل من RM15، معبّأ لتأخذه معك.",
      },
    },
  },
  transport: {
    ms: {
      kicker: "Bergerak ke sana sini",
      title: "Pengangkutan & perjalanan",
      blurb:
        "Lembah Klang bergerak dengan MRT, LRT, Komuter dan kad Touch 'n Go. Sediakan kad dan pas My50 dahulu, ia penjimatan bulanan terbesar untuk pelajar.",
      what: {
        "My50 unlimited pass":
          "RM50 sebulan untuk kereta api dan bas Rapid KL tanpa had (MRT, LRT, monorel, BRT). Belian komuter penting jika anda bergerak setiap hari.",
        "Touch 'n Go eWallet":
          "Satu apl untuk kereta api, tol, letak kereta dan kebanyakan pembayaran tanpa tunai. Tambah nilai dalam talian; pautkan kad untuk isi semula automatik.",
        "Rapid KL (MRT / LRT)":
          "Rancang laluan dan semak masa langsung. Stesen menghubungkan kebanyakan kampus dan pusat beli-belah, peta rangkaian berbaloi dihafal.",
        "KTM Komuter":
          "Laluan rel berat yang lebih murah ke UKM/Kajang, Serdang (UPM) dan ke Klang. Lebih perlahan tetapi jauh lebih murah untuk jarak jauh.",
        Grab: "Perkhidmatan e-hailing untuk lewat malam dan perjalanan berkumpulan. Kongsi tambang antara teman serumah; jadualkan awal ketika hujan apabila harga melonjak.",
      },
    },
    ar: {
      kicker: "التنقّل",
      title: "النقل والسفر",
      blurb:
        "يعمل وادي كلانغ على MRT وLRT وKomuter وبطاقة Touch 'n Go. جهّز البطاقة وبطاقة My50 أولًا، فهي أكبر توفير شهري للطالب.",
      what: {
        "My50 unlimited pass":
          "RM50 شهريًا لقطارات وحافلات Rapid KL بلا حدود (MRT, LRT, monorail, BRT). شراء أساسي للمتنقّل يوميًا.",
        "Touch 'n Go eWallet":
          "تطبيق واحد للقطارات والرسوم والمواقف ومعظم المدفوعات بلا نقد. اشحن عبر الإنترنت؛ واربط بطاقة لإعادة التعبئة التلقائية.",
        "Rapid KL (MRT / LRT)":
          "خطّط المسارات وتحقّق من الأوقات الحيّة. تربط المحطات معظم الأحرام والمراكز التجارية، وخريطة الشبكة تستحق الحفظ.",
        "KTM Komuter":
          "خط السكك الثقيل الأرخص الواصل إلى UKM/Kajang، وSerdang (UPM)، وحتى Klang. أبطأ لكن أرخص بكثير للمسافات الطويلة.",
        Grab: "طلب سيارات للّيالي المتأخرة والرحلات الجماعية. اقتسم الأجرة مع رفاق السكن؛ واحجز مسبقًا وقت المطر حين ترتفع الأسعار.",
      },
    },
  },
  connect: {
    ms: {
      kicker: "Kekal berhubung",
      title: "Telefon & internet",
      blurb:
        "SIM prabayar dengan pelan data murah hati berharga kurang RM40 sebulan. Bawa pasport atau IC anda untuk mendaftar, ia diwajibkan undang-undang untuk setiap SIM Malaysia.",
      what: {
        "Hotlink Prepaid":
          "Cabang prabayar Maxis, liputan paling luas dan boleh dipercayai. Pilihan serba boleh jika anda bergerak di luar bandar.",
        Yoodo:
          "Bina pelan digital anda sendiri, tiada kontrak, sepenuhnya dalam apl. Popular dengan pelajar untuk data murah dan pas permainan percuma.",
        "CelcomDigi Prepaid":
          "Rangkaian gabungan Celcom + Digi, liputan kuat dan tawaran data pelajar kerap. Mudah didaftar di mana-mana cawangan.",
        "Unifi / TIME home fibre":
          "Jika sewa anda tidak termasuk wifi, ini dua penyedia fiber rumah utama. Semak yang mana mendawai bangunan anda sebelum komited.",
      },
    },
    ar: {
      kicker: "ابقَ على اتصال",
      title: "الهاتف والإنترنت",
      blurb:
        "شريحة مسبقة الدفع بباقة بيانات سخية تكلّف أقل من RM40 شهريًا. أحضِر جواز سفرك أو بطاقتك للتسجيل، فهذا مطلوب قانونًا لكل شريحة ماليزية.",
      what: {
        "Hotlink Prepaid":
          "ذراع Maxis مسبقة الدفع، أوسع تغطية وأكثرها موثوقية. خيار شامل جيّد إن سافرت خارج المدينة.",
        Yoodo:
          "ابنِ باقتك الرقمية بنفسك، بلا عقد، بالكامل في التطبيق. شائعة بين الطلاب للبيانات الرخيصة وتذاكر الألعاب المجانية.",
        "CelcomDigi Prepaid":
          "شبكة Celcom + Digi المدمجة، تغطية قوية وعروض بيانات طلابية متكرّرة. سهلة التسجيل في أي فرع.",
        "Unifi / TIME home fibre":
          "إن لم يتضمّن إيجارك واي فاي، فهذان مزوّدا ألياف المنزل الرئيسيان. تحقّق أيّهما يوصّل مبناك قبل الالتزام.",
      },
    },
  },
  money: {
    ms: {
      kicker: "Hal kewangan",
      title: "Perbankan & pembayaran",
      blurb:
        "Akaun pelajar tempatan tanpa yuran bulanan dan kad debit menjadikan sewa, tambah nilai dan beli-belah dalam talian mudah. Kebanyakan bank mengetepikan yuran semasa anda belajar.",
      what: {
        "Maybank student account":
          "Bank paling luas diterima di Malaysia. Akaun pelajar/belia melangkau baki minimum dan berpasangan dengan apl MAE.",
        CIMB: "Rangkaian cawangan dan ATM besar di dan berhampiran kampus. Apl bagus, pemulaan dalam talian mudah untuk pelajar.",
        "Boost / GrabPay":
          "E-dompet QR diterima di kebanyakan gerai dan mamak. Berguna untuk kongsi bil dan menangkap kempen pulangan tunai.",
        PTPTN:
          "Badan pinjaman pelajar kebangsaan. Urus pinjaman, semak pengeluaran dan terma bayaran balik melalui portal rasmi.",
      },
    },
    ar: {
      kicker: "الأمور المالية",
      title: "البنوك والمدفوعات",
      blurb:
        "حساب طالب محلي بلا رسوم شهرية وبطاقة خصم يجعل الإيجار والشحن والتسوّق عبر الإنترنت سهلًا. تُعفي معظم البنوك من الرسوم أثناء دراستك.",
      what: {
        "Maybank student account":
          "البنك الأوسع قبولًا في ماليزيا. حساب الطالب/الشباب يتخطّى الحد الأدنى للرصيد ويقترن بتطبيق MAE.",
        CIMB: "شبكة فروع وأجهزة صرّاف كبيرة في الأحرام وقربها. تطبيق جيّد وتسجيل إلكتروني سهل للطلاب.",
        "Boost / GrabPay":
          "محافظ QR مقبولة في معظم الأكشاك ومطاعم mamak. مفيدة لاقتسام الفواتير واغتنام حملات استرداد النقد.",
        PTPTN:
          "هيئة قروض الطلاب الوطنية. أدِر قرضك، وتحقّق من الصرف وشروط السداد عبر البوابة الرسمية.",
      },
    },
  },
  study: {
    ms: {
      kicker: "Kelengkapan belajar",
      title: "Teknologi, buku & belajar",
      blurb:
        "Komputer riba, monitor kedua, kelengkapan makmal dan buku teks yang anda benar-benar perlukan. Beli terpakai di mana boleh dan simpan bukti diskaun pelajar.",
      what: {
        "Low Yat Plaza":
          "Pusat teknologi KL, komputer riba, alat ganti, pembaikan dan aksesori. Banding dua atau tiga kedai dan tawar; bawa kawan yang tahu spesifikasi.",
        "Apple Education store":
          "Mac dan iPad pada harga pendidikan jika kursus anda perlukan. Sahkan status pelajar dalam talian sebelum membeli.",
        BookXcess:
          "Buku lebihan pada harga sepecahan runcit, kedai Tamarind Square dan MyTOWN sangat besar. Bagus untuk rujukan dan bacaan.",
        "Used textbooks (Mudah / Carousell)":
          "Cari kod kursus anda, senior melepaskan edisi tahun lepas murah. Buku teks terpakai biasanya sepertiga harga kedai buku.",
        "Public libraries":
          "Ruang belajar percuma, wifi dan buku rujukan. Perpustakaan komuniti Kuala Lumpur dan PJ tenang dan berhawa dingin.",
      },
    },
    ar: {
      kicker: "معدّات الدراسة",
      title: "التقنية والكتب والدراسة",
      blurb:
        "حواسيب محمولة، وشاشة ثانية، ومعدّات مختبر، والكتب الدراسية التي تحتاجها فعلًا. اشترِ المستعمل حيث أمكن واحتفظ بإثبات خصم الطلاب.",
      what: {
        "Low Yat Plaza":
          "مركز التقنية في KL، حواسيب وقطع وإصلاحات وإكسسوارات. قارِن بين محلّين أو ثلاثة وساوم؛ واصطحب صديقًا يعرف المواصفات.",
        "Apple Education store":
          "Mac وiPad بسعر التعليم إن احتاجها مساقك. تحقّق من حالتك الطلابية عبر الإنترنت قبل الشراء.",
        BookXcess:
          "كتب فائضة بجزء من سعر التجزئة، فرعا Tamarind Square وMyTOWN ضخمان. ممتاز للمراجع والقراءة.",
        "Used textbooks (Mudah / Carousell)":
          "ابحث برمز مساقك، يبيع الخريجون طبعات العام الماضي بثمن رخيص. الكتاب المستعمل عادةً ثلث سعر المكتبة.",
        "Public libraries":
          "مساحة دراسة مجانية وواي فاي وكتب مراجع. مكتبتا مجتمع كوالالمبور وPJ هادئتان ومكيّفتان.",
      },
    },
  },
  health: {
    ms: {
      kicker: "Jaga diri anda",
      title: "Kesihatan & keselamatan",
      blurb:
        "Tahu di mana klinik terdekat dan farmasi 24 jam sebelum anda memerlukannya. Klinik awam murah, pusat kesihatan kampus anda biasanya percuma, dan nombor kecemasan ialah 999.",
      what: {
        "Guardian / Watsons":
          "Dua rangkaian farmasi besar di setiap pusat beli-belah, ubat, barang mandian dan asas tanpa preskripsi. Banyak cawangan buka lewat.",
        "Klinik Kesihatan (public clinics)":
          "Klinik kerajaan mengenakan RM1 untuk warganegara, lawatan GP termurah yang anda akan temui. Bawa IC; jangka beratur.",
        "Campus health centre":
          "Kebanyakan universiti ada klinik atau pusat kesihatan menawarkan rawatan percuma atau hampir percuma kepada pelajar berdaftar. Cari milik anda pada minggu pertama.",
        "Emergency, 999":
          "Polis, ambulans dan bomba di seluruh Malaysia. Simpan sekarang. Untuk sokongan kesihatan mental, Talian Kasih (15999) dan Befrienders beroperasi 24/7.",
      },
    },
    ar: {
      kicker: "اعتنِ بنفسك",
      title: "الصحة والسلامة",
      blurb:
        "اعرف أين أقرب عيادة وصيدلية 24 ساعة قبل أن تحتاجها. العيادات العامة رخيصة، ومركز صحة حرمك مجاني غالبًا، ورقم الطوارئ هو 999.",
      what: {
        "Guardian / Watsons":
          "أكبر سلسلتي صيدليات في كل مركز تجاري، أدوية ومستلزمات حمّام وأساسيات بلا وصفة. كثير من الفروع يفتح حتى وقت متأخر.",
        "Klinik Kesihatan (public clinics)":
          "العيادات الحكومية تتقاضى RM1 للمواطنين، أرخص زيارة طبيب عام تجدها. أحضِر بطاقتك؛ وتوقّع الانتظار.",
        "Campus health centre":
          "لمعظم الجامعات عيادة أو مركز صحي يقدّم رعاية مجانية أو شبه مجانية للطلاب المسجّلين. اعثر على مركزك في الأسبوع الأول.",
        "Emergency, 999":
          "الشرطة والإسعاف والإطفاء في أنحاء ماليزيا. احفظه الآن. للدعم النفسي، يعمل Talian Kasih (15999) وBefrienders على مدار 24/7.",
      },
    },
  },
  perks: {
    ms: {
      kicker: "Percuma & berdiskaun",
      title: "Faedah pelajar & jalan-jalan",
      blurb:
        "Menjadi pelajar itu sendiri satu diskaun, bawa kad matrik anda. Dan apabila bajet sifar, Lembah Klang ada taman, galeri dan hari muzium percuma yang berbaloi dilawati.",
      what: {
        "Student discounts":
          "Pawagam, pengangkutan, perisian, gim dan banyak kafe diam-diam memberi potongan dengan kad matrik sah. Sentiasa tanya sebelum membayar.",
        "Perdana Botanical Garden":
          "Percuma, luas, dan hijau di tengah KL, jalan tepi tasik, taman burung berdekatan dan piknik hujung minggu. Jalan-jalan sebenar tanpa kos.",
        "KLCC Park":
          "Taman percuma di bawah Menara Berkembar dengan pertunjukan air pancut hampir setiap petang. Bagus untuk jalan-jalan malam murah dengan kawan.",
        "National museums & galleries":
          "Muzium Negara dan Balai Seni Negara mengenakan sedikit atau tiada bayaran untuk pelajar, dan beberapa galeri percuma sepanjang tahun.",
      },
    },
    ar: {
      kicker: "مجاني ومخفّض",
      title: "مزايا الطلاب والخروجات",
      blurb:
        "كونك طالبًا خصم بحدّ ذاته، احمل بطاقتك الجامعية. وحين تكون الميزانية صفرًا، في وادي كلانغ حدائق ومعارض وأيام متاحف مجانية تستحق الزيارة.",
      what: {
        "Student discounts":
          "السينما والنقل والبرمجيات والصالات الرياضية وكثير من المقاهي تخصم بهدوء ببطاقة جامعية سارية. اسأل دائمًا قبل أن تدفع.",
        "Perdana Botanical Garden":
          "مجانية وضخمة وخضراء في وسط KL، ممشى على البحيرة، وحديقة طيور قريبة، ونزهات نهاية الأسبوع. خروجة حقيقية بلا تكلفة.",
        "KLCC Park":
          "حديقة مجانية تحت البرجين التوأمين مع عرض نافورة معظم الأمسيات. مناسبة لسهرة رخيصة مع الأصدقاء.",
        "National museums & galleries":
          "متحف Muzium Negara والمعرض الفني الوطني يتقاضيان القليل أو لا شيء للطلاب، وعدّة معارض مجانية طوال العام.",
      },
    },
  },
};

/** A copy of ESSENTIALS with prose, price and tag fields localized per locale. */
export function localizeEssentials(locale: Locale): EssentialCategory[] {
  return ESSENTIALS.map((cat) => {
    const ct = OVERLAY[cat.id]?.[locale];
    return {
      ...cat,
      kicker: ct?.kicker ?? cat.kicker,
      title: ct?.title ?? cat.title,
      blurb: ct?.blurb ?? cat.blurb,
      places: cat.places.map((p) => ({
        ...p,
        what: ct?.what[p.name] ?? p.what,
        price: p.price ? PRICE_I18N[p.price]?.[locale] ?? p.price : p.price,
        tag: p.tag ? TAG_I18N[p.tag]?.[locale] ?? p.tag : p.tag,
      })),
    };
  });
}
