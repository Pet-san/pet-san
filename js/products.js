/* ==========================================================================
   products.js (النسخة 2.0 - دعم الأقسام الفرعية والخيارات - مع إصلاح شريط الأقسام)
   ========================================================================== */

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
  
  if (product.isOffer) badges.push('<span class="badge badge-offer" style="background:var(--danger); color:white;">عرض🔥</span>');
  else if (product.isNew) badges.push('<span class="badge badge-new">جديد</span>');
  else if (product.featured) badges.push('<span class="badge badge-featured">مميز</span>');

  return (
    '<article class="product-card">' +
      '<a href="product.html?id=' + product.id + '" class="product-media">' +
        productMediaHtml(product) +
        badges.join("") +
      "</a>" +
      // تم إلغاء التمدد هنا لتصبح البطاقة مضغوطة
      '<div class="product-body" style="padding-top: 6px;">' +
        '<span class="product-cat" style="font-size:0.7rem; color:var(--olive-500); font-weight:600; display:block; margin-bottom:2px;">' + Store.getCategoryName(product.categoryId) + "</span>" +
        '<h3 class="product-name" style="margin:0 0 4px; font-size:0.75rem; line-height:1.4; font-weight:700;"><a href="product.html?id=' + product.id + '">' + product.name + "</a></h3>" +
        '<div class="product-foot" style="margin:0 0 8px 0; justify-content:center;">' +
'<span class="price" style="font-size:1rem; font-weight:900; color:var(--olive-700);">' + formatPrice(product.price) + "</span>" +        "</div>" +
        '<div class="product-actions" style="margin-top:0;">' +
          '<button class="btn btn-primary btn-sm btn-block" style="padding:6px; font-size:0.8rem; font-weight:bold;" ' + (outOfStock ? "disabled" : "") +
            ' onclick="quickAddToCart(\'' + product.id + '\')">' + 
            (outOfStock ? "غير متوفر" : iconSvg("cart") + "أضف للسلة") + 
          "</button>" +
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
  if (product.variants && product.variants.length > 0) {
      window.location.href = 'product.html?id=' + productId;
      return;
  }
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

const shopState = { search: "", categoryId: "all", sort: "default", minPrice: "", maxPrice: "", filterMode: "", mobileMenuOpen: false };

function initShopPage() {
  const grid = document.getElementById("shopGrid");
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  if (params.get("cat")) shopState.categoryId = params.get("cat");
  if (params.get("q")) shopState.search = params.get("q");
  if (params.get("filter")) shopState.filterMode = params.get("filter");

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

window.updateCategory = function(catId) {
    shopState.categoryId = catId;
    shopState.filterMode = "";
    renderCategoryFilterPanel();
    renderShopResults();

    // إعادة التمرير لأعلى شبكة المنتجات مع مراعاة ارتفاع الهيدر الثابت
    const grid = document.getElementById("shopGrid");
    if (grid) {
        const headerEl = document.querySelector(".site-header");
        const offset = (headerEl ? headerEl.offsetHeight : 80) + 10;
        const top = grid.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top: top, behavior: "smooth" });
    }
};

