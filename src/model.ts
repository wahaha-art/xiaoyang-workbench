export type CoreViewId = 'dashboard' | 'study' | 'jobs' | 'drinks' | 'calendar' | 'resources' | 'backup' | 'settings'
export type ConfigurableCoreViewId = Exclude<CoreViewId, 'dashboard' | 'backup' | 'settings'>
export type ViewId = CoreViewId | `custom:${string}`
export type SidebarIconKey = 'book' | 'briefcase' | 'coffee' | 'calendar' | 'folder' | 'checklist' | 'habit' | 'notes'
export type CustomModuleTemplate = 'checklist' | 'habit' | 'calendar' | 'notes'

export interface CoreNavigationItem {
  id: ConfigurableCoreViewId
  label: string
  icon: SidebarIconKey
  visible: boolean
  order: number
}

export interface CustomModuleItem {
  id: string
  title: string
  note: string
  createdAt: string
  date?: string
  completed?: boolean
  checkins?: string[]
}

export interface CustomModule {
  id: string
  name: string
  template: CustomModuleTemplate
  icon: SidebarIconKey
  color: string
  visible: boolean
  order: number
  items: CustomModuleItem[]
}

export type StudyMode = '刷题' | '看课' | '复盘' | '背诵' | '模考' | '其他'

export interface Subject {
  id: string
  name: string
  parentId: string | null
  color: string
  active: boolean
}

export interface StudySession {
  id: string
  date: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  subjectId: string
  mode: StudyMode
  title: string
  totalQuestions?: number
  correctQuestions?: number
}

export interface StudyTimer {
  subjectId: string
  mode: StudyMode
  title: string
  hasQuestions: boolean
  timerKind: 'stopwatch' | 'countdown'
  targetMinutes?: number
  startedAt: number
  accumulatedMs: number
  running: boolean
}

export interface StudyCountdown {
  id: string
  title: string
  targetDate: string
  color: string
  note: string
  completed: boolean
}

export type TaskStatus = 'pending' | 'completed' | 'missed'
export type RepeatMode = 'none' | 'daily' | 'weekdays'

export interface Task {
  id: string
  seriesId: string
  name: string
  date: string
  subjectId?: string
  targetMinutes?: number
  repeat: RepeatMode
  status: TaskStatus
  completedAt?: string
  rolloverFrom?: string
}

export type JobStatus = '收藏' | '待投递' | '已投递' | '笔试' | '面试' | '体检/政审' | '录用' | '淘汰' | '放弃' | string

export interface Job {
  id: string
  company: string
  title: string
  city: string
  organizationType: string
  recruitmentType: string
  startDate?: string
  deadline?: string
  officialUrl: string
  sourceName: string
  verifiedAt?: string
  favorite: boolean
  status: JobStatus
  resumeId?: string
  writtenDate?: string
  interviewDate?: string
  notes: string
  origin: 'manual' | 'feed'
}

export interface DrinkBrand {
  id: string
  name: string
  mark: string
  color: string
  logoDataUrl?: string
  active: boolean
}

export interface DrinkRecord {
  id: string
  date: string
  time: string
  brandId: string
  product: string
  amount: number
  cups: number
}

export type EventType = '考试' | '考试报名' | '网申截止' | '笔试' | '面试' | '体检政审' | '其他'

export interface CalendarEvent {
  id: string
  title: string
  type: EventType
  startsAt: string
  allDay: boolean
  relatedJobId?: string
  notes: string
}

export interface ResourceItem {
  id: string
  name: string
  type: 'pdf' | 'link'
  category: '简历' | '考试公告' | '招聘公告' | '课程资料' | '其他'
  url?: string
  blob?: Blob
  size?: number
  createdAt: string
}

export interface AppSettings {
  drinkLimit: number
  studyCheckinMinutes: number
  customJobStatuses: string[]
  darkMode: boolean
  navigation: CoreNavigationItem[]
}

export interface AppMeta {
  version: number
  lastBackupAt?: string
  lastJobSyncAt?: string
  lastJobSyncNote?: string
}

export interface AppState {
  subjects: Subject[]
  sessions: StudySession[]
  timer: StudyTimer | null
  studyCountdowns: StudyCountdown[]
  tasks: Task[]
  jobs: Job[]
  drinkBrands: DrinkBrand[]
  drinks: DrinkRecord[]
  events: CalendarEvent[]
  resources: ResourceItem[]
  customModules: CustomModule[]
  settings: AppSettings
  meta: AppMeta
}

