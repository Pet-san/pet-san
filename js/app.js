/* ==========================================================================
   app.js
   منطق مشترك بين كل صفحات المتجر: رسم الهيدر والفوتر ديناميكيًا من الإعدادات
   المخزّنة، القائمة على الجوال، عداد السلة، ورسائل التوست. يجب تحميله بعد
   config.js + icons.js + store.js + whatsapp.js في كل صفحة.
   ========================================================================== */

const NAV_LINKS = [
  { href: "index.html", label: "الرئيسية", key: "home" },
  { href: "products.html", label: "المنتجات", key: "products" },
  { href: "products.html#categories", label: "الأقسام", key: "categories" },
  { href: "about.html", label: "من نحن", key: "about" },
  { href: "contact.html", label: "تواصل معنا", key: "contact" }
];

function renderHeader() {
  const mount = document.getElementById("site-header");
  if (!mount) return;
  const active = mount.dataset.active || "";
  const settings = Store.getSettings();

  const navHtml = NAV_LINKS.map(function (link) {
    const isActive = link.key === active ? " active" : "";
    return '<a href="' + link.href + '" class="' + isActive.trim() + '">' + link.label + "</a>";
  }).join("");

  mount.innerHTML =
    '<header class="site-header">' +
      '<div class="container header-inner">' +
        '<a href="index.html" class="brand">' +
          '<img src="assets/logo/logo.png" alt="' + settings.storeName + '">' +
          '<span class="brand-name">' + settings.storeName + '<span>' + settings.storeTagline + "</span></span>" +
        "</a>" +
        '<nav class="main-nav" id="mainNav">' + navHtml + "</nav>" +
        '<div class="header-actions">' +
          '<a href="cart.html" class="btn-icon cart-link" aria-label="السلة" title="السلة">' +
            iconSvg("cart") +
            '<span class="cart-count" id="cartCount">0</span>' +
          "</a>" +
          
          '<button class="btn-icon nav-toggle" id="navToggle" aria-label="القائمة">' + iconSvg("menu") + "</button>" +
        "</div>" +
      "</div>" +
    "</header>";

  fixRelativePaths(mount);
  initMobileNav();
}

function renderFooter() {
  const mount = document.getElementById("site-footer");
  if (!mount) return;
  const settings = Store.getSettings();
  const categories = Store.getCategories().slice(0, 5);

  const catLinks = categories.map(function (c) {
    return '<li><a href="products.html?cat=' + c.id + '">' + c.name + "</a></li>";
  }).join("");

  mount.innerHTML =
    '<footer class="site-footer">' +
      '<div class="container">' +
        '<div class="footer-grid">' +
          '<div>' +
            '<div class="footer-brand"><img src="assets/logo/logo.png" alt="' + settings.storeName + '"><strong>' + settings.storeName + "</strong></div>" +
            "<p>" + settings.storeDescription + "</p>" +
          "</div>" +
          '<div><h4>روابط سريعة</h4><ul>' +
            '<li><a href="index.html">الرئيسية</a></li>' +
            '<li><a href="products.html">المنتجات</a></li>' +
            '<li><a href="about.html">من نحن</a></li>' +
            '<li><a href="contact.html">تواصل معنا</a></li>' +
          "</ul></div>" +
          '<div><h4>الأقسام</h4><ul>' + catLinks + "</ul></div>" +
          '<div><h4>تواصل معنا</h4><ul>' +
            '<li><a href="tel:' + settings.phone + '">' + settings.phone + "</a></li>" +
            '<li><a href="https://wa.me/' + whatsappDigitsOnly(settings.whatsapp) + '" target="_blank" rel="noopener">واتساب</a></li>' +
            '<li><a href="' + settings.instagram + '" target="_blank" rel="noopener">انستغرام</a></li>' +
            "<li>" + settings.address + "</li>" +
          "</ul></div>" +
        "</div>" +
      "<div class='footer-bottom' style='padding: 20px 15px; margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; flex-direction: column; align-items: center; gap: 8px; font-size: 0.85rem; color: rgba(255,255,255,0.7);'>" +
      "<span>&copy; " + new Date().getFullYear() + " " + settings.storeName + " - جميع الحقوق محفوظة.</span>" +
      "<span style='font-size: 0.8rem; opacity: 0.8;'>تصميم وتطوير | <a href='https://instagram.com/az_6ui' target='_blank' style='color: var(--olive-400); font-weight: bold; text-decoration: none;'>م. أمير (az_6ui)</a> | واتساب: <a href='https://wa.me/9647813623682' target='_blank' style='color: var(--olive-400); font-weight: bold; text-decoration: none;' dir='ltr'>+964 781 362 3682</a></span>" +
      "</div>" +
      "</div>" +
      "</footer>";
}

function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;
  toggle.addEventListener("click", function () {
    nav.classList.toggle("open");
    toggle.innerHTML = nav.classList.contains("open") ? iconSvg("close") : iconSvg("menu");
  });
  nav.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () {
      nav.classList.remove("open");
      toggle.innerHTML = iconSvg("menu");
    });
  });
}

function updateCartBadge() {
  const el = document.getElementById("cartCount");
  if (!el) return;
  const count = Store.cartCount();
  el.textContent = count;
  el.style.display = count > 0 ? "flex" : "none";
}

function showToast(message) {
  let toast = document.getElementById("appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
}

function fixRelativePaths(scope) { /* no-op: flat file structure */ }

document.addEventListener("DOMContentLoaded", function () {
  renderHeader();
  renderFooter();
  updateCartBadge();
});
document.addEventListener("cart:updated", updateCartBadge);
