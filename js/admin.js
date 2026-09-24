/* ==========================================================================
   admin.js
   منطق لوحة تحكم الأدمن بالكامل (admin.html). 
   تم التحديث: سقف صارم 100KB للمنتجات (max_bytes-100000) ودقة فائقة للإعلانات.
   ========================================================================== */

let editingProductId = null;
let editingCategoryId = null;
let editingAdId = null; 
let pendingProductImage = null; 
let pendingCategoryImage = null; 
let pendingAdImage = null; 
let pendingVariantImages = {}; // لحفظ صور النكهات/الخيارات

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
/* رفع الصور ومعالجتها الذكية عبر ImageKit CDN                            */
/* ---------------------------------------------------------------------- */

async function uploadToImgBB(file, isBanner = false) {
    const apiKey = "556361ffe3b34464a10010ce71544776";
    const formData = new FormData();
    formData.append("image", file);
    
    const response = await fetch("https://api.imgbb.com/1/upload?key=" + apiKey, {
      method: "POST",
      body: formData
    });
    
    const data = await response.json();
    if (data.success) {
      const rawUrl = data.data.url;
      const imageKitEndpoint = "https://ik.imagekit.io/petshop";
      
      // إزالة البروتوكول وتنظيف المسار
      let cleanPath = rawUrl.replace(/^https?:\/\//i, "");
      
      if (cleanPath.startsWith("i.ibb.co/")) {
        cleanPath = cleanPath.replace("i.ibb.co/", "");
      }
      
      // الإعلانات: دقة فائقة - المنتجات: حد أقصى صارم 100 كيلوبايت (100,000 بايت)
      const transform = isBanner
        ? "tr:w-1400,q-95,e-sharpen-12,f-auto"
        : "tr:w-900,max_bytes-100000,e-sharpen-8,f-auto";

      const cdnUrl = `${imageKitEndpoint}/${transform}/${cleanPath}`;

      // فحص سريع للصورة لضمان عدم اختفائها في حال تعثر الـ CDN
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(cdnUrl);
        img.onerror = () => {
          console.warn("تعذر تحميل الصورة عبر CDN، تم الاعتماد على الرابط المباشر.");
          resolve(rawUrl);
        };
        img.src = cdnUrl;
      });

    } else {
      throw new Error(data.error.message);
    }
}

/* ---------------------------------------------------------------------- */
/* التنقّل بين الأقسام                                                     */
/* ---------------------------------------------------------------------- */

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

/* ---------------------------------------------------------------------- */
/* لوحة الإحصائيات                                                        */
/* ---------------------------------------------------------------------- */

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

/* ---------------------------------------------------------------------- */
/* جدول المنتجات                                                          */
/* ---------------------------------------------------------------------- */

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
    const statusPill = (p.available && p.stock > 0)
      ? '<span class="pill pill-ok">متوفر</span>'
      : '<span class="pill pill-off">غير متوفر</span>';
    const tags = [];
    if (p.featured) tags.push("مميز");
    if (p.isNew) tags.push("جديد");
    if (p.isOffer) tags.push("عرض🔥"); 

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
    Store.deleteProduct(id);
    renderProductsTable();
    renderStats();
    showToast("تم حذف المنتج");
  }
}

function populateCategorySelect() {
  const select = document.getElementById("productCategorySelect");
  if (!select) return;
  select.innerHTML = Store.getCategories().map(function (c) {
    return '<option value="' + c.id + '">' + c.name + "</option>";
  }).join("");
}

/* ---- مودال إضافة/تعديل منتج ---- */

