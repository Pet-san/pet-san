/* ==========================================================================
   store.js (النسخة الاحترافية 4.0 - Firebase Web SDK)
   ========================================================================== */

// 1. إعداد الاتصال بمكتبة فايربيس الرسمية
const firebaseConfig = {
  databaseURL: "https://pet-shop3-59335-default-rtdb.europe-west1.firebasedatabase.app"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const DB_KEYS = {
  categories: "ws_categories",
  products: "ws_products",
  settings: "ws_settings",
  cart: "ws_cart",
  orders: "ws_orders",
  session: "ws_admin_session",
  seeded: "ws_seeded_v1",
  ads: "ws_ads"
};

function uid(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- دالة الرفع المجزأ باستخدام مكتبة فايربيس (Targeted Sync) ---
// تقوم برفع الجزء المعدل فقط (مثلاً المنتجات) بدلاً من المتجر بالكامل
function syncNodeToFirebase(nodeKey, data) {
  database.ref(nodeKey).set(data).catch(error => {
    console.error(`Firebase SDK Sync Error for ${nodeKey}:`, error);
  });
}

// --- دالة مساعدة لجلب بيانات عقدة محددة بذكاء ---
async function fetchNode(nodeKey) {
  try {
    const snapshot = await database.ref(nodeKey).get();
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error(`Firebase SDK Fetch Error for ${nodeKey}:`, error);
    return null;
  }
}

async function pullFromFirebase() {
  try {
    // --- 1. نظام التخزين المؤقت (15 دقيقة) لتوفير قراءات قاعدة البيانات ---
    const lastSync = localStorage.getItem("last_pull_time");
    const hasData = localStorage.getItem(DB_KEYS.products) !== null && localStorage.getItem(DB_KEYS.products) !== "[]";
    const now = Date.now();
    const cooldownMs = 15 * 60 * 1000;

    // استخدام البيانات المحلية إذا لم تنتهِ المدة
    if (lastSync && (now - parseInt(lastSync)) < cooldownMs && hasData) {
        const notifySync = () => document.dispatchEvent(new CustomEvent("store:synced"));
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", notifySync, { once: true });
        } else {
          notifySync();
        }
        return; 
    }
    // -----------------------------------------------------

    // --- 2. الجلب المتوازي والمنفصل للبيانات الأساسية ---
    const [products, categories, settings, ads] = await Promise.all([
        fetchNode(DB_KEYS.products),
        fetchNode(DB_KEYS.categories),
        fetchNode(DB_KEYS.settings),
        fetchNode(DB_KEYS.ads)
    ]);
    
    // إذا كانت القاعدة فارغة، ارفع البيانات الافتراضية
    if (products === null && categories === null) {
        syncNodeToFirebase(DB_KEYS.products, JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"));
        syncNodeToFirebase(DB_KEYS.categories, JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"));
        syncNodeToFirebase(DB_KEYS.settings, JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"));
        syncNodeToFirebase(DB_KEYS.ads, JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]"));
        return;
    }

    // تحديث الذاكرة المحلية ببيانات السحابة
    localStorage.setItem(DB_KEYS.products, JSON.stringify(products || []));
    localStorage.setItem(DB_KEYS.categories, JSON.stringify(categories || []));
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(settings || {}));
    localStorage.setItem(DB_KEYS.ads, JSON.stringify(ads || []));

    // --- حماية الباقة: تحميل سجل الطلبات للأدمن فقط ---
    if (sessionStorage.getItem(DB_KEYS.session) === "1") {
        const orders = await fetchNode(DB_KEYS.orders);
        localStorage.setItem(DB_KEYS.orders, JSON.stringify(orders || []));
    }

    // --- 3. تسجيل وقت التحديث ---
    localStorage.setItem("last_pull_time", now.toString());

    const notifySync = () => {
      document.dispatchEvent(new CustomEvent("store:synced"));
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", notifySync, { once: true });
    } else {
      notifySync();
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
    p(uid("prd"), "طعام قطط رويال كانين بالدجاج", "طعام جاف متكامل للقطط البالغة، كيس 2 كغم، يدعم صحة الفراء والجهاز الهضمي.", 28000, "cat_cat_food", 24, { featured: true, isNew: true, variants: ["دجاج", "لحم", "تونة"] }),
    p(uid("prd"), "طعام قطط تونة وسمك", "وجبة رطبة غنية بالبروتين، علبة 400 غرام، مناسبة لجميع الأعمار.", 6000, "cat_cat_food", 40)
  ];
}

const SEED_SETTINGS = () => ({
  storeName: "متجر مستلزمات الحيوانات",
  storeTagline: "كل ما يحتاجه صديقك الأليف",
  storeDescription: "طعام، ألعاب، أسرّة، وأدوات عناية بجودة موثوقة.",
  whatsapp: "",
  instagram: "",
  phone: "",
  address: "",
  workingHours: "",
  deliveryInfo: "",
  currencySymbol: "د.ع",
  adminUsername: "admin",
  adminPassword: "PetShop@2025"
});

function seedIfNeeded() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;
  localStorage.setItem(DB_KEYS.categories, JSON.stringify(SEED_CATEGORIES));
  localStorage.setItem(DB_KEYS.products, JSON.stringify(seedProducts()));
  
  try {
      if (typeof STORE_CONFIG !== 'undefined') {
          localStorage.setItem(DB_KEYS.settings, JSON.stringify({
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
          }));
      } else {
          localStorage.setItem(DB_KEYS.settings, JSON.stringify(SEED_SETTINGS()));
      }
  } catch(e) {
      localStorage.setItem(DB_KEYS.settings, JSON.stringify(SEED_SETTINGS()));
  }
  
  localStorage.setItem(DB_KEYS.cart, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.orders, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.ads, JSON.stringify([])); 
  localStorage.setItem(DB_KEYS.seeded, "1");
}
seedIfNeeded();

/* ---------------------------------------------------------------------- */
/* Store API                                                              */
/* ---------------------------------------------------------------------- */

const Store = {
  getCategories() { return JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"); },
  saveCategories(list) {
    localStorage.setItem(DB_KEYS.categories, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.categories, list);
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
  deleteCategory(id) { this.saveCategories(this.getCategories().filter(c => c.id !== id)); },
  getCategoryName(id) {
    const c = this.getCategories().find(c => c.id === id);
    return c ? c.name : "";
  },

  getProducts() { return JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"); },
  saveProducts(list) {
    localStorage.setItem(DB_KEYS.products, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.products, list);
  },
  getProduct(id) { return this.getProducts().find(p => p.id === id) || null; },
  addProduct(prod) {
    const list = this.getProducts();
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
  deleteProduct(id) { this.saveProducts(this.getProducts().filter(p => p.id !== id)); },

  getSettings() { return JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"); },
  saveSettings(patch) {
    const current = this.getSettings();
    const updated = Object.assign(current, patch);
    localStorage.setItem(DB_KEYS.settings, JSON.stringify(updated));
    syncNodeToFirebase(DB_KEYS.settings, updated);
  },
  
  getAds() { return JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]"); },
  saveAds(list) {
    localStorage.setItem(DB_KEYS.ads, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.ads, list);
  },
  addAd(adData) {
    const list = this.getAds();
    list.push(Object.assign({ id: uid("ad") }, adData));
    this.saveAds(list);
  },
  deleteAd(id) { this.saveAds(this.getAds().filter(a => a.id !== id)); },

  getCart() { return JSON.parse(localStorage.getItem(DB_KEYS.cart) || "[]"); },
  saveCart(cart) {
    localStorage.setItem(DB_KEYS.cart, JSON.stringify(cart));
    document.dispatchEvent(new CustomEvent("cart:updated"));
  },
  addToCart(itemKey, qty, variantName = null) {
    const cart = this.getCart();
    const line = cart.find(l => l.itemKey === itemKey);
    if (line) {
        line.qty += qty;
    } else {
        const productId = itemKey.split('|')[0];
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
  removeFromCart(itemKey) { this.saveCart(this.getCart().filter(l => l.itemKey !== itemKey)); },
  clearCart() { this.saveCart([]); },
  cartCount() { return this.getCart().reduce((sum, l) => sum + l.qty, 0); },

  getOrders() { return JSON.parse(localStorage.getItem(DB_KEYS.orders) || "[]"); },
  logOrder(order) {
    const list = this.getOrders();
    const newOrder = Object.assign({ id: uid("ord"), date: new Date().toISOString() }, order);
    list.unshift(newOrder);
    localStorage.setItem(DB_KEYS.orders, JSON.stringify(list));
    syncNodeToFirebase(DB_KEYS.orders, list);
  },

  login(username, password) {
    const s = this.getSettings();
    if (username === s.adminUsername && password === s.adminPassword) {
      sessionStorage.setItem(DB_KEYS.session, "1");
      return true;
    }
    return false;
  },
  isLoggedIn() { return sessionStorage.getItem(DB_KEYS.session) === "1"; },
  logout() { sessionStorage.removeItem(DB_KEYS.session); }
};
