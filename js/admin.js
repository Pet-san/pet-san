/* ==========================================================================
   admin.js
   نسخة هجينة: مع دعم أزرار حذف الصورة وتفريغ الحقول بالكامل
   ========================================================================== */

let editingProductId = null;
let editingCategoryId = null;
let editingAdId = null; 
let pendingProductImage = null; 
let pendingCategoryImage = null; 
let pendingAdImage = null; 

function initAdminPage() {
  const app = document.getElementById("adminApp");
  if (!app) return;
  if (!requireAdminAuth()) return;

  wireSidebarNav();
  document.getElementById("adminLogoutBtn").addEventListener("click", handleAdminLogout);
  const sidebarToggle = document.getElementById("adminSidebarToggle");
  if (sidebarToggle) {
    sidebarToggle.addEventListener("click", function () {
      document.querySelector(".admin-sidebar").classList.toggle("open");
    });
  }

  renderStats();
  renderProductsTable();
  renderCategoriesTable();
  renderOrdersTable();
  renderAdsTable(); 
  
  fillSettingsForm();
  populateCategorySelect();
  populateIconPicker();

  wireProductModal();
  wireCategoryModal();
  wireAdModal(); 
  wireSettingsForm();

  const productSearch = document.getElementById("adminProductSearch");
  if (productSearch) productSearch.addEventListener("input", renderProductsTable);
}

/* ---------------------------------------------------------------------- */
/* ضاغط الصور (يعمل إذا تم اختيار صورة من الجهاز)                          */
/* ---------------------------------------------------------------------- */

function compressImage(file, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = img.width; let height = img.height;
        if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width = maxWidth; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = error => reject(error);
    };
    reader.onerror = error => reject(error);
  });
}

function wireSidebarNav() {
  const buttons = document.querySelectorAll(".admin-nav button[data-panel]");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      buttons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      document.querySelectorAll(".admin-panel-view").forEach(function (p) { p.style.display = "none"; });
      document.getElementById("panel-" + btn.dataset.panel).style.display = "block";
      document.querySelector(".admin-sidebar").classList.remove("open");
    });
  });
}

function renderStats() {
  const products = Store.getProducts();
  const outOfStock = products.filter(function (p) { return !p.available || p.stock <= 0; }).length;
  const stats = [
    { num: products.length, label: "إجمالي المنتجات" },
    { num: Store.getCategories().length, label: "الأقسام" },
    { num: outOfStock, label: "منتجات غير متوفرة" },
    { num: Store.getOrders().length, label: "طلبات عبر واتساب" }
  ];
  const el = document.getElementById("statsRow");
  if (!el) return;
  el.innerHTML = stats.map(function (s) {
    return '<div class="stat-card"><div class="num">' + s.num + '</div><div class="label">' + s.label + "</div></div>";
  }).join("");
}

function renderProductsTable() {
  const tbody = document.getElementById("productsTableBody");
  if (!tbody) return;
  const query = (document.getElementById("adminProductSearch") || {}).value || "";
  let products = Store.getProducts();
  if (query.trim()) {
    const q = query.trim().toLowerCase();
    products = products.filter(function (p) { return p.name.toLowerCase().includes(q); });
  }
  if (!products.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--ink-300);">لا توجد منتجات</td></tr>';
    return;
  }
  tbody.innerHTML = products.map(function (p) {
    const img = p.image ? '<img src="' + p.image + '">' : '<div class="admin-table-icon">' + iconSvg("box") + "</div>";
    const statusPill = (p.available && p.stock > 0) ? '<span class="pill pill-ok">متوفر</span>' : '<span class="pill pill-off">غير متوفر</span>';
    const tags = [];
    if (p.featured) tags.push("مميز"); if (p.isNew) tags.push("جديد"); if (p.isOffer) tags.push("عرض🔥"); 
    return (
      "<tr>" +
        "<td>" + img + "</td>" +
        "<td>" + p.name + (tags.length ? ' <span class="field-hint" style="color:var(--danger);">(' + tags.join(" / ") + ")</span>" : "") + "</td>" +
        "<td>" + Store.getCategoryName(p.categoryId) + "</td>" +
        "<td>" + formatPrice(p.price) + "</td>" +
        "<td>" + p.stock + "</td>" +
        "<td>" + statusPill + "</td>" +
        '<td class="row-actions">' +
          '<button class="btn-icon btn-sm" title="تعديل" onclick="openProductModal(\'' + p.id + '\')">' + iconSvg("edit") + "</button>" +
          '<button class="btn-icon btn-sm" title="حذف" onclick="deleteProductConfirm(\'' + p.id + '\')">' + iconSvg("trash") + "</button>" +
        "</td>" +
      "</tr>"
    );
  }).join("");
}

