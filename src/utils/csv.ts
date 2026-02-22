export function downloadCsv(filename: string, headers: string[], rows: (string | number | null)[][]) {
  const headerLine = headers.join(",")
  const lines = rows.map((r) =>
    r
      .map((v) => {
        const s = v == null ? "" : String(v)
        const needsQuote = /[",\n]/.test(s)
        const escaped = s.replace(/"/g, '""')
        return needsQuote ? `"${escaped}"` : escaped
      })
      .join(",")
  )
  const csv = [headerLine, ...lines].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
