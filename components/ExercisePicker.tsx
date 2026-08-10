"use client"
import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { database } from "@/lib/supabase"
import { normalizeExerciseName, type Exercise } from "@/lib/exercises"

export default function ExercisePicker({
  value, onChange, canAddCustom, userId, disabled,
}: { value: string; onChange: (name: string) => void; canAddCustom: boolean; userId?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => { database.getExercises().then(({ data }) => setExercises(data)) }, [])

  const norm = normalizeExerciseName(query)
  const exactExists = exercises.some((e) => e.normalized_name === norm)
  const canOfferAdd = canAddCustom && query.trim().length > 0 && !exactExists

  async function handleAdd() {
    setAdding(true)
    const { data } = await database.addExercise(query.trim(), userId)
    setAdding(false)
    if (data) {
      setExercises((prev) => prev.some((e) => e.id === data.id) ? prev : [...prev, data])
      onChange(data.name); setOpen(false); setQuery("")
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} disabled={disabled}
          className="w-full justify-between">
          {value || "Choose exercise"}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search exercise..." value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>{canAddCustom ? "No match." : "No exercise found."}</CommandEmpty>
            <CommandGroup>
              {exercises.map((e) => (
                <CommandItem key={e.id} value={e.name}
                  onSelect={() => { onChange(e.name); setOpen(false); setQuery("") }}>
                  <Check className={`mr-2 h-4 w-4 ${value === e.name ? "opacity-100" : "opacity-0"}`} />
                  {e.name}
                </CommandItem>
              ))}
              {canOfferAdd && (
                <CommandItem value={`__add__${query}`} onSelect={handleAdd} disabled={adding}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add “{query.trim()}”
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