function renderCategoryFilterPanel() {
  const panel = document.getElementById("filterCategories");
  if (!panel) return;
  const categories = Store.getCategories();
  const mainCats = categories.filter(function(c) { return !c.parentId; });

  let html = '';
  html += '<button id="mobileFilterToggle" class="mobile-toggle-btn" style="display:none; width:100%; padding:12px 15px; background:var(--olive-100); color:var(--olive-700); border:none; border-radius:var(--radius-sm); font-weight:bold; align-items:center; justify-content:space-between; margin-bottom:5px; cursor:pointer;">';
  html += '<span style="display:flex; align-items:center; gap:8px;">' + iconSvg("box") + ' تصفية الأقسام</span>';
  html += '<span style="transition: transform 0.3s; transform: rotate(' + (shopState.mobileMenuOpen ? '180deg' : '0deg') + ');">▼</span>';
  html += '</button>';

  html += '<div id="filterListContainer" class="filter-list-container ' + (shopState.mobileMenuOpen ? 'open' : '') + '" style="flex-direction: column;">';
  html += '<button data-cat="all" class="' + (shopState.categoryId === "all" && !shopState.filterMode ? "active" : "") + '" style="font-weight:bold; width:100%; text-align:right; margin-bottom: 8px;">جميع المنتجات</button>';
  html += '<button data-filter="featured" class="' + (shopState.filterMode === "featured" ? "active" : "") + '" style="font-weight:bold; width:100%; text-align:right; margin-bottom: 8px; color: var(--sand-500);">⭐ منتجات مميزة</button>';
  html += '<button data-filter="offer" class="' + (shopState.filterMode === "offer" ? "active" : "") + '" style="font-weight:bold; width:100%; text-align:right; margin-bottom: 8px; color: var(--danger);">🔥 عروض خاصة</button>';
  html += '<button data-filter="new" class="' + (shopState.filterMode === "new" ? "active" : "") + '" style="font-weight:bold; width:100%; text-align:right; margin-bottom: 18px; color: #2563eb;">✨ وصل حديثاً</button>';
  
  mainCats.forEach(function(main) {
    const isMainActive = shopState.categoryId === main.id && !shopState.filterMode;
    const isChildActive = categories.some(c => c.parentId === main.id && c.id === shopState.categoryId);
    const isActive = isMainActive || (isChildActive && !shopState.filterMode);
    const hasSubCats = categories.some(c => c.parentId === main.id);
    let btnLabel = main.name;
    
    if (hasSubCats) {
        btnLabel = '<div style="display:flex; justify-content:space-between; align-items:center;">' +
                      '<span>' + main.name + '</span>' +
                      '<span style="font-size:0.7rem; font-weight:600; color:var(--olive-600); background:var(--olive-100); padding:2px 8px; border-radius:10px;">+ تفرعات</span>' +
                   '</div>';
    }
    html += '<button data-cat="' + main.id + '" class="main-cat-btn ' + (isActive ? "active" : "") + '" style="font-weight:bold; width:100%; text-align:right; margin-bottom: 8px;">' + btnLabel + '</button>';
  });
  html += '</div>';
  panel.innerHTML = html;

  const toggleBtn = document.getElementById("mobileFilterToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function() {
      shopState.mobileMenuOpen = !shopState.mobileMenuOpen;
      renderCategoryFilterPanel();
    });
  }

  panel.querySelectorAll("button[data-cat], button[data-filter]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      if (btn.dataset.filter) { shopState.filterMode = btn.dataset.filter; shopState.categoryId = "all"; } 
      else { shopState.filterMode = ""; shopState.categoryId = btn.dataset.cat; }
      if (window.innerWidth <= 980) shopState.mobileMenuOpen = false;
      const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.pushState({path:newUrl}, '', newUrl);
      renderCategoryFilterPanel(); 
      renderShopResults();
    });
  });
}

