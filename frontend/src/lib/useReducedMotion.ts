'use client'

import { useEffect, useState } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

/** True when the user asked the OS to minimise motion. */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(QUERY)
    const update = () => setReduced(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  return reduced
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches
}
