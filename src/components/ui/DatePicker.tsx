import { useMemo } from "react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export function DatePicker({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const date = useMemo(() => {
    if (!value) return undefined
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-").map(Number)
      return new Date(y, m - 1, d)
    }
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? undefined : d
  }, [value])
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start">{date ? format(date, "dd/MM/yyyy") : "Selecionar data"}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          locale={ptBR}
          mode="single"
          selected={date}
          onSelect={(d) => d && onChange(format(d, "yyyy-MM-dd"))}
        />
      </PopoverContent>
    </Popover>
  )
}
