/* ==========================================================================
   store.js (النسخة 4.2 - إزالة البيانات الوهمية القديمة لتنظيف الواجهة)
   ========================================================================== */

const FIREBASE_DB_URL = "https://pet-san-default-rtdb.firebaseio.com";

const DB_KEYS = {
  categories: "ws_categories",
  products: "ws_products",
  settings: "ws_settings",
  cart: "ws_cart",
  orders: "ws_orders",
  session: "ws_admin_session",
  seeded: "ws_seeded_v2", // تم التغيير لفرض تفريغ الكاش القديم
  ads: "ws_ads"
};

function uid(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// تفريغ المنتجات الوهمية القديمة كلياً
function seedProducts() {
  return []; 
}

// تفريغ الأقسام الوهمية القديمة
const SEED_CATEGORIES = [];

const SEED_SETTINGS = () => ({
  storeName: "سان ستور",
  storeTagline: "كل ما يحتاجه صديقك الأليف",
  storeDescription: "متجر عراقي متخصص بمستلزمات الحيوانات الأليفة.",
  whatsapp: "9647701234567",
  instagram: "https://instagram.com/pet_san1",
  phone: "+964 770 123 4567",
  address: "كربلاء، العراق",
  workingHours: "يوميًا من 9 صباحًا حتى 10 مساءً",
  deliveryInfo: "توصيل خلال 24 ساعة داخل العراق.",
  currencySymbol: "د.ع",
  adminUsername: "admin",
  adminPassword: "PetShop@2025"
});

function seedIfNeeded() {
  if (localStorage.getItem(DB_KEYS.seeded)) return;
  localStorage.setItem(DB_KEYS.categories, JSON.stringify(SEED_CATEGORIES));
  localStorage.setItem(DB_KEYS.products, JSON.stringify(seedProducts()));
  localStorage.setItem(DB_KEYS.settings, JSON.stringify(SEED_SETTINGS()));
  localStorage.setItem(DB_KEYS.cart, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.orders, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.ads, JSON.stringify([]));
  localStorage.setItem(DB_KEYS.seeded, "1");
}
seedIfNeeded();

/* ---------------------------------------------------------------------- */
/* المزامنة السحابية الذكية والآمنة الشاملة                               */
/* ---------------------------------------------------------------------- */

let pushTimeout = null;

function pushToFirebase() {
  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(async () => {
    try {
      const data = {
        products: JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"),
        categories: JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"),
        settings: JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"),
        orders: JSON.parse(localStorage.getItem(DB_KEYS.orders) || "[]"),
        ads: JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]")
      };
      await fetch(FIREBASE_DB_URL + "/data.json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.error("Firebase Sync Error:", e);
    }
  }, 1000);
}

async function syncWithFirebase() {
  try {
    const res = await fetch(FIREBASE_DB_URL + "/data.json?nocache=" + Date.now(), { cache: "no-store" });
    const remoteData = await res.json();
    
    if (!remoteData) {
      pushToFirebase();
      return;
    }

    const localProducts = JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]");
    const remoteProducts = remoteData.products || [];

    if (remoteProducts.length === 0 && localProducts.length > 0) {
        pushToFirebase();
        return;
    }

    const localHash = JSON.stringify({
        products: localProducts,
        ads: JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]"),
        categories: JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]")
    });

    const remoteHash = JSON.stringify({
        products: remoteProducts,
        ads: remoteData.ads || [],
        categories: remoteData.categories || []
    });

    if (localHash !== remoteHash) {
        localStorage.setItem(DB_KEYS.products, JSON.stringify(remoteProducts));
        localStorage.setItem(DB_KEYS.categories, JSON.stringify(remoteData.categories || []));
        localStorage.setItem(DB_KEYS.settings, JSON.stringify(remoteData.settings || {}));
        localStorage.setItem(DB_KEYS.ads, JSON.stringify(remoteData.ads || []));
        if (remoteData.orders) localStorage.setItem(DB_KEYS.orders, JSON.stringify(remoteData.orders));
        
        document.dispatchEvent(new CustomEvent("store:synced"));
    }
  } catch (e) {
    console.error("Sync error", e);
  }
}

setTimeout(syncWithFirebase, 100); // تسريع طلب التحديث فوراً

