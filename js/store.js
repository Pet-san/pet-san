async function pullFromFirebase() {
  try {
    // تم إزالة كاسر الكاش والترويسات الصارمة لإنقاذ الباقة المجانية!
    const res = await fetch(FIREBASE_DB_URL + "/data.json");
    
    const data = await res.json();
    
    if (data === null) {
        pushToFirebase();
        return;
    }

    const localHash = JSON.stringify({
      products: JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"),
      categories: JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"),
      settings: JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"),
      ads: JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]") 
    });
    
    const remoteHash = JSON.stringify({
      products: data.products || [],
      categories: data.categories || [],
      settings: data.settings || {},
      ads: data.ads || [] 
    });

      if (localHash !== remoteHash) {
        localStorage.setItem(DB_KEYS.products, JSON.stringify(data.products || []));
        localStorage.setItem(DB_KEYS.categories, JSON.stringify(data.categories || []));
        localStorage.setItem(DB_KEYS.settings, JSON.stringify(data.settings || {}));
        localStorage.setItem(DB_KEYS.ads, JSON.stringify(data.ads || []));
        if (data.orders) localStorage.setItem(DB_KEYS.orders, JSON.stringify(data.orders));
        document.dispatchEvent(new CustomEvent("store:synced"));
    }
  } catch (e) {
    console.error("Firebase Pull Error:", e);
  }
}
