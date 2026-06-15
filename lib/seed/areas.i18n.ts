// Localized overlay for the area `vibe` descriptors shown as chips on the
// /areas/[slug] hero. English source lives on the area objects in areas.ts;
// this map supplies ms/ar, resolved per slug with English fallback. Area NAMES
// are never translated (proper nouns). University abbreviations inside a vibe
// (UM, UiTM, IIUM) stay as-is.

import type { Locale } from "@/lib/i18n/config";

export const AREA_VIBE_I18N: Record<string, Partial<Record<Locale, string>>> = {
  bangsar: {
    ms: "Kafe, mesra pejalan kaki, mesra ekspatriat",
    ar: "مقاهٍ، صالحة للمشي، ملائمة للوافدين",
  },
  "pantai-dalam": {
    ms: "Tenang, dekat pintu belakang UM",
    ar: "هادئة، قرب البوابة الخلفية لـ UM",
  },
  pj: {
    ms: "Pinggir bandar matang, transit baik",
    ar: "ضاحية راسخة، نقل جيد",
  },
  bangi: {
    ms: "Bandar pelajar, makanan halal",
    ar: "بلدة طلابية، طعام حلال",
  },
  serdang: {
    ms: "Bercampur, makanan gerai",
    ar: "متنوعة، طعام الباعة",
  },
  cyberjaya: {
    ms: "Hab teknologi, kondo moden",
    ar: "مركز تقني، شقق حديثة",
  },
  "shah-alam": {
    ms: "Meriah, dekat UiTM",
    ar: "نابضة بالحياة، قرب UiTM",
  },
  "subang-jaya": {
    ms: "Ibu kota bubble tea, sibuk",
    ar: "عاصمة شاي الفقاعات، مزدحمة",
  },
  "bandar-sunway": {
    ms: "Laluan kanopi ke kampus",
    ar: "ممر مظلّل إلى الحرم",
  },
  cheras: {
    ms: "Mampu milik, akses MRT",
    ar: "ميسورة، وصول MRT",
  },
  gombak: {
    ms: "Berbukit, dekat IIUM",
    ar: "جبلية، قريبة من IIUM",
  },
  setapak: {
    ms: "Padat pelajar, pusat beli-belah berdekatan",
    ar: "كثيفة بالطلاب، مراكز تسوّق قريبة",
  },
};

/** Localized vibe string for an area, falling back to the English source. */
export function localizeVibe(
  slug: string,
  englishVibe: string | null | undefined,
  locale: Locale,
): string {
  return AREA_VIBE_I18N[slug]?.[locale] ?? englishVibe ?? "";
}
