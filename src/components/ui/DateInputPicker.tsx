/**
 * DateInputPicker — campo de data com digitação (DD/MM/YYYY) + ícone de calendário.
 * Aceita value/onChange no formato "yyyy-MM-dd".
 */
import { useState, useEffect } from "react"
import { format, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface DateInputPickerProps {
  value?: string          // formato interno: "yyyy-MM-dd"
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  label?: string
}

function isoToDate(v?: string): Date | undefined {
  if (!v) return undefined
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number)
    const date = new Date(y, m - 1, d)
    return isValid(date) ? date : undefined
  }
  const d = new Date(v)
  return isValid(d) ? d : undefined
}

function displayToIso(display: string): string | null {
  const clean = display.replace(/\D/g, "")
  if (clean.length !== 8) return null
  const d = clean.slice(0, 2), m = clean.slice(2, 4), y = clean.slice(4, 8)
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (!isValid(date)) return null
  return `${y}-${m}-${d}`
}

function autoFormat(raw: string): string {
  const clean = raw.replace(/\D/g, "").slice(0, 8)
  if (clean.length <= 2) return clean
  if (clean.length <= 4) return `${clean.slice(0, 2)}/${clean.slice(2)}`
  return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
}

export function DateInputPicker({
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  className,
}: DateInputPickerProps) {
  const [inputVal, setInputVal] = useState("")
  const [open, setOpen] = useState(false)

  // Sync external value → display
  useEffect(() => {
    const d = isoToDate(value)
    setInputVal(d ? format(d, "dd/MM/yyyy") : "")
  }, [value])

  const handleInputChange = (raw: string) => {
    const formatted = autoFormat(raw)
    setInputVal(formatted)
    const iso = displayToIso(formatted)
    if (iso) onChange(iso)
    else if (formatted === "") onChange("")
  }

  const selectedDate = isoToDate(value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative flex items-center", className)}>
        <Input
          value={inputVal}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pr-9 w-36"
          maxLength={10}
        />
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute right-2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <CalendarIcon className="w-4 h-4" />
          </button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          locale={ptBR}
          mode="single"
          selected={selectedDate}
          defaultMonth={selectedDate}
          onSelect={(d) => {
            if (d) {
              onChange(format(d, "yyyy-MM-dd"))
              setOpen(false)
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
