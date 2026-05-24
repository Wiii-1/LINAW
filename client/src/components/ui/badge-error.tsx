<<<<<<< HEAD
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
=======
import { BsBanFill } from "react-icons/bs"

import { Badge } from "@/components/ui/badge"

const BadgeError = () => {
  return (
    <Badge
      variant="outline"
      className="rounded-sm border-destructive bg-destructive/10 text-destructive"
    >
      <BsBanFill className="size-3" />
      Error
    </Badge>
  )
}

export default BadgeError
>>>>>>> a4736ffa (chore(git): rebase preparation through squashing)
