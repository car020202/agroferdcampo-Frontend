import * as React from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { cn } from "./utils"

export interface NumberInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onValueChange?: (value: number | undefined) => void
  step?: number
  hideControls?: boolean
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, onValueChange, step = 1, hideControls = false, min, max, onChange, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null)
    const resolvedRef = (ref as React.RefObject<HTMLInputElement>) ?? inputRef

    const getCurrentValue = () => {
      const raw = resolvedRef.current?.value ?? ''
      return parseFloat(raw)
    }

    const handleIncrement = () => {
      const cur = getCurrentValue()
      const next = (isNaN(cur) ? 0 : cur) + Number(step)
      const clamped = max !== undefined ? Math.min(Number(max), next) : next
      if (resolvedRef.current) resolvedRef.current.value = String(clamped)
      onValueChange?.(clamped)
    }

    const handleDecrement = () => {
      const cur = getCurrentValue()
      const next = (isNaN(cur) ? 0 : cur) - Number(step)
      const clamped = min !== undefined ? Math.max(Number(min), next) : next
      if (resolvedRef.current) resolvedRef.current.value = String(clamped)
      onValueChange?.(clamped)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Normalize comma to dot so users in Spanish/European locale can use either separator
      const normalized = e.target.value.replace(',', '.')
      if (normalized !== e.target.value) {
        e.target.value = normalized
      }
      const val = parseFloat(normalized)
      onValueChange?.(isNaN(val) ? undefined : val)
      onChange?.(e)
    }

    // Convert numeric value to string so type="text" displays it correctly
    const { value: rawValue, ...restProps } = props
    const displayValue = rawValue !== undefined && rawValue !== null ? String(rawValue) : undefined

    return (
      <div className="relative group">
        <input
          type="text"
          inputMode="decimal"
          className={cn(
            "flex h-11 w-full rounded-xl border border-input bg-background px-4 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            className
          )}
          ref={resolvedRef}
          value={displayValue}
          onChange={handleChange}
          {...restProps}
        />
        {!hideControls && (
          <div className="absolute right-0 top-0 h-full flex flex-col border-l border-input overflow-hidden rounded-r-xl">
            <button
              type="button"
              onClick={handleIncrement}
              className="flex-1 px-2 hover:bg-accent hover:text-accent-foreground transition-colors border-b border-input flex items-center justify-center"
              tabIndex={-1}
            >
              <ChevronUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handleDecrement}
              className="flex-1 px-2 hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-center"
              tabIndex={-1}
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    )
  }
)
NumberInput.displayName = "NumberInput"

export { NumberInput }