function deleteProductConfirm(id) {
  const product = Store.getProduct(id);
  if (!product) return;
  if (confirm('هل تريد حذف المنتج "' + product.name + '"؟ لا يمكن التراجع عن هذا الإجراء.')) {
    Store.deleteProduct(id); renderProductsTable(); renderStats(); showToast("تم حذف المنتج");
  }
}

function populateCategorySelect() {
  const select = document.getElementById("productCategorySelect");
  if (!select) return;
  select.innerHTML = Store.getCategories().map(function (c) { return '<option value="' + c.id + '">' + c.name + "</option>"; }).join("");
}

function wireProductModal() {
  const addBtn = document.getElementById("addProductBtn");
  if (addBtn) addBtn.addEventListener("click", function () { openProductModal(null); });
  const closeBtn = document.getElementById("closeProductModal");
  if (closeBtn) closeBtn.addEventListener("click", closeProductModal);
  const form = document.getElementById("productForm");
  if (form) form.addEventListener("submit", saveProductForm);

  const fileInput = document.getElementById("productImageFile");
  const urlInput = document.getElementById("productImageUrl");
  const preview = document.getElementById("productImagePreview");

  if (fileInput) {
    fileInput.addEventListener("change", async function () {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const compressedBase64 = await compressImage(file);
        pendingProductImage = compressedBase64;
        if (urlInput) urlInput.value = ""; 
        if (preview) preview.innerHTML = '<img src="' + compressedBase64 + '" style="width:100%;height:100%;object-fit:cover;">';
      } catch (e) { showToast("فشل معالجة الصورة."); }
    });
  }

  if (urlInput) {
    urlInput.addEventListener("input", function () {
      const url = urlInput.value.trim();
      if (url) {
        pendingProductImage = url;
        if (fileInput) fileInput.value = ""; 
        if (preview) preview.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">';
      }
    });
  }

  const removeImgBtn = document.getElementById("removeProductImageBtn");
  if (removeImgBtn) {
    removeImgBtn.addEventListener("click", function () {
      pendingProductImage = null;
      if (fileInput) fileInput.value = "";
      if (urlInput) urlInput.value = "";
      if (preview) preview.innerHTML = iconSvg("box");
    });
  }
}

function openProductModal(productId) {
  editingProductId = productId;
  pendingProductImage = null;
  populateCategorySelect();
  const modal = document.getElementById("productModal");
  const title = document.getElementById("productModalTitle");
  const form = document.getElementById("productForm");
  form.reset();
  const preview = document.getElementById("productImagePreview");
  const fileInput = document.getElementById("productImageFile");
  const urlInput = document.getElementById("productImageUrl");

  if (productId) {
    const p = Store.getProduct(productId);
    title.textContent = "تعديل المنتج";
    document.getElementById("productName").value = p.name;
    document.getElementById("productDescription").value = p.description;
    document.getElementById("productPrice").value = p.price;
    document.getElementById("productCategorySelect").value = p.categoryId;
    document.getElementById("productStock").value = p.stock;
    if(document.getElementById("productVariants")) document.getElementById("productVariants").value = p.variants && p.variants.length > 0 ? p.variants.join(", ") : "";
    document.getElementById("productAvailable").checked = p.available;
    document.getElementById("productFeatured").checked = !!p.featured;
    document.getElementById("productNew").checked = !!p.isNew;
    if (document.getElementById("productOffer")) document.getElementById("productOffer").checked = !!p.isOffer; 
    
    pendingProductImage = p.image || null;
    fileInput.value = ""; 
    urlInput.value = (pendingProductImage && pendingProductImage.startsWith("http")) ? pendingProductImage : "";
    preview.innerHTML = p.image ? '<img src="' + p.image + '" style="width:100%;height:100%;object-fit:cover;">' : iconSvg("box");
  } else {
    title.textContent = "إضافة منتج جديد";
    document.getElementById("productAvailable").checked = true;
    if(document.getElementById("productVariants")) document.getElementById("productVariants").value = "";
    fileInput.value = "";
    urlInput.value = "";
    preview.innerHTML = iconSvg("box");
  }
  modal.classList.add("open");
}

