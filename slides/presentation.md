---
name: slidev
description: Create and present web-based slides for developers using Markdown, Vue components, code highlighting, animations, and interactive features. Use when building technical presentations, conference talks, or teaching materials.
---

---

theme: default
title: آگاهی وضعیتی در میدان نبرد
author: محمدرضا منتظری شاتوری
info: |

## پایان‌نامه کارشناسی ارشد

**استاد راهنما:** مهندس اشکان مقدسی

**بهمن ۱۴۰۴**
highlighter: shiki
lineNumbers: false
transition: slide-left
aspectRatio: 16/9
canvasWidth: 980
htmlAttrs:
dir: rtl
lang: fa
defaults:
layout: default
fonts:
sans: Vazirmatn
serif: Vazirmatn
mono: Fira Code
themeConfig:
primary: '#1e3a5f'
secondary: '#2c5282'

---

# آگاهی وضعیتی در میدان نبرد

<div class="text-center mt-8">
  <p class="text-xl opacity-80">طراحی و پیاده‌سازی سامانه بومی آگاهی وضعیتی تاکتیکی</p>
  
  <div class="mt-12">
    <p class="text-lg">محمدرضا منتظری شاتوری</p>
    <p class="text-base opacity-70 mt-2">استاد راهنما: مهندس اشکان مقدسی</p>
    <p class="text-base opacity-70 mt-1">بهمن ۱۴۰۴</p>
  </div>
</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# چالش‌های میدان نبرد

<div class="flex justify-center items-center h-40">
  <mdi-alert-circle class="text-8xl text-red-500 animate-pulse" />
</div>

---

# چالش‌های کلیدی

<v-clicks>

<div class="flex items-center gap-4 mb-4">
  <mdi-database-alert class="text-4xl text-blue-500" />
  <span class="text-xl">حجم عظیم داده‌های بلادرنگ</span>
</div>

<div class="flex items-center gap-4 mb-4">
  <mdi-share-variant class="text-4xl text-green-500" />
  <span class="text-xl">مدیریت و توزیع اطلاعات</span>
</div>

<div class="flex items-center gap-4 mb-4">
  <mdi-help-circle class="text-4xl text-yellow-500" />
  <span class="text-xl">سردرگمی و خطای تصمیم‌گیری</span>
</div>

<div class="flex items-center gap-4 mb-4">
  <mdi-shield-alert class="text-4xl text-red-500" />
  <span class="text-xl">تلفات خودی (Friendly Fire)</span>
</div>

<div class="flex items-center gap-4 mb-4">
  <mdi-lan-disconnect class="text-4xl text-purple-500" />
  <span class="text-xl">محدودیت استفاده از سامانه‌های خارجی</span>
</div>

</v-clicks>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# آگاهی وضعیتی چیست؟

<div class="flex justify-center items-center h-40">
  <mdi-brain class="text-8xl text-blue-500 animate-bounce" />
</div>

---

# تعریف آگاهی وضعیتی

<div class="grid grid-cols-2 gap-8">

<div v-click>

## <mdi-eye class="inline text-blue-500" /> درک (Perception)

درک عناصر محیطی در زمان و مکان

</div>

<div v-click>

## <mdi-lightbulb class="inline text-yellow-500" /> فهم (Comprehension)

فهم معنای اطلاعات و ارتباطات

</div>

</div>

<div v-click class="mt-8 text-center">

## <mdi-crystal-ball class="inline text-purple-500" /> پیش‌بینی (Projection)

پیش‌بینی وضعیت آینده بر اساس تحلیل

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
h2 {
  text-align: right;
}
</style>

---

## layout: two-cols

# هدف تحقیق

## طراحی و پیاده‌سازی سامانه بومی

<v-clicks>

