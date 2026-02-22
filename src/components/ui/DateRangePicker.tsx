import { format } from "date-fns"
import { useMemo } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import type { DateRange } from "react-day-picker"

function parseDate(value?: string) {
  if (!value) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export function DateRangePicker({ value, onChange, label }: { value?: { from?: string; to?: string }; onChange: (v: { from?: string; to?: string }) => void; label?: string }) {
  const selected: DateRange | undefined = useMemo(() => {
    const f = parseDate(value?.from)
    const t = parseDate(value?.to)
    return (!f && !t) ? undefined : { from: f, to: t }
  }, [value])
  const text = useMemo(() => {
    const f = value?.from ? format(parseDate(value!.from!)!, "dd/MM/yyyy") : ""
    const t = value?.to ? format(parseDate(value!.to!)!, "dd/MM/yyyy") : ""
    if (!f && !t) return label ?? "Selecionar período"
    return `${f || "—"} → ${t || "—"}`
  }, [value, label])
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">{text}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={(range) => {
            // Note: range can be undefined if user deselects
            onChange({
              from: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
              to: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
            })
          }}
        />
      </PopoverContent>
    </Popover>
  )
}
