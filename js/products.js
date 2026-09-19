/* ==========================================================================
   products.js
   يُستخدم في: index.html (المنتجات المميزة/الجديدة)، products.html (المتجر
   الكامل مع البحث والفلاتر)، product.html (صفحة تفاصيل المنتج).
   ========================================================================== */

/* ---------------------------------------------------------------------- */
/* بطاقة المنتج — تُستخدم في كل الشبكات (الرئيسية، المتجر)                  */
/* ---------------------------------------------------------------------- */

function productMediaHtml(product) {
  if (product.image) {
    return '<img src="' + product.image + '" alt="' + product.name + '" loading="lazy">';
  }
  const cat = Store.getCategories().find(function (c) { return c.id === product.categoryId; });
  const key = cat ? cat.icon : "paw";
  return '<div class="placeholder-icon">' + iconSvg(key) + "</div>";
}

function renderProductCard(product) {
  const outOfStock = !product.available || product.stock <= 0;
  const badges = [];
  if (product.isNew) badges.push('<span class="badge badge-new">جديد</span>');
  else if (product.featured) badges.push('<span class="badge badge-featured">مميز</span>');

  return (
    '<article class="product-card">' +
      '<a href="product.html?id=' + product.id + '" class="product-media">' +
        productMediaHtml(product) +
        badges.join("") +
      "</a>" +
      '<div class="product-body">' +
        '<span class="product-cat">' + Store.getCategoryName(product.categoryId) + "</span>" +
        '<h3 class="product-name"><a href="product.html?id=' + product.id + '">' + product.name + "</a></h3>" +
        '<p class="product-desc">' + truncate(product.description, 70) + "</p>" +
        '<div class="stock-line">' +
          '<span class="dot' + (outOfStock ? " dot-out" : "") + '"></span>' +
          (outOfStock ? "غير متوفر حاليًا" : "متوفر — الكمية " + product.stock) +
        "</div>" +
        '<div class="product-foot">' +
          '<span class="price">' + formatPrice(product.price) + "</span>" +
        "</div>" +
        '<div class="product-actions">' +
          '<button class="btn btn-primary btn-sm btn-block" ' + (outOfStock ? "disabled" : "") +
            ' onclick="quickAddToCart(\'' + product.id + '\')">' + iconSvg("cart") + "أضف للسلة</button>" +
        "</div>" +
      "</div>" +
    "</article>"
  );
}

function truncate(text, max) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max).trim() + "…" : text;
}

function quickAddToCart(productId) {
  const product = Store.getProduct(productId);
  if (!product || !product.available || product.stock <= 0) return;
  Store.addToCart(productId, 1);
  showToast(product.name + " أُضيف إلى السلة");
}

function renderGridInto(containerId, products, emptyMessage) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!products.length) {
    el.innerHTML = '<div class="empty-state">' + iconSvg("box") + "<p>" + (emptyMessage || "لا توجد منتجات لعرضها حاليًا.") + "</p></div>";
    return;
  }
  el.innerHTML = products.map(renderProductCard).join("");
}

/* ---------------------------------------------------------------------- */
/* صفحة المتجر الكاملة (products.html) والفلاتر                             */
/* ---------------------------------------------------------------------- */

const shopState = { search: "", categoryId: "all", sort: "default", minPrice: "", maxPrice: "" };

function initShopPage() {
  const grid = document.getElementById("shopGrid");
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  if (params.get("cat")) shopState.categoryId = params.get("cat");
  if (params.get("q")) shopState.search = params.get("q");

  const searchInput = document.getElementById("searchInput");
  const sortSelect = document.getElementById("sortSelect");
  const minInput = document.getElementById("priceMin");
  const maxInput = document.getElementById("priceMax");

  if (searchInput) {
    searchInput.value = shopState.search;
    searchInput.addEventListener("input", function () {
      shopState.search = searchInput.value.trim();
      renderShopResults();
    });
  }
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      shopState.sort = sortSelect.value;
      renderShopResults();
    });
  }
  [minInput, maxInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("input", function () {
      shopState.minPrice = minInput ? minInput.value : "";
      shopState.maxPrice = maxInput ? maxInput.value : "";
      renderShopResults();
    });
  });

  renderCategoryFilterPanel();
  renderShopResults();
}