function closeProductModal() {
  document.getElementById("productModal").classList.remove("open");
  editingProductId = null;
}

function saveProductForm(e) {
  e.preventDefault();
  const variantsStr = document.getElementById("productVariants") ? document.getElementById("productVariants").value : "";
  const variantsArr = variantsStr.split(',').map(v => v.trim()).filter(v => v.length > 0);
  
  const data = {
    name: document.getElementById("productName").value.trim(),
    description: document.getElementById("productDescription").value.trim(),
    price: Number(document.getElementById("productPrice").value) || 0,
    categoryId: document.getElementById("productCategorySelect").value,
    stock: Number(document.getElementById("productStock").value) || 0,
    available: document.getElementById("productAvailable").checked,
    featured: document.getElementById("productFeatured").checked,
    isNew: document.getElementById("productNew").checked,
    isOffer: document.getElementById("productOffer") ? document.getElementById("productOffer").checked : false, 
    variants: variantsArr, 
    image: pendingProductImage
  };

  if (!data.name || !data.categoryId) { showToast("يرجى تعبئة اسم المنتج واختيار القسم"); return; }
  if (editingProductId) { Store.updateProduct(editingProductId, data); showToast("تم تحديث المنتج"); } 
  else { Store.addProduct(data); showToast("تمت إضافة المنتج"); }
  closeProductModal(); renderProductsTable(); renderStats();
}

function renderCategoriesTable() {
  const tbody = document.getElementById("categoriesTableBody");
  if (!tbody) return;
  const categories = Store.getCategories();
  const products = Store.getProducts();

  if (!categories.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--ink-300);">لا توجد أقسام</td></tr>'; return; }

  tbody.innerHTML = categories.map(function (c) {
    const count = products.filter(function (p) { return p.categoryId === c.id; }).length;
    const img = c.image ? '<img src="' + c.image + '">' : '<div class="admin-table-icon">' + iconSvg(c.icon || "box") + "</div>";
    const parent = c.parentId ? categories.find(function(x) { return x.id === c.parentId; }) : null;
    const displayName = parent ? c.name + '<br><small style="color:#888;">↳ فرعي من: ' + parent.name + '</small>' : '<strong>' + c.name + '</strong>';

    return "<tr><td>" + img + "</td><td>" + displayName + "</td><td>" + count + " منتج</td>" +
        '<td class="row-actions">' +
          '<button class="btn-icon btn-sm" title="تعديل" onclick="openCategoryModal(\'' + c.id + '\')">' + iconSvg("edit") + "</button>" +
          '<button class="btn-icon btn-sm" title="حذف" onclick="deleteCategoryConfirm(\'' + c.id + '\')">' + iconSvg("trash") + "</button>" +
        "</td></tr>";
  }).join("");
}

function deleteCategoryConfirm(id) {
  const category = Store.getCategories().find(function (c) { return c.id === id; });
  if (!category) return;
  const msg = 'هل تريد حذف القسم "' + category.name + '"؟';
  if (confirm(msg)) {
    Store.deleteCategory(id); renderCategoriesTable(); populateCategorySelect(); renderStats(); showToast("تم حذف القسم");
  }
}

