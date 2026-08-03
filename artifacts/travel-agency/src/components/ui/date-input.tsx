import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  className?: string;
}

export function DateInput({ value, onChange, className }: DateInputProps) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      setYear(y);
      setMonth(String(parseInt(m)));
      setDay(String(parseInt(d)));
    } else if (!value) {
      setDay(""); setMonth(""); setYear("");
    }
  }, [value]);

  const emit = (d: string, m: string, y: string) => {
    const di = parseInt(d), mi = parseInt(m), yi = parseInt(y);
    if (d && m && y && y.length === 4 && di >= 1 && di <= 31 && mi >= 1 && mi <= 12 && yi >= 1900 && yi <= 2100) {
      onChange(`${y}-${String(mi).padStart(2, "0")}-${String(di).padStart(2, "0")}`);
    } else if (!d && !m && !y) {
      onChange("");
    }
  };

  const inputClass = cn(
    "flex h-9 rounded-md border border-input bg-background px-2 py-1 text-sm text-center",
    "shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
    "placeholder:text-muted-foreground [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <input
        type="number" min={1} max={31} placeholder="يوم"
        value={day}
        onChange={e => { const v = e.target.value; setDay(v); emit(v, month, year); }}
        className={cn(inputClass, "w-16")}
      />
      <span className="text-muted-foreground select-none">/</span>
      <input
        type="number" min={1} max={12} placeholder="شهر"
        value={month}
        onChange={e => { const v = e.target.value; setMonth(v); emit(day, v, year); }}
        className={cn(inputClass, "w-16")}
      />
      <span className="text-muted-foreground select-none">/</span>
      <input
        type="number" min={2000} max={2100} placeholder="سنة"
        value={year}
        onChange={e => { const v = e.target.value; setYear(v); emit(day, month, v); }}
        className={cn(inputClass, "w-[5.5rem]")}
      />
    </div>
  );
}
