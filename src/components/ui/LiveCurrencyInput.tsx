import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

function formatBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function parseTextToNumber(text: string) {
  const cleaned = text.replace(/[^\d,-]/g, "").replace(/\./g, "").replace(",", ".")
  const n = Number(cleaned)
  return Number.isNaN(n) ? 0 : n
}

export function LiveCurrencyInput({ value, onChange, placeholder }: { value?: number | null; onChange: (v: number) => void; placeholder?: string }) {
  const [text, setText] = useState(value != null ? formatBRL(value) : "")
  useEffect(() => {
    if (value != null) setText(formatBRL(value))
  }, [value])
  return (
    <Input
      value={text}
      onChange={(e) => {
        const raw = e.target.value
        setText(raw)
        const n = parseTextToNumber(raw)
        onChange(n)
      }}
      onBlur={() => {
        const n = parseTextToNumber(text)
        setText(formatBRL(n))
      }}
      placeholder={placeholder}
    />
  )
}
