import React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { listStates, type State } from "@/api/geo"
import { useQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"

export function StateCombobox(props: {
  value?: string | null
  onChange: (stateCode: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const states = useQuery({ queryKey: ["geo", "states", search], queryFn: async () => listStates({ search }) })
  const loading = states.isFetching

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between" disabled={props.disabled}>
          {props.value || "Selecione"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <div className="p-2">
            <CommandInput value={search} onValueChange={setSearch} placeholder="Buscar UF..." />
          </div>
          <div className="max-h-64 overflow-y-auto">
            <CommandList>
              {(states.data ?? []).map((s: State) => (
                <CommandItem key={s.code} onSelect={() => { props.onChange(s.code); setOpen(false) }}>
                  {s.code} — {s.name}
                </CommandItem>
              ))}
              {loading ? (
                <div className="flex items-center justify-center py-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Carregando...
                </div>
              ) : null}
            </CommandList>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
