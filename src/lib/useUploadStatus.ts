'use client'

import { useCallback, useMemo, useState } from 'react'

export type UploadStatusState =
  | 'idle'
  | 'validating'
  | 'uploading'
  | 'resetting'
  | 'success'
  | 'error'

export type UploadStatus = {
  state: UploadStatusState
  message: string
}

export const useUploadStatus = (initialMessage: string) => {
  const [status, setStatus] = useState<UploadStatus>({
    state: 'idle',
    message: initialMessage,
  })

  const updateStatus = useCallback((state: UploadStatusState, message: string) => {
    setStatus({ state, message })
  }, [])

  const setIdle = useCallback(
    (message: string) => updateStatus('idle', message),
    [updateStatus],
  )
  const setValidating = useCallback(
    (message: string) => updateStatus('validating', message),
    [updateStatus],
  )
  const setUploading = useCallback(
    (message: string) => updateStatus('uploading', message),
    [updateStatus],
  )
  const setResetting = useCallback(
    (message: string) => updateStatus('resetting', message),
    [updateStatus],
  )
  const setSuccess = useCallback(
    (message: string) => updateStatus('success', message),
    [updateStatus],
  )
  const setError = useCallback(
    (message: string) => updateStatus('error', message),
    [updateStatus],
  )

  const isBusy = useMemo(
    () =>
      status.state === 'validating' ||
      status.state === 'uploading' ||
      status.state === 'resetting',
    [status.state],
  )

  return {
    status,
    updateStatus,
    setIdle,
    setValidating,
    setUploading,
    setResetting,
    setSuccess,
    setError,
    isBusy,
  }
}