function populateIconPicker() {
  const wrap = document.getElementById("categoryIconPicker");
  if (!wrap) return;
  wrap.innerHTML = CATEGORY_ICON_KEYS.map(function (key) {
    return '<label class="icon-choice"><input type="radio" name="categoryIcon" value="' + key + '"><span>' + iconSvg(key) + "</span></label>";
  }).join("");
}

function wireCategoryModal() {
  const addBtn = document.getElementById("addCategoryBtn");
  if (addBtn) addBtn.addEventListener("click", function () { openCategoryModal(null); });
  const closeBtn = document.getElementById("closeCategoryModal");
  if (closeBtn) closeBtn.addEventListener("click", closeCategoryModal);
  const form = document.getElementById("categoryForm");
  if (form) form.addEventListener("submit", saveCategoryForm);

  const fileInput = document.getElementById("categoryImageFile");
  const urlInput = document.getElementById("categoryImageUrl");
  const preview = document.getElementById("categoryImagePreview");

  if (fileInput) {
    fileInput.addEventListener("change", async function () {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const compressedBase64 = await compressImage(file);
        pendingCategoryImage = compressedBase64;
        if (urlInput) urlInput.value = ""; 
        if (preview) preview.innerHTML = '<img src="' + compressedBase64 + '" style="width:100%;height:100%;object-fit:cover;">';
      } catch (e) { showToast("فشل معالجة الصورة."); }
    });
  }

  if (urlInput) {
    urlInput.addEventListener("input", function () {
      const url = urlInput.value.trim();
      if (url) {
        pendingCategoryImage = url;
        if (fileInput) fileInput.value = ""; 
        if (preview) preview.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">';
      }
    });
  }

  const removeImgBtn = document.getElementById("removeCategoryImageBtn");
  if (removeImgBtn) {
    removeImgBtn.addEventListener("click", function () {
      pendingCategoryImage = null;
      if (fileInput) fileInput.value = "";
      if (urlInput) urlInput.value = "";
      if (preview) preview.innerHTML = iconSvg("box");
    });
  }
}

function openCategoryModal(categoryId) {
  editingCategoryId = categoryId;
  pendingCategoryImage = null;
  populateIconPicker();
  
  const modal = document.getElementById("categoryModal");
  const title = document.getElementById("categoryModalTitle");
  const form = document.getElementById("categoryForm");
  form.reset();

  const preview = document.getElementById("categoryImagePreview");
  const fileInput = document.getElementById("categoryImageFile");
  const urlInput = document.getElementById("categoryImageUrl");
  const nameInput = document.getElementById("categoryName");

  let parentContainer = document.getElementById("categoryParentContainer");
  if (!parentContainer) {
    parentContainer = document.createElement("div");
    parentContainer.id = "categoryParentContainer";
    parentContainer.style.marginTop = "15px";
    parentContainer.innerHTML = '<label style="display:block;margin-bottom:5px;">يتبع لقسم (اختياري)</label><select id="categoryParent" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;"></select>';
    nameInput.parentNode.insertBefore(parentContainer, nameInput.nextSibling);
  }

  const parentSelect = document.getElementById("categoryParent");
  const allCats = Store.getCategories();
  parentSelect.innerHTML = '<option value="">-- قسم رئيسي مستقل --</option>' +
    allCats.filter(function(c) { return c.id !== categoryId && !c.parentId; }).map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join("");

  if (categoryId) {
    const c = allCats.find(function (cc) { return cc.id === categoryId; });
    title.textContent = "تعديل القسم";
    nameInput.value = c.name;
    parentSelect.value = c.parentId || "";
    pendingCategoryImage = c.image || null;
    
    fileInput.value = "";
    urlInput.value = (pendingCategoryImage && pendingCategoryImage.startsWith("http")) ? pendingCategoryImage : "";
    
    if (preview) preview.innerHTML = c.image ? '<img src="' + c.image + '" style="width:100%;height:100%;object-fit:cover;">' : iconSvg(c.icon || "box");
    const radio = form.querySelector('input[name="categoryIcon"][value="' + c.icon + '"]');
    if (radio) radio.checked = true;
  } else {
    title.textContent = "إضافة قسم جديد";
    parentSelect.value = "";
    fileInput.value = "";
    urlInput.value = "";
    if (preview) preview.innerHTML = iconSvg("box");
  }
  modal.classList.add("open");
}