function renderShopResults() {
  let list = Store.getProducts();

  if (shopState.filterMode === "featured") list = list.filter(function (p) { return p.featured; });
  else if (shopState.filterMode === "offer") list = list.filter(function (p) { return p.isOffer; });
  else if (shopState.filterMode === "new") list = list.filter(function (p) { return p.isNew; });

  if (shopState.categoryId !== "all" && !shopState.filterMode) {
    const subCatIds = Store.getCategories().filter(function(c) { return c.parentId === shopState.categoryId; }).map(function(c) { return c.id; });
    const allowedCats = [shopState.categoryId].concat(subCatIds);
    list = list.filter(function (p) { return allowedCats.includes(p.categoryId); });
  }
  
  if (shopState.search) {
    const q = shopState.search.toLowerCase();
    list = list.filter(function (p) { return p.name.toLowerCase().includes(q) || (p.description || "").toLowerCase().includes(q); });
  }
  if (shopState.minPrice) list = list.filter(function (p) { return p.price >= Number(shopState.minPrice); });
  if (shopState.maxPrice) list = list.filter(function (p) { return p.price <= Number(shopState.maxPrice); });

  switch (shopState.sort) {
    case "price-asc": list.sort(function (a, b) { return a.price - b.price; }); break;
    case "price-desc": list.sort(function (a, b) { return b.price - a.price; }); break;
    case "name": list.sort(function (a, b) { return a.name.localeCompare(b.name, "ar"); }); break;
    default: break; 
  }

  const subCatContainerId = "subCategoryScroller";
  let subCatContainer = document.getElementById(subCatContainerId);
  
  if (shopState.categoryId !== "all" && !shopState.filterMode) {
      const currentCat = Store.getCategories().find(c => c.id === shopState.categoryId);
      const parentId = currentCat ? (currentCat.parentId || currentCat.id) : null;
      if (parentId) {
          const subCats = Store.getCategories().filter(c => c.parentId === parentId);
          if (subCats.length > 0) {
              if (!subCatContainer) {
                  subCatContainer = document.createElement("div");
                  subCatContainer.id = subCatContainerId;
                  subCatContainer.className = "cat-scroller";
                  subCatContainer.style.marginBottom = "10px";
                  subCatContainer.style.padding = "10px 0";
                             subCatContainer.style.position = "sticky";
              const headerElForOffset = document.querySelector(".site-header");
              subCatContainer.style.top = (headerElForOffset ? headerElForOffset.offsetHeight : 75) + "px";
                  subCatContainer.style.zIndex = "40"; 
                  subCatContainer.style.backgroundColor = "#fefcf4"; 
                  const grid = document.getElementById("shopGrid");
                  if (grid && grid.parentNode) grid.parentNode.insertBefore(subCatContainer, grid);
              }
              let subHtml = '<button class="filter-chip ' + (shopState.categoryId === parentId ? 'active' : '') + '" onclick="updateCategory(\'' + parentId + '\')">الكل</button>';
              subHtml += subCats.map(sub => { return '<button class="filter-chip ' + (shopState.categoryId === sub.id ? 'active' : '') + '" onclick="updateCategory(\'' + sub.id + '\')">' + sub.name + '</button>'; }).join('');
              subCatContainer.innerHTML = subHtml;
              subCatContainer.style.display = "flex";
          } else if (subCatContainer) subCatContainer.style.display = "none";
      }
  } else if (subCatContainer) subCatContainer.style.display = "none";

  let emptyMsg = "لا توجد منتجات مطابقة لبحثك — جرّب تغيير الفلاتر.";
  if (shopState.filterMode === "featured") emptyMsg = "عذراً، لا توجد منتجات مميزة في المتجر حالياً.";
  else if (shopState.filterMode === "offer") emptyMsg = "عذراً، لا توجد عروض وتخفيضات حالياً.";
  else if (shopState.filterMode === "new") emptyMsg = "عذراً، لا توجد منتجات جديدة في المتجر حالياً.";

  renderGridInto("shopGrid", list, emptyMsg);
  const countEl = document.getElementById("resultCount");
  if (countEl) countEl.textContent = list.length + " منتج";
}

function initHomeCollections() {
  const featuredEl = document.getElementById("featuredGrid");
  const offerEl = document.getElementById("offerGrid"); 
  const newEl = document.getElementById("newGrid");
  const catEl = document.getElementById("homeCategories");
  const products = Store.getProducts();

  if (featuredEl) renderGridInto("featuredGrid", products.filter(function (p) { return p.featured; }).slice(0, 4), "لا توجد منتجات مميزة حاليًا.");
  if (offerEl) renderGridInto("offerGrid", products.filter(function (p) { return p.isOffer; }).slice(0, 4), "لا توجد عروض حاليًا.");
  if (newEl) renderGridInto("newGrid", products.filter(function (p) { return p.isNew; }).slice(0, 4), "لا توجد منتجات جديدة حاليًا.");
  
  if (catEl) {
    const categories = Store.getCategories();
    const mainCategories = categories.filter(function(c) { return !c.parentId; });
    catEl.innerHTML = mainCategories.map(function (c) {
      const media = c.image ? '<img src="' + c.image + '" alt="' + c.name + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">' : iconSvg(c.icon || "box");
      return '<a href="products.html?cat=' + c.id + '" class="cat-chip"><span class="cat-icon" style="padding:0;overflow:hidden;display:flex;align-items:center;justify-content:center;">' + media + '</span><span class="name">' + c.name + "</span></a>";
    }).join("");
  }
}

