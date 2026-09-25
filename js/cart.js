/* ==========================================================================
   cart.js
   منطق صفحة السلة (cart.html) فقط — محمي بالتحقق من وجود #cartItems حتى
   يمكن تضمين الملف بأمان دون أن يؤثر على صفحات أخرى.
   ========================================================================== */

function cartLineHtml(line, product) {
  // استخدام صورة الخيار (النكهة) إذا وجدت، وإلا صورة المنتج الأساسية
  const mediaUrl = (product.variantImages && line.variant && product.variantImages[line.variant])
    ? product.variantImages[line.variant]
    : product.image;

  const media = mediaUrl
    ? '<img src="' + mediaUrl + '" alt="' + product.name + '">'
    : '<div class="placeholder-icon-wrap">' + iconSvg(
        (Store.getCategories().find(function (c) { return c.id === product.categoryId; }) || {}).icon || "paw"
      ) + "</div>";

  // إضافة اسم الخيار (النكهة) بجانب اسم المنتج لتمييزه في السلة
  const displayName = product.name + (line.variant ? ' <span style="color:var(--olive-600); font-size: 0.85em;">(' + line.variant + ')</span>' : '');

  return (
    '<div class="cart-item" data-id="' + line.itemKey + '">' +
      media +
      '<div>' +
        "<h4>" + displayName + "</h4>" +
        '<div class="unit-price">' + formatPrice(product.price) + " / قطعة</div>" +
        '<button type="button" class="remove-btn" onclick="removeCartLine(\'' + line.itemKey + '\')">إزالة من السلة</button>' +
      "</div>" +
      '<div class="qty-stepper">' +
        '<button type="button" onclick="stepCartQty(\'' + line.itemKey + '\', -1)">−</button>' +
        '<input type="number" min="1" max="' + product.stock + '" value="' + line.qty + '" ' +
          'onchange="setCartQty(\'' + line.itemKey + '\', this.value)">' +
        '<button type="button" onclick="stepCartQty(\'' + line.itemKey + '\', 1)">+</button>' +
      "</div>" +
      '<div class="price">' + formatPrice(product.price * line.qty) + "</div>" +
    "</div>"
  );
}

function renderCartPage() {
  const listEl = document.getElementById("cartItems");
  if (!listEl) return;

  const cart = Store.getCart();
  const products = Store.getProducts();

  const rows = [];
  let subtotal = 0;
  let itemCount = 0;
  let hasUnavailable = false;

  cart.forEach(function (line) {
    const product = products.find(function (p) { return p.id === line.productId; });
    if (!product) return;
    if (!product.available || product.stock <= 0) hasUnavailable = true;
    const qty = Math.min(line.qty, Math.max(product.stock, 1));
    subtotal += product.price * qty;
    itemCount += qty;
    rows.push(cartLineHtml(Object.assign({}, line, { qty: qty }), product));
  });

  if (!rows.length) {
    listEl.innerHTML = '<div class="empty-state">' + iconSvg("cart") +
      "<p>سلتك فارغة حاليًا.</p>" +
      '<a href="products.html" class="btn btn-primary">تصفح المنتجات</a></div>';
  } else {
    listEl.innerHTML = rows.join("");
  }

  const subtotalEl = document.getElementById("cartSubtotal");
  const totalEl = document.getElementById("cartTotal");
  const countEl = document.getElementById("cartItemCount");
  const checkoutBtn = document.getElementById("checkoutBtn");
  const warningEl = document.getElementById("cartWarning");

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl) totalEl.textContent = formatPrice(subtotal);
  if (countEl) countEl.textContent = itemCount;
  if (checkoutBtn) checkoutBtn.disabled = rows.length === 0;
  if (warningEl) {
    warningEl.style.display = hasUnavailable ? "block" : "none";
  }
}

function stepCartQty(itemKey, delta) {
  const cart = Store.getCart();
  const line = cart.find(function (l) { return l.itemKey === itemKey; });
  if (!line) return;
  const product = Store.getProduct(line.productId);
  if (!product) return;
  const next = Math.max(1, Math.min(product.stock, line.qty + delta));
  Store.setQty(itemKey, next);
  renderCartPage();
}

function setCartQty(itemKey, value) {
  const cart = Store.getCart();
  const line = cart.find(function (l) { return l.itemKey === itemKey; });
  if (!line) return;
  const product = Store.getProduct(line.productId);
  if (!product) return;
  let qty = parseInt(value, 10) || 1;
  qty = Math.max(1, Math.min(product.stock, qty));
  Store.setQty(itemKey, qty);
  renderCartPage();
}

function removeCartLine(itemKey) {
  Store.removeFromCart(itemKey);
  renderCartPage();
}

function initCartPage() {
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (!checkoutBtn) return;
  checkoutBtn.addEventListener("click", function () {
    if (!Store.getCart().length) return;
    orderCartViaWhatsApp();
    showToast("تم فتح واتساب لإتمام الطلب");
    setTimeout(renderCartPage, 300);
  });
  renderCartPage();
}

document.addEventListener("DOMContentLoaded", initCartPage);
document.addEventListener("cart:updated", renderCartPage);
