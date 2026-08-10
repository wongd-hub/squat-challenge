"use client"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

export default function GoalModeToggle({
  value, onChange, disabled,
}: { value: 'full' | 'half'; onChange: (v: 'full' | 'half') => void; disabled?: boolean }) {
  return (
    <ToggleGroup type="single" value={value} disabled={disabled}
      onValueChange={(v) => { if (v === 'full' || v === 'half') onChange(v) }}>
      <ToggleGroupItem value="full" aria-label="Full target">Full</ToggleGroupItem>
      <ToggleGroupItem value="half" aria-label="Half target">Half</ToggleGroupItem>
    </ToggleGroup>
  )
}