function closeCategoryModal() {
  document.getElementById("categoryModal").classList.remove("open");
  editingCategoryId = null;
}

function saveCategoryForm(e) {
  e.preventDefault();
  const name = document.getElementById("categoryName").value.trim();
  const parentId = document.getElementById("categoryParent") ? document.getElementById("categoryParent").value : "";
  
  if (!name) { showToast("يرجى إدخال اسم القسم"); return; }
  if (editingCategoryId) { Store.updateCategory(editingCategoryId, { name: name, image: pendingCategoryImage, parentId: parentId }); showToast("تم تحديث القسم"); } 
  else { Store.addCategory({ name: name, image: pendingCategoryImage, parentId: parentId }); showToast("تمت إضافة القسم"); }
  closeCategoryModal(); renderCategoriesTable(); populateCategorySelect();
}

function renderAdsTable() {
  const tbody = document.getElementById("adsTableBody");
  if (!tbody) return;
  const ads = Store.getAds().sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!ads.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--ink-300);">لا توجد إعلانات حالياً</td></tr>'; return; }

  tbody.innerHTML = ads.map(function (ad) {
    const img = ad.image ? '<img src="' + ad.image + '" style="width:80px;height:40px;border-radius:4px;object-fit:cover;">' : '<div class="admin-table-icon">' + iconSvg("image") + "</div>";
    const link = ad.link ? '<a href="' + ad.link + '" target="_blank" style="color:var(--olive-700);text-decoration:underline;">عرض الرابط</a>' : '-';
    return "<tr><td>" + img + "</td><td>" + link + "</td><td>" + (ad.order || 0) + "</td>" +
        '<td class="row-actions"><button class="btn-icon btn-sm" title="حذف" onclick="deleteAdConfirm(\'' + ad.id + '\')">' + iconSvg("trash") + "</button></td></tr>";
  }).join("");
}

function deleteAdConfirm(id) {
  if (confirm('هل تريد حذف هذا الإعلان؟')) { Store.deleteAd(id); renderAdsTable(); showToast("تم حذف الإعلان"); }
}

function wireAdModal() {
  const addBtn = document.getElementById("addAdBtn");
  if (addBtn) addBtn.addEventListener("click", function () { openAdModal(); });
  const closeBtn = document.getElementById("closeAdModal");
  if (closeBtn) closeBtn.addEventListener("click", closeAdModal);
  const form = document.getElementById("adForm");
  if (form) form.addEventListener("submit", saveAdForm);

  const fileInput = document.getElementById("adImageFile");
  const urlInput = document.getElementById("adImageUrl");
  const preview = document.getElementById("adImagePreview");

  if (fileInput) {
    fileInput.addEventListener("change", async function () {
      const file = fileInput.files[0];
      if (!file) return;
      try {
        const compressedBase64 = await compressImage(file, 1000, 0.8);
        pendingAdImage = compressedBase64;
        if (urlInput) urlInput.value = ""; 
        if (preview) preview.innerHTML = '<img src="' + compressedBase64 + '" style="width:100%;height:100%;object-fit:cover;">';
      } catch (e) { showToast("فشل معالجة الصورة."); }
    });
  }

  if (urlInput) {
    urlInput.addEventListener("input", function () {
      const url = urlInput.value.trim();
      if (url) {
        pendingAdImage = url;
        if (fileInput) fileInput.value = ""; 
        if (preview) preview.innerHTML = '<img src="' + url + '" style="width:100%;height:100%;object-fit:cover;">';
      }
    });
  }

  const removeImgBtn = document.getElementById("removeAdImageBtn");
  if (removeImgBtn) {
    removeImgBtn.addEventListener("click", function () {
      pendingAdImage = null;
      if (fileInput) fileInput.value = "";
      if (urlInput) urlInput.value = "";
      if (preview) preview.innerHTML = "";
    });
  }
}

