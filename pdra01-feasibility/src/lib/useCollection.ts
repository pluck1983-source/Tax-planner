import { useCallback, useState } from 'react'
import { v4 as uuid } from 'uuid'

export function useCollection<T extends { id: string }>(
  load: () => T[],
  save: (items: T[]) => void,
) {
  const [items, setItems] = useState<T[]>(load)

  const persist = useCallback(
    (next: T[]) => {
      setItems(next)
      save(next)
    },
    [save],
  )

  const add = useCallback(
    (item: Omit<T, 'id'>) => {
      const withId = { ...item, id: uuid() } as T
      persist([...items, withId])
      return withId
    },
    [items, persist],
  )

  const update = useCallback(
    (id: string, patch: Partial<T>) => {
      persist(items.map((it) => (it.id === id ? { ...it, ...patch } : it)))
    },
    [items, persist],
  )

  const remove = useCallback(
    (id: string) => {
      persist(items.filter((it) => it.id !== id))
    },
    [items, persist],
  )

  return { items, add, update, remove, setAll: persist }
}
