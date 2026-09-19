/* ==========================================================================
   cart.js
   منطق صفحة السلة (cart.html) فقط — محمي بالتحقق من وجود #cartItems حتى
   يمكن تضمين الملف بأمان دون أن يؤثر على صفحات أخرى.
   ========================================================================== */

function cartLineHtml(line, product) {
  const media = product.image
    ? '<img src="' + product.image + '" alt="' + product.name + '">'
    : '<div class="placeholder-icon-wrap">' + iconSvg(
        (Store.getCategories().find(function (c) { return c.id === product.categoryId; }) || {}).icon || "paw"
      ) + "</div>";

  return (
    '<div class="cart-item" data-id="' + product.id + '">' +
      media +
      '<div>' +
        "<h4>" + product.name + "</h4>" +
        '<div class="unit-price">' + formatPrice(product.price) + " / قطعة</div>" +
        '<button type="button" class="remove-btn" onclick="removeCartLine(\'' + product.id + '\')">إزالة من السلة</button>' +
      "</div>" +
      '<div class="qty-stepper">' +
        '<button type="button" onclick="stepCartQty(\'' + product.id + '\', -1)">−</button>' +
        '<input type="number" min="1" max="' + product.stock + '" value="' + line.qty + '" ' +
          'onchange="setCartQty(\'' + product.id + '\', this.value)">' +
        '<button type="button" onclick="stepCartQty(\'' + product.id + '\', 1)">+</button>' +
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

function stepCartQty(productId, delta) {
  const cart = Store.getCart();
  const line = cart.find(function (l) { return l.productId === productId; });
  const product = Store.getProduct(productId);
  if (!line || !product) return;
  const next = Math.max(1, Math.min(product.stock, line.qty + delta));
  Store.setQty(productId, next);
  renderCartPage();
}

function setCartQty(productId, value) {
  const product = Store.getProduct(productId);
  if (!product) return;
  let qty = parseInt(value, 10) || 1;
  qty = Math.max(1, Math.min(product.stock, qty));
  Store.setQty(productId, qty);
  renderCartPage();
}

function removeCartLine(productId) {
  Store.removeFromCart(productId);
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
