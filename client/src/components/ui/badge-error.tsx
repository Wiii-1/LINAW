import { Badge } from "@/components/ui/badge"

const BadgeError = () => {
  return (
    <Badge className="border-none bg-destructive/10 text-destructive focus-visible:ring-destructive/20 focus-visible:outline-none dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/5">
      <span className="size-2 rounded-full bg-destructive" aria-hidden="true" />
      Error
    </Badge>
  )
}

export default BadgeError
