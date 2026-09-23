/* ==========================================================================
   store.js (نسخة السحابة - Firebase - مع حل مشكلة الكاش نهائياً - النسخة 2.0)
   ========================================================================== */

const FIREBASE_DB_URL = "https://pet-shop-2-1552d-default-rtdb.firebaseio.com";
const DB_KEYS = {
  categories: "ws_categories",
  products: "ws_products",
  settings: "ws_settings",
  cart: "ws_cart",
  orders: "ws_orders",
  session: "ws_admin_session",
  seeded: "ws_seeded_v1",
  ads: "ws_ads" // التعديل 1: إضافة مفتاح لجدول الإعلانات
};

function uid(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- محرك مزامنة Firebase الجديد (نظام الطابور الذكي) ---
let pushTimeout = null;

function pushToFirebase() {
  if (pushTimeout) {
    clearTimeout(pushTimeout);
  }
  
  pushTimeout = setTimeout(async () => {
    try {
      const data = {
        products: JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"),
        categories: JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"),
        settings: JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"),
        orders: JSON.parse(localStorage.getItem(DB_KEYS.orders) || "[]"),
        ads: JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]") // التعديل 2: رفع الإعلانات للسحابة
      };
      
      await fetch(FIREBASE_DB_URL + "/data.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
    } catch (e) {
      console.error("Firebase Sync Error:", e);
    }
  }, 600); 
}

async function pullFromFirebase() {
  try {
    const cacheBuster = new Date().getTime();
    
    const res = await fetch(FIREBASE_DB_URL + "/data.json?nocache=" + cacheBuster, {
        cache: "no-store",
        headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
        }
    });
    
    const data = await res.json();
    
    if (data === null) {
        pushToFirebase();
        return;
    }

    const localHash = JSON.stringify({
      products: JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"),
      categories: JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"),
      settings: JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"),
      ads: JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]") // التعديل 3: سحب الإعلانات محلياً
    });
    
    const remoteHash = JSON.stringify({
      products: data.products || [],
      categories: data.categories || [],
      settings: data.settings || {},
      ads: data.ads || [] // التعديل 4: مقارنة الإعلانات من السحابة
    });

      if (localHash !== remoteHash) {
        localStorage.setItem(DB_KEYS.products, JSON.stringify(data.products || []));
        localStorage.setItem(DB_KEYS.categories, JSON.stringify(data.categories || []));
        localStorage.setItem(DB_KEYS.settings, JSON.stringify(data.settings || {}));
        localStorage.setItem(DB_KEYS.ads, JSON.stringify(data.ads || []));
        if (data.orders) localStorage.setItem(DB_KEYS.orders, JSON.stringify(data.orders));
        // بدل إعادة تحميل الصفحة بالكامل، نبعث حدث ليحدّث كل جزء نفسه فقط
        document.dispatchEvent(new CustomEvent("store:synced"));
    }
  } catch (e) {
    console.error("Firebase Pull Error:", e);
  }
}

pullFromFirebase();

/* ---------------------------------------------------------------------- */
/* Seed data (البيانات الافتراضية)                                       */
/* ---------------------------------------------------------------------- */

const SEED_CATEGORIES = [
  { id: "cat_cat_food",   name: "طعام قطط",     icon: "bag" },
  { id: "cat_dog_food",   name: "طعام كلاب",    icon: "bone" },
  { id: "cat_bird_food",  name: "طعام طيور",    icon: "feather" },
  { id: "cat_toys",       name: "ألعاب",         icon: "toy" },
  { id: "cat_beds",       name: "أسرّة ووسائد",  icon: "bed" },
  { id: "cat_cages",      name: "أقفاص",         icon: "cage" },
  { id: "cat_collars",    name: "أطواق وأحزمة",  icon: "collar" },
  { id: "cat_grooming",   name: "عناية وتنظيف",  icon: "brush" },
  { id: "cat_cleaning",   name: "منظفات",        icon: "spray" },
  { id: "cat_aquarium",   name: "مستلزمات أحواض", icon: "fish" },
  { id: "cat_accessories",name: "إكسسوارات",     icon: "box" }
];

