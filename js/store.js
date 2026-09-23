async function pullFromFirebase() {
  try {
    const res = await fetch(FIREBASE_DB_URL + "/data.json", {
      cache: "no-store" // يمنع كاش المتصفح دون إضافة query params أو headers صارمة
    });

    if (!res.ok) {
      throw new Error(`Firebase responded with status ${res.status}`);
    }

    const data = await res.json();

    if (data === null) {
      pushToFirebase();
      return;
    }

    const localHash = JSON.stringify({
      products: JSON.parse(localStorage.getItem(DB_KEYS.products) || "[]"),
      categories: JSON.parse(localStorage.getItem(DB_KEYS.categories) || "[]"),
      settings: JSON.parse(localStorage.getItem(DB_KEYS.settings) || "{}"),
      ads: JSON.parse(localStorage.getItem(DB_KEYS.ads) || "[]"),
      orders: JSON.parse(localStorage.getItem(DB_KEYS.orders) || "[]")
    });

    const remoteHash = JSON.stringify({
      products: data.products || [],
      categories: data.categories || [],
      settings: data.settings || {},
      ads: data.ads || [],
      orders: data.orders || []
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