function renderVariantImageUploaders(variantsArr) {
  const wrap = document.getElementById("variantImagesWrap");
  const list = document.getElementById("variantImagesList");
  if (!wrap || !list) return;

  if (variantsArr.length === 0) {
    wrap.style.display = "none";
    list.innerHTML = "";
    return;
  }

  wrap.style.display = "block";
  let html = "";
  variantsArr.forEach((v, idx) => {
    const existingImg = pendingVariantImages[v] || "";
    html += `
      <div style="display:flex; align-items:center; gap:10px; background:var(--olive-50); padding:10px; border-radius:8px; border:1px solid var(--line);">
        <div style="flex:1; font-weight:bold; font-size:0.85rem;">صورة خيار: ${v}</div>
        <div class="image-upload" style="margin:0;">
          <div class="preview" id="preview_var_${idx}" style="width:40px; height:40px;">
            ${existingImg ? '<img src="' + existingImg + '">' : iconSvg("box")}
          </div>
          <input type="file" id="file_var_${idx}" accept="image/*" data-variant="${v}">
        </div>
        ${existingImg ? `<button type="button" class="btn-icon btn-sm" style="color:var(--danger); width:32px; height:32px;" onclick="removeVariantImage('${v}')">${iconSvg("trash")}</button>` : ''}
      </div>`;
  });
  list.innerHTML = html;

  variantsArr.forEach((v, idx) => {
    const input = document.getElementById(`file_var_${idx}`);
    if(input) {
      input.addEventListener("change", async function() {
        const file = this.files[0];
        if(!file) return;
        try {
          showToast(`جاري رفع صورة (${v})...`);
          const imageUrl = await uploadToImgBB(file, false);
          pendingVariantImages[v] = imageUrl;
          showToast(`تم رفع الصورة بنجاح!`);
          renderVariantImageUploaders(variantsArr);
        } catch(error) {
          showToast("فشل رفع الصورة. تأكد من الإنترنت.");
        }
      });
    }
  });
}

window.removeVariantImage = function(variantName) {
  delete pendingVariantImages[variantName];
  const variantsInput = document.getElementById("productVariants");
  if (variantsInput) {
      const variantsArr = variantsInput.value.split(',').map(v => v.trim()).filter(v => v.length > 0);
      renderVariantImageUploaders(variantsArr);
  }
};

function wireProductModal() {
  const addBtn = document.getElementById("addProductBtn");
  if (addBtn) addBtn.addEventListener("click", function () { openProductModal(null); });

  const closeBtn = document.getElementById("closeProductModal");
  if (closeBtn) closeBtn.addEventListener("click", closeProductModal);

  const form = document.getElementById("productForm");
  if (form) form.addEventListener("submit", saveProductForm);

  const imageInput = document.getElementById("productImageInput");
  if (imageInput) {
    imageInput.addEventListener("change", async function () {
      const file = imageInput.files[0];
      if (!file) return;
      
      try {
        showToast("جاري رفع الصورة لسيرفر التخزين...");
        const imageUrl = await uploadToImgBB(file, false);
        pendingProductImage = imageUrl;
        document.getElementById("productImagePreview").innerHTML = '<img src="' + imageUrl + '">';
        showToast("تم رفع الصورة بنجاح!");
      } catch (error) {
        console.error("Upload Error:", error);
        showToast("فشل رفع الصورة. يرجى التأكد من اتصال الإنترنت.");
      }
    });
  }

  const removeImgBtn = document.getElementById("removeProductImageBtn");
  if (removeImgBtn) {
    removeImgBtn.addEventListener("click", function () {
      pendingProductImage = null;
      if (document.getElementById("productImageInput")) {
          document.getElementById("productImageInput").value = "";
      }
      document.getElementById("productImagePreview").innerHTML = iconSvg("box");
    });
  }

  const variantsInput = document.getElementById("productVariants");
  if (variantsInput) {
    variantsInput.addEventListener("input", function () {
      const variantsArr = this.value.split(',').map(v => v.trim()).filter(v => v.length > 0);
      renderVariantImageUploaders(variantsArr);
    });
  }
}

function openProductModal(productId) {
  editingProductId = productId;
  pendingProductImage = null;
  pendingVariantImages = {}; 
  populateCategorySelect();

  const modal = document.getElementById("productModal");
  const title = document.getElementById("productModalTitle");
  const form = document.getElementById("productForm");
  form.reset();

  const preview = document.getElementById("productImagePreview");

  if (productId) {
    const p = Store.getProduct(productId);
    title.textContent = "تعديل المنتج";
    document.getElementById("productName").value = p.name;
    document.getElementById("productDescription").value = p.description;
    document.getElementById("productPrice").value = p.price;
    document.getElementById("productCategorySelect").value = p.categoryId;
    document.getElementById("productStock").value = p.stock;
    
    document.getElementById("productAvailable").checked = p.available;
    document.getElementById("productFeatured").checked = !!p.featured;
    document.getElementById("productNew").checked = !!p.isNew;
    if (document.getElementById("productOffer")) document.getElementById("productOffer").checked = !!p.isOffer; 
    
    pendingProductImage = p.image || null;
    preview.innerHTML = p.image ? '<img src="' + p.image + '">' : iconSvg("box");

    pendingVariantImages = p.variantImages ? Object.assign({}, p.variantImages) : {};
    if(document.getElementById("productVariants")) {
        const variantsStr = p.variants && p.variants.length > 0 ? p.variants.join(", ") : "";
        document.getElementById("productVariants").value = variantsStr;
        const variantsArr = variantsStr.split(',').map(v => v.trim()).filter(v => v.length > 0);
        renderVariantImageUploaders(variantsArr);
    }
  } else {
    title.textContent = "إضافة منتج جديد";
    document.getElementById("productAvailable").checked = true;
    preview.innerHTML = iconSvg("box");
    
    if(document.getElementById("productVariants")) {
        document.getElementById("productVariants").value = "";
        renderVariantImageUploaders([]);
    }
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
  
  const cleanVariantImages = {};
  variantsArr.forEach(v => {
      if(pendingVariantImages[v]) cleanVariantImages[v] = pendingVariantImages[v];
  });

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
    variantImages: cleanVariantImages,
    image: pendingProductImage
  };

  if (!data.name || !data.categoryId) {
    showToast("يرجى تعبئة اسم المنتج واختيار القسم");
    return;
  }

  if (editingProductId) {
    Store.updateProduct(editingProductId, data);
    showToast("تم تحديث المنتج");
  } else {
    Store.addProduct(data);
    showToast("تمت إضافة المنتج");
  }

  closeProductModal();
  renderProductsTable();
  renderStats();
}