function seedProducts() {
  const p = (id, name, desc, price, cat, stock, opts) => Object.assign({
    id, name, description: desc, price, categoryId: cat, stock,
    available: stock > 0, featured: false, isNew: false, isOffer: false, image: null, variants: []
  }, opts || {});

  return [
    p(uid("prd"), "طعام قطط رويال كانين بالدجاج", "طعام جاف متكامل للقطط البالغة، كيس 2 كغم، يدعم صحة الفراء والجهاز الهضمي.", 28000, "cat_cat_food", 24, { featured: true, isNew: true, variants: ["دجاج", "لحم", "تونة"] }), // التعديل: تجربة أولية لنكهات متعددة
    p(uid("prd"), "طعام قطط تونة وسمك", "وجبة رطبة غنية بالبروتين، علبة 400 غرام، مناسبة لجميع الأعمار.", 6000, "cat_cat_food", 40),
    p(uid("prd"), "طعام كلاب بيدجري باللحم", "طعام جاف متوازن للكلاب البالغة، كيس 3 كغم.", 35000, "cat_dog_food", 18, { featured: true }),
    p(uid("prd"), "طعام جراء دجاج وأرز", "تركيبة خاصة لدعم نمو الجراء، كيس 1.5 كغم.", 22000, "cat_dog_food", 0, { isNew: true }),
    p(uid("prd"), "خلطة بذور كناري وحسون", "بذور طبيعية مغذية لطيور الزينة، كيس 1 كغم.", 7000, "cat_bird_food", 30),
    p(uid("prd"), "طعام ببغاء متكامل", "خليط حبوب وفواكه مجففة للببغاوات المتوسطة.", 12000, "cat_bird_food", 15),
    p(uid("prd"), "فأر قماشي بصوت صرير", "لعبة تفاعلية للقطط بحشوة نعناع برّي.", 4000, "cat_toys", 50, { isNew: true }),
    p(uid("prd"), "كرة مطاطية صامدة للكلاب", "لعبة مضغ متينة لتنظيف الأسنان وتسلية الكلب.", 6500, "cat_toys", 35),
    p(uid("prd"), "عمود خدش وتسلق للقطط", "برج خدش بثلاث طبقات مع كرة معلقة، ارتفاع 90 سم.", 45000, "cat_toys", 8, { featured: true }),
    p(uid("prd"), "سرير دائري ناعم للقطط", "سرير مبطّن بحواف مرتفعة يمنح دفئًا وراحة، قطر 45 سم.", 21000, "cat_beds", 20, { featured: true, variants: ["صغير", "متوسط", "كبير"] }), // التعديل: تجربة أحجام متعددة
    p(uid("prd"), "وسادة مقاومة للماء للكلاب", "قماش متين قابل للغسل، مقاس متوسط.", 26000, "cat_beds", 12),
    p(uid("prd"), "قفص طائر معدني متوسط", "قفص مع أدراج ومساكن، سهل التنظيف.", 38000, "cat_cages", 10, { isNew: true }),
    p(uid("prd"), "قفص نقل صغير للقطط", "قفص بلاستيكي مهوّى مناسب للسفر والزيارات البيطرية.", 32000, "cat_cages", 0),
    p(uid("prd"), "طوق جلدي مزخرف", "طوق جلد طبيعي بمشبك معدني، مقاسات متعددة.", 9000, "cat_collars", 45),
    p(uid("prd"), "حزام مشي مع مقود", "حزام صدري مريح مع مقود 1.5 متر.", 15000, "cat_collars", 22),
    p(uid("prd"), "فرشاة إزالة الشعر المتساقط", "فرشاة سيليكون لطيفة على البشرة تقلل تساقط الفرو.", 8500, "cat_grooming", 28),
    p(uid("prd"), "شامبو مرطب للقطط والكلاب", "تركيبة خالية من العطور القوية، 250 مل.", 11000, "cat_grooming", 33, { isNew: true }),
    p(uid("prd"), "مزيل روائح ومعقم للأرضيات", "منظف آمن للحيوانات الأليفة، عبوة 1 لتر.", 9500, "cat_cleaning", 26),
    p(uid("prd"), "أكياس نظافة قابلة للتحلل", "لفة 60 كيس لنظافة نزهات الكلب.", 5000, "cat_cleaning", 60),
    p(uid("prd"), "فلتر مياه لحوض السمك", "فلتر داخلي هادئ لأحواض حتى 60 لتر.", 27000, "cat_aquarium", 14),
    p(uid("prd"), "إضاءة LED لحوض الزينة", "إضاءة موفرة للطاقة تبرز ألوان السمك والنباتات.", 19000, "cat_aquarium", 9, { featured: true }),
    p(uid("prd"), "وعاء طعام مزدوج ستانلس", "وعاءان متصلان لطعام وماء الحيوانات الأليفة.", 8000, "cat_accessories", 40),
    p(uid("prd"), "بطاقة اسم معدنية للطوق", "بطاقة قابلة للنقش تحتوي رقم التواصل.", 3500, "cat_accessories", 50, { isNew: true })
  ];
}

const SEED_SETTINGS = () => ({
  storeName: STORE_CONFIG.storeName,
  storeTagline: STORE_CONFIG.storeTagline,
  storeDescription: STORE_CONFIG.storeDescription,
  whatsapp: STORE_CONFIG.whatsappNumber,
  instagram: STORE_CONFIG.instagram,
  phone: STORE_CONFIG.phone,
  address: STORE_CONFIG.address,
  workingHours: STORE_CONFIG.workingHours,
  deliveryInfo: STORE_CONFIG.deliveryInfo,
  currencySymbol: STORE_CONFIG.currencySymbol,
  adminUsername: STORE_CONFIG.adminUsername,
  adminPassword: STORE_CONFIG.adminPassword
});

function seedIfNeeded() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;
  localStorage.setItem(DB_KEYS.categories, JSON.stringify(SEED_CATEGORIES));
  localStorage.setItem(DB_KEYS.products, JSON.stringify(seedProducts()));
  localStorage.setItem(DB_KEYS.settings, JSON.stringify(SEED_SETTINGS()));
  localStorage.setItem(DB_KEYS.cart, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.orders, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.ads, JSON.stringify([])); // التعديل 6: تهيئة مصفوفة الإعلانات
  localStorage.setItem(DB_KEYS.seeded, "1");
}
seedIfNeeded();

