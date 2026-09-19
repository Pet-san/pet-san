/* ==========================================================================
   whatsapp.js
   تنسيق العملة (دينار عراقي) + بناء روابط واتساب مع نافذة معلومات التوصيل
   ========================================================================== */

function formatPrice(amount) {
  const symbol = (Store.getSettings().currencySymbol) || "د.ع";
  const num = Number(amount) || 0;
  return num.toLocaleString("en-US") + " " + symbol;
}

function whatsappDigitsOnly(number) {
  return String(number || "").replace(/[^0-9]/g, "");
}

// --- نظام نافذة معلومات التوصيل المنبثقة ---
function showDeliveryModal(onConfirm) {
  let modal = document.getElementById("deliveryModal");
  
  // إنشاء النافذة إذا لم تكن موجودة مسبقاً في الصفحة
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "deliveryModal";
    modal.className = "modal-overlay";
    modal.innerHTML =
      '<div class="modal-card" style="max-width: 400px;">' +
        '<div class="modal-head">' +
          '<h3 style="margin:0;">معلومات التوصيل</h3>' +
          '<button class="close-modal" id="closeDeliveryModal" type="button">' + iconSvg("close") + '</button>' +
        '</div>' +
        '<p style="font-size: .85rem; margin-top: -10px; margin-bottom: 20px;">يرجى إدخال عنوانك لإكمال الطلب عبر واتساب.</p>' +
        '<form id="deliveryForm">' +
          '<div class="field"><label>المحافظة</label><input type="text" id="delGov" placeholder="مثال: بغداد" required></div>' +
          '<div class="field"><label>المنطقة</label><input type="text" id="delArea" placeholder="مثال: المنصور" required></div>' +
          '<div class="field"><label>أقرب نقطة دالة (اختياري)</label><input type="text" id="delLandmark" placeholder="مثال: قرب مول المنصور"></div>' +
          '<button type="submit" class="btn btn-whatsapp btn-block" style="margin-top:20px;">تأكيد وإرسال عبر واتساب</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);

    // زر إغلاق النافذة
    document.getElementById("closeDeliveryModal").addEventListener("click", function() {
      modal.classList.remove("open");
    });
  }

  // تصفير الحقول في كل مرة تفتح فيها النافذة
  document.getElementById("delGov").value = "";
  document.getElementById("delArea").value = "";
  document.getElementById("delLandmark").value = "";

  const form = document.getElementById("deliveryForm");
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  // إظهار النافذة
  modal.classList.add("open");

  // عند الضغط على تأكيد
  newForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const info = {
      gov: document.getElementById("delGov").value.trim(),
      area: document.getElementById("delArea").value.trim(),
      landmark: document.getElementById("delLandmark").value.trim() || "لا يوجد"
    };
    modal.classList.remove("open"); // إخفاء النافذة
    onConfirm(info); // إرسال البيانات لتوليد رابط الواتساب
  });
}

// بناء رسالة منتج واحد
function buildProductWhatsAppLink(product, qty, info) {
  const quantity = Math.max(1, qty || 1);
  const total = product.price * quantity;
  const productUrl = location.origin + location.pathname.replace(/[^/]*$/, "") + "product.html?id=" + product.id;

  const lines = [
  "👋 السلام عليكم، أود طلب هذا المنتج:",
  "",
  "📦 *تفاصيل الطلب:*",
  "▪️ اسم المنتج: *" + product.name + "*",
  "▪️ الكمية: " + quantity,
  "▪️ السعر: *" + formatPrice(total) + "* (غير شامل أجور التوصيل)",
  "🔗 رابط المنتج: " + productUrl,
  "",
  "📍 *معلومات التوصيل:*",
  "▪️ المحافظة: *" + info.gov + "*",
  "▪️ المنطقة: *" + info.area + "*",
  "▪️ أقرب نقطة دالة: " + info.landmark,
  "",
  "أنتظر تأكيدكم لإتمام الطلب، شكراً لكم! 🐾"
];

  return buildWhatsAppUrl(lines.join("\n"));
}

// بناء رسالة السلة كاملة
function buildCartWhatsAppLink(cartLines, products, info) {
const messageLines = [
    "👋 السلام عليكم، أود طلب هذه المنتجات من السلة:",
    "",
    "🛒 *تفاصيل الطلب:*"
  ];

  let total = 0;
  cartLines.forEach(function (line) {
    const p = products.find(function (x) { return x.id === line.productId; });
    if (p) {
      messageLines.push("▪️ *" + p.name + "* (الكمية: " + line.qty + ")");
      total += p.price * line.qty;
    }
  });

  messageLines.push("");
  messageLines.push("💰 *السعر الإجمالي:* *" + formatPrice(total) + "* (غير شامل أجور التوصيل)");
  messageLines.push("");
  messageLines.push("📍 *معلومات التوصيل:*");
  messageLines.push("▪️ المحافظة: *" + info.gov + "*");
  messageLines.push("▪️ المنطقة: *" + info.area + "*");
  messageLines.push("▪️ أقرب نقطة دالة: " + info.landmark);
  messageLines.push("");
  messageLines.push("أنتظر تأكيدكم لإتمام الطلب، شكراً لكم! 🐾");

  return buildWhatsAppUrl(messageLines.join("\n"));
}

function buildWhatsAppUrl(message) {
  const number = whatsappDigitsOnly(Store.getSettings().whatsapp);
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}

// تعديل دالة الطلب لمنتج واحد لتعرض النافذة أولاً
function orderSingleProductViaWhatsApp(product, qty) {
  showDeliveryModal(function(info) {
    Store.logOrder({
      type: "single",
      items: [{ productId: product.id, name: product.name, qty: qty, price: product.price }],
      total: product.price * qty
    });
    window.open(buildProductWhatsAppLink(product, qty, info), "_blank");
  });
}

// تعديل دالة الطلب للسلة لتعرض النافذة أولاً
function orderCartViaWhatsApp() {
  const cart = Store.getCart();
  if (!cart.length) return;
  const products = Store.getProducts();

  showDeliveryModal(function(info) {
    const items = cart.map(function (line) {
      const p = products.find(function (pp) { return pp.id === line.productId; });
      return p ? { productId: p.id, name: p.name, qty: line.qty, price: p.price } : null;
    }).filter(Boolean);

    const total = items.reduce(function (sum, it) { return sum + it.price * it.qty; }, 0);

    Store.logOrder({ type: "cart", items: items, total: total });

    window.open(buildCartWhatsAppLink(cart, products, info), "_blank");
    Store.clearCart();
  });
}
