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
          '<div class="field"><label>رقم الهاتف</label><input type="tel" id="delPhone" placeholder="مثال: 07700000000" required></div>' +
          '<button type="submit" class="btn btn-whatsapp btn-block" style="margin-top:20px;">تأكيد وإرسال عبر واتساب</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);

    document.getElementById("closeDeliveryModal").addEventListener("click", function() {
      modal.classList.remove("open");
    });
  }

  document.getElementById("delGov").value = "";
  document.getElementById("delArea").value = "";
  document.getElementById("delLandmark").value = "";
  document.getElementById("delPhone").value = "";

  const form = document.getElementById("deliveryForm");
  const newForm = form.cloneNode(true);
  form.parentNode.replaceChild(newForm, form);

  modal.classList.add("open");

  newForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const info = {
      gov: document.getElementById("delGov").value.trim(),
      area: document.getElementById("delArea").value.trim(),
      landmark: document.getElementById("delLandmark").value.trim() || "لا يوجد",
      phone: document.getElementById("delPhone").value.trim()
    };
    modal.classList.remove("open"); 
    onConfirm(info); 
  });
}

function buildProductWhatsAppLink(product, qty, info) {
  const quantity = Math.max(1, qty || 1);
  const total = product.price * quantity;
 
  const lines = [
  "👋 السلام عليكم، أود طلب هذا المنتج:",
  "",
  "📦 *تفاصيل الطلب:*",
  "▪️ اسم المنتج: *" + product.name + "*",
  "▪️ الكمية: " + quantity,
  "▪️ السعر: *" + formatPrice(total) + "* (غير شامل أجور التوصيل)",
  "",
  "📍 *معلومات التوصيل:*",
  "▪️ المحافظة: *" + info.gov + "*",
  "▪️ المنطقة: *" + info.area + "*",
  "▪️ أقرب نقطة دالة: " + info.landmark,
  "▪️ رقم الهاتف: *" + info.phone + "*",
  "",
  "أنتظر تأكيدكم لإتمام الطلب، شكراً لكم! 🐾"
];

  return buildWhatsAppUrl(lines.join("\n"));
}

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
  messageLines.push("▪️ رقم الهاتف: *" + info.phone + "*");
  messageLines.push("");
  messageLines.push("أنتظر تأكيدكم لإتمام الطلب، شكراً لكم! 🐾");

  return buildWhatsAppUrl(messageLines.join("\n"));
}

function buildWhatsAppUrl(message) {
  const number = whatsappDigitsOnly(Store.getSettings().whatsapp);
  return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
}

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