document.addEventListener("store:synced", function() {
    window.location.reload(); 
});

/* ---------------------------------------------------------------------- */
/* Store API                                                              */
/* ---------------------------------------------------------------------- */

const Store = {
  getCategories() { return JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"); },
  saveCategories(list) { localStorage.setItem(DB_KEYS.categories, JSON.stringify(list)); pushToFirebase(); },
  addCategory(cat) { const list = this.getCategories(); list.push(Object.assign({ id: uid("cat"), icon: "box" }, cat)); this.saveCategories(list); },
  updateCategory(id, patch) { const list = this.getCategories().map(c => c.id === id ? Object.assign({}, c, patch) : c); this.saveCategories(list); },
  deleteCategory(id) { this.saveCategories(this.getCategories().filter(c => c.id !== id)); },
  getCategoryName(id) { const c = this.getCategories().find(c => c.id === id); return c ? c.name : ""; },

  getProducts() { return JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"); },
  saveProducts(list) { localStorage.setItem(DB_KEYS.products, JSON.stringify(list)); pushToFirebase(); },
  getProduct(id) { return this.getProducts().find(p => p.id === id) || null; },
  addProduct(prod) {
    const list = this.getProducts();
    const item = Object.assign({ id: uid("prd"), stock: 0, available: true, featured: false, isNew: false, isOffer: false, image: null, variants: [] }, prod);
    list.unshift(item);
    this.saveProducts(list);
    return item;
  },
  updateProduct(id, patch) { const list = this.getProducts().map(p => p.id === id ? Object.assign({}, p, patch) : p); this.saveProducts(list); },
  deleteProduct(id) { this.saveProducts(this.getProducts().filter(p => p.id !== id)); },

  getSettings() { return JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"); },
  saveSettings(patch) { const current = this.getSettings(); localStorage.setItem(DB_KEYS.settings, JSON.stringify(Object.assign(current, patch))); pushToFirebase(); },
  
  getAds() { return JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]"); },
  saveAds(list) { localStorage.setItem(DB_KEYS.ads, JSON.stringify(list)); pushToFirebase(); },
  addAd(adData) { const list = this.getAds(); list.push(Object.assign({ id: uid("ad") }, adData)); this.saveAds(list); },
  deleteAd(id) { this.saveAds(this.getAds().filter(a => a.id !== id)); },

  getCart() { return JSON.parse(localStorage.getItem(DB_KEYS.cart) || "[]"); },
  saveCart(cart) { localStorage.setItem(DB_KEYS.cart, JSON.stringify(cart)); document.dispatchEvent(new CustomEvent("cart:updated")); },
  addToCart(itemKey, qty, variantName = null) {
    const cart = this.getCart();
    const line = cart.find(l => l.itemKey === itemKey);
    if (line) { line.qty += qty; } else {
        const productId = itemKey.split('|')[0];
        cart.push({ itemKey: itemKey, productId: productId, qty: qty, variant: variantName });
    }
    this.saveCart(cart);
  },
  setQty(itemKey, qty) {
    let cart = this.getCart();
    if (qty <= 0) cart = cart.filter(l => l.itemKey !== itemKey); else cart.forEach(l => { if (l.itemKey === itemKey) l.qty = qty; });
    this.saveCart(cart);
  },
  removeFromCart(itemKey) { this.saveCart(this.getCart().filter(l => l.itemKey !== itemKey)); },
  clearCart() { this.saveCart([]); },
  cartCount() { return this.getCart().reduce((sum, l) => sum + l.qty, 0); },

  getOrders() { return JSON.parse(localStorage.getItem(DB_KEYS.orders) || "[]"); },
  logOrder(order) {
    const list = this.getOrders();
    list.unshift(Object.assign({ id: uid("ord"), date: new Date().toISOString() }, order));
    localStorage.setItem(DB_KEYS.orders, JSON.stringify(list));
    pushToFirebase();
  },

  login(username, password) {
    const s = this.getSettings();
    if (username === s.adminUsername && password === s.adminPassword) { sessionStorage.setItem(DB_KEYS.session, "1"); return true; }
    return false;
  },
  isLoggedIn() { return sessionStorage.getItem(DB_KEYS.session) === "1"; },
  logout() { sessionStorage.removeItem(DB_KEYS.session); }
};
