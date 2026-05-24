<<<<<<< HEAD
import { Badge } from "@/components/ui/badge"

const BadgePending = () => {
  return (
    <Badge className="border-none bg-sky-600/10 text-sky-600 focus-visible:ring-sky-600/20 focus-visible:outline-none dark:bg-sky-400/10 dark:text-sky-400 dark:focus-visible:ring-sky-400/40 [a&]:hover:bg-sky-600/5 dark:[a&]:hover:bg-sky-400/5">
      <span
        className="size-2 rounded-full bg-sky-600 dark:bg-sky-400"
        aria-hidden="true"
      />
      Pending
    </Badge>
  )
}

export default BadgePending
=======
import { Badge } from "@/components/ui/badge"
import { MdError } from "react-icons/md"

const BadgePending = () => {
  return (
    <Badge
      variant="outline"
      className="rounded-sm border-sky-600 bg-sky-600/10 text-sky-600 dark:border-sky-400 dark:bg-sky-400/10 dark:text-sky-400 [a&]:hover:bg-sky-600/10"
    >
      <MdError className="size-3" />
      Pending
    </Badge>
  )
}

export default BadgePending
>>>>>>> a4736ffa (chore(git): rebase preparation through squashing)
