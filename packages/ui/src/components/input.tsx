import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "../lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-9 w-full min-w-0 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 transition-colors outline-none placeholder:text-stone-400 focus-visible:border-stone-500 focus-visible:ring-2 focus-visible:ring-stone-200 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Input }