- <mdi-check-circle class="text-green-500" /> معماری غیرمتمرکز
- <mdi-check-circle class="text-green-500" /> پشتیبانی از لینک‌های رادیویی ناپایدار
- <mdi-check-circle class="text-green-500" /> تعامل‌پذیری با سامانه‌های نظامی

</v-clicks>

::right::

<div class="flex justify-center items-center h-full">
  <mdi-bullseye-arrow class="text-9xl text-blue-600" />
</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# نیازمندی‌های سامانه

<div class="flex justify-center items-center h-40">
  <mdi-clipboard-list class="text-8xl text-green-500" />
</div>

---

# نیازمندی‌های عملکردی

<v-clicks>

<div class="grid grid-cols-2 gap-6">

<div class="flex items-center gap-3 p-4 bg-blue-100 dark:bg-blue-900 rounded-lg">
  <mdi-map-marker-account class="text-3xl text-blue-600" />
  <span>ردیابی نیروهای خودی (BFT)</span>
</div>

<div class="flex items-center gap-3 p-4 bg-green-100 dark:bg-green-900 rounded-lg">
  <mdi-draw class="text-3xl text-green-600" />
  <span>ترسیم تاکتیکی</span>
</div>

<div class="flex items-center gap-3 p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
  <mdi-message-text class="text-3xl text-purple-600" />
  <span>پیام‌رسانی متنی</span>
</div>

<div class="flex items-center gap-3 p-4 bg-orange-100 dark:bg-orange-900 rounded-lg">
  <mdi-satellite-uplink class="text-3xl text-orange-600" />
  <span>اتصال به حسگرها</span>
</div>

<div class="flex items-center gap-3 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
  <mdi-alert class="text-3xl text-red-600" />
  <span>هشداردهی و اعلام اضطرار</span>
</div>

<div class="flex items-center gap-3 p-4 bg-teal-100 dark:bg-teal-900 rounded-lg">
  <mdi-layers class="text-3xl text-teal-600" />
  <span>مدیریت لایه‌ها</span>
</div>

</div>

</v-clicks>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# نیازمندی‌های غیرعملکردی

<v-clicks>

<div class="flex justify-around items-center mt-12">

<div class="text-center">
  <mdi-lan class="text-6xl text-blue-500 mb-2" />
  <p class="text-lg font-bold">عملکرد غیرمتمرکز</p>
</div>

<div class="text-center">
  <mdi-speedometer class="text-6xl text-green-500 mb-2" />
  <p class="text-lg font-bold">کارایی بالا</p>
</div>

<div class="text-center">
  <mdi-shield-check class="text-6xl text-purple-500 mb-2" />
  <p class="text-lg font-bold">قابلیت اطمینان</p>
</div>

<div class="text-center">
  <mdi-lock class="text-6xl text-red-500 mb-2" />
  <p class="text-lg font-bold">امنیت</p>
</div>

<div class="text-center">
  <mdi-cellphone-link class="text-6xl text-orange-500 mb-2" />
  <p class="text-lg font-bold">قابلیت حمل</p>
</div>

</div>

</v-clicks>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# معماری شبکه

<div class="flex justify-center items-center h-40">
  <mdi-sitemap class="text-8xl text-indigo-500" />
</div>

---

# سطوح معماری شبکه

<div class="space-y-6">

<div v-click class="flex items-center gap-6 p-6 bg-gradient-to-l from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-xl">
  <div class="text-4xl font-bold text-blue-600">۱</div>
  <div>
    <h3 class="text-xl font-bold">زیرشبکه‌های تاکتیکی</h3>
    <p class="opacity-80">دسته/گروهان - ارتباط Peer-to-Peer / Broadcast</p>
  </div>
  <mdi-account-group class="text-5xl text-blue-500 ml-auto" />
</div>

