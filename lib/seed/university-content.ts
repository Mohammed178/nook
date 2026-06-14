// Editorial content for the /universities pages. Sibling to universities.ts
// (which 7 modules import for coordinates/filtering, left untouched).
// Voice per PRODUCT.md: plain, factual, no marketing adjectives, no invented
// numbers. Transit notes are coarse station names, not fabricated walk-times,
// per-listing proximity is computed from coordinates (lib/distance.ts), never
// claimed here.

export interface UniversityContent {
  /** Two-to-three plain sentences a student house-hunter actually needs. */
  description: string;
  /** Nearest rail/BRT stops by name. Coarse on purpose, no walk-time claims. */
  transit: string[];
  /** On-campus facts useful when choosing where to live. */
  campusFeatures: string[];
  /** Official site, https. */
  website: string;
  /** Real campus photograph (Wikimedia Commons, hotlink-stable). */
  photo: string;
  /** Commons file name backing `photo`, rendered as the attribution link
   *  (https://commons.wikimedia.org/wiki/File:{photoFile}). */
  photoFile: string;
}

export const UNIVERSITY_CONTENT: Record<string, UniversityContent> = {
  um: {
    description:
      "Universiti Malaya is Malaysia's oldest university, on a large green campus between Kuala Lumpur and Petaling Jaya. Most student housing sits east of campus around Bangsar and Pantai, or across the Federal Highway in PJ. Rooms close to the KL gate tend to price higher than the PJ side.",
    transit: [
      "Universiti LRT station (Kelana Jaya Line)",
      "Frequent buses along the Federal Highway",
    ],
    campusFeatures: [
      "Teaching hospital on campus (UMMC)",
      "Central library and 24-hour study spaces in residential colleges",
      "On-campus sports centre with pool and stadium",
      "Internal shuttle bus between faculties",
    ],
    website: "https://um.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/95/University_of_Malaya_-_UM_Letters.jpg/1280px-University_of_Malaya_-_UM_Letters.jpg",
    photoFile: "University_of_Malaya_-_UM_Letters.jpg",
  },
  ukm: {
    description:
      "Universiti Kebangsaan Malaysia's main campus is in Bangi, about 30 km south of Kuala Lumpur. The campus is large and forested; most off-campus students live in Bandar Baru Bangi, where rents run lower than anywhere comparable closer to KL. A car or the KTM is the practical way in and out.",
    transit: [
      "UKM KTM station (Seremban Line), adjacent to campus",
      "Campus shuttle between the KTM station and faculties",
    ],
    campusFeatures: [
      "Forested hillside campus with internal bus loop",
      "On-campus residential colleges for early-year students",
      "Main library plus faculty reading rooms",
      "Hospital Canselor Tuanku Muhriz teaching hospital (Cheras campus)",
    ],
    website: "https://www.ukm.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Gong_of_UKM_in_front_of_DECTAR.jpg/1280px-Gong_of_UKM_in_front_of_DECTAR.jpg",
    photoFile: "Gong_of_UKM_in_front_of_DECTAR.jpg",
  },
  upm: {
    description:
      "Universiti Putra Malaysia sits in Serdang, next to the Mines and about 25 km from central KL. The campus is one of the country's largest, with agriculture and engineering roots. Off-campus students mostly rent in Seri Kembangan and Serdang town, both cheaper than KL proper.",
    transit: [
      "Serdang KTM station (Seremban Line)",
      "Buses along Jalan Serdang–Kajang",
    ],
    campusFeatures: [
      "One of Malaysia's largest campuses, with its own farm and forest reserve",
      "Internal shuttle bus across the campus loop",
      "On-campus colleges plus a sports academy",
      "Veterinary teaching hospital",
    ],
    website: "https://upm.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Anjung_Putra%2C_UPM.jpg/1280px-Anjung_Putra%2C_UPM.jpg",
    photoFile: "Anjung_Putra,_UPM.jpg",
  },
  uitm: {
    description:
      "Universiti Teknologi MARA's flagship campus is in Shah Alam, the Selangor state capital. UiTM is Malaysia's largest university by enrolment, so the surrounding sections of Shah Alam carry a deep stock of student rooms. Seksyen 7, directly opposite the main gate, is the established student neighbourhood.",
    transit: [
      "Padang Jawa KTM station (Port Klang Line)",
      "Local buses across Shah Alam's sections",
    ],
    campusFeatures: [
      "Largest enrolment in the country across the UiTM system",
      "On-campus stadium and aquatic centre",
      "Tun Abdul Razak Library, one of the largest university libraries in Malaysia",
      "Dedicated student mall and food courts in Seksyen 7",
    ],
    website: "https://uitm.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/UiTM_Shah_Alam_Pintu_Utama_%28230115%29.jpg/1280px-UiTM_Shah_Alam_Pintu_Utama_%28230115%29.jpg",
    photoFile: "UiTM_Shah_Alam_Pintu_Utama_(230115).jpg",
  },
  mmu: {
    description:
      "Multimedia University's Cyberjaya campus anchors Malaysia's tech corridor, surrounded by data centres and software offices. Cyberjaya is purpose-built: housing is mostly newer serviced apartments, and many come furnished. Rents are moderate, but the area is quiet outside working hours.",
    transit: [
      "Cyberjaya City Centre MRT station (Putrajaya Line)",
      "Cyberjaya Utara MRT station (Putrajaya Line)",
    ],
    campusFeatures: [
      "Engineering, computing, and creative-multimedia faculties on one campus",
      "Industry placement links with Cyberjaya tech employers",
      "On-campus hostels plus a lake-side recreation area",
      "24-hour labs during teaching weeks",
    ],
    website: "https://www.mmu.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/MMU_Chancellery_Building.jpg/1280px-MMU_Chancellery_Building.jpg",
    photoFile: "MMU_Chancellery_Building.jpg",
  },
  sunway: {
    description:
      "Sunway University sits inside Bandar Sunway, sharing the township with Sunway Pyramid mall, the medical centre, and the lagoon. Almost everything a student needs is within the township, and elevated canopy walkways connect campus to the mall and BRT. Convenience is priced in, rooms here cost more than the Klang Valley average.",
    transit: [
      "SunU-Monash BRT station (Sunway Line)",
      "Canopy walkway linking campus, Sunway Pyramid, and the BRT",
    ],
    campusFeatures: [
      "Campus integrated into the Bandar Sunway township",
      "Covered elevated walkways to the mall and BRT",
      "University residence towers next to campus",
      "Shared sports and library facilities with Sunway College",
    ],
    website: "https://sunwayuniversity.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Sunway_University_%28220711%29_04.jpg/1280px-Sunway_University_%28220711%29_04.jpg",
    photoFile: "Sunway_University_(220711)_04.jpg",
  },
  ucsi: {
    description:
      "UCSI University's main campus is in Taman Connaught, Cheras, on the southeast side of Kuala Lumpur. The neighbourhood is dense and lived-in: hawker food, the Connaught night market, and older walk-up apartments alongside newer condos. Rents are noticeably lower than central KL.",
    transit: [
      "Taman Connaught MRT station (Kajang Line)",
      "Buses along Jalan Cheras",
    ],
    campusFeatures: [
      "Known for music, medicine, and hospitality programmes",
      "On-campus performance halls and teaching kitchens",
      "Hostel blocks within walking distance of the campus",
      "Weekly night market directly outside the campus area",
    ],
    website: "https://www.ucsiuniversity.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/UCSI_main_gate_Taman_Connaught_%28231105%29.jpg/1280px-UCSI_main_gate_Taman_Connaught_%28231105%29.jpg",
    photoFile: "UCSI_main_gate_Taman_Connaught_(231105).jpg",
  },
  iium: {
    description:
      "The International Islamic University Malaysia's Gombak campus sits in a valley at the northeast edge of Kuala Lumpur, beside the Gombak river. The campus is self-contained and mosque-centred, with most undergraduates in on-campus mahallah housing. Off-campus students rent in Taman Melati and Setapak, a short drive south.",
    transit: [
      "Gombak LRT terminus (Kelana Jaya Line), with feeder buses to campus",
      "Taman Melati LRT station for the Setapak student area",
    ],
    campusFeatures: [
      "Garden campus design centred on the Sultan Haji Ahmad Shah mosque",
      "Mahallah residential colleges covering most undergraduates",
      "Riverside recreation areas and sports complex",
      "International student community from over 100 countries",
    ],
    website: "https://www.iium.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/df/International_Islamic_University_of_Malaysia_building.jpg/1280px-International_Islamic_University_of_Malaysia_building.jpg",
    photoFile: "International_Islamic_University_of_Malaysia_building.jpg",
  },
  taylors: {
    description:
      "Taylor's University's Lakeside Campus is in Subang Jaya, built around a lake a few minutes from Bandar Sunway. Hospitality and culinary programmes are its best-known strength. Students rent across SS15, USJ, and Bandar Sunway, all established student neighbourhoods with heavy food options.",
    transit: [
      "South Quay–USJ1 BRT station (Sunway Line)",
      "SS15 LRT station (Kelana Jaya Line) for the SS15 student area",
    ],
    campusFeatures: [
      "Lakeside campus with a boardwalk commercial strip",
      "Teaching restaurants and training kitchens open to the public",
      "U Residence apartments adjoining the campus",
      "Shuttle links to nearby student neighbourhoods",
    ],
    website: "https://university.taylors.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Taylors_Lakeside_Campus.jpg/1280px-Taylors_Lakeside_Campus.jpg",
    photoFile: "Taylors_Lakeside_Campus.jpg",
  },
  monash: {
    description:
      "Monash University Malaysia is the Australian university's largest international campus, in Bandar Sunway next door to Sunway University. Degrees are Monash Australia degrees. Housing options are the same Bandar Sunway pool: serviced apartments and condos at above-average rents, with the township's full amenities attached.",
    transit: [
      "SunU-Monash BRT station (Sunway Line), at the campus",
      "Canopy walkway to Sunway Pyramid and the wider township",
    ],
    campusFeatures: [
      "Australian curriculum and award; credit mobility with Monash Australia",
      "Research-active campus with its own labs and clinical school",
      "Shares the Bandar Sunway township's housing and amenities",
      "Active student exchange between Malaysia and Melbourne campuses",
    ],
    website: "https://www.monash.edu.my",
    photo:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Cmglee_Sunway_Monash_University.jpg/1280px-Cmglee_Sunway_Monash_University.jpg",
    photoFile: "Cmglee_Sunway_Monash_University.jpg",
  },
};
