import * as XLSX from "xlsx"

export function downloadXlsx(filename: string, headers: string[], rows: (string | number | null)[][], sheetName = "Sheet1", opts?: { currencyColumns?: number[]; dateColumns?: number[] }) {
  const aoa = [headers, ...rows]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  if (opts?.dateColumns?.length) {
    for (let r = 1; r < aoa.length; r++) {
      for (const c of opts.dateColumns) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = ws[addr]
        if (cell && typeof cell.v === "string") {
          const d = new Date(cell.v as string)
          if (!Number.isNaN(d.getTime())) {
            cell.v = d
            cell.t = "d"
            cell.z = "yyyy-mm-dd"
          }
        }
      }
    }
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName)
  if (opts?.currencyColumns?.length) {
    for (let r = 1; r < aoa.length; r++) {
      for (const c of opts.currencyColumns) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = ws[addr]
        if (cell && typeof cell.v === "number") {
          cell.z = '[$R$-pt-BR] #,##0.00'
        }
      }
    }
  }
  const colWidths: number[] = []
  for (let c = 0; c < headers.length; c++) {
    let maxLen = String(headers[c] ?? "").length
    for (let r = 0; r < rows.length; r++) {
      const val = rows[r][c]
      const len = String(val ?? "").length
      if (len > maxLen) maxLen = len
    }
    colWidths[c] = Math.min(Math.max(10, maxLen + 2), 40)
  }
  ws["!cols"] = colWidths.map((wch) => ({ wch }))
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadXlsxMulti(filename: string, sheets: Array<{ name: string; headers: string[]; rows: (string | number | null)[][]; numFmtColumns?: number[]; currencyColumns?: number[]; dateColumns?: number[] }>) {
  const wb = XLSX.utils.book_new()
  for (const sh of sheets) {
    const aoa = [sh.headers, ...sh.rows]
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    if (sh.numFmtColumns?.length) {
      for (let r = 1; r < aoa.length; r++) {
        for (const c of sh.numFmtColumns) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (cell && typeof cell.v === "number") {
            cell.z = "#,##0.00"
          }
        }
      }
    }
    if (sh.currencyColumns?.length) {
      for (let r = 1; r < aoa.length; r++) {
        for (const c of sh.currencyColumns) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (cell && typeof cell.v === "number") {
            cell.z = '[$R$-pt-BR] #,##0.00'
          }
        }
      }
    }
    if (sh.dateColumns?.length) {
      for (let r = 1; r < aoa.length; r++) {
        for (const c of sh.dateColumns) {
          const addr = XLSX.utils.encode_cell({ r, c })
          const cell = ws[addr]
          if (cell && typeof cell.v === "string") {
            const d = new Date(cell.v as string)
            if (!Number.isNaN(d.getTime())) {
              cell.v = d
              cell.t = "d"
              cell.z = "yyyy-mm-dd"
            }
          }
        }
      }
    }
    const colWidths: number[] = []
    for (let c = 0; c < sh.headers.length; c++) {
      let maxLen = String(sh.headers[c] ?? "").length
      for (let r = 0; r < sh.rows.length; r++) {
        const val = sh.rows[r][c]
        const len = String(val ?? "").length
        if (len > maxLen) maxLen = len
      }
      colWidths[c] = Math.min(Math.max(10, maxLen + 2), 40)
    }
    ws["!cols"] = colWidths.map((wch) => ({ wch }))
    XLSX.utils.book_append_sheet(wb, ws, sh.name)
  }
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