/* ---------------------------------------------------------------------- */
/* الأقسام                                                                 */
/* ---------------------------------------------------------------------- */

function renderCategoriesTable() {
  const tbody = document.getElementById("categoriesTableBody");
  if (!tbody) return;
  const categories = Store.getCategories();
  const products = Store.getProducts();

  if (!categories.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--ink-300);">لا توجد أقسام</td></tr>';
    return;
  }

  tbody.innerHTML = categories.map(function (c) {
    const count = products.filter(function (p) { return p.categoryId === c.id; }).length;
    const img = c.image ? '<img src="' + c.image + '">' : '<div class="admin-table-icon">' + iconSvg(c.icon || "box") + "</div>";
    
    const parent = c.parentId ? categories.find(function(x) { return x.id === c.parentId; }) : null;
    const displayName = parent 
        ? c.name + '<br><small style="color:#888;">↳ فرعي من: ' + parent.name + '</small>' 
        : '<strong>' + c.name + '</strong>';

    return (
      "<tr>" +
        "<td>" + img + "</td>" +
        "<td>" + displayName + "</td>" +
        "<td>" + count + " منتج</td>" +
        '<td class="row-actions">' +
          '<button class="btn-icon btn-sm" title="تعديل" onclick="openCategoryModal(\'' + c.id + '\')">' + iconSvg("edit") + "</button>" +
          '<button class="btn-icon btn-sm" title="حذف" onclick="deleteCategoryConfirm(\'' + c.id + '\')">' + iconSvg("trash") + "</button>" +
        "</td>" +
      "</tr>"
    );
  }).join("");
}

function deleteCategoryConfirm(id) {
  const category = Store.getCategories().find(function (c) { return c.id === id; });
  if (!category) return;
  const productsInCat = Store.getProducts().filter(function (p) { return p.categoryId === id; }).length;
  const msg = productsInCat
    ? 'يوجد ' + productsInCat + ' منتج مرتبط بقسم "' + category.name + '". حذف القسم لن يحذف المنتجات لكنها ستبقى بدون قسم ظاهر. المتابعة؟'
    : 'هل تريد حذف القسم "' + category.name + '"؟';
  if (confirm(msg)) {
    Store.deleteCategory(id);
    renderCategoriesTable();
    populateCategorySelect();
    renderStats();
    showToast("تم حذف القسم");
  }
}

function populateIconPicker() {
  const wrap = document.getElementById("categoryIconPicker");
  if (!wrap) return;
  wrap.innerHTML = CATEGORY_ICON_KEYS.map(function (key) {
    return '<label class="icon-choice"><input type="radio" name="categoryIcon" value="' + key + '">' +
      '<span>' + iconSvg(key) + "</span></label>";
  }).join("");
}