function openAdModal() {
  pendingAdImage = null;
  const modal = document.getElementById("adModal");
  const form = document.getElementById("adForm");
  if(form) form.reset();
  
  const preview = document.getElementById("adImagePreview");
  const fileInput = document.getElementById("adImageFile");
  const urlInput = document.getElementById("adImageUrl");

  if (preview) preview.innerHTML = "";
  if (fileInput) fileInput.value = "";
  if (urlInput) urlInput.value = "";

  if(modal) modal.classList.add("open");
}

function closeAdModal() {
  document.getElementById("adModal").classList.remove("open");
}

async function saveAdForm(e) {
  e.preventDefault();
  if (!pendingAdImage) { showToast("يرجى اختيار صورة أو إدخال رابط للإعلان"); return; }
  
  const data = {
    link: document.getElementById("adLink") ? document.getElementById("adLink").value.trim() : "",
    order: document.getElementById("adOrder") ? Number(document.getElementById("adOrder").value) : 0,
    image: pendingAdImage
  };

  Store.addAd(data);
  showToast("جاري حفظ ورفع الإعلان...");

  try {
    const allAds = Store.getAds();
    await fetch(FIREBASE_DB_URL + "/data.json", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ads: allAds })
    });
    showToast("تم حفظ الإعلان بنجاح!");
  } catch (err) {
    showToast("تم الحفظ محلياً، سيتم المزامنة لاحقاً.");
  }
  closeAdModal(); renderAdsTable();
}

function renderOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;
  const orders = Store.getOrders();
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--ink-300);">لا توجد طلبات مسجّلة بعد</td></tr>'; return; }
  tbody.innerHTML = orders.map(function (o) {
    const date = new Date(o.date).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
    const summary = o.items.map(function (it) { return it.name + " ×" + it.qty; }).join("، ");
    return "<tr><td>" + date + "</td><td>" + (o.type === "cart" ? "سلة" : "مفرد") + "</td><td>" + summary + "</td><td>" + formatPrice(o.total) + "</td></tr>";
  }).join("");
}

function fillSettingsForm() {
  const form = document.getElementById("settingsForm");
  if (!form) return;
  const s = Store.getSettings();
  form.storeName.value = s.storeName || "";
  form.storeTagline.value = s.storeTagline || "";
  form.storeDescription.value = s.storeDescription || "";
  form.whatsapp.value = s.whatsapp || "";
  form.instagram.value = s.instagram || "";
  form.phone.value = s.phone || "";
  form.address.value = s.address || "";
  form.workingHours.value = s.workingHours || "";
  form.deliveryInfo.value = s.deliveryInfo || "";
  form.currencySymbol.value = s.currencySymbol || "د.ع";
  form.adminUsername.value = s.adminUsername || "";
}

function wireSettingsForm() {
  const form = document.getElementById("settingsForm");
  if (!form) return;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const patch = {
      storeName: form.storeName.value.trim(),
      storeTagline: form.storeTagline.value.trim(),
      storeDescription: form.storeDescription.value.trim(),
      whatsapp: whatsappDigitsOnly(form.whatsapp.value),
      instagram: form.instagram.value.trim(),
      phone: form.phone.value.trim(),
      address: form.address.value.trim(),
      workingHours: form.workingHours.value.trim(),
      deliveryInfo: form.deliveryInfo.value.trim(),
      currencySymbol: form.currencySymbol.value.trim() || "د.ع",
      adminUsername: form.adminUsername.value.trim() || Store.getSettings().adminUsername
    };
    const newPassword = form.newPassword.value;
    const confirmPassword = form.confirmPassword.value;
    if (newPassword || confirmPassword) {
      if (newPassword.length < 4) { showToast("كلمة المرور الجديدة قصيرة جدًا"); return; }
      if (newPassword !== confirmPassword) { showToast("كلمتا المرور غير متطابقتين"); return; }
      patch.adminPassword = newPassword;
    }
    Store.saveSettings(patch);
    form.newPassword.value = "";
    form.confirmPassword.value = "";
    showToast("تم حفظ الإعدادات بنجاح");
  });
}

document.addEventListener("DOMContentLoaded", initAdminPage);