function renderCategoryFilterPanel() {
  const panel = document.getElementById("filterCategories");
  if (!panel) return;
  const categories = Store.getCategories();

  // فصل الأقسام الرئيسية
  const mainCats = categories.filter(function(c) { return !c.parentId; });

  let html = '<button data-cat="all" class="' + (shopState.categoryId === "all" ? "active" : "") + '">جميع الأقسام</button>';

  mainCats.forEach(function(main) {
    // رسم القسم الرئيسي
    html += '<button data-cat="' + main.id + '" class="' + (shopState.categoryId === main.id ? "active" : "") + '" style="font-weight:bold; border-right: 4px solid transparent;">' + main.name + "</button>";

    // رسم الأقسام الفرعية التابعة له
    const subCats = categories.filter(function(c) { return c.parentId === main.id; });
    subCats.forEach(function(sub) {
      html += '<button data-cat="' + sub.id + '" class="' + (shopState.categoryId === sub.id ? "active" : "") + '" style="padding-right: 25px; font-size: 0.9em; opacity: 0.85; border-right: 2px solid var(--primary); margin-bottom: 3px;">↳ ' + sub.name + "</button>";
    });
  });

  panel.innerHTML = html;
  panel.querySelectorAll("button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      shopState.categoryId = btn.dataset.cat;
      panel.querySelectorAll("button").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      renderShopResults();
    });
  });
}

function renderShopResults() {
  let list = Store.getProducts();

  if (shopState.categoryId !== "all") {
    // جلب المنتجات التابعة للقسم المختار والأقسام المتفرعة منه
    const subCatIds = Store.getCategories().filter(function(c) { return c.parentId === shopState.categoryId; }).map(function(c) { return c.id; });
    const allowedCats = [shopState.categoryId].concat(subCatIds);

    list = list.filter(function (p) { return allowedCats.includes(p.categoryId); });
  }

  if (shopState.search) {
    const q = shopState.search.toLowerCase();
    list = list.filter(function (p) {
      return p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q);
    });
  }
  if (shopState.minPrice) list = list.filter(function (p) { return p.price >= Number(shopState.minPrice); });
  if (shopState.maxPrice) list = list.filter(function (p) { return p.price <= Number(shopState.maxPrice); });

  switch (shopState.sort) {
    case "price-asc": list.sort(function (a, b) { return a.price - b.price; }); break;
    case "price-desc": list.sort(function (a, b) { return b.price - a.price; }); break;
    case "name": list.sort(function (a, b) { return a.name.localeCompare(b.name, "ar"); }); break;
    default: break; 
  }

  renderGridInto("shopGrid", list, "لا توجد منتجات مطابقة لبحثك — جرّب تغيير الفلاتر.");

  const countEl = document.getElementById("resultCount");
  if (countEl) countEl.textContent = list.length + " منتج";
}

/* ---------------------------------------------------------------------- */
/* الرئيسية — المنتجات المميزة / الجديدة / الأقسام الشائعة                  */
/* ---------------------------------------------------------------------- */

function initHomeCollections() {
  const featuredEl = document.getElementById("featuredGrid");
  const newEl = document.getElementById("newGrid");
  const catEl = document.getElementById("homeCategories");
  if (!featuredEl && !newEl && !catEl) return;

  const products = Store.getProducts();

  if (featuredEl) {
    renderGridInto("featuredGrid", products.filter(function (p) { return p.featured; }).slice(0, 4), "لا توجد منتجات مميزة حاليًا.");
  }
  if (newEl) {
    renderGridInto("newGrid", products.filter(function (p) { return p.isNew; }).slice(0, 4), "لا توجد منتجات جديدة حاليًا.");
  }
  if (catEl) {
    const categories = Store.getCategories();
    // عرض الأقسام الرئيسية فقط في الرئيسية لعدم تكديس الواجهة
    const mainCategories = categories.filter(function(c) { return !c.parentId; });
    
    catEl.innerHTML = mainCategories.map(function (c) {
      const media = c.image 
        ? '<img src="' + c.image + '" alt="' + c.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' 
        : iconSvg(c.icon || "box");
        
      return '<a href="products.html?cat=' + c.id + '" class="cat-chip">' +
        '<span class="cat-icon" style="padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center;">' + media + '</span>' +
        '<span class="name">' + c.name + "</span>" +
      "</a>";
    }).join("");
  }
}

