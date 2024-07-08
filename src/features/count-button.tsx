import { useReducer } from "react"

import { Button } from "~components/ui/button"

export const CountButton = () => {
  const [count, increase] = useReducer((c) => c + 1, 0)

  return <Button onClick={() => increase()}>Count: {count}</Button>
}
