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
      
      // إزالة https://
      let cleanPath = rawUrl.replace(/^https?:\/\//i, "");
      
      // إزالة i.ibb.co/ لأنها مضبوطة كـ Origin مسبقاً
      if (cleanPath.startsWith("i.ibb.co/")) {
        cleanPath = cleanPath.replace("i.ibb.co/", "");
      }
      
      // تحديد المعاملات
      const transform = isBanner
        ? "tr:w-1400,q-95,e-sharpen-12,f-auto"
        : "tr:w-900,max_bytes-100000,e-sharpen-8,f-auto";

      // إرجاع رابط الـ CDN مباشرة دون العودة إلى ImgBB
      return `${imageKitEndpoint}/${transform}/${cleanPath}`;

    } else {
      throw new Error(data.error.message);
    }
}
