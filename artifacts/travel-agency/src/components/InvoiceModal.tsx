import { useRef } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAgency } from "@/hooks/use-agency";
import { statusAr } from "@/lib/i18n";

interface InvoiceBooking {
  id: number;
  clientName: string | null;
  packageName: string | null;
  travelDate?: string;
  departureDate?: string;
  returnDate?: string;
  totalPrice: number;
  numberOfPersons?: number;
  status: string;
  notes?: string | null;
  bookingType?: string | null;
}

interface Props {
  booking: InvoiceBooking | null;
  open: boolean;
  onClose: () => void;
}

const BOOKING_TYPE_AR: Record<string, string> = {
  hotel: "فندقي", flight: "طيران", hotel_flight: "فندق + طيران",
};

export function InvoiceModal({ booking, open, onClose }: Props) {
  const { settings } = useAgency();
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML ?? "";
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8" />
        <title>فاتورة #${booking?.id}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; background: #fff; color: #1a1a1a; padding: 40px; }
          .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #c9a227; padding-bottom: 20px; margin-bottom: 28px; }
          .agency-info h1 { font-size: 22px; font-weight: 700; color: #1a1200; }
          .agency-info p { font-size: 12px; color: #666; margin-top: 2px; }
          .invoice-meta { text-align: left; }
          .invoice-meta .inv-title { font-size: 28px; font-weight: 800; color: #c9a227; letter-spacing: 1px; }
          .invoice-meta .inv-num { font-size: 14px; color: #444; margin-top: 4px; }
          .invoice-meta .inv-date { font-size: 12px; color: #666; }
          .section { margin-bottom: 24px; }
          .section-title { font-size: 13px; font-weight: 700; color: #c9a227; text-transform: uppercase; letter-spacing: .5px; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 12px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .field label { font-size: 11px; color: #888; display: block; margin-bottom: 2px; }
          .field span { font-size: 14px; font-weight: 600; color: #111; }
          .total-box { background: #fffbef; border: 2px solid #c9a227; border-radius: 10px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-top: 16px; }
          .total-box .label { font-size: 15px; font-weight: 600; color: #555; }
          .total-box .amount { font-size: 28px; font-weight: 800; color: #c9a227; }
          .status-badge { display: inline-block; padding: 3px 12px; border-radius: 20px; font-size: 12px; font-weight: 700; }
          .status-confirmed { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-cancelled { background: #fee2e2; color: #991b1b; }
          .status-completed { background: #dbeafe; color: #1e40af; }
          .notes-box { background: #f9f9f9; border-right: 3px solid #c9a227; padding: 10px 14px; border-radius: 6px; font-size: 13px; color: #444; line-height: 1.7; }
          .footer { margin-top: 40px; border-top: 1px solid #eee; padding-top: 16px; text-align: center; font-size: 11px; color: #aaa; }
          .logo-img { max-height: 64px; object-fit: contain; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); win.close(); }, 300);
  };

  if (!booking) return null;

  const dateLabel = booking.departureDate || booking.travelDate;
  const statusClass = `status-${booking.status}`;

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0" dir="rtl">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30 sticky top-0 z-10">
          <span className="font-semibold">فاتورة الحجز #{booking.id}</span>
          <div className="flex gap-2">
            <Button onClick={handlePrint} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
              <Printer className="h-4 w-4" /> طباعة
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={printRef} className="p-8">
          {/* Header */}
          <div className="invoice-header flex justify-between items-start border-b-2 border-amber-500 pb-5 mb-7">
            <div className="agency-info">
              {settings.agencyLogoUrl && (
                <img src={settings.agencyLogoUrl} alt={settings.agencyName} className="logo-img h-14 object-contain mb-2" />
              )}
              <h1 className="text-xl font-bold text-gray-900">{settings.agencyName}</h1>
              {settings.agencyNameEn && <p className="text-xs text-gray-500">{settings.agencyNameEn}</p>}
              {settings.agencyPhone && <p className="text-xs text-gray-500 mt-1">📞 {settings.agencyPhone}</p>}
              {settings.agencyEmail && <p className="text-xs text-gray-500">✉ {settings.agencyEmail}</p>}
              {settings.agencyAddress && <p className="text-xs text-gray-500">📍 {settings.agencyAddress}</p>}
            </div>
            <div className="text-left">
              <div className="text-3xl font-extrabold text-amber-600 tracking-wide">فاتورة</div>
              <div className="text-sm text-gray-600 mt-1">رقم: <strong>#{booking.id}</strong></div>
              <div className="text-xs text-gray-400 mt-0.5">التاريخ: {format(new Date(), "d MMMM yyyy", { locale: ar })}</div>
              <div className="mt-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  booking.status === "confirmed" ? "bg-green-100 text-green-800" :
                  booking.status === "pending" ? "bg-amber-100 text-amber-800" :
                  booking.status === "cancelled" ? "bg-red-100 text-red-800" :
                  "bg-blue-100 text-blue-800"
                }`}>{statusAr(booking.status)}</span>
              </div>
            </div>
          </div>

          {/* Client Section */}
          <div className="mb-6">
            <div className="section-title text-amber-700 font-bold text-xs uppercase border-b border-gray-100 pb-1.5 mb-3">بيانات العميل</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">اسم العميل</div>
                <div className="text-base font-bold">{booking.clientName}</div>
              </div>
              {booking.numberOfPersons && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">عدد المسافرين</div>
                  <div className="text-base font-bold">{booking.numberOfPersons} مسافر</div>
                </div>
              )}
            </div>
          </div>

          {/* Trip Section */}
          <div className="mb-6">
            <div className="section-title text-amber-700 font-bold text-xs uppercase border-b border-gray-100 pb-1.5 mb-3">تفاصيل الرحلة</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">الباقة السياحية</div>
                <div className="text-sm font-semibold">{booking.packageName}</div>
              </div>
              {booking.bookingType && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">نوع الحجز</div>
                  <div className="text-sm font-semibold">{BOOKING_TYPE_AR[booking.bookingType] ?? booking.bookingType}</div>
                </div>
              )}
              {dateLabel && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">تاريخ الانطلاق</div>
                  <div className="text-sm font-semibold">{format(new Date(dateLabel), "d MMMM yyyy", { locale: ar })}</div>
                </div>
              )}
              {booking.returnDate && (
                <div>
                  <div className="text-xs text-gray-400 mb-0.5">تاريخ العودة</div>
                  <div className="text-sm font-semibold">{format(new Date(booking.returnDate), "d MMMM yyyy", { locale: ar })}</div>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="mb-6">
              <div className="section-title text-amber-700 font-bold text-xs uppercase border-b border-gray-100 pb-1.5 mb-3">ملاحظات</div>
              <div className="bg-gray-50 border-r-4 border-amber-400 px-4 py-3 rounded text-sm text-gray-600 leading-relaxed">{booking.notes}</div>
            </div>
          )}

          {/* Total */}
          <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-6 py-4 flex items-center justify-between mt-2">
            <div className="text-base font-semibold text-gray-600">المبلغ الإجمالي</div>
            <div className="text-3xl font-extrabold text-amber-600">{booking.totalPrice.toLocaleString()} <span className="text-lg">$</span></div>
          </div>

          {/* Footer */}
          <div className="mt-10 border-t border-gray-100 pt-4 text-center text-xs text-gray-300">
            شكراً لاختياركم {settings.agencyName} — نتمنى لكم رحلة سعيدة وممتعة
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
