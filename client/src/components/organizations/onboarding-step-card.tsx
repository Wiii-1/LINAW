import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type OnboardingStepCardProps = {
  step: number
  title: string
  description: string
  locked?: boolean
  children: ReactNode
  className?: string
}

export function OnboardingStepCard({
  step,
  title,
  description,
  locked = false,
  children,
  className,
}: OnboardingStepCardProps) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm",
        locked && "opacity-60",
        className
      )}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  )
}