function initProductDetailPage() {
  const mount = document.getElementById("productDetail");
  if (!mount) return;

  const id = new URLSearchParams(location.search).get("id");
  const product = id ? Store.getProduct(id) : null;

  if (!product) {
    mount.innerHTML = '<div class="empty-state">' + iconSvg("box") + "<p>هذا المنتج غير موجود أو تم حذفه.</p>" + '<a href="products.html" class="btn btn-outline">العودة إلى المتجر</a></div>';
    return;
  }

  document.title = product.name + " — " + Store.getSettings().storeName;
  const outOfStock = !product.available || product.stock <= 0;

  let variantsHtml = "";
  if (product.variants && product.variants.length > 0) {
      variantsHtml = '<div class="field" style="margin-bottom: 20px;"><label style="font-weight:bold; display:block; margin-bottom:8px;">الخيارات المتوفرة:</label>' +
                     '<select id="variantSelect" style="width:100%; padding:12px; border-radius:var(--radius-sm); border:1px solid var(--line-strong); background:var(--white); font-family:inherit; font-size:1rem;">' +
                     product.variants.map(v => '<option value="' + v + '">' + v + '</option>').join('') + '</select></div>';
  }

  mount.innerHTML =
    '<div class="detail-grid"><div class="detail-media">' + productMediaHtml(product) + "</div>" +
      '<div class="detail-info">' +
        '<span class="product-cat">' + Store.getCategoryName(product.categoryId) + "</span>" +
        "<h1>" + product.name + "</h1>" +
        '<div class="stock-line"><span class="dot' + (outOfStock ? " dot-out" : "") + '"></span>' + (outOfStock ? "غير متوفر حاليًا" : "متوفر — الكمية " + product.stock) + "</div>" +
        '<div class="detail-price">' + formatPrice(product.price) + "</div>" +
        "<p>" + product.description + "</p>" +
        variantsHtml + 
        (outOfStock ? "" : '<div class="qty-stepper"><button type="button" id="qtyMinus">−</button><input type="number" id="qtyInput" value="1" min="1" max="' + product.stock + '"><button type="button" id="qtyPlus">+</button></div>') +
        '<div class="detail-actions">' +
          (outOfStock
            ? '<button class="btn btn-outline" disabled>غير متوفر حاليًا</button>'
            : '<button class="btn btn-primary" id="addToCartBtn">' + iconSvg("cart") + "أضف للسلة</button>" + '<button class="btn btn-whatsapp" id="orderNowBtn">' + iconSvg("whatsapp") + "طلب عبر واتساب</button>"
          ) +
        "</div>" +
        '<div class="detail-meta"><span>القسم: ' + Store.getCategoryName(product.categoryId) + '</span><span>حالة التوفر: ' + (outOfStock ? "غير متوفر" : "متوفر") + '</span></div>' +
      "</div></div>";

  if (!outOfStock) {
    const qtyInput = document.getElementById("qtyInput");
    const variantSelect = document.getElementById("variantSelect");
    
    document.getElementById("qtyMinus").addEventListener("click", function () { qtyInput.value = Math.max(1, Number(qtyInput.value) - 1); });
    document.getElementById("qtyPlus").addEventListener("click", function () { qtyInput.value = Math.min(product.stock, Number(qtyInput.value) + 1); });
    
    document.getElementById("addToCartBtn").addEventListener("click", function () {
      const qty = Number(qtyInput.value) || 1;
      const selectedVariant = variantSelect ? variantSelect.value : null;
      const itemKey = selectedVariant ? product.id + "|" + selectedVariant : product.id;
      Store.addToCart(itemKey, qty, selectedVariant);
      showToast(product.name + (selectedVariant ? " (" + selectedVariant + ")" : "") + " أُضيف إلى السلة");
    });
    
    document.getElementById("orderNowBtn").addEventListener("click", function () {
      const qty = Number(qtyInput.value) || 1;
      const selectedVariant = variantSelect ? variantSelect.value : null;
      const orderProduct = Object.assign({}, product);
      if (selectedVariant) orderProduct.name = product.name + " (" + selectedVariant + ")";
      orderSingleProductViaWhatsApp(orderProduct, qty);
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initHomeCollections();
  initShopPage();
  initProductDetailPage();
});
document.addEventListener("store:synced", function () {
  initHomeCollections();
  renderCategoryFilterPanel();
  renderShopResults();
  initProductDetailPage();
});
