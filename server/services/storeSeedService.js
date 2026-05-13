const Collection = require("../models/Collection");
const InventoryMovement = require("../models/InventoryMovement");
const Order = require("../models/Order");
const Product = require("../models/Product");
const SiteSetting = require("../models/SiteSetting");
const User = require("../models/User");

const unsplashImage = (id, crop = "entropy") => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=72&fm=webp&crop=${crop}`;

const productPhotos = {
  bomber: unsplashImage("photo-1523398002811-999ca8dec234"),
  hoodie: unsplashImage("photo-1556821840-3a63f95609a7"),
  tee: unsplashImage("photo-1521572163474-6864f9cf17ab"),
  denim: unsplashImage("photo-1542272604-787c3835535d"),
  dress: unsplashImage("photo-1515372039744-b8f02a3ae446"),
  blazer: unsplashImage("photo-1591047139829-d91aecb6caea"),
  sneakers: unsplashImage("photo-1549298916-b41d501d3772"),
  cap: unsplashImage("photo-1521369909029-2afed882baee"),
  tote: unsplashImage("photo-1584917865442-de89df76afd3"),
  sunglasses: unsplashImage("photo-1511499767150-a48a237f0083"),
  cargos: unsplashImage("photo-1515886657613-9f3515b0c78f"),
  shirt: unsplashImage("photo-1602810318383-e386cc2a3ccf"),
};

function variants(stockA = 10, stockB = 8, stockC = 6, colors = ["Black", "White"]) {
  return ["S", "M", "L"].flatMap((size, index) => colors.map((color) => ({ size, color, stock: [stockA, stockB, stockC][index] })));
}

const products = [
  {
    name: "Oversized Street Hoodie",
    slug: "oversized-street-hoodie",
    sku: "UW-ST-001",
    category: "Streetwear",
    brand: "UrbanWear",
    description: "Heavyweight oversized hoodie with drop shoulders, kangaroo pocket, and soft fleece interior.",
    highlights: ["Oversized fit", "Soft fleece", "Drop shoulder"],
    price: 59,
    compareAtPrice: 79,
    variants: variants(15, 12, 8, ["Black", "Ash Grey"]),
    lowStockThreshold: 8,
    images: [productPhotos.hoodie],
    tags: ["hoodie", "streetwear", "winter", "trending"],
    isFeatured: true,
    seoTitle: "Oversized Street Hoodie | UrbanWear",
    seoDescription: "Shop oversized streetwear hoodies with size and color variants at UrbanWear.",
  },
  {
    name: "Relaxed Denim Jacket",
    slug: "relaxed-denim-jacket",
    sku: "UW-MN-002",
    category: "Men",
    brand: "UrbanWear",
    description: "Relaxed-fit denim jacket with sturdy seams and a washed blue finish for everyday layering.",
    highlights: ["Relaxed fit", "Washed denim", "Layer-ready"],
    price: 72,
    compareAtPrice: 99,
    variants: variants(10, 7, 4, ["Blue", "Black"]),
    lowStockThreshold: 6,
    images: [productPhotos.denim],
    tags: ["men", "denim", "jacket", "layer"],
    isFeatured: true,
    seoTitle: "Relaxed Denim Jacket | UrbanWear",
    seoDescription: "Buy men's denim jackets with live UrbanWear inventory.",
  },
  {
    name: "Minimal Cotton Tee",
    slug: "minimal-cotton-tee",
    sku: "UW-MN-003",
    category: "Men",
    brand: "UrbanWear Basics",
    description: "Soft cotton everyday tee with a clean crew neck and minimal branding.",
    highlights: ["100% cotton", "Crew neck", "Everyday basic"],
    price: 24,
    compareAtPrice: 32,
    variants: variants(22, 20, 14, ["White", "Black", "Olive"]),
    lowStockThreshold: 12,
    images: [productPhotos.tee],
    tags: ["tee", "men", "basic", "cotton"],
    isFeatured: false,
    seoTitle: "Minimal Cotton Tee | UrbanWear",
    seoDescription: "UrbanWear cotton tees available by size and color.",
  },
  {
    name: "Tailored Oversized Blazer",
    slug: "tailored-oversized-blazer",
    sku: "UW-WM-004",
    category: "Women",
    brand: "UrbanWear Studio",
    description: "Structured oversized blazer designed for clean city styling and smart casual outfits.",
    highlights: ["Structured shoulder", "Oversized silhouette", "City smart"],
    price: 88,
    compareAtPrice: 120,
    variants: variants(8, 6, 5, ["Black", "Cream"]),
    lowStockThreshold: 5,
    images: [productPhotos.blazer],
    tags: ["women", "blazer", "office", "collection"],
    isFeatured: true,
    seoTitle: "Tailored Oversized Blazer | UrbanWear",
    seoDescription: "Shop women’s oversized blazers from UrbanWear.",
  },
  {
    name: "Summer Slip Dress",
    slug: "summer-slip-dress",
    sku: "UW-WM-005",
    category: "Women",
    brand: "UrbanWear Studio",
    description: "Lightweight slip dress with an easy drape for warm weather styling.",
    highlights: ["Lightweight", "Easy drape", "Summer ready"],
    price: 64,
    compareAtPrice: 84,
    variants: variants(9, 8, 4, ["Black", "Sage"]),
    lowStockThreshold: 5,
    images: [productPhotos.dress],
    tags: ["women", "dress", "summer", "seasonal"],
    isFeatured: true,
    seoTitle: "Summer Slip Dress | UrbanWear",
    seoDescription: "Explore UrbanWear seasonal women’s dresses.",
  },
  {
    name: "Utility Cargo Pants",
    slug: "utility-cargo-pants",
    sku: "UW-ST-006",
    category: "Streetwear",
    brand: "UrbanWear Utility",
    description: "Tapered cargo pants with utility pockets and adjustable waist tabs.",
    highlights: ["Utility pockets", "Adjustable waist", "Tapered fit"],
    price: 68,
    compareAtPrice: 92,
    variants: variants(12, 9, 6, ["Black", "Olive"]),
    lowStockThreshold: 7,
    images: [productPhotos.cargos],
    tags: ["streetwear", "cargo", "pants", "utility"],
    isFeatured: false,
    seoTitle: "Utility Cargo Pants | UrbanWear",
    seoDescription: "Shop UrbanWear cargo pants with variant stock.",
  },
  {
    name: "City Runner Sneakers",
    slug: "city-runner-sneakers",
    sku: "UW-AC-007",
    category: "Accessories",
    brand: "UrbanWear Footwear",
    description: "Clean everyday sneakers with cushioned support for city walking.",
    highlights: ["Cushioned sole", "Daily comfort", "Clean profile"],
    price: 95,
    compareAtPrice: 125,
    variants: ["40", "41", "42", "43"].flatMap((size, index) => ["White", "Black"].map((color) => ({ size, color, stock: [6, 8, 7, 5][index] }))),
    lowStockThreshold: 5,
    images: [productPhotos.sneakers],
    tags: ["sneakers", "accessories", "footwear", "street"],
    isFeatured: true,
    seoTitle: "City Runner Sneakers | UrbanWear",
    seoDescription: "UrbanWear sneakers with color and size variants.",
  },
  {
    name: "Logo Dad Cap",
    slug: "logo-dad-cap",
    sku: "UW-AC-008",
    category: "Accessories",
    brand: "UrbanWear",
    description: "Low-profile cotton cap with embroidered UrbanWear logo.",
    highlights: ["Cotton twill", "Adjustable strap", "Logo embroidery"],
    price: 22,
    compareAtPrice: 30,
    variants: [{ size: "FREE", color: "Black", stock: 25 }, { size: "FREE", color: "Khaki", stock: 18 }],
    lowStockThreshold: 10,
    images: [productPhotos.cap],
    tags: ["cap", "accessories", "logo", "streetwear"],
    isFeatured: false,
    seoTitle: "Logo Dad Cap | UrbanWear",
    seoDescription: "UrbanWear caps and accessories.",
  },
  {
    name: "Oversized Button Shirt",
    slug: "oversized-button-shirt",
    sku: "UW-MN-009",
    category: "Men",
    brand: "UrbanWear Studio",
    description: "Breathable oversized button shirt for smart casual summer outfits.",
    highlights: ["Breathable fabric", "Oversized cut", "Smart casual"],
    price: 46,
    compareAtPrice: 64,
    variants: variants(10, 9, 6, ["White", "Sky Blue"]),
    lowStockThreshold: 6,
    images: [productPhotos.shirt],
    tags: ["men", "shirt", "summer", "smart casual"],
    isFeatured: false,
    seoTitle: "Oversized Button Shirt | UrbanWear",
    seoDescription: "Men's oversized button shirts from UrbanWear.",
  },
  {
    name: "Structured Tote Bag",
    slug: "structured-tote-bag",
    sku: "UW-AC-010",
    category: "Accessories",
    brand: "UrbanWear Studio",
    description: "Structured tote bag with roomy storage for daily city use.",
    highlights: ["Roomy storage", "Structured shape", "Daily carry"],
    price: 58,
    compareAtPrice: 78,
    variants: [{ size: "FREE", color: "Black", stock: 11 }, { size: "FREE", color: "Tan", stock: 9 }],
    lowStockThreshold: 5,
    images: [productPhotos.tote],
    tags: ["bag", "accessories", "tote", "women"],
    isFeatured: true,
    seoTitle: "Structured Tote Bag | UrbanWear",
    seoDescription: "Shop UrbanWear tote bags and accessories.",
  },
  {
    name: "Classic Bomber Jacket",
    slug: "classic-bomber-jacket",
    sku: "UW-ST-011",
    category: "Streetwear",
    brand: "UrbanWear Utility",
    description: "Classic bomber jacket with ribbed trims and satin-finish shell.",
    highlights: ["Ribbed trims", "Satin shell", "Classic bomber fit"],
    price: 110,
    compareAtPrice: 145,
    variants: variants(7, 6, 4, ["Black", "Army Green"]),
    lowStockThreshold: 5,
    images: [productPhotos.bomber],
    tags: ["streetwear", "jacket", "bomber", "winter"],
    isFeatured: true,
    seoTitle: "Classic Bomber Jacket | UrbanWear",
    seoDescription: "UrbanWear bomber jackets with live size and color stock.",
  },
  {
    name: "Retro Square Sunglasses",
    slug: "retro-square-sunglasses",
    sku: "UW-AC-012",
    category: "Accessories",
    brand: "UrbanWear Optics",
    description: "Retro square sunglasses with UV protection and lightweight frame.",
    highlights: ["UV protection", "Lightweight frame", "Retro square"],
    price: 34,
    compareAtPrice: 45,
    variants: [{ size: "FREE", color: "Black", stock: 16 }, { size: "FREE", color: "Tortoise", stock: 12 }],
    lowStockThreshold: 6,
    images: [productPhotos.sunglasses],
    tags: ["sunglasses", "accessories", "summer"],
    isFeatured: false,
    seoTitle: "Retro Square Sunglasses | UrbanWear",
    seoDescription: "UrbanWear sunglasses and fashion accessories.",
  },
  {
    name: "Boxy Linen Overshirt", slug: "boxy-linen-overshirt", sku: "UW-MN-013", category: "Men", brand: "UrbanWear Studio",
    description: "Airy linen-blend overshirt with a boxy fit for clean layered dressing.", highlights: ["Linen blend", "Boxy fit", "Layer friendly"], price: 54, compareAtPrice: 72,
    variants: variants(11, 9, 7, ["Stone", "Black"]), lowStockThreshold: 6, images: [unsplashImage("photo-1617137968427-85924c800a22")], tags: ["men", "overshirt", "linen", "summer"], isFeatured: true,
  },
  {
    name: "Straight Fit Chino", slug: "straight-fit-chino", sku: "UW-MN-014", category: "Men", brand: "UrbanWear Basics",
    description: "Straight fit chino pant with a soft cotton handfeel and neat city profile.", highlights: ["Straight fit", "Cotton twill", "Office casual"], price: 48, compareAtPrice: 62,
    variants: variants(12, 11, 8, ["Khaki", "Charcoal"]), lowStockThreshold: 7, images: [unsplashImage("photo-1473966968600-fa801b869a1a")], tags: ["men", "pants", "chino", "basic"], isFeatured: false,
  },
  {
    name: "Ribbed Tank Top", slug: "ribbed-tank-top", sku: "UW-WM-015", category: "Women", brand: "UrbanWear Basics",
    description: "Soft ribbed tank with a fitted silhouette for warm days and layered looks.", highlights: ["Ribbed cotton", "Fitted shape", "Layering basic"], price: 26, compareAtPrice: 34,
    variants: variants(18, 15, 10, ["White", "Black", "Mocha"]), lowStockThreshold: 10, images: [unsplashImage("photo-1487412720507-e7ab37603c6f")], tags: ["women", "tank", "basic", "summer"], isFeatured: true,
  },
  {
    name: "Wide Leg Trouser", slug: "wide-leg-trouser", sku: "UW-WM-016", category: "Women", brand: "UrbanWear Studio",
    description: "Relaxed wide-leg trouser with soft drape and a high-rise waist.", highlights: ["Wide leg", "Soft drape", "High rise"], price: 66, compareAtPrice: 89,
    variants: variants(9, 8, 6, ["Black", "Taupe"]), lowStockThreshold: 5, images: [unsplashImage("photo-1503342217505-b0a15ec3261c")], tags: ["women", "trouser", "workwear", "minimal"], isFeatured: false,
  },
  {
    name: "Cropped Zip Jacket", slug: "cropped-zip-jacket", sku: "UW-WM-017", category: "Women", brand: "UrbanWear Studio",
    description: "Cropped zip jacket with a clean collar and lightweight structure.", highlights: ["Cropped fit", "Light structure", "Zip closure"], price: 74, compareAtPrice: 98,
    variants: variants(8, 7, 5, ["Cream", "Black"]), lowStockThreshold: 5, images: [unsplashImage("photo-1529139574466-a303027c1d8b")], tags: ["women", "jacket", "cropped", "layer"], isFeatured: true,
  },
  {
    name: "Heavyweight Crew Sweatshirt", slug: "heavyweight-crew-sweatshirt", sku: "UW-ST-018", category: "Streetwear", brand: "UrbanWear Street",
    description: "Premium heavyweight crew sweatshirt with a relaxed street silhouette.", highlights: ["Heavyweight fleece", "Relaxed cut", "Minimal logo"], price: 52, compareAtPrice: 69,
    variants: variants(14, 11, 7, ["Black", "Heather Grey"]), lowStockThreshold: 7, images: [unsplashImage("photo-1562157873-818bc0726f68")], tags: ["streetwear", "sweatshirt", "crew", "fleece"], isFeatured: true,
  },
  {
    name: "Parachute Track Pants", slug: "parachute-track-pants", sku: "UW-ST-019", category: "Streetwear", brand: "UrbanWear Utility",
    description: "Light parachute pants with adjustable hems and roomy utility pockets.", highlights: ["Parachute fabric", "Adjustable hem", "Utility pocket"], price: 63, compareAtPrice: 82,
    variants: variants(12, 8, 6, ["Black", "Silver"]), lowStockThreshold: 6, images: [unsplashImage("photo-1506629905607-df8040ef01fe")], tags: ["streetwear", "pants", "utility", "track"], isFeatured: false,
  },
  {
    name: "Graphic Box Tee", slug: "graphic-box-tee", sku: "UW-ST-020", category: "Streetwear", brand: "UrbanWear Street",
    description: "Boxy graphic tee with a soft washed finish and dropped shoulder line.", highlights: ["Boxy shape", "Washed cotton", "Graphic print"], price: 32, compareAtPrice: 42,
    variants: variants(20, 17, 12, ["White", "Black"]), lowStockThreshold: 10, images: [unsplashImage("photo-1503341504253-dff4815485f1")], tags: ["streetwear", "tee", "graphic", "boxy"], isFeatured: true,
  },
  {
    name: "Leather Card Holder", slug: "leather-card-holder", sku: "UW-AC-021", category: "Accessories", brand: "UrbanWear Goods",
    description: "Slim leather card holder with clean slots for daily carry.", highlights: ["Slim profile", "Leather feel", "Daily carry"], price: 28, compareAtPrice: 38,
    variants: [{ size: "FREE", color: "Black", stock: 20 }, { size: "FREE", color: "Tan", stock: 17 }], lowStockThreshold: 8, images: [unsplashImage("photo-1601592998333-08f56d7ac82c")], tags: ["accessories", "wallet", "cardholder", "leather"], isFeatured: false,
  },
  {
    name: "Minimal Crossbody Bag", slug: "minimal-crossbody-bag", sku: "UW-AC-022", category: "Accessories", brand: "UrbanWear Goods",
    description: "Compact crossbody bag with adjustable strap and soft structured body.", highlights: ["Adjustable strap", "Compact", "Soft structured"], price: 49, compareAtPrice: 66,
    variants: [{ size: "FREE", color: "Black", stock: 14 }, { size: "FREE", color: "Sage", stock: 9 }], lowStockThreshold: 6, images: [unsplashImage("photo-1590874103328-eac38a683ce7")], tags: ["accessories", "bag", "crossbody", "daily"], isFeatured: true,
  },
  {
    name: "Canvas Bucket Hat", slug: "canvas-bucket-hat", sku: "UW-AC-023", category: "Accessories", brand: "UrbanWear Goods",
    description: "Soft canvas bucket hat with a clean brim and breathable finish.", highlights: ["Canvas", "Soft brim", "Breathable"], price: 24, compareAtPrice: 32,
    variants: [{ size: "FREE", color: "Black", stock: 18 }, { size: "FREE", color: "Cream", stock: 15 }], lowStockThreshold: 7, images: [unsplashImage("photo-1575428652377-a2d80e2277fc")], tags: ["accessories", "hat", "bucket", "summer"], isFeatured: false,
  },
  {
    name: "Textured Knit Polo", slug: "textured-knit-polo", sku: "UW-MN-024", category: "Men", brand: "UrbanWear Studio",
    description: "Soft knit polo with a textured finish for polished casual styling.", highlights: ["Textured knit", "Polished casual", "Soft collar"], price: 44, compareAtPrice: 59,
    variants: variants(10, 10, 7, ["Navy", "Cream"]), lowStockThreshold: 6, images: [unsplashImage("photo-1620012253295-c15cc3e65df4")], tags: ["men", "polo", "knit", "smart casual"], isFeatured: true,
  },
  {
    name: "Slim Utility Vest", slug: "slim-utility-vest", sku: "UW-ST-025", category: "Streetwear", brand: "UrbanWear Utility",
    description: "Slim utility vest with tonal pockets designed for city layering.", highlights: ["Utility pockets", "Layering piece", "Tonal detail"], price: 57, compareAtPrice: 76,
    variants: variants(8, 7, 5, ["Black", "Olive"]), lowStockThreshold: 5, images: [unsplashImage("photo-1516826957135-700dedea698c")], tags: ["streetwear", "vest", "utility", "layer"], isFeatured: false,
  },
  {
    name: "Soft Pleated Skirt", slug: "soft-pleated-skirt", sku: "UW-WM-026", category: "Women", brand: "UrbanWear Studio",
    description: "Soft pleated skirt with elegant movement and a clean waistband.", highlights: ["Pleated", "Soft movement", "Clean waist"], price: 58, compareAtPrice: 78,
    variants: variants(10, 8, 6, ["Black", "Cream"]), lowStockThreshold: 6, images: [unsplashImage("photo-1515886657613-9f3515b0c78f")], tags: ["women", "skirt", "pleated", "minimal"], isFeatured: false,
  },
  {
    name: "Clean Leather Belt", slug: "clean-leather-belt", sku: "UW-AC-027", category: "Accessories", brand: "UrbanWear Goods",
    description: "Minimal belt with a clean buckle and smooth leather finish.", highlights: ["Clean buckle", "Leather finish", "Daily styling"], price: 31, compareAtPrice: 42,
    variants: [{ size: "S", color: "Black", stock: 8 }, { size: "M", color: "Black", stock: 12 }, { size: "L", color: "Black", stock: 9 }, { size: "M", color: "Brown", stock: 10 }], lowStockThreshold: 5, images: [unsplashImage("photo-1624222247344-550fb60583dc")], tags: ["accessories", "belt", "leather", "minimal"], isFeatured: false,
  },
  {
    name: "Relaxed Poplin Dress", slug: "relaxed-poplin-dress", sku: "UW-WM-028", category: "Women", brand: "UrbanWear Studio",
    description: "Relaxed poplin dress with crisp structure and an easy day-to-night shape.", highlights: ["Crisp poplin", "Relaxed shape", "Day-to-night"], price: 69, compareAtPrice: 92,
    variants: variants(9, 8, 5, ["White", "Black"]), lowStockThreshold: 5, images: [unsplashImage("photo-1524504388940-b1c1722653e1")], tags: ["women", "dress", "poplin", "summer"], isFeatured: true,
  },
  {
    name: "Lightweight Field Jacket", slug: "lightweight-field-jacket", sku: "UW-MN-029", category: "Men", brand: "UrbanWear Utility",
    description: "Lightweight field jacket with soft utility pockets and everyday function.", highlights: ["Lightweight", "Utility pockets", "Everyday layer"], price: 82, compareAtPrice: 108,
    variants: variants(8, 7, 5, ["Olive", "Black"]), lowStockThreshold: 5, images: [unsplashImage("photo-1496747611176-843222e1e57c")], tags: ["men", "jacket", "field", "utility"], isFeatured: true,
  },
  {
    name: "Everyday Crew Socks 3-Pack", slug: "everyday-crew-socks-3-pack", sku: "UW-AC-030", category: "Accessories", brand: "UrbanWear Basics",
    description: "Three-pack crew socks with cushioned comfort and minimal branding.", highlights: ["3-pack", "Cushioned", "Daily comfort"], price: 18, compareAtPrice: 25,
    variants: [{ size: "M", color: "White", stock: 30 }, { size: "L", color: "White", stock: 24 }, { size: "M", color: "Black", stock: 27 }, { size: "L", color: "Black", stock: 22 }], lowStockThreshold: 12, images: [unsplashImage("photo-1586350977771-b3b0abd50c82")], tags: ["accessories", "socks", "basics", "pack"], isFeatured: false,
  },
  {
    name: "Men's Commuter Overshirt", slug: "mens-commuter-overshirt", sku: "UW-MN-031", category: "Men", brand: "UrbanWear Studio",
    description: "Structured cotton overshirt with a clean collar and utility pocket for everyday layering.", highlights: ["Structured cotton", "Utility pocket", "Layer-ready"], price: 58, compareAtPrice: 76,
    variants: variants(12, 11, 8, ["Stone", "Black"]), lowStockThreshold: 7, images: [unsplashImage("photo-1617137968427-85924c800a22")], tags: ["men", "overshirt", "commuter", "layer"], isFeatured: true,
  },
  {
    name: "Men's Relaxed Cargo Trouser", slug: "mens-relaxed-cargo-trouser", sku: "UW-MN-032", category: "Men", brand: "UrbanWear Utility",
    description: "Relaxed cargo trouser with low-profile pockets and adjustable hems for street-ready city wear.", highlights: ["Relaxed fit", "Low-profile pockets", "Adjustable hem"], price: 64, compareAtPrice: 84,
    variants: variants(10, 12, 8, ["Olive", "Black"]), lowStockThreshold: 7, images: [unsplashImage("photo-1515886657613-9f3515b0c78f")], tags: ["men", "cargo", "trouser", "utility"], isFeatured: true,
  },
  {
    name: "Men's Pique Resort Polo", slug: "mens-pique-resort-polo", sku: "UW-MN-033", category: "Men", brand: "UrbanWear Basics",
    description: "Soft pique polo with a relaxed resort collar and breathable summer weight.", highlights: ["Pique cotton", "Resort collar", "Breathable"], price: 42, compareAtPrice: 56,
    variants: variants(14, 12, 9, ["Navy", "Ecru", "Sage"]), lowStockThreshold: 9, images: [unsplashImage("photo-1620012253295-c15cc3e65df4")], tags: ["men", "polo", "summer", "basic"], isFeatured: true,
  },
  {
    name: "Men's Tapered Tech Jogger", slug: "mens-tapered-tech-jogger", sku: "UW-MN-034", category: "Men", brand: "UrbanWear Utility",
    description: "Tapered jogger in lightweight stretch fabric with zip pockets and a clean ankle finish.", highlights: ["Stretch fabric", "Zip pockets", "Tapered leg"], price: 52, compareAtPrice: 70,
    variants: variants(11, 10, 7, ["Black", "Charcoal"]), lowStockThreshold: 7, images: [unsplashImage("photo-1506629905607-df8040ef01fe")], tags: ["men", "jogger", "tech", "pants"], isFeatured: false,
  },
  {
    name: "Men's Clean Oxford Shirt", slug: "mens-clean-oxford-shirt", sku: "UW-MN-035", category: "Men", brand: "UrbanWear Studio",
    description: "Crisp oxford shirt with a relaxed fit, button-down collar, and daily office-to-weekend polish.", highlights: ["Oxford cotton", "Button-down collar", "Relaxed fit"], price: 49, compareAtPrice: 66,
    variants: variants(13, 12, 8, ["White", "Sky Blue"]), lowStockThreshold: 8, images: [unsplashImage("photo-1602810318383-e386cc2a3ccf")], tags: ["men", "oxford", "shirt", "smart casual"], isFeatured: false,
  },
  {
    name: "Men's Lightweight Harrington", slug: "mens-lightweight-harrington", sku: "UW-MN-036", category: "Men", brand: "UrbanWear Utility",
    description: "Lightweight Harrington jacket with clean rib trims and weather-ready city utility.", highlights: ["Lightweight shell", "Rib trims", "City layer"], price: 86, compareAtPrice: 116,
    variants: variants(8, 8, 6, ["Navy", "Sand"]), lowStockThreshold: 5, images: [unsplashImage("photo-1496747611176-843222e1e57c")], tags: ["men", "jacket", "harrington", "outerwear"], isFeatured: true,
  }
];

const collectionDefinitions = [
  { name: "Summer Edit", season: "Summer 2026", slugs: ["summer-slip-dress", "oversized-button-shirt", "retro-square-sunglasses", "structured-tote-bag"] },
  { name: "Streetwear Drop", season: "All Season", slugs: ["oversized-street-hoodie", "utility-cargo-pants", "classic-bomber-jacket", "city-runner-sneakers"] },
  { name: "Black & White Essentials", season: "Core", slugs: ["minimal-cotton-tee", "tailored-oversized-blazer", "logo-dad-cap", "city-runner-sneakers"] },
  { name: "Men's City Edit", season: "Core 2026", slugs: ["mens-commuter-overshirt", "mens-relaxed-cargo-trouser", "mens-pique-resort-polo", "mens-lightweight-harrington"] },
];

function totalStock(product) {
  return product.variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
}

async function ensureStoreDemoData() {
  if (String(process.env.ENABLE_STORE_SEED || "true").toLowerCase() === "false") {
    console.log("UrbanWear seed data disabled. Set ENABLE_STORE_SEED=true to load demo catalog.");
    return [];
  }

  const seeded = [];
  for (const productData of products) {
    const stock = totalStock(productData);
    const product = await Product.findOneAndUpdate(
      { sku: productData.sku },
      { $set: { ...productData, stock } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    seeded.push(product);
  }

  const skuToProduct = new Map(seeded.map((product) => [product.sku, product]));
  const slugToProduct = new Map(seeded.map((product) => [product.slug, product]));

  for (const collectionData of collectionDefinitions) {
    const collectionProducts = collectionData.slugs.map((slug) => slugToProduct.get(slug)?._id).filter(Boolean);
    await Collection.findOneAndUpdate(
      { name: collectionData.name },
      {
        $set: {
          name: collectionData.name,
          season: collectionData.season,
          description: `${collectionData.name} curated by UrbanWear.`,
          products: collectionProducts,
          isActive: true,
        },
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  if ((await Order.countDocuments({})) === 0) {
    const customer = await User.findOne({ role: "customer" });
    const firstProduct = skuToProduct.get("UW-ST-001");
    const secondProduct = skuToProduct.get("UW-AC-010");
    if (customer && firstProduct && secondProduct) {
      await Order.create({
        orderNumber: "ORD-20260508-DEMO1",
        trackingNumber: "UW-20260508-DEMO1",
        customer: customer._id,
        customerInfo: {
          name: customer.name,
          phone: "+8801700000000",
          email: customer.email,
          line1: "UrbanWear Demo Road",
          city: "Dhaka",
          country: "Bangladesh",
        },
        shippingAddress: {
          name: customer.name,
          phone: "+8801700000000",
          email: customer.email,
          line1: "UrbanWear Demo Road",
          city: "Dhaka",
          country: "Bangladesh",
        },
        items: [
          { product: firstProduct._id, name: firstProduct.name, slug: firstProduct.slug, sku: firstProduct.sku, size: "M", color: "Black", price: firstProduct.price, quantity: 1, image: firstProduct.images[0] },
          { product: secondProduct._id, name: secondProduct.name, slug: secondProduct.slug, sku: secondProduct.sku, size: "FREE", color: "Black", price: secondProduct.price, quantity: 1, image: secondProduct.images[0] },
        ],
        subtotal: firstProduct.price + secondProduct.price,
        tax: Number(((firstProduct.price + secondProduct.price) * 0.08).toFixed(2)),
        deliveryFee: 7,
        discount: 0,
        total: Number((firstProduct.price + secondProduct.price + 7 + (firstProduct.price + secondProduct.price) * 0.08).toFixed(2)),
        status: "confirmed",
        paymentMethod: "cash_on_delivery",
        paymentStatus: "pending",
        expectedDeliveryDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        statusHistory: [{ status: "pending", note: "Demo order placed", updatedBy: customer._id }, { status: "confirmed", note: "Demo order confirmed", updatedBy: customer._id }],
      });
    }
  }

  const hasMovements = await InventoryMovement.countDocuments({ reason: "UrbanWear demo seed" });
  if (!hasMovements) {
    await InventoryMovement.insertMany(seeded.map((product) => ({
      product: product._id,
      sku: product.sku,
      type: "restock",
      quantity: product.stock,
      previousStock: 0,
      newStock: product.stock,
      reason: "UrbanWear demo seed",
    })));
  }

  await SiteSetting.findOneAndUpdate(
    { key: "main" },
    {
      $setOnInsert: {
        key: "main",
        logoText: "UrbanWear",
        logoSubtext: "Studio",
        phonePrimary: "+880 1700 000 000",
        phoneSecondary: "+880 1800 000 000",
        supportEmail: "support@urbanwear.test",
        address: "Banani, Dhaka, Bangladesh",
        announcement: "Use coupon WELCOME10 for 10% off your first UrbanWear order.",
        couponCode: "WELCOME10",
        footerNote: "Clean fashion essentials, secure checkout, live variant stock, and fast delivery tracking.",
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  console.log(`UrbanWear demo data ready: ${seeded.length} fashion products and ${collectionDefinitions.length} collections.`);
  return seeded;
}

module.exports = {
  ensureStoreDemoData,
};
