// Localized overlay for UNIVERSITY_CONTENT (lib/seed/university-content.ts).
// English remains the source in that file; this map supplies ms/ar versions of
// the prose fields (description, transit, campusFeatures). Resolution falls back
// to English per field, so a missing locale or key degrades gracefully rather
// than throwing. University NAMES are never translated (they live in
// universities.ts and are proper nouns).
//
// Station and place names inside sentences stay in their established Latin form
// (e.g. "Kelana Jaya Line", "Bangsar"); only the surrounding prose is translated.

import type { Locale } from "@/lib/i18n/config";
import {
  UNIVERSITY_CONTENT,
  type UniversityContent,
} from "@/lib/seed/university-content";

interface ContentTranslation {
  description?: string;
  transit?: string[];
  campusFeatures?: string[];
}

type Overlay = Partial<Record<Locale, ContentTranslation>>;

export const UNIVERSITY_CONTENT_I18N: Record<string, Overlay> = {
  um: {
    ms: {
      description:
        "Universiti Malaya ialah universiti tertua Malaysia, di kampus hijau yang luas antara Kuala Lumpur dan Petaling Jaya. Kebanyakan perumahan pelajar terletak di timur kampus sekitar Bangsar dan Pantai, atau merentasi Lebuhraya Persekutuan di PJ. Bilik berhampiran pintu KL cenderung lebih mahal berbanding sebelah PJ.",
      transit: [
        "Stesen LRT Universiti (Laluan Kelana Jaya)",
        "Bas kerap di sepanjang Lebuhraya Persekutuan",
      ],
      campusFeatures: [
        "Hospital pengajar di kampus (UMMC)",
        "Perpustakaan pusat dan ruang belajar 24 jam di kolej kediaman",
        "Pusat sukan di kampus dengan kolam dan stadium",
        "Bas ulang-alik dalaman antara fakulti",
      ],
    },
    ar: {
      description:
        "جامعة مالايا أقدم جامعات ماليزيا، في حرم أخضر واسع بين كوالالمبور وبيتالينغ جايا. تقع معظم مساكن الطلاب شرق الحرم حول بانغسار وبانتاي، أو عبر الطريق الفيدرالي في PJ. تميل الغرف القريبة من بوابة KL إلى أسعار أعلى من جهة PJ.",
      transit: [
        "محطة LRT Universiti (خط Kelana Jaya)",
        "حافلات متكررة على طول الطريق الفيدرالي",
      ],
      campusFeatures: [
        "مستشفى تعليمي داخل الحرم (UMMC)",
        "مكتبة مركزية ومساحات دراسة على مدار 24 ساعة في الكليات السكنية",
        "مركز رياضي في الحرم بمسبح وملعب",
        "حافلة مكوكية داخلية بين الكليات",
      ],
    },
  },
  ukm: {
    ms: {
      description:
        "Kampus utama Universiti Kebangsaan Malaysia terletak di Bangi, kira-kira 30 km selatan Kuala Lumpur. Kampusnya luas dan berhutan; kebanyakan pelajar luar kampus tinggal di Bandar Baru Bangi, dengan sewa lebih rendah daripada mana-mana tempat setara yang lebih dekat dengan KL. Kereta atau KTM ialah cara praktikal keluar masuk.",
      transit: [
        "Stesen KTM UKM (Laluan Seremban), bersebelahan kampus",
        "Bas ulang-alik kampus antara stesen KTM dan fakulti",
      ],
      campusFeatures: [
        "Kampus bukit berhutan dengan laluan bas dalaman",
        "Kolej kediaman di kampus untuk pelajar tahun awal",
        "Perpustakaan utama serta bilik bacaan fakulti",
        "Hospital pengajar Canselor Tuanku Muhriz (kampus Cheras)",
      ],
    },
    ar: {
      description:
        "يقع الحرم الرئيسي للجامعة الوطنية الماليزية في بانغي، على بُعد نحو 30 كم جنوب كوالالمبور. الحرم واسع ومشجّر؛ ويسكن معظم الطلاب خارج الحرم في Bandar Baru Bangi، حيث الإيجارات أقل من أي مكان مماثل أقرب إلى KL. السيارة أو قطار KTM هما الوسيلة العملية للتنقّل.",
      transit: [
        "محطة KTM UKM (خط Seremban)، بمحاذاة الحرم",
        "حافلة مكوكية في الحرم بين محطة KTM والكليات",
      ],
      campusFeatures: [
        "حرم على تلّة مشجّرة مع خط حافلات داخلي",
        "كليات سكنية في الحرم لطلاب السنوات الأولى",
        "مكتبة رئيسية إضافةً إلى قاعات قراءة بالكليات",
        "مستشفى تعليمي Canselor Tuanku Muhriz (حرم Cheras)",
      ],
    },
  },
  upm: {
    ms: {
      description:
        "Universiti Putra Malaysia terletak di Serdang, bersebelahan The Mines dan kira-kira 25 km dari tengah KL. Kampusnya antara yang terbesar di negara ini, berakar dalam pertanian dan kejuruteraan. Pelajar luar kampus kebanyakannya menyewa di Seri Kembangan dan pekan Serdang, kedua-duanya lebih murah daripada KL.",
      transit: [
        "Stesen KTM Serdang (Laluan Seremban)",
        "Bas di sepanjang Jalan Serdang–Kajang",
      ],
      campusFeatures: [
        "Antara kampus terbesar Malaysia, dengan ladang dan hutan simpan sendiri",
        "Bas ulang-alik dalaman merentasi laluan kampus",
        "Kolej di kampus serta akademi sukan",
        "Hospital pengajar veterinar",
      ],
    },
    ar: {
      description:
        "تقع جامعة بوترا الماليزية في سيردانغ، بجوار The Mines وعلى بُعد نحو 25 كم من وسط KL. حرمها من أكبر الأحرام في البلاد، بجذور في الزراعة والهندسة. يستأجر معظم الطلاب خارج الحرم في Seri Kembangan وبلدة Serdang، وكلاهما أرخص من KL.",
      transit: [
        "محطة KTM Serdang (خط Seremban)",
        "حافلات على طول Jalan Serdang–Kajang",
      ],
      campusFeatures: [
        "من أكبر أحرام ماليزيا، بمزرعة ومحمية غابات خاصة به",
        "حافلة مكوكية داخلية عبر مسار الحرم",
        "كليات سكنية في الحرم إضافةً إلى أكاديمية رياضية",
        "مستشفى بيطري تعليمي",
      ],
    },
  },
  uitm: {
    ms: {
      description:
        "Kampus utama Universiti Teknologi MARA terletak di Shah Alam, ibu negeri Selangor. UiTM ialah universiti terbesar Malaysia dari segi pendaftaran, jadi seksyen-seksyen Shah Alam sekitarnya mempunyai stok bilik pelajar yang banyak. Seksyen 7, betul-betul bertentangan pintu utama, ialah kawasan pelajar yang mapan.",
      transit: [
        "Stesen KTM Padang Jawa (Laluan Pelabuhan Klang)",
        "Bas tempatan merentasi seksyen-seksyen Shah Alam",
      ],
      campusFeatures: [
        "Pendaftaran terbesar di negara ini merentasi sistem UiTM",
        "Stadium dan pusat akuatik di kampus",
        "Perpustakaan Tun Abdul Razak, antara perpustakaan universiti terbesar di Malaysia",
        "Pusat beli-belah pelajar khusus dan medan selera di Seksyen 7",
      ],
    },
    ar: {
      description:
        "يقع الحرم الرئيسي لجامعة التكنولوجيا MARA في شاه عالم، عاصمة ولاية سيلانغور. UiTM أكبر جامعات ماليزيا من حيث عدد المسجّلين، لذا تحوي أقسام شاه عالم المحيطة مخزونًا كبيرًا من غرف الطلاب. Seksyen 7، مقابل البوابة الرئيسية مباشرةً، هو حيّ الطلاب الراسخ.",
      transit: [
        "محطة KTM Padang Jawa (خط Port Klang)",
        "حافلات محلية عبر أقسام شاه عالم",
      ],
      campusFeatures: [
        "أكبر عدد مسجّلين في البلاد عبر نظام UiTM",
        "ملعب ومركز مائي في الحرم",
        "مكتبة Tun Abdul Razak، من أكبر مكتبات الجامعات في ماليزيا",
        "مجمّع طلابي ومناطق طعام مخصّصة في Seksyen 7",
      ],
    },
  },
  mmu: {
    ms: {
      description:
        "Kampus Cyberjaya Multimedia University menjadi tunjang koridor teknologi Malaysia, dikelilingi pusat data dan pejabat perisian. Cyberjaya dibina khusus: perumahan kebanyakannya apartmen servis yang lebih baharu, dan ramai datang berperabot. Sewa sederhana, tetapi kawasan ini sunyi di luar waktu kerja.",
      transit: [
        "Stesen MRT Cyberjaya City Centre (Laluan Putrajaya)",
        "Stesen MRT Cyberjaya Utara (Laluan Putrajaya)",
      ],
      campusFeatures: [
        "Fakulti kejuruteraan, pengkomputeran, dan multimedia kreatif dalam satu kampus",
        "Pautan penempatan industri dengan majikan teknologi Cyberjaya",
        "Asrama di kampus serta kawasan rekreasi tepi tasik",
        "Makmal 24 jam sepanjang minggu pengajaran",
      ],
    },
    ar: {
      description:
        "يشكّل حرم Cyberjaya لجامعة الوسائط المتعددة محور ممرّ التقنية في ماليزيا، محاطًا بمراكز البيانات ومكاتب البرمجيات. سايبرجايا مدينة مبنية لغرض محدّد: السكن غالبًا شقق خدمية أحدث، وكثير منها مفروش. الإيجارات متوسطة، لكن المنطقة هادئة خارج ساعات العمل.",
      transit: [
        "محطة MRT Cyberjaya City Centre (خط Putrajaya)",
        "محطة MRT Cyberjaya Utara (خط Putrajaya)",
      ],
      campusFeatures: [
        "كليات الهندسة والحوسبة والوسائط الإبداعية في حرم واحد",
        "روابط تدريب صناعي مع شركات التقنية في سايبرجايا",
        "سكن داخلي في الحرم ومنطقة ترفيه على البحيرة",
        "مختبرات على مدار 24 ساعة خلال أسابيع التدريس",
      ],
    },
  },
  sunway: {
    ms: {
      description:
        "Sunway University terletak di dalam Bandar Sunway, berkongsi bandar dengan pusat beli-belah Sunway Pyramid, pusat perubatan, dan lagun. Hampir semua keperluan pelajar ada dalam bandar ini, dan laluan kanopi bertingkat menghubungkan kampus ke pusat beli-belah dan BRT. Keselesaan ada harganya, bilik di sini lebih mahal daripada purata Lembah Klang.",
      transit: [
        "Stesen BRT SunU-Monash (Laluan Sunway)",
        "Laluan kanopi menghubungkan kampus, Sunway Pyramid, dan BRT",
      ],
      campusFeatures: [
        "Kampus bersepadu dengan bandar Bandar Sunway",
        "Laluan bertingkat berbumbung ke pusat beli-belah dan BRT",
        "Menara kediaman universiti bersebelahan kampus",
        "Kemudahan sukan dan perpustakaan dikongsi dengan Sunway College",
      ],
    },
    ar: {
      description:
        "تقع جامعة Sunway داخل Bandar Sunway، وتشارك البلدة مع مركز Sunway Pyramid والمركز الطبي والبحيرة. تتوفّر تقريبًا كل احتياجات الطالب داخل البلدة، وتربط ممرّات مظلّلة مرتفعة الحرم بالمركز التجاري وحافلة BRT. الراحة لها ثمنها، فالغرف هنا أغلى من متوسط وادي كلانغ.",
      transit: [
        "محطة BRT SunU-Monash (خط Sunway)",
        "ممرّ مظلّل يربط الحرم وSunway Pyramid وحافلة BRT",
      ],
      campusFeatures: [
        "حرم مدمج ضمن بلدة Bandar Sunway",
        "ممرّات مرتفعة مغطّاة إلى المركز التجاري وحافلة BRT",
        "أبراج سكنية جامعية بجوار الحرم",
        "مرافق رياضية ومكتبة مشتركة مع Sunway College",
      ],
    },
  },
  ucsi: {
    ms: {
      description:
        "Kampus utama UCSI University terletak di Taman Connaught, Cheras, di sebelah tenggara Kuala Lumpur. Kawasan ini padat dan rancak: makanan gerai, pasar malam Connaught, dan pangsapuri walk-up lama bersama kondo baharu. Sewa jauh lebih rendah daripada tengah KL.",
      transit: [
        "Stesen MRT Taman Connaught (Laluan Kajang)",
        "Bas di sepanjang Jalan Cheras",
      ],
      campusFeatures: [
        "Terkenal dengan program muzik, perubatan, dan hospitaliti",
        "Dewan persembahan dan dapur pengajaran di kampus",
        "Blok asrama dalam jarak berjalan kaki dari kampus",
        "Pasar malam mingguan betul-betul di luar kawasan kampus",
      ],
    },
    ar: {
      description:
        "يقع الحرم الرئيسي لجامعة UCSI في Taman Connaught بمنطقة Cheras، جنوب شرق كوالالمبور. الحيّ كثيف ونابض بالحياة: طعام الباعة، وسوق Connaught الليلي، وشقق قديمة بلا مصاعد إلى جانب أبراج أحدث. الإيجارات أقل بوضوح من وسط KL.",
      transit: [
        "محطة MRT Taman Connaught (خط Kajang)",
        "حافلات على طول Jalan Cheras",
      ],
      campusFeatures: [
        "معروفة ببرامج الموسيقى والطب والضيافة",
        "قاعات أداء ومطابخ تدريب في الحرم",
        "مبانٍ سكنية على مسافة مشي من الحرم",
        "سوق ليلي أسبوعي مباشرةً خارج منطقة الحرم",
      ],
    },
  },
  iium: {
    ms: {
      description:
        "Kampus Gombak Universiti Islam Antarabangsa Malaysia terletak di sebuah lembah di pinggir timur laut Kuala Lumpur, bersebelahan Sungai Gombak. Kampusnya berdikari dan berpusatkan masjid, dengan kebanyakan pelajar prasiswazah di perumahan mahallah dalam kampus. Pelajar luar kampus menyewa di Taman Melati dan Setapak, sedikit memandu ke selatan.",
      transit: [
        "Terminal LRT Gombak (Laluan Kelana Jaya), dengan bas penyuap ke kampus",
        "Stesen LRT Taman Melati untuk kawasan pelajar Setapak",
      ],
      campusFeatures: [
        "Reka bentuk kampus taman berpusatkan masjid Sultan Haji Ahmad Shah",
        "Kolej kediaman mahallah merangkumi kebanyakan pelajar prasiswazah",
        "Kawasan rekreasi tepi sungai dan kompleks sukan",
        "Komuniti pelajar antarabangsa dari lebih 100 negara",
      ],
    },
    ar: {
      description:
        "يقع حرم Gombak للجامعة الإسلامية العالمية بماليزيا في وادٍ عند الطرف الشمالي الشرقي لكوالالمبور، بجوار نهر Gombak. الحرم مكتفٍ ذاتيًا ويتمحور حول المسجد، ويسكن معظم طلاب البكالوريوس في سكن mahallah داخل الحرم. يستأجر طلاب خارج الحرم في Taman Melati وSetapak، على مسافة قيادة قصيرة جنوبًا.",
      transit: [
        "محطة LRT Gombak الطرفية (خط Kelana Jaya)، مع حافلات مغذّية إلى الحرم",
        "محطة LRT Taman Melati لمنطقة طلاب Setapak",
      ],
      campusFeatures: [
        "تصميم حرم حديقيّ يتمحور حول مسجد Sultan Haji Ahmad Shah",
        "كليات سكنية mahallah تغطّي معظم طلاب البكالوريوس",
        "مناطق ترفيه على ضفة النهر ومجمّع رياضي",
        "مجتمع طلابي دولي من أكثر من 100 دولة",
      ],
    },
  },
  taylors: {
    ms: {
      description:
        "Kampus Lakeside Taylor's University terletak di Subang Jaya, dibina mengelilingi sebuah tasik beberapa minit dari Bandar Sunway. Program hospitaliti dan kulinari ialah kekuatannya yang paling terkenal. Pelajar menyewa di SS15, USJ, dan Bandar Sunway, semuanya kawasan pelajar mapan dengan banyak pilihan makanan.",
      transit: [
        "Stesen BRT South Quay–USJ1 (Laluan Sunway)",
        "Stesen LRT SS15 (Laluan Kelana Jaya) untuk kawasan pelajar SS15",
      ],
      campusFeatures: [
        "Kampus tepi tasik dengan deretan komersial papan jalan",
        "Restoran pengajaran dan dapur latihan terbuka kepada orang ramai",
        "Apartmen U Residence bersebelahan kampus",
        "Pautan bas ulang-alik ke kawasan pelajar berdekatan",
      ],
    },
    ar: {
      description:
        "يقع حرم Lakeside لجامعة Taylor's في Subang Jaya، مبنيًّا حول بحيرة على بُعد دقائق من Bandar Sunway. برامج الضيافة والطهي أبرز نقاط قوّته. يستأجر الطلاب في SS15 وUSJ وBandar Sunway، وكلها أحياء طلابية راسخة بخيارات طعام وفيرة.",
      transit: [
        "محطة BRT South Quay–USJ1 (خط Sunway)",
        "محطة LRT SS15 (خط Kelana Jaya) لمنطقة طلاب SS15",
      ],
      campusFeatures: [
        "حرم على البحيرة مع ممشى تجاري خشبي",
        "مطاعم تدريب ومطابخ تدريب مفتوحة للجمهور",
        "شقق U Residence ملاصقة للحرم",
        "روابط حافلات مكوكية إلى الأحياء الطلابية القريبة",
      ],
    },
  },
  monash: {
    ms: {
      description:
        "Monash University Malaysia ialah kampus antarabangsa terbesar universiti Australia itu, di Bandar Sunway bersebelahan Sunway University. Ijazahnya ialah ijazah Monash Australia. Pilihan perumahan ialah kumpulan Bandar Sunway yang sama: apartmen servis dan kondo pada sewa melebihi purata, dengan kemudahan penuh bandar itu.",
      transit: [
        "Stesen BRT SunU-Monash (Laluan Sunway), di kampus",
        "Laluan kanopi ke Sunway Pyramid dan bandar yang lebih luas",
      ],
      campusFeatures: [
        "Kurikulum dan anugerah Australia; mobiliti kredit dengan Monash Australia",
        "Kampus aktif penyelidikan dengan makmal dan sekolah klinikal sendiri",
        "Berkongsi perumahan dan kemudahan bandar Bandar Sunway",
        "Pertukaran pelajar aktif antara kampus Malaysia dan Melbourne",
      ],
    },
    ar: {
      description:
        "جامعة Monash ماليزيا أكبر حرم دولي للجامعة الأسترالية، في Bandar Sunway بجوار جامعة Sunway. الشهادات هي شهادات Monash أستراليا. خيارات السكن هي نفسها في Bandar Sunway: شقق خدمية وأبراج بإيجارات أعلى من المتوسط، مع كامل مرافق البلدة.",
      transit: [
        "محطة BRT SunU-Monash (خط Sunway)، عند الحرم",
        "ممرّ مظلّل إلى Sunway Pyramid والبلدة الأوسع",
      ],
      campusFeatures: [
        "منهج وشهادة أسترالية؛ وانتقال للساعات المعتمدة مع Monash أستراليا",
        "حرم نشط بحثيًا بمختبرات ومدرسة سريرية خاصة به",
        "يشارك سكن ومرافق بلدة Bandar Sunway",
        "تبادل طلابي نشط بين حرمي ماليزيا وملبورن",
      ],
    },
  },
};

export interface LocalizedUniversityContent {
  description: string;
  transit: string[];
  campusFeatures: string[];
  website: string;
  photo: string;
  photoFile: string;
}

/**
 * Resolve a university's content for a locale, falling back to the English
 * source per field when a translation is absent.
 */
export function localizeUniversityContent(
  id: string,
  content: UniversityContent,
  locale: Locale,
): LocalizedUniversityContent {
  const tr = UNIVERSITY_CONTENT_I18N[id]?.[locale];
  return {
    description: tr?.description ?? content.description,
    transit: tr?.transit ?? content.transit,
    campusFeatures: tr?.campusFeatures ?? content.campusFeatures,
    website: content.website,
    photo: content.photo,
    photoFile: content.photoFile,
  };
}

/** Convenience: look up + localize by id, returning null if the id is unknown. */
export function getLocalizedUniversityContent(
  id: string,
  locale: Locale,
): LocalizedUniversityContent | null {
  const content = UNIVERSITY_CONTENT[id];
  if (!content) return null;
  return localizeUniversityContent(id, content, locale);
}
