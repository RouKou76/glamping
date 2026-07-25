import { useAuth } from '../contexts/AuthContext'

interface CanProps {
  permission: string
  children: React.ReactNode
}

export function Can({ permission, children }: CanProps) {
  const { hasPermission } = useAuth()
  return hasPermission(permission) ? <>{children}</> : null
}
