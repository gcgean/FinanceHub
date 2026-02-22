import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

export function CurrencyInput({ value, onChange, placeholder }: { value?: number | null; onChange: (v: number) => void; placeholder?: string }) {
  const [text, setText] = useState("")

  useEffect(() => {
    if (value != null) {
      setText(value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
    } else {
      setText("")
    }
  }, [value])

  return (
    <Input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        // Remove R$, spaces, etc.
        let cleaned = text.replace(/[^\d.,-]/g, "")
        // Remove thousands separators (dots)
        cleaned = cleaned.replace(/\./g, "")
        // Replace decimal separator (comma) with dot
        cleaned = cleaned.replace(",", ".")
        
        const n = parseFloat(cleaned)
        const isValid = !isNaN(n)
        const finalVal = isValid ? n : 0
        
        onChange(finalVal)
        // Formatting will happen via useEffect since parent updates value
        // But to be sure (if parent value doesn't change), we set it here too
        setText(finalVal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }))
      }}
      placeholder={placeholder}
    />
  )
}