<div v-click class="flex items-center gap-6 p-6 bg-gradient-to-l from-green-100 to-green-50 dark:from-green-900 dark:to-green-800 rounded-xl">
  <div class="text-4xl font-bold text-green-600">۲</div>
  <div>
    <h3 class="text-xl font-bold">گره‌های سرگروه</h3>
    <p class="opacity-80">تجمیع و مسیریابی اطلاعات</p>
  </div>
  <mdi-server-network class="text-5xl text-green-500 ml-auto" />
</div>

<div v-click class="flex items-center gap-6 p-6 bg-gradient-to-l from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-800 rounded-xl">
  <div class="text-4xl font-bold text-purple-600">۳</div>
  <div>
    <h3 class="text-xl font-bold">مرکز فرماندهی</h3>
    <p class="opacity-80">دید کامل و آرشیو داده‌ها</p>
  </div>
  <mdi-domain class="text-5xl text-purple-500 ml-auto" />
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: two-cols

# اجزای نرم‌افزاری

## تکنولوژی‌های اصلی

<div v-click class="mb-6">

### <logos-go class="inline" /> بک‌اند

**زبان Go**

- کارایی بالا
- پشتیبانی از همزمانی
- قابلیت اطمینان

</div>

<div v-click class="mb-6">

### <logos-vue class="inline" /> فرانت‌اند

**فریم‌ورک Vue.js**

- رابط کاربری تعاملی
- عملکرد بهینه
- پشتیبانی از RTL

</div>

::right::

<div class="flex flex-col justify-center items-center h-full gap-8">
  <logos-go class="text-8xl" />
  <mdi-arrow-down-thick class="text-4xl opacity-50" />
  <logos-vue class="text-8xl" />
</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# پروتکل‌ها و استانداردها

<div class="flex justify-center items-center h-40">
  <mdi-web class="text-8xl text-teal-500" />
</div>

---

# پروتکل‌های ارتباطی

<div class="grid grid-cols-2 gap-8">

<div v-click class="p-6 bg-yellow-50 dark:bg-yellow-900 rounded-xl">
  <h3 class="flex items-center gap-2 text-xl font-bold mb-4">
    <mdi-access-point-network class="text-yellow-600" />
    UDP
  </h3>
  <ul class="space-y-2">
    <li>استاندارد TAK</li>
    <li>Unicast</li>
    <li>Broadcast</li>
    <li>Multicast</li>
  </ul>
</div>

<div v-click class="p-6 bg-orange-50 dark:bg-orange-900 rounded-xl">
  <h3 class="flex items-center gap-2 text-xl font-bold mb-4">
    <mdi-message-processing class="text-orange-600" />
    RabbitMQ
  </h3>
  <ul class="space-y-2">
    <li>صف‌بندی پیام‌ها</li>
    <li>قابلیت اطمینان بالا</li>
    <li>مسیریابی پیشرفته</li>
  </ul>
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
ul {
  text-align: right;
}
</style>

---

# پروتکل CoT

<div class="text-center mb-8">
  <h2 class="text-3xl font-bold text-blue-600">Cursor on Target</h2>
  <p class="text-lg opacity-80 mt-2">استاندارد پیام‌رسانی XML</p>
</div>

<v-clicks>

<div class="flex justify-center items-center gap-4 text-xl">
  <div class="px-6 py-3 bg-blue-100 dark:bg-blue-900 rounded-lg">چیست؟</div>
  <mdi-arrow-left class="text-2xl" />
  <div class="px-6 py-3 bg-green-100 dark:bg-green-900 rounded-lg">کجاست؟</div>
  <mdi-arrow-left class="text-2xl" />
  <div class="px-6 py-3 bg-purple-100 dark:bg-purple-900 rounded-lg">کی؟</div>
</div>

