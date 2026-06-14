// Curated "Essentials" guide, the off-campus survival kit for Klang Valley
// students: where to furnish a room, buy clothes, eat cheaply, get around,
// sort out a SIM, and stay safe and healthy.
//
// Every entry is hand-curated and links straight to the source (an official
// site, or a Google Maps search for physical places and markets). Nothing here
// is sponsored or scraped, it's a starting point, not a guarantee. Prices and
// opening hours change; the copy stays plain and never claims more than it can
// back up (PRODUCT.md brand voice: trustworthy, warm, no FOMO).
//
// Pure static data → the page renders fully server-side with no user input and
// no dynamic fetch, so there's no injection surface to defend.

import type { IconName } from "@/components/nook/icon";

export interface EssentialPlace {
  /** Place or service name. */
  name: string;
  /** One honest line: what you get here and why students use it. */
  what: string;
  /** Rough price signal, e.g. "RM10–40", "Budget", "Free". Optional. */
  price?: string;
  /** Where to find it, e.g. "Mid Valley, IOI City Mall". Optional. */
  where?: string;
  /** Outbound link, official site, or a Google Maps search. Must be http(s). */
  href: string;
  /** Small badge, e.g. "Student discount", "Open late". Optional. */
  tag?: string;
}

export interface EssentialCategory {
  /** Anchor id + stable key. */
  id: string;
  /** Short eyebrow above the title. */
  kicker: string;
  /** Section title. */
  title: string;
  /** Icon name from the shared Icon set. */
  icon: IconName;
  /** One-paragraph intro, plain-spoken. */
  blurb: string;
  places: EssentialPlace[];
}

// Google Maps search deep-link for a physical place/market. Encodes the query
// so it stays a well-formed https URL.
const maps = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