/* ---------------------------------------------------------------------- */
/* صفحة تفاصيل المنتج (product.html)                                       */
/* ---------------------------------------------------------------------- */

function initProductDetailPage() {
  const mount = document.getElementById("productDetail");
  if (!mount) return;

  const id = new URLSearchParams(location.search).get("id");
  const product = id ? Store.getProduct(id) : null;

  if (!product) {
    mount.innerHTML = '<div class="empty-state">' + iconSvg("box") +
      "<p>هذا المنتج غير موجود أو تم حذفه.</p>" +
      '<a href="products.html" class="btn btn-outline">العودة إلى المتجر</a></div>';
    return;
  }

  document.title = product.name + " — " + Store.getSettings().storeName;
  const outOfStock = !product.available || product.stock <= 0;

  mount.innerHTML =
    '<div class="detail-grid">' +
      '<div class="detail-media">' + productMediaHtml(product) + "</div>" +
      '<div class="detail-info">' +
        '<span class="product-cat">' + Store.getCategoryName(product.categoryId) + "</span>" +
        "<h1>" + product.name + "</h1>" +
        '<div class="stock-line">' +
          '<span class="dot' + (outOfStock ? " dot-out" : "") + '"></span>' +
          (outOfStock ? "غير متوفر حاليًا" : "متوفر — الكمية " + product.stock) +
        "</div>" +
        '<div class="detail-price">' + formatPrice(product.price) + "</div>" +
        "<p>" + product.description + "</p>" +
        (outOfStock ? "" :
          '<div class="qty-stepper">' +
            '<button type="button" id="qtyMinus">−</button>' +
            '<input type="number" id="qtyInput" value="1" min="1" max="' + product.stock + '">' +
            '<button type="button" id="qtyPlus">+</button>' +
          "</div>"
        ) +
        '<div class="detail-actions">' +
          (outOfStock
            ? '<button class="btn btn-outline" disabled>غير متوفر حاليًا</button>'
            : '<button class="btn btn-primary" id="addToCartBtn">' + iconSvg("cart") + "أضف للسلة</button>" +
              '<button class="btn btn-whatsapp" id="orderNowBtn">' + iconSvg("whatsapp") + "طلب عبر واتساب</button>"
          ) +
        "</div>" +
        '<div class="detail-meta">' +
          "<span>القسم: " + Store.getCategoryName(product.categoryId) + "</span>" +
          "<span>حالة التوفر: " + (outOfStock ? "غير متوفر" : "متوفر") + "</span>" +
        "</div>" +
      "</div>" +
    "</div>";

  if (!outOfStock) {
    const qtyInput = document.getElementById("qtyInput");
    document.getElementById("qtyMinus").addEventListener("click", function () {
      qtyInput.value = Math.max(1, Number(qtyInput.value) - 1);
    });
    document.getElementById("qtyPlus").addEventListener("click", function () {
      qtyInput.value = Math.min(product.stock, Number(qtyInput.value) + 1);
    });
    document.getElementById("addToCartBtn").addEventListener("click", function () {
      Store.addToCart(product.id, Number(qtyInput.value) || 1);
      showToast(product.name + " أُضيف إلى السلة");
    });
    document.getElementById("orderNowBtn").addEventListener("click", function () {
      orderSingleProductViaWhatsApp(product, Number(qtyInput.value) || 1);
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initHomeCollections();
  initShopPage();
  initProductDetailPage();
});
