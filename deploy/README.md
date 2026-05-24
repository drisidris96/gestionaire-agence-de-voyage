# دليل النشر على VPS — buydriss.co.uk

نشر النظام مباشرة على Node.js + PM2 + Nginx + PostgreSQL (بدون Docker).

## 📋 المتطلبات

- خادم VPS بنظام **Ubuntu 22.04 أو 24.04**
- وصول **root** عبر SSH
- دومين **buydriss.co.uk** مربوط بـ IP الخادم (سجل A في DNS)

---

## 🚀 الخطوات

### 1️⃣ إعداد الخادم لأول مرة

من جهازك المحلي، انسخ مجلد `deploy/` إلى الخادم:

```bash
scp -r deploy/ root@buydriss.co.uk:/root/
ssh root@buydriss.co.uk
cd /root/deploy
bash setup-server.sh
```

السكريبت سيقوم بـ:
- تثبيت Node.js 24 + pnpm + PM2
- تثبيت Nginx + Certbot
- تثبيت PostgreSQL وإنشاء قاعدة البيانات
- إنشاء مجلدات التطبيق وملف `.env`
- إعداد جدار حماية UFW
- إعداد Nginx

### 2️⃣ تفعيل HTTPS (شهادة SSL مجانية)

بعد التأكد من أن DNS يشير للخادم:

```bash
sudo certbot --nginx -d buydriss.co.uk -d www.buydriss.co.uk
```

### 3️⃣ نشر التطبيق من جهازك المحلي

```bash
bash deploy/deploy.sh
```

السكريبت سيقوم تلقائياً بـ:
- توليد كود API + فحص الأنواع
- بناء الـ API والـ Frontend
- رفع الملفات عبر rsync
- إعادة تشغيل PM2 و Nginx

### 4️⃣ تشغيل قاعدة البيانات (مرة واحدة فقط)

على الخادم، طبّق الـ schema:

```bash
ssh root@buydriss.co.uk
cd /tmp
# انسخ الـ schema من الجهاز المحلي أولاً عبر:
# scp -r lib/db root@buydriss.co.uk:/tmp/
cd /tmp/db
DATABASE_URL="postgresql://atlas:كلمة_السر@127.0.0.1:5432/atlas_travel" pnpm install
DATABASE_URL="postgresql://atlas:كلمة_السر@127.0.0.1:5432/atlas_travel" pnpm run push
```

### 5️⃣ تفعيل تشغيل PM2 تلقائياً عند إعادة تشغيل الخادم

```bash
ssh root@buydriss.co.uk
pm2 startup systemd
pm2 save
```

---

## 🔄 النشر بعد كل تحديث

```bash
bash deploy/deploy.sh
```

## 📊 مراقبة الخادم

```bash
ssh root@buydriss.co.uk

# حالة API
pm2 status
pm2 logs atlas-api --lines 100

# حالة Nginx
systemctl status nginx
tail -f /var/log/nginx/access.log

# حالة قاعدة البيانات
systemctl status postgresql
sudo -u postgres psql atlas_travel
```

## 🆘 استكشاف الأخطاء

| المشكلة | الحل |
|---------|------|
| الموقع لا يفتح | `systemctl status nginx` + `pm2 status` |
| خطأ 502 Bad Gateway | API متوقف: `pm2 restart atlas-api` |
| خطأ في DB | تحقق من `DATABASE_URL` في `/var/www/atlas-travel/api/.env` |
| HTTPS لا يعمل | `certbot renew --dry-run` |

## 📁 هيكل الملفات على الخادم

```
/var/www/atlas-travel/
├── api/
│   ├── dist/             # كود API المبني
│   └── .env              # متغيرات البيئة (DATABASE_URL...)
├── public/               # ملفات الـ Frontend الثابتة (HTML/JS/CSS)
├── uploads/              # الشعارات والملفات المرفوعة
└── ecosystem.config.cjs  # إعدادات PM2
```
