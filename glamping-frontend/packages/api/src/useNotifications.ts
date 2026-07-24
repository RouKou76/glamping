import { useEffect, useCallback } from 'react'

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function useNotifications(onEvent?: (title: string, body: string) => void) {
  const notify = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/icon-192.png' })
    }
    onEvent?.(title, body)
  }, [onEvent])

  useEffect(() => {
    requestNotificationPermission()
  }, [])

  return { notify }
}