<div class="mt-8 text-center">
  <p class="text-lg font-bold mb-4">ساختار پیام:</p>
  <div class="inline-flex gap-4 px-8 py-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
    <span class="px-3 py-1 bg-blue-200 dark:bg-blue-800 rounded">UID</span>
    <span class="px-3 py-1 bg-green-200 dark:bg-green-800 rounded">Type</span>
    <span class="px-3 py-1 bg-yellow-200 dark:bg-yellow-800 rounded">Time</span>
    <span class="px-3 py-1 bg-purple-200 dark:bg-purple-800 rounded">Point</span>
    <span class="px-3 py-1 bg-red-200 dark:bg-red-800 rounded">Detail</span>
  </div>
</div>

</v-clicks>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# استاندارد MIL-STD-2525

<div class="flex items-center justify-between">

<div class="flex-1">

<v-clicks>

- <mdi-check class="text-green-500" /> نمادهای نظامی ناتو
- <mdi-check class="text-green-500" /> نیروهای خودی، دشمن، غیرنظامی
- <mdi-check class="text-green-500" /> تسریع درک اطلاعات

</v-clicks>

</div>

<div class="flex-1 flex justify-center">
  <mdi-map-marker-radius class="text-9xl text-blue-500" />
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# یکپارچه‌سازی حسگرها

<div class="flex justify-center items-center h-40">
  <mdi-chip class="text-8xl text-cyan-500" />
</div>

---

# حسگرهای پشتیبانی شده

<div class="grid grid-cols-3 gap-6">

<div v-click class="text-center p-6 bg-blue-50 dark:bg-blue-900 rounded-xl">
  <mdi-satellite-variant class="text-6xl text-blue-500 mb-4" />
  <h3 class="text-xl font-bold mb-2">GPS</h3>
  <p class="opacity-80">اتصال به gpsd</p>
</div>

<div v-click class="text-center p-6 bg-teal-50 dark:bg-teal-900 rounded-xl">
  <mdi-ferry class="text-6xl text-teal-500 mb-4" />
  <h3 class="text-xl font-bold mb-2">AIS</h3>
  <p class="opacity-80">ردیابی شناورها</p>
</div>

<div v-click class="text-center p-6 bg-purple-50 dark:bg-purple-900 rounded-xl">
  <mdi-radar class="text-6xl text-purple-500 mb-4" />
  <h3 class="text-xl font-bold mb-2">رادار</h3>
  <p class="opacity-80">نمایش اهداف</p>
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# سرویس‌ها و زیرساخت

<div class="flex justify-center items-center h-40">
  <mdi-cogs class="text-8xl text-gray-500" />
</div>

---

# سرویس‌های بک‌اند

<v-clicks>

<div class="grid grid-cols-2 gap-4">

<div class="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
  <mdi-router-wireless class="text-4xl text-blue-500" />
  <div>
    <h3 class="font-bold">CoT Router</h3>
    <p class="text-sm opacity-70">مسیریابی پیام‌ها</p>
  </div>
</div>

<div class="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
  <mdi-web class="text-4xl text-green-500" />
  <div>
    <h3 class="font-bold">Web Server</h3>
    <p class="text-sm opacity-70">سرویس وب</p>
  </div>
</div>

<div class="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
  <mdi-crosshairs-gps class="text-4xl text-purple-500" />
  <div>
    <h3 class="font-bold">Tracking Service</h3>
    <p class="text-sm opacity-70">ردیابی</p>
  </div>
</div>

<div class="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
  <mdi-shield-account class="text-4xl text-orange-500" />
  <div>
    <h3 class="font-bold">Auth Service</h3>
    <p class="text-sm opacity-70">احراز هویت</p>
  </div>
</div>

<div class="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900 rounded-lg col-span-2">
  <mdi-sync class="text-4xl text-red-500" />
  <div>
    <h3 class="font-bold">Resend Service</h3>
    <p class="text-sm opacity-70">بازارسال پیام‌ها</p>
  </div>
</div>

</div>

</v-clicks>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# پایگاه داده

<div class="flex items-center gap-8">

<div class="flex-1">

<v-clicks>