/* ---------------------------------------------------------------------- */
/* Store API                                                              */
/* ---------------------------------------------------------------------- */

const Store = {
  // ---- categories ----
  getCategories() {
    return JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]");
  },
  saveCategories(list) {
    localStorage.setItem(DB_KEYS.categories, JSON.stringify(list));
    pushToFirebase();
  },
  addCategory(cat) {
    const list = this.getCategories();
    list.push(Object.assign({ id: uid("cat"), icon: "box" }, cat));
    this.saveCategories(list);
  },
  updateCategory(id, patch) {
    const list = this.getCategories().map(c => c.id === id ? Object.assign({}, c, patch) : c);
    this.saveCategories(list);
  },
  deleteCategory(id) {
    this.saveCategories(this.getCategories().filter(c => c.id !== id));
  },
  getCategoryName(id) {
    const c = this.getCategories().find(c => c.id === id);
    return c ? c.name : "";
  },

  // ---- products ----
  getProducts() {
    return JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]");
  },
  saveProducts(list) {
    localStorage.setItem(DB_KEYS.products, JSON.stringify(list));
    pushToFirebase();
  },
  getProduct(id) {
    return this.getProducts().find(p => p.id === id) || null;
  },
  addProduct(prod) {
    const list = this.getProducts();
    // التعديل 7: إضافة variants: [] لتخزين الخيارات (النكهات/الأحجام)
    const item = Object.assign({
      id: uid("prd"), stock: 0, available: true, featured: false, isNew: false, isOffer: false, image: null, variants: []
    }, prod);
    list.unshift(item);
    this.saveProducts(list);
    return item;
  },
  updateProduct(id, patch) {
    const list = this.getProducts().map(p => p.id === id ? Object.assign({}, p, patch) : p);
    this.saveProducts(list);
  },
  deleteProduct(id) {
    this.saveProducts(this.getProducts().filter(p => p.id !== id));
  },

  // ---- settings ----
  getSettings() {
    return JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}");
  },
  saveSettings(patch) {
    const current = this.getSettings();
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(Object.assign(current, patch)));
    pushToFirebase();
  },
  
  // ---- ads (القسم الجديد للإعلانات) ----
  getAds() {
    return JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]");
  },
  saveAds(list) {
    localStorage.setItem(DB_KEYS.ads, JSON.stringify(list));
    pushToFirebase();
  },
  addAd(adData) {
    const list = this.getAds();
    list.push(Object.assign({ id: uid("ad") }, adData));
    this.saveAds(list);
  },
  deleteAd(id) {
    this.saveAds(this.getAds().filter(a => a.id !== id));
  },

  // ---- cart (محدث ليدعم الخيارات/Variants) ----
  getCart() {
    return JSON.parse(localStorage.getItem(DB_KEYS.cart) || "[]");
  },
  saveCart(cart) {
    localStorage.setItem(DB_KEYS.cart, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent("cart:updated"));
  },
  addToCart(itemKey, qty, variantName = null) {
    // التعديل 8: تغيير productId إلى itemKey لكي نسمح بإضافة نفس المنتج بنكهات مختلفة
    const cart = this.getCart();
    const line = cart.find(l => l.itemKey === itemKey);
    if (line) {
        line.qty += qty;
    } else {
        const productId = itemKey.split('|')[0]; // استخراج الـ ID الأصلي
        cart.push({ itemKey: itemKey, productId: productId, qty: qty, variant: variantName });
    }
    this.saveCart(cart);
  },
  setQty(itemKey, qty) {
    let cart = this.getCart();
    if (qty <= 0) cart = cart.filter(l => l.itemKey !== itemKey);
    else cart.forEach(l => { if (l.itemKey === itemKey) l.qty = qty; });
    this.saveCart(cart);
  },
  removeFromCart(itemKey) {
    this.saveCart(this.getCart().filter(l => l.itemKey !== itemKey));
  },
  clearCart() {
    this.saveCart([]);
  },
  cartCount() {
    return this.getCart().reduce((sum, l) => sum + l.qty, 0);
  },

  // ---- orders log ----
  getOrders() {
    return JSON.parse(localStorage.getItem(DB_KEYS.orders) || "[]");
  },
  logOrder(order) {
    const list = this.getOrders();
    list.unshift(Object.assign({ id: uid("ord"), date: new Date().toISOString() }, order));
    localStorage.setItem(DB_KEYS.orders, JSON.stringify(list));
    pushToFirebase();
  },

  // ---- admin session ----
  login(username, password) {
    const s = this.getSettings();
    if (username === s.adminUsername && password === s.adminPassword) {
      sessionStorage.setItem(DB_KEYS.session, "1");
      return true;
    }
    return false;
  },
  isLoggedIn() {
    return sessionStorage.getItem(DB_KEYS.session) === "1";
  },
  logout() {
    sessionStorage.removeItem(DB_KEYS.session);
  }
};
