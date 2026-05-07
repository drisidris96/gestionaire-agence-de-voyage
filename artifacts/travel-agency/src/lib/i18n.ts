export const STATUS_AR: Record<string, string> = {
  pending: "معلق",
  confirmed: "مؤكد",
  cancelled: "ملغى",
  completed: "مكتمل",
};

export const METHOD_AR: Record<string, string> = {
  cash: "نقدًا",
  card: "بطاقة ائتمان",
  bank_transfer: "تحويل بنكي",
  cheque: "شيك",
};

export function statusAr(status: string): string {
  return STATUS_AR[status] ?? status;
}

export function methodAr(method: string): string {
  return METHOD_AR[method] ?? method;
}
