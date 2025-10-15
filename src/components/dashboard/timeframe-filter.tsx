"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type TimeframeAllOption = {
  type: "all"
  value: "all"
  label: string
}

export type TimeframeYearOption = {
  type: "year"
  value: `year-${number}`
  label: string
  year: number
}

export type TimeframeMonthOption = {
  type: "month"
  value: `month-${number}-${string}`
  label: string
  year: number
  month: number
}

export type TimeframeOption =
  | TimeframeAllOption
  | TimeframeYearOption
  | TimeframeMonthOption

export type TimeframeValue = TimeframeOption["value"]

const FALLBACK_OPTION: TimeframeAllOption = {
  type: "all",
  value: "all",
  label: "All time",
}

type TimeframeFilterProps = {
  options: TimeframeOption[]
  value: TimeframeValue
  onValueChange: (value: TimeframeValue) => void
}

function TimeframeFilter({ options, value, onValueChange }: TimeframeFilterProps) {
  const activeOption =
    options.find((option) => option.value === value) ?? options[0] ?? FALLBACK_OPTION
  const isDisabled = options.length <= 1

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="min-w-36 justify-between gap-2"
          aria-label="Select timeframe"
          disabled={isDisabled}
        >
          <span className="text-sm text-muted-foreground">Timeframe</span>
          <span className="font-medium">{activeOption.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Timeframe</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { TimeframeFilter }