<div class="flex items-center gap-3 mb-4">
  <mdi-database class="text-4xl text-blue-500" />
  <span class="text-xl font-bold">SQLite</span>
  <span class="opacity-70">- سبک و قابل حمل</span>
</div>

<div class="flex items-center gap-3 mb-4">
  <mdi-code-tags class="text-4xl text-green-500" />
  <span class="text-xl font-bold">GORM</span>
  <span class="opacity-70">- مدیریت پایگاه داده</span>
</div>

<div class="flex items-center gap-3 mb-4">
  <mdi-content-save class="text-4xl text-purple-500" />
  <span class="text-xl font-bold">ذخیره‌سازی:</span>
</div>

<ul class="mr-12 space-y-2">
  <li><mdi-check class="inline text-green-500" /> موقعیت‌ها</li>
  <li><mdi-check class="inline text-green-500" /> پیام‌ها</li>
  <li><mdi-check class="inline text-green-500" /> ترسیمات</li>
</ul>

</v-clicks>

</div>

<div class="flex-1 flex justify-center">
  <mdi-database-cog class="text-9xl text-gray-400" />
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# فرانت‌اند

<div class="flex justify-around items-center mt-8">

<div v-click class="text-center">
  <logos-vue class="text-8xl mb-4" />
  <h3 class="text-xl font-bold">Vue.js 3</h3>
  <p class="opacity-70">Composition API</p>
</div>

<div v-click class="text-center">
  <logos-vitejs class="text-8xl mb-4" />
  <h3 class="text-xl font-bold">Vite</h3>
  <p class="opacity-70">Build Tool</p>
</div>

<div v-click class="text-center">
  <mdi-bootstrap class="text-8xl mb-4 text-purple-600" />
  <h3 class="text-xl font-bold">Bootstrap 5</h3>
  <p class="opacity-70">RTL فارسی</p>
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# نقشه و تجسم

<div class="flex justify-center items-center h-40">
  <mdi-map class="text-8xl text-green-500" />
</div>

---

# نقشه

<div class="grid grid-cols-2 gap-8">

<div v-click class="p-6 bg-blue-50 dark:bg-blue-900 rounded-xl">
  <h3 class="flex items-center gap-2 text-xl font-bold mb-4">
    <mdi-map-marker class="text-blue-600" />
    MapLibre GL JS
  </h3>
  <p>WebGL رندرینگ با کارایی بالا</p>
</div>

<div v-click class="p-6 bg-green-50 dark:bg-green-900 rounded-xl">
  <h3 class="flex items-center gap-2 text-xl font-bold mb-4">
    <mdi-server class="text-green-600" />
    Tileserver
  </h3>
  <p>نقشه آفلاین (PMTiles)</p>
</div>

</div>

<div v-click class="mt-8 text-center p-4 bg-purple-50 dark:bg-purple-900 rounded-xl">
  <mdi-layers-triple class="inline text-3xl text-purple-600 mr-2" />
  <span class="text-xl">لایه‌های قابل فیلتر</span>
</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# Docker

<div class="flex items-center justify-center gap-12">

<div v-click class="text-center">
  <mdi-docker class="text-9xl text-blue-500" />
</div>

<div class="text-right">

<v-clicks>

- <mdi-check-circle class="text-green-500 inline" /> کانتینری‌سازی کامل
- <mdi-check-circle class="text-green-500 inline" /> Docker Compose برای استقرار
- <mdi-check-circle class="text-green-500 inline" /> حذف وابستگی‌ها

</v-clicks>

</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# تست و ارزیابی

<div class="flex justify-center items-center h-40">
  <mdi-test-tube class="text-8xl text-pink-500" />
</div>

---

# تست: شبیه‌سازی حرکت

<div class="flex items-center gap-8">

<div class="flex-1">

<v-clicks>

<div class="mb-6">
  <h3 class="flex items-center gap-2 text-xl font-bold">
    <mdi-ferry class="text-blue-500" />
    OpenCPN
  </h3>
  <p class="opacity-70 mr-8">نرم‌افزار ناوبری</p>