export const ESSENTIALS: EssentialCategory[] = [
  {
    id: "furnish",
    kicker: "Move-in day",
    title: "Furnish your room",
    icon: "bed",
    blurb:
      "Most student rooms come part-furnished, a bed, a wardrobe, maybe a desk. These are the places that fill the gaps without wrecking a first-semester budget.",
    places: [
      {
        name: "IKEA",
        what: "Flat-pack desks, mattresses, lamps and storage. The Damansara and Cheras stores have a marketplace floor of cheap small stuff near the exit.",
        price: "RM5–500",
        where: "Damansara, Cheras",
        href: "https://www.ikea.com/my/en/",
        tag: "Delivery available",
      },
      {
        name: "Mr DIY",
        what: "Hangers, extension plugs, fans, kitchenware, cleaning kit: the everyday bits, almost always the cheapest in the mall.",
        price: "RM2–50",
        where: "Most malls",
        href: "https://www.mrdiy.com/",
      },
      {
        name: "Eco-Shop",
        what: "Everything RM2.40. Cups, baskets, toiletries, snacks. Good for kitting out a room in one trip.",
        price: "RM2.40 flat",
        where: "Nationwide",
        href: "https://www.eco-shop.com.my/",
      },
      {
        name: "Mudah.my",
        what: "Malaysia's biggest second-hand marketplace. Graduating seniors sell desks, fridges and fans cheap. Meet in a public place to pay.",
        price: "Second-hand",
        href: "https://www.mudah.my/",
        tag: "Meet safely",
      },
      {
        name: "Shopee & Lazada",
        what: "Online for anything bulky or boring, bedding, drying racks, mini-fridges. Watch the 9.9 / 11.11 sale dates for the real discounts.",
        price: "Varies",
        href: "https://shopee.com.my/",
      },
      {
        name: "NSK / Nitori",
        what: "Nitori is the Japanese 'affordable home' chain (think budget MUJI) for bedding and storage that lasts past one year.",
        price: "RM20–300",
        where: "Selected malls",
        href: "https://www.nitori-net.my/",
      },
    ],
  },
  {
    id: "clothes",
    kicker: "Wardrobe",
    title: "Clothes & basics",
    icon: "bag",
    blurb:
      "From a presentation blazer to everyday tees and a baju for Raya. The mix below runs from fast-fashion staples to bundle shops where you dig for gems.",
    places: [
      {
        name: "Uniqlo",
        what: "Plain, well-made basics that survive the laundry. The end-of-season racks and online clearance are where students actually buy.",
        price: "RM30–150",
        where: "Most malls",
        href: "https://www.uniqlo.com/my/",
      },
      {
        name: "Brands Outlet",
        what: "Local fast fashion at outlet prices, whole outfits under RM100. Big stores in most malls.",
        price: "Budget",
        where: "Nationwide",
        href: "https://www.brandsoutlet.com.my/",
      },
      {
        name: "Padini Concept Store",
        what: "Home-grown brands (Seed, Vincci, PDI) under one roof. Smart-casual that works for class and interviews.",
        price: "RM40–200",
        href: "https://www.padini.com/",
      },
      {
        name: "Jalan Tuanku Abdul Rahman",
        what: "The old textile street, Kamdar and rows of fabric and baju shops. Cheapest place to sort out traditional wear or tailoring.",
        price: "Budget",
        where: "Jalan TAR, KL",
        href: maps("Jalan Tuanku Abdul Rahman textile shops Kuala Lumpur"),
      },
      {
        name: "Bundle / thrift shops",
        what: "Second-hand 'bundle' stores across KL and PJ, vintage denim and tees by the kilo. Patience rewarded.",
        price: "RM5–30",
        where: "KL, PJ, Sungai Wang",
        href: maps("bundle thrift shop Kuala Lumpur"),
        tag: "Pre-loved",
      },
      {
        name: "Shein / Zalora",
        what: "Online for trend pieces and shoes on a tight budget. Zalora ships faster and returns are easier if the fit is off.",
        price: "Budget",
        href: "https://www.zalora.com.my/",
      },
    ],
  },
  {
    id: "groceries",
    kicker: "Stocking up",
    title: "Groceries & home",
    icon: "kitchen",
    blurb:
      "Weekly shop, late-night snack run, or a market haul for cooking together. Hypermarkets for the basics, wet markets and night markets for fresh and cheap.",
    places: [
      {
        name: "Lotus's",
        what: "The old Tesco, big-format hypermarket with the cheapest staples and a loyalty card worth getting.",
        price: "Budget",
        where: "Nationwide",
        href: "https://www.lotuss.com.my/",
      },
      {
        name: "Mydin",
        what: "Local hypermarket known for the lowest prices on rice, oil and household bulk. Strong on halal and budget brands.",
        price: "Budget",
        where: "USJ, Mall of Medini, KL",
        href: "https://www.mydin.com.my/",
      },
      {
        name: "AEON / AEON BiG",
        what: "Mid-range supermarket inside most malls. BiG is the cheaper hypermarket arm; AEON has better fresh produce.",
        price: "Mid",
        where: "Most malls",
        href: "https://www.aeonretail.com.my/",
      },
      {
        name: "NSK Trade City",
        what: "Wholesale-style warehouse grocer. Buy meat, veg and dry goods in bulk; split a trip with housemates to save.",
        price: "Wholesale",
        where: "Kuchai, Cheras, Selayang",
        href: maps("NSK Trade City Kuala Lumpur"),
      },
      {
        name: "Pasar malam (night markets)",
        what: "Every neighbourhood has a weekly one. Cheapest fresh fruit, veg and cooked dinner in the Klang Valley, bring cash and a bag.",
        price: "Cheap",
        where: "Rotates by night",
        href: maps("pasar malam near me Klang Valley"),
        tag: "Cash only",
      },
      {
        name: "Jaya Grocer",
        what: "The nicer supermarket for when you want imported snacks or a treat. Pricier, but the in-mall ones are open late.",
        price: "Premium",
        where: "Selected malls",
        href: "https://www.jayagrocer.com/",
      },
    ],
  },
  {
    id: "food",
    kicker: "Eating well for less",
    title: "Food on a budget",
    icon: "kitchen",
    blurb:
      "You can eat three meals a day in the Klang Valley for under RM25 if you know where to look. The honest answer is almost always the nearest mamak or economy-rice stall.",
    places: [
      {
        name: "Mamak stalls",
        what: "Open 24/7, roti canai from RM1.50, teh tarik, and a place to study till late. The backbone of student life here.",
        price: "RM2–12",
        where: "Everywhere",
        href: maps("mamak restaurant near me Klang Valley"),
        tag: "Open 24h",
      },
      {
        name: "Nasi campur / economy rice",
        what: "Point at what you want, pay by the scoop. A full plate of rice, veg and protein runs RM6–10 at most kedai.",
        price: "RM6–10",
        where: "Everywhere",
        href: maps("nasi campur economy rice near me"),
      },
      {
        name: "Campus cafeterias",
        what: "Subsidised meals on your own campus are still the cheapest hot food you'll find. Check the faculty cafés, not just the main one.",
        price: "RM3–8",
        where: "On campus",
        href: maps("university cafeteria Klang Valley"),
      },
      {
        name: "Foodpanda & GrabFood",
        what: "Worth it for the vouchers and 'pandapro' free-delivery days when cooking isn't happening. Split orders to clear the minimum.",
        price: "Varies",
        href: "https://www.foodpanda.my/",
        tag: "Use vouchers",
      },
      {
        name: "Pasar malam dinner",
        what: "Fried noodles, ayam, apam balik, fruit, a full night-market dinner for under RM15, packed to take home.",
        price: "RM5–15",
        where: "Weekly, by area",
        href: maps("pasar malam food Klang Valley"),
      },
    ],
  },
  {
    id: "transport",
    kicker: "Getting around",
    title: "Transport & travel",
    icon: "train",
    blurb:
      "The Klang Valley runs on the MRT, LRT, Komuter and a Touch 'n Go card. Set up the card and the My50 pass first, it's the single biggest monthly saving for a student.",
    places: [
      {
        name: "My50 unlimited pass",
        what: "RM50 a month for unlimited Rapid KL trains and buses (MRT, LRT, monorail, BRT). The essential commuter buy if you travel daily.",
        price: "RM50 / month",
        href: "https://myrapid.com.my/bus-train/how-to-ride-with-us/travel-with-my50/",
        tag: "Best value",
      },
      {
        name: "Touch 'n Go eWallet",
        what: "One app for trains, tolls, parking and most cashless payments. Top up online; link a card for auto-reload.",
        price: "Free app",
        href: "https://www.touchngo.com.my/",
      },
      {
        name: "Rapid KL (MRT / LRT)",
        what: "Plan routes and check live times. Stations connect most campuses and malls, the network map is worth memorising.",
        price: "RM1–6 / trip",
        href: "https://myrapid.com.my/",
      },
      {
        name: "KTM Komuter",
        what: "The cheaper heavy-rail line reaching UKM/Kajang, Serdang (UPM) and out to Klang. Slower but far cheaper for longer hauls.",
        price: "RM1–10",
        href: "https://www.ktmb.com.my/",
      },
      {
        name: "Grab",
        what: "Ride-hailing for late nights and group trips. Share the fare across housemates; schedule ahead during rain when prices surge.",
        price: "Varies",
        href: "https://www.grab.com/my/transport/",
        tag: "Split fares",
      },
    ],
  },
  {
    id: "connect",
    kicker: "Stay connected",
    title: "Phone & internet",
    icon: "phone",
    blurb:
      "A prepaid SIM with a generous data plan costs less than RM40 a month. Bring your passport or IC to register, it's required by law for every Malaysian SIM.",
    places: [
      {
        name: "Hotlink Prepaid",
        what: "Maxis's prepaid arm, the widest, most reliable coverage. Good all-rounder if you travel outside the city.",
        price: "RM30–40 / month",
        href: "https://www.hotlink.com.my/",
      },
      {
        name: "Yoodo",
        what: "Build-your-own digital plan, no contract, fully in-app. Popular with students for cheap data and free gaming passes.",
        price: "From RM20",
        href: "https://www.yoodo.com.my/",
        tag: "No contract",
      },
      {
        name: "CelcomDigi Prepaid",
        what: "The merged Celcom + Digi network, strong coverage and frequent student data deals. Easy to register at any branch.",
        price: "RM30–45 / month",
        href: "https://www.celcomdigi.com/",
      },
      {
        name: "Unifi / TIME home fibre",
        what: "If your rental doesn't include wifi, these are the two main home-fibre providers. Check which one wires your building before you commit.",
        price: "From RM89 / month",
        href: "https://unifi.com.my/",
        tag: "Check coverage",
      },
    ],
  },
  {
    id: "money",
    kicker: "Money matters",
    title: "Banking & payments",
    icon: "shield",
    blurb:
      "A local student account with no monthly fee and a debit card makes rent, top-ups and online shopping painless. Most banks waive fees while you're studying.",
    places: [
      {
        name: "Maybank student account",
        what: "The most widely accepted bank in Malaysia. The student/youth account skips the minimum balance and pairs with the MAE app.",
        price: "No monthly fee",
        href: "https://www.maybank2u.com.my/",
      },
      {
        name: "CIMB",
        what: "Big branch and ATM network on and near campuses. Good app, easy online onboarding for students.",
        price: "No monthly fee",
        href: "https://www.cimb.com.my/",
      },
      {
        name: "Boost / GrabPay",
        what: "QR e-wallets accepted at most stalls and mamaks. Handy for splitting bills and catching cashback campaigns.",
        price: "Free app",
        href: "https://www.myboost.com.my/",
        tag: "Split bills",
      },
      {
        name: "PTPTN",
        what: "The national student loan body. Manage your loan, check disbursements and repayment terms through the official portal.",
        price: "Govt loan",
        href: "https://www.ptptn.gov.my/",
      },
    ],
  },
  {
    id: "study",
    kicker: "Study gear",
    title: "Tech, books & study",
    icon: "school",
    blurb:
      "Laptops, a second monitor, lab gear and the textbooks you actually need. Buy second-hand where you can and keep the student-discount proof handy.",
    places: [
      {
        name: "Low Yat Plaza",
        what: "KL's tech mall, laptops, parts, repairs and accessories. Compare two or three shops and bargain; bring a friend who knows specs.",
        price: "Varies",
        where: "Bukit Bintang, KL",
        href: maps("Low Yat Plaza Kuala Lumpur"),
        tag: "Bargain",
      },
      {
        name: "Apple Education store",
        what: "Mac and iPad at the education price if your course needs them. Verify your student status online before you buy.",
        price: "Student price",
        href: "https://www.apple.com/my-edu/store",
        tag: "Student discount",
      },
      {
        name: "BookXcess",
        what: "Remaindered books at a fraction of retail, the Tamarind Square and MyTOWN stores are huge. Great for reference and reading.",
        price: "RM5–40",
        where: "Selected malls",
        href: "https://www.bookxcess.com/",
      },
      {
        name: "Used textbooks (Mudah / Carousell)",
        what: "Search your course code, seniors offload last year's editions cheap. A used textbook is usually a third of the bookshop price.",
        price: "Second-hand",
        href: "https://www.carousell.com.my/",
      },
      {
        name: "Public libraries",
        what: "Free study space, wifi and reference books. The Kuala Lumpur and PJ community libraries are quiet and air-conditioned.",
        price: "Free",
        where: "KL, PJ, Shah Alam",
        href: maps("public library Klang Valley"),
        tag: "Free",
      },
    ],
  },
  {
    id: "health",
    kicker: "Look after yourself",
    title: "Health & safety",
    icon: "check-circle",
    blurb:
      "Know where the nearest clinic and 24-hour pharmacy are before you need them. Public clinics are cheap, your campus health centre is usually free, and the emergency number is 999.",
    places: [
      {
        name: "Guardian / Watsons",
        what: "The two big pharmacy chains in every mall, medicine, toiletries and over-the-counter basics. Many branches open late.",
        price: "Varies",
        where: "Most malls",
        href: "https://www.guardian.com.my/",
      },
      {
        name: "Klinik Kesihatan (public clinics)",
        what: "Government clinics charge RM1 for citizens, the cheapest GP visit you'll find. Bring your IC; expect to queue.",
        price: "RM1 (citizens)",
        where: "Every district",
        href: maps("Klinik Kesihatan near me Klang Valley"),
      },
      {
        name: "Campus health centre",
        what: "Most universities have a clinic or pusat kesihatan offering free or near-free care to enrolled students. Find yours in week one.",
        price: "Free / low",
        where: "On campus",
        href: maps("university health centre Klang Valley"),
      },
      {
        name: "Emergency, 999",
        what: "Police, ambulance and fire across Malaysia. Save it now. For mental-health support, Talian Kasih (15999) and Befrienders run 24/7.",
        price: "Free",
        href: "https://www.befrienders.org.my/",
        tag: "24/7",
      },
    ],
  },
  {
    id: "perks",
    kicker: "Free & discounted",
    title: "Student perks & days out",
    icon: "star",
    blurb:
      "Being a student is a discount in itself, carry your matric card. And when the budget is zero, the Klang Valley has free parks, galleries and museum days worth the trip.",
    places: [
      {
        name: "Student discounts",
        what: "Cinemas, transport, software, gyms and lots of cafés quietly knock money off with a valid matric card. Always ask before you pay.",
        price: "Varies",
        href: "https://www.studentbeans.com/my",
        tag: "Ask first",
      },
      {
        name: "Perdana Botanical Garden",
        what: "Free, huge, and green in the middle of KL, lakeside walks, the bird park nearby and weekend picnics. A proper day out for nothing.",
        price: "Free entry",
        where: "Lake Gardens, KL",
        href: maps("Perdana Botanical Garden Kuala Lumpur"),
      },
      {
        name: "KLCC Park",
        what: "Free park under the Twin Towers with a fountain show most evenings. Good for a cheap night out with friends.",
        price: "Free",
        where: "KLCC, KL",
        href: maps("KLCC Park Kuala Lumpur"),
      },
      {
        name: "National museums & galleries",
        what: "Muzium Negara and the National Art Gallery charge little or nothing for students, and several galleries are free year-round.",
        price: "Free / RM2",
        where: "KL",
        href: "https://www.jmm.gov.my/",
      },
    ],
  },
];
