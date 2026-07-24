export type Lang = 'ru' | 'en' | 'zh'

export type TaskType =
  | 'food'
  | 'transfer'
  | 'cleaning'
  | 'towels'
  | 'minibar'
  | 'gates'
  | 'custom'

export type TaskStatus =
  | 'new'
  | 'in_progress'
  | 'done'
  | 'cancelled'
  | 'archived'

export type MenuCategory = 'breakfast' | 'lunch' | 'dinner' | 'minibar'

export type MenuSubcategory = 'appetizers' | 'hot' | 'sides' | 'desserts' | 'drinks' | null

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner' | 'none'

export type AssignedRole = 'cook' | 'cleaning' | 'driver' | 'admin'

export type HouseStatus = 'occupied' | 'vacant'

export type ServiceLocation = 'cabin' | 'terrace' | 'gazebo'

export interface TaskItem {
  menuItemId: string
  name: string
  price: number
  quantity: number
}

export interface Task {
  id: string
  houseId: string
  type: TaskType
  status: TaskStatus
  createdAt: string
  updatedAt: string
  desiredAt?: string
  description?: string
  geo?: string
  assignedTo?: AssignedRole
  items?: TaskItem[]
  location?: ServiceLocation
  guestCount?: number
  priceFix?: number
  km?: number
}

export type Translations = Partial<Record<Lang, {
  name: string
  description?: string
}>>

export interface MenuItem {
  id: string
  name: string
  description?: string
  category: MenuCategory
  subcat?: MenuSubcategory
  price: number
  isAvailable: boolean
}

export interface House {
  id: string
  number: number
  status: HouseStatus
  deviceToken?: string
}

export interface GuestSession {
  id: string
  houseId: string
  guestCount?: number
  lang: Lang
  checkInAt?: string
  checkOutAt?: string
  isActive: boolean
}

export interface Service {
  id: string
  name: string
  requiresTime: boolean
  priceInfo?: string
  icon?: string
  description?: string
  showDescription?: boolean
  booking?: boolean
  bookingSlots?: string[]
  bookingLimit?: number
  jsonSchema?: Record<string, unknown>
  active: boolean
  assignedTo: AssignedRole
  translations?: Translations
}

export interface MealType {
  id: string
  name: string
  startTime: string
  endTime: string
}

export type MessageSender = 'GUEST' | 'STAFF'

export interface Message {
  id: string
  houseId: string
  sender: MessageSender
  text: string
  timestamp: string
  read: boolean
}

export interface Settings {
  phone: string
  wifiName: string
  wifiPassword: string
  rules: string
  description: string
  servicesText: string
}

export type WsEventType =
  | 'task:new'
  | 'task:updated'
  | 'task:cancelled'
  | 'message:new'
  | 'gate:request'
  | 'gate:confirmed'
  | 'connection:ping'

export interface WsEvent<T = unknown> {
  type: WsEventType
  payload: T
}