</div>

<div class="mb-6">
  <h3 class="flex items-center gap-2 text-xl font-bold">
    <mdi-plug class="text-green-500" />
    ShipDriver
  </h3>
  <p class="opacity-70 mr-8">افزونه شبیه‌سازی</p>
</div>

<div>
  <h3 class="flex items-center gap-2 text-xl font-bold">
    <mdi-check-circle class="text-purple-500" />
    تست زنجیره
  </h3>
  <p class="opacity-70 mr-8">حسگر تا نقشه</p>
</div>

</v-clicks>

</div>

<div class="flex-1 flex justify-center">
  <mdi-map-marker-path class="text-9xl text-gray-400" />
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# تست: ارتباطات

<div class="flex justify-center gap-8 mt-8">

<div v-click class="text-center p-6 bg-blue-50 dark:bg-blue-900 rounded-xl">
  <mdi-access-point-network class="text-6xl text-blue-500 mb-4" />
  <h3 class="text-xl font-bold">Multicast</h3>
  <p class="opacity-70">TAK استاندارد</p>
</div>

<div v-click class="text-center p-6 bg-green-50 dark:bg-green-900 rounded-xl">
  <mdi-access-point class="text-6xl text-green-500 mb-4" />
  <h3 class="text-xl font-bold">Broadcast</h3>
  <p class="opacity-70">جایگزین</p>
</div>

<div v-click class="text-center p-6 bg-purple-50 dark:bg-purple-900 rounded-xl">
  <mdi-laptop class="text-6xl text-purple-500 mb-4" />
  <h3 class="text-xl font-bold">Multi-Platform</h3>
  <p class="opacity-70">Linux / Windows / Docker</p>
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# تست: سناریوی اضطراری

<v-clicks>

<div class="flex items-center gap-4 mb-6 p-4 bg-red-50 dark:bg-red-900 rounded-lg">
  <mdi-alert-octagon class="text-4xl text-red-500" />
  <span class="text-xl">اعلام وضعیت اضطراری</span>
</div>

<div class="flex items-center gap-4 mb-6 p-4 bg-yellow-50 dark:bg-yellow-900 rounded-lg">
  <mdi-map-marker-alert class="text-4xl text-yellow-500" />
  <span class="text-xl">تغییر نماد و هشدار</span>
</div>

<div class="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
  <mdi-eye-check class="text-4xl text-green-500" />
  <span class="text-xl">مشاهده موقعیت و لغو</span>
</div>

</v-clicks>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: section

# نتایج و دستاوردها

<div class="flex justify-center items-center h-40">
  <mdi-trophy class="text-8xl text-yellow-500" />
</div>

---

# نتایج و دستاوردها

<v-clicks>

<div class="grid grid-cols-2 gap-6">

<div class="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900 rounded-lg">
  <mdi-clock-fast class="text-4xl text-blue-500" />
  <span class="text-lg">آگاهی وضعیتی بلادرنگ</span>
</div>

<div class="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900 rounded-lg">
  <mdi-earth-remove class="text-4xl text-green-500" />
  <span class="text-lg">استقلال از زیرساخت خارجی</span>
</div>

<div class="flex items-center gap-4 p-4 bg-purple-50 dark:bg-purple-900 rounded-lg">
  <mdi-handshake class="text-4xl text-purple-500" />
  <span class="text-lg">تعامل‌پذیری با CoT</span>
</div>

<div class="flex items-center gap-4 p-4 bg-orange-50 dark:bg-orange-900 rounded-lg">
  <mdi-satellite-uplink class="text-4xl text-orange-500" />
  <span class="text-lg">یکپارچه‌سازی حسگرها</span>
</div>

