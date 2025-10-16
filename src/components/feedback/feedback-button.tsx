'use client'

import React, { useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { FeedbackModal } from './feedback-modal'
import { cn } from '@/lib/utils'

interface FeedbackButtonProps {
  className?: string
}

/**
 * Floating Action Button for Feedback
 *
 * Fixed position in bottom-right corner, opens feedback modal on click
 */
export function FeedbackButton({ className }: FeedbackButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    setIsModalOpen(true)
  }

  return (
    <>
      {/* Floating Action Button with Text */}
      <button
        ref={buttonRef}
        onClick={handleClick}
        className={cn(
          // Base styles
          'fixed bottom-6 right-6 z-40',
          'px-4 py-3 rounded-full',
          'flex items-center gap-2',
          // Colors & shadows
          'bg-primary text-primary-foreground hover:bg-primary/90',
          'shadow-lg hover:shadow-xl',
          // Transitions
          'transition-all duration-200 ease-out',
          'hover:scale-105 active:scale-95',
          // Focus styles
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Mobile optimizations
          'sm:bottom-8 sm:right-8',
          className
        )}
        aria-label="Share feedback"
        title="Share your feedback with us"
        aria-haspopup="dialog"
        aria-expanded={isModalOpen}
      >
        <MessageSquare className="w-5 h-5" aria-hidden="true" />
        <span className="font-medium text-sm whitespace-nowrap">Feedback</span>
      </button>

      {/* Feedback Modal */}
      <FeedbackModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        triggerRef={buttonRef}
      />
    </>
  )
}