export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`

export const localDate = (input: Date | number | string = new Date()) => {
  const date = input instanceof Date ? input : new Date(input)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const formatDate = (value?: string) => {
  if (!value) return '未设置'
  const [year, month, day] = value.slice(0, 10).split('-')
  return `${year}年${Number(month)}月${Number(day)}日`
}

export const formatMinutes = (minutes: number) => {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  return hours ? `${hours}小时${rest ? `${rest}分` : ''}` : `${rest}分钟`
}

const subjects: Subject[] = [
  { id: 'xingce', name: '行测', parentId: null, color: '#ef5a2f', active: true },
  { id: 'ziliao', name: '资料分析', parentId: 'xingce', color: '#ef5a2f', active: true },
  { id: 'yanyu', name: '言语理解', parentId: 'xingce', color: '#6c63d9', active: true },
  { id: 'panduan', name: '判断推理', parentId: 'xingce', color: '#2f7ed8', active: true },
  { id: 'tuxing', name: '图形推理', parentId: 'panduan', color: '#3f8ae0', active: true },
  { id: 'dingyi', name: '定义判断', parentId: 'panduan', color: '#59a0e8', active: true },
  { id: 'leibi', name: '类比推理', parentId: 'panduan', color: '#7ab5ed', active: true },
  { id: 'luoji', name: '逻辑判断', parentId: 'panduan', color: '#99c8f1', active: true },
  { id: 'shuliang', name: '数量关系', parentId: 'xingce', color: '#d6942f', active: true },
  { id: 'changshi', name: '常识判断', parentId: 'xingce', color: '#1f9d67', active: true },
  { id: 'shenlun', name: '申论', parentId: null, color: '#cf4e80', active: true },
  { id: 'gailuo', name: '归纳概括', parentId: 'shenlun', color: '#cf4e80', active: true },
  { id: 'fenxi', name: '综合分析', parentId: 'shenlun', color: '#a85a99', active: true },
  { id: 'duice', name: '提出对策', parentId: 'shenlun', color: '#825fab', active: true },
  { id: 'guanche', name: '贯彻执行', parentId: 'shenlun', color: '#5d6eb9', active: true },
  { id: 'xiezuo', name: '文章写作', parentId: 'shenlun', color: '#416fa8', active: true },
]

const drinkBrands: DrinkBrand[] = [
  { id: 'luckin', name: '瑞幸咖啡', mark: '瑞', color: '#1764c0', active: true },
  { id: 'mollytea', name: '茉莉奶白', mark: '茉', color: '#4f765f', active: true },
  { id: 'alittletea', name: '一点点', mark: '1', color: '#f18b22', active: true },
  { id: 'heytea', name: '喜茶', mark: '喜', color: '#202020', active: true },
  { id: 'chayan', name: '茶颜悦色', mark: '茶', color: '#ba3232', active: true },
  { id: 'manner', name: 'Manner', mark: 'M', color: '#202020', active: true },
  { id: 'guming', name: '古茗', mark: '古', color: '#ef2d2d', active: true },
  { id: 'chabaidao', name: '茶百道', mark: '百', color: '#f0b426', active: true },
  { id: 'chagee', name: '霸王茶姬', mark: '霸', color: '#9a1f2d', active: true },
]

const defaultNavigation: CoreNavigationItem[] = [
  { id: 'study', label: '学习中心', icon: 'book', visible: true, order: 10 },
  { id: 'jobs', label: '求职中心', icon: 'briefcase', visible: true, order: 20 },
  { id: 'drinks', label: '饮品日历', icon: 'coffee', visible: true, order: 30 },
  { id: 'calendar', label: '日程与倒计时', icon: 'calendar', visible: true, order: 40 },
  { id: 'resources', label: '资料中心', icon: 'folder', visible: true, order: 50 },
]

export const createDefaultState = (): AppState => ({
  subjects,
  sessions: [],
  timer: null,
  studyCountdowns: [],
  tasks: [],
  jobs: [],
  drinkBrands,
  drinks: [],
  events: [],
  resources: [],
  customModules: [],
  settings: { drinkLimit: 6, studyCheckinMinutes: 30, customJobStatuses: [], darkMode: false, navigation: defaultNavigation.map((item) => ({ ...item })) },
  meta: { version: 3 },
})

const nextWeekday = (date: Date) => {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  while (next.getDay() === 0 || next.getDay() === 6) next.setDate(next.getDate() + 1)
  return next
}

export const normalizeTasks = (state: AppState): AppState => {
  const today = localDate()
  const tasks = state.tasks.map((task) => ({ ...task }))
  const generated: Task[] = []

  for (const task of tasks) {
    if (task.status === 'pending' && task.date < today) {
      task.status = 'missed'
      const alreadyRolled = tasks.some((candidate) => candidate.rolloverFrom === task.id) || generated.some((candidate) => candidate.rolloverFrom === task.id)
      if (!alreadyRolled) {
        generated.push({ ...task, id: uid(), date: today, status: 'pending', completedAt: undefined, rolloverFrom: task.id })
      }
    }

    if (task.status === 'completed' && task.repeat !== 'none' && task.date < today) {
      const desired = task.repeat === 'weekdays' ? localDate(nextWeekday(new Date(`${task.date}T12:00:00`))) : localDate(new Date(`${task.date}T12:00:00`).getTime() + 86_400_000)
      const nextDate = desired < today ? today : desired
      const exists = tasks.some((candidate) => candidate.seriesId === task.seriesId && candidate.date >= nextDate) || generated.some((candidate) => candidate.seriesId === task.seriesId && candidate.date >= nextDate)
      if (!exists && (task.repeat !== 'weekdays' || ![0, 6].includes(new Date(`${nextDate}T12:00:00`).getDay()))) {
        generated.push({ ...task, id: uid(), date: nextDate, status: 'pending', completedAt: undefined, rolloverFrom: undefined })
      }
    }
  }

  return { ...state, tasks: [...tasks, ...generated] }
}

export const normalizeState = (stored?: Partial<AppState>): AppState => {
  const defaults = createDefaultState()
  const savedNavigation = Array.isArray(stored?.settings?.navigation) ? stored.settings.navigation : []
  const navigation = defaults.settings.navigation.map((defaultItem) => ({
    ...defaultItem,
    ...savedNavigation.find((item) => item.id === defaultItem.id),
    id: defaultItem.id,
  }))
  const customModules = Array.isArray(stored?.customModules) ? stored.customModules.map((module, index) => ({
    ...module,
    name: module.name || `自定义模块 ${index + 1}`,
    icon: module.icon || (module.template === 'habit' ? 'habit' : module.template === 'calendar' ? 'calendar' : module.template === 'notes' ? 'notes' : 'checklist'),
    color: module.color || '#3d72c7',
    visible: module.visible !== false,
    order: Number.isFinite(module.order) ? module.order : 60 + index * 10,
    items: Array.isArray(module.items) ? module.items : [],
  })) : []
  const timer = stored?.timer ? {
    ...stored.timer,
    timerKind: stored.timer.timerKind === 'countdown' ? 'countdown' as const : 'stopwatch' as const,
    targetMinutes: stored.timer.timerKind === 'countdown' && Number(stored.timer.targetMinutes) > 0 ? Number(stored.timer.targetMinutes) : undefined,
  } : null
  const studyCheckinMinutes = Number(stored?.settings?.studyCheckinMinutes)
  const normalized: AppState = {
    ...defaults,
    ...stored,
    subjects: Array.isArray(stored?.subjects) ? stored.subjects : defaults.subjects,
    sessions: Array.isArray(stored?.sessions) ? stored.sessions : [],
    timer,
    studyCountdowns: Array.isArray(stored?.studyCountdowns) ? stored.studyCountdowns : [],
    tasks: Array.isArray(stored?.tasks) ? stored.tasks : [],
    jobs: Array.isArray(stored?.jobs) ? stored.jobs : [],
    drinkBrands: Array.isArray(stored?.drinkBrands) ? stored.drinkBrands : defaults.drinkBrands,
    drinks: Array.isArray(stored?.drinks) ? stored.drinks : [],
    events: Array.isArray(stored?.events) ? stored.events : [],
    resources: Array.isArray(stored?.resources) ? stored.resources : [],
    customModules,
    settings: { ...defaults.settings, ...stored?.settings, studyCheckinMinutes: studyCheckinMinutes > 0 ? studyCheckinMinutes : defaults.settings.studyCheckinMinutes, navigation },
    meta: { ...defaults.meta, ...stored?.meta, version: 3 },
  }
  return normalizeTasks(normalized)
}

const DB_NAME = 'xiaoyang-workbench'
const STORE_NAME = 'app-state'
const STATE_KEY = 'current'

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1)
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME)
  }
  request.onsuccess = () => resolve(request.result)
  request.onerror = () => reject(request.error)
})

export const loadState = async (): Promise<AppState> => {
  const database = await openDatabase()
  const stored = await new Promise<AppState | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(STATE_KEY)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  database.close()
  return normalizeState(stored)
}

export const saveState = async (state: AppState) => {
  const database = await openDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(state, STATE_KEY)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

export const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

export const dataUrlToBlob = async (dataUrl: string) => (await fetch(dataUrl)).blob()

export const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