<div class="flex items-center gap-4 p-4 bg-teal-50 dark:bg-teal-900 rounded-lg col-span-2">
  <mdi-earth class="text-4xl text-teal-500" />
  <span class="text-lg">رابط کاربری فارسی</span>
</div>

</div>

</v-clicks>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# مزایای سامانه

<div class="flex justify-center gap-6 mt-8">

<div v-click class="text-center p-6 bg-red-50 dark:bg-red-900 rounded-xl w-64">
  <mdi-brain class="text-6xl text-red-500 mb-4" />
  <h3 class="text-lg font-bold mb-2">کاهش خطا</h3>
  <p class="opacity-70">خطای تصمیم‌گیری</p>
</div>

<div v-click class="text-center p-6 bg-green-50 dark:bg-green-900 rounded-xl w-64">
  <mdi-shield-check class="text-6xl text-green-500 mb-4" />
  <h3 class="text-lg font-bold mb-2">جلوگیری</h3>
  <p class="opacity-70">از آتش خودی</p>
</div>

<div v-click class="text-center p-6 bg-blue-50 dark:bg-blue-900 rounded-xl w-64">
  <mdi-account-group class="text-6xl text-blue-500 mb-4" />
  <h3 class="text-lg font-bold mb-2">بهبود</h3>
  <p class="opacity-70">هماهنگی یگان‌ها</p>
</div>

<div v-click class="text-center p-6 bg-purple-50 dark:bg-purple-900 rounded-xl w-64">
  <mdi-heart-pulse class="text-6xl text-purple-500 mb-4" />
  <h3 class="text-lg font-bold mb-2">افزایش</h3>
  <p class="opacity-70">ایمنی نیروها</p>
</div>

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

# مقایسه با سامانه‌های مشابه

<div class="flex justify-center">

| <mdi-flag class="inline" /> سامانه | <mdi-earth class="inline" /> کشور            |
| ---------------------------------- | -------------------------------------------- |
| TAK                                | <span class="text-blue-500">آمریکا</span>    |
| FBCB2/JBC-P                        | <span class="text-blue-500">آمریکا</span>    |
| SICS                               | <span class="text-green-500">فرانسه</span>   |
| SitaWare                           | <span class="text-red-500">دانمارک</span>    |
| Delta                              | <span class="text-yellow-500">اوکراین</span> |

</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

## layout: two-cols

# نتیجه‌گیری

<v-clicks>

- <mdi-check-circle class="text-green-500" /> سامانه آگاهی وضعیتی بومی
- <mdi-check-circle class="text-green-500" /> معماری مقیاس‌پذیر
- <mdi-check-circle class="text-green-500" /> استانداردهای باز
- <mdi-check-circle class="text-green-500" /> رابط کاربری فارسی

</v-clicks>

<div v-click class="mt-8">

## <mdi-rocket-launch class="inline text-purple-500" /> کارهای آینده

- نسخه موبایل
- هوش مصنوعی

</div>

::right::

<div class="flex justify-center items-center h-full">
  <mdi-checkbox-marked-circle-outline class="text-9xl text-green-500" />
</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: right;
}
</style>

---

layout: center
class: text-center

---

# تشکر

<div class="mt-12">
  <p class="text-3xl font-bold mb-8">محمدرضا منتظری شاتوری</p>
  
  <div class="space-y-4 text-xl">
    <p><mdi-account-tie class="inline" /> <strong>استاد راهنما:</strong> مهندس اشکان مقدسی</p>
    <p><mdi-calendar class="inline" /> بهمن ۱۴۰۴</p>
  </div>
</div>

<div class="mt-16">
  <mdi-handshake class="text-6xl text-blue-500 animate-bounce" />
</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: center;
}
</style>

---

## layout: end

# پایان

<div class="flex justify-center items-center h-64">
  <mdi-flag-checkered class="text-9xl text-green-500" />
</div>

<style>
.slidev-layout {
  direction: rtl;
  text-align: center;
}
</style>
