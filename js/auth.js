/* ==========================================================================
   auth.js (النسخة المدعومة بـ Firebase Authentication)
   ========================================================================== */

function initLoginPage() {
  const form = document.getElementById("loginForm");
  const errorBox = document.getElementById("loginError");

  if (!form) return;

  // التحقق: إذا كان الأدمن مسجل الدخول بالفعل، انقله فوراً للوحة التحكم
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      window.location.href = "admin.html";
    }
  });

  // عند الضغط على زر "دخول"
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    // إرسال الطلب لفايربيس للتحقق
    firebase.auth().signInWithEmailAndPassword(email, password)
      .then(function(userCredential) {
        // تم تسجيل الدخول بنجاح! سيتم توجيهك تلقائياً عبر الكود بالأعلى
      })
      .catch(function(error) {
        // في حال أخطأت في البريد أو كلمة المرور
        if (errorBox) {
          errorBox.textContent = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
          errorBox.style.display = "block";
        }
      });
  });
}

// حارس المسار — لمنع الغرباء من فتح لوحة التحكم
function requireAdminAuth() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) {
      // إذا لم يكن مسجلاً، اطرده لصفحة تسجيل الدخول
      window.location.href = "login.html";
    }
  });
  return true;
}

// دالة تسجيل الخروج
function handleAdminLogout() {
  firebase.auth().signOut().then(function() {
    window.location.href = "login.html";
  });
}

document.addEventListener("DOMContentLoaded", initLoginPage);
