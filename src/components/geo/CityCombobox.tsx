import React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { listCities, type City } from "@/api/geo"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

export function CityCombobox(props: {
  state?: string | null
  valueName?: string | null
  onChange: (city: { id: string; name: string; stateCode: string }) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [take, setTake] = React.useState(200)
  const [page, setPage] = React.useState(0)
  const cities = useQuery({
    queryKey: ["geo", "cities", props.state, search, take, page],
    queryFn: async () => listCities({ state: props.state ?? undefined, search, take, skip: page * take }),
  })
  const items = React.useMemo(() => cities.data?.items ?? [], [cities.data?.items])
  const total = cities.data?.total ?? 0
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const loading = cities.isFetching
  const [rows, setRows] = React.useState<City[]>([])
  const fetchingNextRef = React.useRef(false)
  const allowIncrementRef = React.useRef(true)

  React.useEffect(() => {
    setRows([])
    setPage(0)
    allowIncrementRef.current = true
  }, [props.state, search])

  React.useEffect(() => {
    if (!items.length) {
      if (page === 0) setRows([])
      return
    }
    if (page === 0) {
      setRows(items)
    } else {
      setRows((prev) => {
        const seen = new Set(prev.map((x) => x.id))
        const merged = [...prev]
        for (const x of items) if (!seen.has(x.id)) merged.push(x)
        return merged
      })
    }
    allowIncrementRef.current = true
  }, [items, page])

  React.useEffect(() => {
    fetchingNextRef.current = loading
  }, [loading])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between">
          {props.valueName || "Selecione"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <div className="p-2">
            <CommandInput value={search} onValueChange={(v) => { setSearch(v); setPage(0) }} placeholder="Buscar cidade..." />
          </div>
          <div
            ref={containerRef}
            className="max-h-64 overflow-y-auto"
            onScroll={() => {
              const el = containerRef.current
              if (!el || fetchingNextRef.current) return
              const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24
              if (nearBottom && rows.length < total && allowIncrementRef.current) {
                allowIncrementRef.current = false
                setPage((p) => p + 1)
              }
            }}
          >
            <CommandList>
              {rows.map((c: City) => (
                <CommandItem key={c.id} onSelect={() => { props.onChange({ id: c.id, name: c.name, stateCode: c.stateCode }); setOpen(false) }}>
                  {c.name}
                </CommandItem>
              ))}
              {loading ? (
                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Carregando...
                </div>
              ) : null}
              {!loading && rows.length < total ? (
                <div className="p-2">
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setPage((p) => p + 1)}>
                    Carregar mais
                  </Button>
                </div>
              ) : null}
            </CommandList>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
