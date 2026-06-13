// Editorial imagery for the /areas pages — the area-level sibling of
// university-content.ts. Photos are real Wikimedia Commons lead images of each
// neighbourhood (hotlink-stable upload.wikimedia.org URLs, same source and
// licence model as the campus photos). `photoFile` backs the attribution link
// (https://commons.wikimedia.org/wiki/File:{photoFile}).
//
// Keyed by area SLUG (= area.id in the seed). An area absent from this map
// (e.g. gombak — no representative free photo exists) renders the warm
// token-band fallback rather than a misleading stock image (PRODUCT.md: never
// claim or imply what isn't true).

export interface AreaContent {
  /** Real neighbourhood photograph (Wikimedia Commons, hotlink-stable). */
  photo: string;
  /** Commons file name backing `photo`, rendered as the attribution link. */
  photoFile: string;
}

export const AREA_CONTENT: Record<string, AreaContent> = {
  bangsar: {
    photo: "https://upload.wikimedia.org/wikipedia/commons/8/8d/Bangsar.JPG",
    photoFile: "Bangsar.JPG",
  },
  "pantai-dalam": {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Jalan_Pantai_Dalam%2C_Kuala_Lumpur_20240212_145523.jpg/3840px-Jalan_Pantai_Dalam%2C_Kuala_Lumpur_20240212_145523.jpg",
    photoFile: "Jalan_Pantai_Dalam,_Kuala_Lumpur_20240212_145523.jpg",
  },
  pj: {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/a/ae/Section_17_PJ_4.jpg",
    photoFile: "Section_17_PJ_4.jpg",
  },
  bangi: {
    photo: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Bangi.jpg",
    photoFile: "Bangi.jpg",
  },
  serdang: {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Kampung_Baru_Seri_Kembangan_skyline_%28230419%29_01_%28cropped%29.jpg/3840px-Kampung_Baru_Seri_Kembangan_skyline_%28230419%29_01_%28cropped%29.jpg",
    photoFile:
      "Kampung_Baru_Seri_Kembangan_skyline_(230419)_01_(cropped).jpg",
  },
  cyberjaya: {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/Shaftsburry_Square_Cyberjaya.jpg/3840px-Shaftsburry_Square_Cyberjaya.jpg",
    photoFile: "Shaftsburry_Square_Cyberjaya.jpg",
  },
  "shah-alam": {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/b/bf/Shah_Alam_Blue_mosque_at_night.jpg",
    photoFile: "Shah_Alam_Blue_mosque_at_night.jpg",
  },
  "subang-jaya": {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/5/5b/Subang_Jaya_at_Dusk.jpg",
    photoFile: "Subang_Jaya_at_Dusk.jpg",
  },
  "bandar-sunway": {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/0/0b/Bandar_Sunway_aerial.jpg",
    photoFile: "Bandar_Sunway_aerial.jpg",
  },
  cheras: {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/8/8b/Cheras_Indah_Street_View.jpg",
    photoFile: "Cheras_Indah_Street_View.jpg",
  },
  setapak: {
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/6/6c/Setapak%2C_Kuala_Lumpur%2C_Federal_Territory_of_Kuala_Lumpur%2C_Malaysia_-_panoramio_%282%29.jpg",
    photoFile:
      "Setapak,_Kuala_Lumpur,_Federal_Territory_of_Kuala_Lumpur,_Malaysia_-_panoramio_(2).jpg",
  },
};
