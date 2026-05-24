<<<<<<< HEAD
import { Badge } from "@/components/ui/badge"

const BadgeReady = () => {
  return (
    <Badge className="border-none bg-green-600/10 text-green-600 focus-visible:ring-green-600/20 focus-visible:outline-none dark:bg-green-400/10 dark:text-green-400 dark:focus-visible:ring-green-400/40">
      <span
        className="size-2 rounded-full bg-green-600 dark:bg-green-400"
        aria-hidden="true"
      />
      Ready
    </Badge>
  )
}

export default BadgeReady
=======
import { Badge } from "@/components/ui/badge"
import { GoCheckCircleFill } from "react-icons/go"

const BadgeReady = () => {
  return (
    <Badge
      variant="outline"
      className="rounded-sm border-green-600 bg-green-600/10 text-green-600 dark:border-green-400 dark:bg-green-400/10 dark:text-green-400"
    >
      <GoCheckCircleFill className="size-3" />
      Ready
    </Badge>
  )
}

export default BadgeReady
>>>>>>> a4736ffa (chore(git): rebase preparation through squashing)
