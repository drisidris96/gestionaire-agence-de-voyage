import { useState } from "react";
import { useListBookings, useListPayments, getListPaymentsQueryKey } from "@workspace/api-client-react";
import { useAgency } from "@/hooks/use-agency";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Printer, FileText, Receipt, Search, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { methodAr, statusAr } from "@/lib/i18n";

function PrintArea({ children }: { children: React.ReactNode }) {
  return (
    <div id="print-area" className="bg-white min-h-[800px] rounded-xl border shadow-lg p-8 w-full max-w-[780px] mx-auto print:shadow-none print:border-none print:rounded-none print:p-6">
      {children}
    </div>
  );
}

function AgencyHeader({ docType, docNumber, agency }: {
  docType: string;
  docNumber: string;
  agency: { agencyName: string; agencyNameEn: string; agencyLogoUrl?: string | null; agencyPhone?: string | null; agencyEmail?: string | null; agencyAddress?: string | null };
}) {
  const logoSrc = agency.agencyLogoUrl || "/logo.jpg";
  return (
    <div className="mb-6">
      <div className="flex items-start justify-between border-b-2 border-primary pb-5 mb-4" style={{ borderColor: "#C9A227" }}>
        <div className="flex items-center gap-4">
          <img
            src={logoSrc}
            alt={agency.agencyName}
            className="h-20 w-auto object-contain rounded"
            onError={(e) => { (e.target as HTMLImageElement).src = "/logo.jpg"; }}
          />
          <div>
            <div className="text-xl font-black tracking-tight" style={{ color: "#C9A227" }}>{agency.agencyName}</div>
            <div className="text-xs tracking-widest text-gray-500 font-medium uppercase">{agency.agencyNameEn}</div>
            <div className="mt-1.5 space-y-0.5 text-[11px] text-gray-600">
              {agency.agencyPhone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {agency.agencyPhone}</div>}
              {agency.agencyEmail && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3" /> {agency.agencyEmail}</div>}
              {agency.agencyAddress && <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {agency.agencyAddress}</div>}
            </div>
          </div>
        </div>
        <div className="text-left rtl:text-right">
          <div className="inline-block border-2 rounded-lg px-4 py-2 text-center" style={{ borderColor: "#C9A227" }}>
            <div className="text-sm font-bold" style={{ color: "#C9A227" }}>{docType}</div>
            <div className="text-xs text-gray-500 mt-0.5">رقم: {docNumber}</div>
            <div className="text-xs text-gray-500">{format(new Date(), "d MMMM yyyy", { locale: ar })}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgencyFooter({ agency }: { agency: { agencyName: string; agencyNameEn: string } }) {
  return (
    <div className="mt-10 pt-4 border-t border-gray-200">
      <div className="grid grid-cols-2 gap-8 mt-6">
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-6">توقيع المسؤول</div>
          <div className="border-b-2 border-dashed border-gray-300 w-40"></div>
          <div className="text-xs text-gray-500 mt-1">{agency.agencyName}</div>
        </div>
        <div className="text-left rtl:text-right">
          <div className="text-sm font-semibold text-gray-700 mb-6">توقيع العميل</div>
          <div className="border-b-2 border-dashed border-gray-300 w-40 mr-auto rtl:ml-auto rtl:mr-0"></div>
          <div className="text-xs text-gray-500 mt-1">اسم العميل وتوقيعه</div>
        </div>
      </div>
      <div className="mt-6 text-center text-[10px] text-gray-400 border-t pt-3">
        شكراً لثقتكم بنا — {agency.agencyName} — {agency.agencyNameEn}
      </div>
    </div>
  );
}

const BOOKING_TYPE_AR: Record<string, string> = {
  hotel: "فندقي",
  flight: "طيران",
  hotel_flight: "فندق + طيران",
  other: "أخرى",
};

function InvoiceDoc({ booking, agency }: { booking: any; agency: any }) {
  const paidAmount = booking.paidAmount ?? 0;
  const remaining = booking.totalPrice - paidAmount;
  const serviceCost = Number(booking.serviceCost ?? 0);
  const profit = booking.totalPrice - serviceCost;
  const bookingTypeLabel = booking.bookingType === "other"
    ? (booking.customBookingType || "أخرى")
    : (BOOKING_TYPE_AR[booking.bookingType] ?? booking.bookingType ?? "—");

  return (
    <PrintArea>
      <AgencyHeader docType="فـاتـورة" docNumber={`INV-${String(booking.id).padStart(4, "0")}`} agency={agency} />
      <div className="bg-gray-50 rounded-lg p-4 mb-5 border-r-4" style={{ borderColor: "#C9A227" }}>
        <div className="text-sm font-bold text-gray-700 mb-2">بيانات العميل</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-500">الاسم: </span><span className="font-medium">{booking.clientName}</span></div>
          <div><span className="text-gray-500">رقم الحجز: </span><span className="font-medium">#{booking.id}</span></div>
        </div>
      </div>

      <table className="w-full text-sm mb-5 border-collapse">
        <thead>
          <tr style={{ backgroundColor: "#C9A227", color: "white" }}>
            <th className="p-2.5 text-right font-semibold rounded-tr-md">البيان</th>
            <th className="p-2.5 text-center font-semibold">التفاصيل</th>
            <th className="p-2.5 text-center font-semibold rounded-tl-md">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-gray-200">
            <td className="p-2.5 font-medium">نوع الحجز</td>
            <td className="p-2.5 text-center text-gray-600">{bookingTypeLabel}</td>
            <td className="p-2.5 text-center">—</td>
          </tr>
          {booking.travelDate && (
            <tr className="border-b border-gray-200 bg-gray-50/50">
              <td className="p-2.5 font-medium">تاريخ السفر</td>
              <td className="p-2.5 text-center text-gray-600">
                {format(new Date(booking.travelDate), "d MMMM yyyy", { locale: ar })}
                {booking.returnDate && ` ← ${format(new Date(booking.returnDate), "d MMMM yyyy", { locale: ar })}`}
              </td>
              <td className="p-2.5 text-center">—</td>
            </tr>
          )}
          <tr className="border-b border-gray-200">
            <td className="p-2.5 font-medium">عدد المسافرين</td>
            <td className="p-2.5 text-center text-gray-600">{booking.numberOfPersons} أشخاص</td>
            <td className="p-2.5 text-center">—</td>
          </tr>
          <tr className="border-b border-gray-200 bg-gray-50/50">
            <td className="p-2.5 font-medium">سعر الخدمة</td>
            <td className="p-2.5 text-center text-gray-600">التكلفة الإجمالية للخدمة</td>
            <td className="p-2.5 text-center font-medium text-red-600">{serviceCost > 0 ? `${serviceCost.toLocaleString()} $` : "—"}</td>
          </tr>
          <tr className="border-b border-gray-200" style={{ backgroundColor: "#C9A22710" }}>
            <td className="p-2.5 font-bold" colSpan={2}>المبلغ الإجمالي</td>
            <td className="p-2.5 text-center font-bold text-lg" style={{ color: "#C9A227" }}>{booking.totalPrice.toLocaleString()} $</td>
          </tr>
          <tr style={{ backgroundColor: "#f0fdf4" }}>
            <td className="p-2.5 font-bold">المدخول الكلي</td>
            <td className="p-2.5 text-center text-gray-500 text-xs">المبلغ الإجمالي − سعر الخدمة</td>
            <td className="p-2.5 text-center font-bold text-lg" style={{ color: "#16a34a" }}>{profit.toLocaleString()} $</td>
          </tr>
        </tbody>
      </table>

      <div className="border rounded-lg overflow-hidden mb-5">
        <div className="grid grid-cols-3 divide-x divide-x-reverse">
          <div className="p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">الإجمالي</div>
            <div className="text-lg font-bold">{booking.totalPrice.toLocaleString()} $</div>
          </div>
          <div className="p-4 text-center bg-green-50">
            <div className="text-xs text-gray-500 mb-1">المدفوع</div>
            <div className="text-lg font-bold text-green-600">{paidAmount.toLocaleString()} $</div>
          </div>
          <div className="p-4 text-center bg-amber-50">
            <div className="text-xs text-gray-500 mb-1">المتبقي</div>
            <div className="text-lg font-bold text-amber-600">{remaining.toLocaleString()} $</div>
          </div>
        </div>
      </div>

      {booking.notes && (
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700 mb-4">
          <span className="font-semibold">ملاحظات: </span>{booking.notes}
        </div>
      )}
      <AgencyFooter agency={agency} />
    </PrintArea>
  );
}

function ReceiptDoc({ payment, booking, agency }: { payment: any; booking: any; agency: any }) {
  return (
    <PrintArea>
      <AgencyHeader docType="وصـل استـلام" docNumber={`PAY-${String(payment.id).padStart(4, "0")}`} agency={agency} />
      <div className="bg-gray-50 rounded-lg p-4 mb-5 border-r-4" style={{ borderColor: "#C9A227" }}>
        <div className="text-sm font-bold text-gray-700 mb-2">بيانات العميل</div>
        <div className="text-sm"><span className="text-gray-500">الاسم: </span><span className="font-medium">{booking?.clientName ?? "—"}</span></div>
      </div>

      <div className="border rounded-xl p-6 mb-5 text-center" style={{ borderColor: "#C9A227" }}>
        <div className="text-sm text-gray-500 mb-2">تم استلام مبلغ قدره</div>
        <div className="text-5xl font-black my-3" style={{ color: "#C9A227" }}>{Number(payment.amount).toLocaleString()}</div>
        <div className="text-2xl font-bold text-gray-700">دولار أمريكي ($)</div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-5">
        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">طريقة الدفع</div>
          <div className="font-semibold">{methodAr(payment.method)}</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">تاريخ الدفع</div>
          <div className="font-semibold">{format(new Date(payment.paymentDate), "d MMMM yyyy", { locale: ar })}</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">رقم الحجز المرتبط</div>
          <div className="font-semibold">#{payment.bookingId}</div>
        </div>
        <div className="border rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">الباقة</div>
          <div className="font-semibold">{booking?.packageName ?? "—"}</div>
        </div>
      </div>

      {payment.notes && (
        <div className="p-3 bg-blue-50 rounded-lg text-sm text-gray-700 mb-4">
          <span className="font-semibold">مرجع / ملاحظة: </span>{payment.notes}
        </div>
      )}
      <AgencyFooter agency={agency} />
    </PrintArea>
  );
}

export default function DocumentsPage() {
  const [docMode, setDocMode] = useState<"invoice" | "receipt">("invoice");
  const [searchQ, setSearchQ] = useState("");
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState<number | null>(null);

  const { settings } = useAgency();
  const { data: bookings, isLoading: bookingsLoading } = useListBookings({});
  const { data: allPayments, isLoading: paymentsLoading } = useListPayments({}, {
    query: { enabled: true, queryKey: getListPaymentsQueryKey({}) }
  });

  const filteredBookings = bookings?.filter(b =>
    !searchQ ||
    b.clientName?.toLowerCase().includes(searchQ.toLowerCase()) ||
    b.packageName?.toLowerCase().includes(searchQ.toLowerCase()) ||
    String(b.id).includes(searchQ)
  );

  const filteredPayments = allPayments?.filter(p =>
    !searchQ ||
    p.clientName?.toLowerCase().includes(searchQ.toLowerCase()) ||
    String(p.id).includes(searchQ) ||
    String(p.bookingId).includes(searchQ)
  );

  const selectedBooking = bookings?.find(b => b.id === selectedBookingId);
  const selectedPayment = allPayments?.find(p => p.id === selectedPaymentId);
  const paymentBooking = selectedPayment ? bookings?.find(b => b.id === selectedPayment.bookingId) : null;

  const hasDoc = docMode === "invoice" ? !!selectedBooking : !!selectedPayment;

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed !important; top: 0 !important; left: 0 !important; width: 100% !important; padding: 2rem !important; background: white !important; }
        }
      `}</style>

      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">المستندات المالية</h1>
            <p className="text-muted-foreground mt-1">استخراج الفواتير ووصولات الاستلام باسم {settings.agencyName}.</p>
          </div>
          {hasDoc && (
            <Button onClick={() => window.print()} className="gap-2" data-testid="button-print">
              <Printer className="h-4 w-4" /> طباعة المستند
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-6">
          {/* Selector Panel */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 bg-muted p-1 rounded-lg">
              <button
                onClick={() => { setDocMode("invoice"); setSelectedPaymentId(null); }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${docMode === "invoice" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <FileText className="h-4 w-4" /> فاتورة
              </button>
              <button
                onClick={() => { setDocMode("receipt"); setSelectedBookingId(null); }}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${docMode === "receipt" ? "bg-white shadow-sm text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Receipt className="h-4 w-4" /> وصل استلام
              </button>
            </div>

            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pr-9"
                placeholder={docMode === "invoice" ? "ابحث برقم الحجز أو العميل..." : "ابحث برقم الدفعة أو الحجز..."}
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>

            <div className="border rounded-lg overflow-hidden bg-card max-h-[500px] overflow-y-auto">
              {docMode === "invoice" ? (
                bookingsLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">جارٍ التحميل...</div>
                ) : filteredBookings?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">لا توجد نتائج</div>
                ) : (
                  filteredBookings?.map(b => (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBookingId(b.id)}
                      className={`w-full text-right p-3 border-b last:border-b-0 transition-colors flex items-start gap-3 ${selectedBookingId === b.id ? "bg-primary/5 border-r-2" : "hover:bg-muted/40"}`}
                      style={selectedBookingId === b.id ? { borderRightColor: "#C9A227" } : {}}
                    >
                      <FileText className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{b.clientName}</div>
                        <div className="text-xs text-muted-foreground truncate">{b.packageName}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-muted-foreground">#{b.id}</span>
                          <span className="text-xs font-semibold text-primary">{b.totalPrice.toLocaleString()}$</span>
                        </div>
                      </div>
                    </button>
                  ))
                )
              ) : (
                paymentsLoading ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">جارٍ التحميل...</div>
                ) : filteredPayments?.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground text-sm">لا توجد نتائج</div>
                ) : (
                  filteredPayments?.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPaymentId(p.id)}
                      className={`w-full text-right p-3 border-b last:border-b-0 transition-colors flex items-start gap-3 ${selectedPaymentId === p.id ? "bg-primary/5 border-r-2" : "hover:bg-muted/40"}`}
                      style={selectedPaymentId === p.id ? { borderRightColor: "#C9A227" } : {}}
                    >
                      <Receipt className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{p.clientName ?? `حجز #${p.bookingId}`}</div>
                        <div className="text-xs text-muted-foreground">{methodAr(p.method)} — {format(new Date(p.paymentDate), "d/M/yyyy")}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-mono text-muted-foreground">PAY-{String(p.id).padStart(4, "0")}</span>
                          <span className="text-xs font-semibold text-green-600">{Number(p.amount).toLocaleString()}$</span>
                        </div>
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div>
            {!hasDoc ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] border-2 border-dashed rounded-xl text-muted-foreground gap-3">
                {docMode === "invoice" ? <FileText className="h-12 w-12 opacity-30" /> : <Receipt className="h-12 w-12 opacity-30" />}
                <div className="text-center">
                  <p className="font-medium">{docMode === "invoice" ? "اختر حجزاً لعرض الفاتورة" : "اختر دفعةً لعرض وصل الاستلام"}</p>
                  <p className="text-sm mt-1">اختر من القائمة على اليمين</p>
                </div>
              </div>
            ) : docMode === "invoice" && selectedBooking ? (
              <InvoiceDoc booking={selectedBooking} agency={settings} />
            ) : selectedPayment ? (
              <ReceiptDoc payment={selectedPayment} booking={paymentBooking} agency={settings} />
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
