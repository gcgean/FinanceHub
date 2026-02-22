function fmt(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export type Preset = "current_month" | "last_30" | "quarter" | "year"

export function getPresetRange(preset: Preset) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (preset === "current_month") {
    const from = new Date(y, m, 1)
    const to = new Date(y, m + 1, 0)
    return { from: fmt(from), to: fmt(to) }
  }
  if (preset === "last_30") {
    const to = new Date()
    const from = new Date(to)
    from.setDate(to.getDate() - 29)
    return { from: fmt(from), to: fmt(to) }
  }
  if (preset === "quarter") {
    const q = Math.floor(m / 3)
    const from = new Date(y, q * 3, 1)
    const to = new Date(y, q * 3 + 3, 0)
    return { from: fmt(from), to: fmt(to) }
  }
  const from = new Date(y, 0, 1)
  const to = new Date(y, 12, 0)
  return { from: fmt(from), to: fmt(to) }
}

export function getLastNDays(n: number) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - (n - 1))
  return { from: fmt(from), to: fmt(to) }
}

export function getLastNWeeks(n: number) {
  const to = new Date()
  const from = new Date(to)
  from.setDate(to.getDate() - (n * 7 - 1))
  return { from: fmt(from), to: fmt(to) }
}

export function getLastNMonths(n: number) {
  const to = new Date()
  const from = new Date(to)
  from.setMonth(to.getMonth() - (n - 1), 1)
  // set end to last day of current month
  const end = new Date(to.getFullYear(), to.getMonth() + 1, 0)
  return { from: fmt(from), to: fmt(end) }
}
