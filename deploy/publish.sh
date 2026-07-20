#!/bin/bash
# ============================================================
#  publish.sh — أمر واحد من Replit Shell لرفع الكود ونشره
#
#  الاستخدام:
#    bash deploy/publish.sh
#    bash deploy/publish.sh "رسالة الكوميت"
# ============================================================
set -e

MSG="${1:-تحديث تلقائي $(date '+%Y-%m-%d %H:%M')}"

echo "📦 تجميع الملفات..."
git add -A

# لا تفعل شيئاً إذا لا يوجد تغييرات
if git diff --cached --quiet; then
  echo "✅ لا توجد تغييرات جديدة."
  exit 0
fi

echo "💾 حفظ التغييرات: $MSG"
git commit -m "$MSG"

echo "🚀 رفع الكود إلى GitHub..."
git push origin main

echo ""
echo "✅ تم الرفع بنجاح."
echo "   GitHub Actions سيبدأ النشر على السيرفر تلقائياً."
echo "   تابع التقدم على: https://github.com/$(git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/\.git$//')/actions"
