"use client"

import { useMemo } from "react"
import type { TargetAndTransition, Transition } from "framer-motion"
import { useReducedMotion } from "framer-motion"

type MotionConfig = {
  initial: false | TargetAndTransition
  animate: TargetAndTransition
  exit: TargetAndTransition
}

const ENTER_EASING: [number, number, number, number] = [0.21, 0.47, 0.32, 0.98]
const EXIT_EASING: [number, number, number, number] = [0.4, 0, 0.2, 1]

export function useDashboardSectionTransition(): MotionConfig {
  const prefersReducedMotion = useReducedMotion()

  return useMemo(() => {
    if (prefersReducedMotion) {
      return {
        initial: false,
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 1, y: 0 },
      }
    }

    return {
      initial: { opacity: 0, y: 16 },
      animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.3, ease: ENTER_EASING },
      },
      exit: {
        opacity: 0,
        y: -12,
        transition: { duration: 0.2, ease: EXIT_EASING },
      },
    }
  }, [prefersReducedMotion])
}