function wireCategoryModal() {
  const addBtn = document.getElementById("addCategoryBtn");
  if (addBtn) addBtn.addEventListener("click", function () { openCategoryModal(null); });
  const closeBtn = document.getElementById("closeCategoryModal");
  if (closeBtn) closeBtn.addEventListener("click", closeCategoryModal);
  const form = document.getElementById("categoryForm");
  if (form) form.addEventListener("submit", saveCategoryForm);

  const imageInput = document.getElementById("categoryImageInput");
  if (imageInput) {
    imageInput.addEventListener("change", async function () {
      const file = imageInput.files[0];
      if (!file) return;

      try {
        showToast("جاري رفع صورة القسم...");
        const imageUrl = await uploadToImgBB(file, false);
        pendingCategoryImage = imageUrl;
        const preview = document.getElementById("categoryImagePreview");
        if (preview) preview.innerHTML = '<img src="' + imageUrl + '">';
        showToast("تم الرفع بنجاح!");
      } catch (error) {
        console.error("Upload Error:", error);
        showToast("فشل رفع الصورة.");
      }
    });
  }

  const removeImgBtn = document.getElementById("removeCategoryImageBtn");
  if (removeImgBtn) {
    removeImgBtn.addEventListener("click", function () {
      pendingCategoryImage = null;
      if (document.getElementById("categoryImageInput")) {
          document.getElementById("categoryImageInput").value = "";
      }
      document.getElementById("categoryImagePreview").innerHTML = iconSvg("box");
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
  const nameInput = document.getElementById("categoryName");

  let parentContainer = document.getElementById("categoryParentContainer");
  if (!parentContainer) {
    parentContainer = document.createElement("div");
    parentContainer.id = "categoryParentContainer";
    parentContainer.style.marginTop = "15px";
    parentContainer.innerHTML = '<label style="display:block;margin-bottom:5px;">يتبع لقسم (اختياري - لجعله قسم فرعي)</label><select id="categoryParent" style="width:100%;padding:10px;border-radius:8px;border:1px solid #ddd;"></select>';
    nameInput.parentNode.insertBefore(parentContainer, nameInput.nextSibling);
  }

  const parentSelect = document.getElementById("categoryParent");
  const allCats = Store.getCategories();
  
  parentSelect.innerHTML = '<option value="">-- قسم رئيسي مستقل --</option>' +
    allCats.filter(function(c) { return c.id !== categoryId && !c.parentId; })
           .map(function(c) { return '<option value="' + c.id + '">' + c.name + '</option>'; }).join("");

  if (categoryId) {
    const c = allCats.find(function (cc) { return cc.id === categoryId; });
    title.textContent = "تعديل القسم";
    nameInput.value = c.name;
    parentSelect.value = c.parentId || "";
    pendingCategoryImage = c.image || null;
    
    if (preview) preview.innerHTML = c.image ? '<img src="' + c.image + '">' : iconSvg(c.icon || "box");
    const radio = form.querySelector('input[name="categoryIcon"][value="' + c.icon + '"]');
    if (radio) radio.checked = true;
  } else {
    title.textContent = "إضافة قسم جديد";
    parentSelect.value = "";
    if (preview) preview.innerHTML = iconSvg("box");
    const first = form.querySelector('input[name="categoryIcon"]');
    if (first) first.checked = true;
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
  const iconInput = document.querySelector('input[name="categoryIcon"]:checked');
  const icon = iconInput ? iconInput.value : "box";

  if (!name) { showToast("يرجى إدخال اسم القسم"); return; }

  if (editingCategoryId) {
    Store.updateCategory(editingCategoryId, { name: name, image: pendingCategoryImage, icon: icon, parentId: parentId });
    showToast("تم تحديث القسم");
  } else {
    Store.addCategory({ name: name, image: pendingCategoryImage, icon: icon, parentId: parentId });
    showToast("تمت إضافة القسم");
  }

  closeCategoryModal();
  renderCategoriesTable();
  populateCategorySelect();
}

/* ---------------------------------------------------------------------- */
/* الإعلانات                                                               */
/* ---------------------------------------------------------------------- */

function renderAdsTable() {
  const tbody = document.getElementById("adsTableBody");
  if (!tbody) return;
  
  const ads = Store.getAds().sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!ads.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--ink-300);">لا توجد إعلانات حالياً</td></tr>';
    return;
  }

  tbody.innerHTML = ads.map(function (ad) {
    const img = ad.image ? '<img src="' + ad.image + '" style="width:80px;height:40px;border-radius:4px;object-fit:cover;">' : '<div class="admin-table-icon">' + iconSvg("image") + "</div>";
    const link = ad.link ? '<a href="' + ad.link + '" target="_blank" style="color:var(--olive-700);text-decoration:underline;">عرض الرابط</a>' : '-';
    
    return (
      "<tr>" +
        "<td>" + img + "</td>" +
        "<td>" + link + "</td>" +
        "<td>" + (ad.order || 0) + "</td>" +
        '<td class="row-actions">' +
          '<button class="btn-icon btn-sm" title="حذف" onclick="deleteAdConfirm(\'' + ad.id + '\')">' + iconSvg("trash") + "</button>" +
        "</td>" +
      "</tr>"
    );
  }).join("");
}

function deleteAdConfirm(id) {
  if (confirm('هل تريد حذف هذا الإعلان؟')) {
    Store.deleteAd(id);
    renderAdsTable();
    showToast("تم حذف الإعلان");
  }
}

function wireAdModal() {
  const addBtn = document.getElementById("addAdBtn");
  if (addBtn) addBtn.addEventListener("click", function () { openAdModal(); });
  
  const closeBtn = document.getElementById("closeAdModal");
  if (closeBtn) closeBtn.addEventListener("click", closeAdModal);
  
  const form = document.getElementById("adForm");
  if (form) form.addEventListener("submit", saveAdForm);

  const imageInput = document.getElementById("adImageInput");
  if (imageInput) {
    imageInput.addEventListener("change", async function () {
      const file = imageInput.files[0];
      if (!file) return;
      try {
        showToast("جاري رفع الإعلان بدقة عالية واحترافية...");
        const imageUrl = await uploadToImgBB(file, true);
        pendingAdImage = imageUrl;
        const preview = document.getElementById("adImagePreview");
        if (preview) preview.innerHTML = '<img src="' + imageUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
        showToast("تم رفع الإعلان بنجاح!");
      } catch (error) {
        console.error("Upload Error:", error);
        showToast("فشل رفع الصورة.");
      }
    });
  }

  const removeImgBtn = document.getElementById("removeAdImageBtn");
  if (removeImgBtn) {
    removeImgBtn.addEventListener("click", function () {
      pendingAdImage = null;
      if (document.getElementById("adImageInput")) {
          document.getElementById("adImageInput").value = "";
      }
      const preview = document.getElementById("adImagePreview");
      if(preview) preview.innerHTML = "";
    });
  }
}

function openAdModal() {
  pendingAdImage = null;
  const modal = document.getElementById("adModal");
  const form = document.getElementById("adForm");
  if(form) form.reset();
  
  const preview = document.getElementById("adImagePreview");
  if (preview) preview.innerHTML = "";
  
  if(modal) modal.classList.add("open");
}

function closeAdModal() {
  const modal = document.getElementById("adModal");
  if(modal) modal.classList.remove("open");
}

function saveAdForm(e) {
  e.preventDefault();
  if (!pendingAdImage) {
      showToast("يرجى رفع صورة للإعلان");
      return;
  }
  
  const data = {
    link: document.getElementById("adLink") ? document.getElementById("adLink").value.trim() : "",
    order: document.getElementById("adOrder") ? Number(document.getElementById("adOrder").value) : 0,
    image: pendingAdImage
  };

  Store.addAd(data);
  showToast("تمت إضافة الإعلان بنجاح");
  closeAdModal();
  renderAdsTable();
}

/* ---------------------------------------------------------------------- */
/* سجلّ الطلبات                                                           */
/* ---------------------------------------------------------------------- */

function renderOrdersTable() {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;
  const orders = Store.getOrders();

  if (!orders.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--ink-300);">لا توجد طلبات مسجّلة بعد</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(function (o) {
    const date = new Date(o.date).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
    const summary = o.items.map(function (it) { return it.name + " ×" + it.qty; }).join("، ");
    return (
      "<tr>" +
        "<td>" + date + "</td>" +
        "<td>" + (o.type === "cart" ? "سلة كاملة" : "منتج واحد") + "</td>" +
        "<td>" + summary + "</td>" +
        "<td>" + formatPrice(o.total) + "</td>" +
      "</tr>"
    );
  }).join("");
}

/* ---------------------------------------------------------------------- */
/* إعدادات المتجر                                                         */
/* ---------------------------------------------------------------------- */

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
      if (newPassword.length < 4) {
        showToast("كلمة المرور الجديدة قصيرة جدًا (4 أحرف على الأقل)");
        return;
      }
      if (newPassword !== confirmPassword) {
        showToast("كلمتا المرور غير متطابقتين");
        return;
      }
      patch.adminPassword = newPassword;
    }

    Store.saveSettings(patch);
    form.newPassword.value = "";
    form.confirmPassword.value = "";
    showToast("تم حفظ الإعدادات بنجاح");
  });
}

document.addEventListener("DOMContentLoaded", initAdminPage);
