import { ChangeEvent, CSSProperties, Dispatch, FormEvent, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Clock3,
  CloudDownload,
  Coffee,
  Download,
  ExternalLink,
  FileText,
  FolderOpen,
  Gauge,
  HeartPulse,
  Home,
  Link as LinkIcon,
  ListChecks,
  Menu,
  Moon,
  MoreHorizontal,
  NotebookPen,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Share2,
  Square,
  Sun,
  Target,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  AppState,
  CalendarEvent,
  CustomModule,
  CustomModuleItem,
  CustomModuleTemplate,
  DrinkBrand,
  DrinkRecord,
  EventType,
  Job,
  ResourceItem,
  SidebarIconKey,
  StudyMode,
  StudySession,
  Subject,
  Task,
  ViewId,
  blobToDataUrl,
  createDefaultState,
  dataUrlToBlob,
  downloadBlob,
  formatDate,
  formatMinutes,
  loadState,
  localDate,
  normalizeState,
  saveState,
  uid,
} from './model'

const MODES: StudyMode[] = ['刷题', '看课', '复盘', '背诵', '模考', '其他']
const EVENT_TYPES: EventType[] = ['考试', '考试报名', '网申截止', '笔试', '面试', '体检政审', '其他']
const DEFAULT_JOB_STATUSES = ['收藏', '待投递', '已投递', '笔试', '面试', '体检/政审', '录用', '淘汰', '放弃']

const OFFICIAL_JOB_SOURCES = [
  { name: '国聘行动', description: '央企、国企与重点单位招聘信息', url: 'https://www.iguopin.com/', kind: '官网' },
  { name: '国务院国资委', description: '中央企业招聘与人才工作信息', url: 'https://www.sasac.gov.cn/', kind: '官网' },
  { name: '中智招聘', description: '央国企、校园与社会招聘项目', url: 'https://www.ciiczhaopin.com/', kind: '官网' },
  { name: '江苏省人社厅', description: '事业单位招聘、人才引进与考试公告', url: 'https://jshrss.jiangsu.gov.cn/', kind: '官网' },
  { name: '江苏人社公众号', description: '在微信内关注“江苏人社”，看到公告后手动录入', url: '', kind: '微信' },
] as const

const DEFAULT_BRAND_LOGOS: Record<string, string> = {
  luckin: './brands/luckin-cropped.webp',
  mollytea: './brands/mollytea.webp',
  alittletea: './brands/alittletea.webp',
  heytea: './brands/heytea.webp',
  chayan: './brands/chayan-icon.webp',
  manner: './brands/manner.webp',
  guming: './brands/guming-icon.webp',
  chabaidao: './brands/chabaidao-icon.webp',
  chagee: './brands/chagee.webp',
}

const BRAND_PRODUCTS: Record<string, string[]> = {
  luckin: ['生椰拿铁', '丝绒拿铁', '标准美式', '橙C美式', '抹茶瑞纳冰'],
  mollytea: ['茉莉奶白', '针王苹果', '白兰', '葡萄茉莉奶白', '桂花酒酿奶白'],
  alittletea: ['四季奶青', '波霸奶茶', '冰淇淋红茶', '四季春茶', '柠檬养乐多'],
  heytea: ['多肉葡萄', '烤黑糖波波牛乳', '芝芝莓莓', '纯绿妍茶后', '轻芝多肉红柚'],
  chayan: ['幽兰拿铁', '声声乌龙', '筝筝纸鸢', '桂花弄', '风栖绿桂', '少年时', '三季虫'],
  manner: ['拿铁', '美式', '澳白', '燕麦拿铁', '桂花拿铁'],
  guming: ['云岭茉莉白', '超A芝士葡萄', '杨枝甘露', '芝士莓莓', '茉莉奶绿'],
  chabaidao: ['豆乳玉麒麟', '杨枝甘露', '招牌芋圆奶茶', '超级杯水果茶', '茉莉奶绿', '桂花酒酿奶绿'],
  chagee: ['伯牙绝弦', '桂馥兰香', '花田乌龙', '万里木兰', '青青糯山'],
}

const SIDEBAR_ICONS: Record<SidebarIconKey, typeof Home> = {
  book: BookOpen,
  briefcase: BriefcaseBusiness,
  coffee: Coffee,
  calendar: CalendarDays,
  folder: FolderOpen,
  checklist: ListChecks,
  habit: HeartPulse,
  notes: NotebookPen,
}

const ICON_LABELS: Record<SidebarIconKey, string> = {
  book: '书本', briefcase: '公文包', coffee: '饮品', calendar: '日历', folder: '文件夹', checklist: '清单', habit: '打卡', notes: '笔记',
}

const MODULE_TEMPLATES: Record<CustomModuleTemplate, { label: string; detail: string; icon: SidebarIconKey }> = {
  checklist: { label: '清单', detail: '待办事项与完成进度', icon: 'checklist' },
  habit: { label: '打卡', detail: '每天记录一次完成情况', icon: 'habit' },
  calendar: { label: '日历', detail: '按日期安排和查看事项', icon: 'calendar' },
  notes: { label: '笔记', detail: '保存文字记录和想法', icon: 'notes' },
}

type SidebarNavItem = { id: ViewId; label: string; icon: typeof Home; order: number; kind: 'fixed' | 'core' | 'custom' }

const sidebarItemsForState = (state: AppState, includeHidden = false): SidebarNavItem[] => {
  const flexible: SidebarNavItem[] = [
    ...state.settings.navigation
      .filter((item) => includeHidden || item.visible)
      .map((item) => ({ id: item.id, label: item.label, icon: SIDEBAR_ICONS[item.icon], order: item.order, kind: 'core' as const })),
    ...state.customModules
      .filter((item) => includeHidden || item.visible)
      .map((item) => ({ id: `custom:${item.id}` as ViewId, label: item.name, icon: SIDEBAR_ICONS[item.icon], order: item.order, kind: 'custom' as const })),
  ].sort((a, b) => a.order - b.order)
  return [
    { id: 'dashboard', label: '首页总览', icon: Home, order: -1, kind: 'fixed' },
    ...flexible,
    { id: 'backup', label: '数据备份', icon: Archive, order: Number.MAX_SAFE_INTEGER - 1, kind: 'fixed' },
    { id: 'settings', label: '设置', icon: Settings, order: Number.MAX_SAFE_INTEGER, kind: 'fixed' },
  ]
}

const field = (data: FormData, name: string) => String(data.get(name) ?? '').trim()
const numberField = (data: FormData, name: string) => Number(data.get(name) || 0)

function useClock(timer: AppState['timer']) {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!timer?.running) return
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [timer?.running])

  if (!timer) return 0
  return timer.accumulatedMs + (timer.running ? Date.now() - timer.startedAt : 0)
}

function formatStopwatch(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  const hours = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const minutes = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const rest = String(seconds % 60).padStart(2, '0')
  return `${hours}:${minutes}:${rest}`
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="关闭"><X size={19} /></button>
        </header>
        {children}
      </section>
    </div>
  )
}

function EmptyState({ icon: Icon, title, detail, action }: { icon: typeof Home; title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><Icon size={22} /></span>
      <strong>{title}</strong>
      <p>{detail}</p>
      {action}
    </div>
  )
}

function StatusBadge({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'accent'; children: ReactNode }) {
  return <span className={`status-badge ${tone}`}>{children}</span>
}

function App() {
  const [state, setState] = useState<AppState>(createDefaultState())
  const [ready, setReady] = useState(false)
  const [view, setView] = useState<ViewId>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toast, setToast] = useState('')
  const saveTimer = useRef<number>()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    loadState()
      .then((loaded) => {
        setState(loaded)
        setReady(true)
      })
      .catch(() => {
        setReady(true)
        setToast('本地数据读取失败，已使用空白工作台')
      })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.darkMode ? 'dark' : 'light'
  }, [state.settings.darkMode])

  useEffect(() => {
    if (!ready) return
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveState(state).catch(() => setToast('保存失败，请立即导出备份'))
    }, 240)
    return () => window.clearTimeout(saveTimer.current)
  }, [ready, state])

  useEffect(() => {
    if (!ready) return
    const persistBeforeBackground = () => saveState(stateRef.current).catch(() => undefined)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') persistBeforeBackground()
    }
    window.addEventListener('pagehide', persistBeforeBackground)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('pagehide', persistBeforeBackground)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [ready])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const navigate = (next: ViewId) => {
    setView(next)
    setSidebarOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const refreshJobs = async (manual = false) => {
    try {
      const response = await fetch('./jobs.json', { cache: 'no-store' })
      if (!response.ok) throw new Error('职位源不可用')
      const payload = await response.json() as { updatedAt?: string | null; sourceNote?: string; jobs?: Job[] }
      const feedJobs = Array.isArray(payload.jobs) ? payload.jobs.filter((job) => job.officialUrl && job.sourceName) : []
      setState((current) => {
        const manualJobs = current.jobs.filter((job) => job.origin === 'manual')
        const existingByKey = new Map(current.jobs.map((job) => [`${job.officialUrl}|${job.title}`, job]))
        const mergedFeed = feedJobs.map((job) => ({ ...job, ...existingByKey.get(`${job.officialUrl}|${job.title}`), origin: 'feed' as const }))
        return {
          ...current,
          jobs: [...manualJobs, ...mergedFeed],
          meta: {
            ...current.meta,
            lastJobSyncAt: new Date().toISOString(),
            lastJobSyncNote: payload.sourceNote || (feedJobs.length ? `已核验 ${feedJobs.length} 条职位` : '职位源暂时没有可用信息'),
          },
        }
      })
      if (manual) setToast(feedJobs.length ? `已更新 ${feedJobs.length} 条招聘信息` : (payload.sourceNote || '官方来源已配置，暂无解析后的新职位'))
    } catch {
      if (manual) setToast('职位源暂时无法连接，请稍后重试')
    }
  }

  useEffect(() => {
    const checkedToday = state.meta.lastJobSyncAt?.slice(0, 10) === localDate()
    const legacyDisconnectedMessage = state.meta.lastJobSyncNote?.includes('尚未连接官方')
    if (!ready || (checkedToday && !legacyDisconnectedMessage)) return
    refreshJobs(false)
  }, [ready])

  if (!ready) {
    return <div className="app-loading"><span className="brand-mark"><Check size={24} /></span><strong>正在打开小阳的工作台</strong></div>
  }

  const common = { state, setState, setToast }
  const sidebarItems = sidebarItemsForState(state)
  const activeNavItem = sidebarItemsForState(state, true).find((item) => item.id === view)
  const activeCustomModule = view.startsWith('custom:') ? state.customModules.find((module) => `custom:${module.id}` === view) : undefined

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark"><Check size={21} strokeWidth={3} /></span>
          <div><strong>小阳的工作台</strong><small>学习 · 求职 · 生活</small></div>
          <button className="icon-button sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="收起侧边栏"><X size={20} /></button>
        </div>
        <nav aria-label="工作台导航">
          {sidebarItems.map(({ id, label, icon: Icon }) => (
            <button key={id} className={view === id ? 'active' : ''} onClick={() => navigate(id)}>
              <Icon size={19} /><span>{label}</span>
              {id === 'jobs' && state.jobs.filter((job) => job.favorite).length > 0 && <em>{state.jobs.filter((job) => job.favorite).length}</em>}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="privacy-note"><span><CheckCircle2 size={16} /></span><div><strong>数据保存在本机</strong><small>记得每月导出备份</small></div></div>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="关闭侧边栏" />}

      <div className="main-column">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="打开侧边栏"><Menu size={21} /></button>
          <div className="topbar-title"><strong>{activeNavItem?.label ?? '小阳的工作台'}</strong><span>{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())}</span></div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={() => setState((current) => ({ ...current, settings: { ...current.settings, darkMode: !current.settings.darkMode } }))} aria-label="切换明暗模式">
              {state.settings.darkMode ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="icon-button" onClick={() => navigate('calendar')} aria-label="查看提醒"><Bell size={19} /></button>
          </div>
        </header>

        <main>
          {view === 'dashboard' && <DashboardView {...common} navigate={navigate} />}
          {view === 'study' && <StudyView {...common} />}
          {view === 'jobs' && <JobsView {...common} refreshJobs={refreshJobs} />}
          {view === 'drinks' && <DrinksView {...common} />}
          {view === 'calendar' && <CalendarView {...common} />}
          {view === 'resources' && <ResourcesView {...common} />}
          {view === 'backup' && <BackupView {...common} />}
          {view === 'settings' && <SettingsView {...common} />}
          {activeCustomModule && <CustomModuleView {...common} module={activeCustomModule} />}
        </main>
      </div>
      {toast && <div className="toast" role="status"><CheckCircle2 size={17} />{toast}</div>}
    </div>
  )
}

type ViewProps = {
  state: AppState
  setState: Dispatch<SetStateAction<AppState>>
  setToast: (message: string) => void
}

function DashboardView({ state, setState, setToast, navigate }: ViewProps & { navigate: (view: ViewId) => void }) {
  const today = localDate()
  const todaySessions = state.sessions.filter((session) => session.date === today)
  const todayMinutes = todaySessions.reduce((sum, session) => sum + session.durationMinutes, 0)
  const todayTasks = state.tasks.filter((task) => task.date === today)
  const doneTasks = todayTasks.filter((task) => task.status === 'completed').length
  const month = today.slice(0, 7)
  const monthDrinks = state.drinks.filter((drink) => drink.date.startsWith(month))
  const monthCups = monthDrinks.reduce((sum, drink) => sum + drink.cups, 0)
  const monthSpend = monthDrinks.reduce((sum, drink) => sum + drink.amount, 0)
  const upcomingJobs = state.jobs
    .filter((job) => job.deadline && job.deadline >= today && !['淘汰', '放弃'].includes(job.status))
    .sort((a, b) => String(a.deadline).localeCompare(String(b.deadline)))
    .slice(0, 3)
  const upcomingEvents = state.events
    .filter((event) => event.startsAt.slice(0, 10) >= today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 3)
  const backupDue = state.meta.lastBackupAt?.slice(0, 7) !== month

  const toggleTask = (task: Task) => {
    setState((current) => ({
      ...current,
      tasks: current.tasks.map((item) => item.id === task.id ? { ...item, status: item.status === 'completed' ? 'pending' : 'completed', completedAt: item.status === 'completed' ? undefined : new Date().toISOString() } : item),
    }))
  }

  return (
    <div className="page dashboard-page">
      <section className="page-intro">
        <div><span className="eyebrow">今日节奏</span><h1>早上好，小阳</h1><p>把今天重要的事稳稳推进一点。</p></div>
        <button className="primary-button" onClick={() => navigate('study')}><Play size={17} fill="currentColor" />开始学习</button>
      </section>

      {backupDue && (
        <button className="notice-strip" onClick={() => navigate('backup')}>
          <span><CloudDownload size={19} /></span>
          <div><strong>本月还没有备份</strong><small>普通备份不包含 PDF，文件很小</small></div>
          <ChevronRight size={18} />
        </button>
      )}

      <section className="metric-grid">
        <button className="metric-card accent-card" onClick={() => navigate('study')}>
          <span className="metric-icon"><Clock3 size={19} /></span><small>今日学习</small><strong>{formatMinutes(todayMinutes)}</strong><em>{todaySessions.length} 条记录</em>
        </button>
        <button className="metric-card" onClick={() => navigate('study')}>
          <span className="metric-icon green"><Target size={19} /></span><small>今日任务</small><strong>{doneTasks}/{todayTasks.length}</strong><em>{todayTasks.length ? `完成率 ${Math.round(doneTasks / todayTasks.length * 100)}%` : '还没有任务'}</em>
        </button>
        <button className="metric-card" onClick={() => navigate('drinks')}>
          <span className="metric-icon rose"><Coffee size={19} /></span><small>本月饮品</small><strong>{monthCups}/{state.settings.drinkLimit} 杯</strong><em>已花 ¥{monthSpend.toFixed(0)}</em>
        </button>
      </section>

      <div className="dashboard-columns">
        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">TODAY</span><h2>今日任务</h2></div><button className="text-button" onClick={() => navigate('study')}>查看全部<ChevronRight size={15} /></button></div>
          {todayTasks.length ? (
            <div className="task-list compact">
              {todayTasks.slice(0, 5).map((task) => (
                <button key={task.id} className={`task-row ${task.status}`} onClick={() => toggleTask(task)}>
                  <span className="task-check">{task.status === 'completed' && <Check size={15} />}</span>
                  <span><strong>{task.name}</strong><small>{task.targetMinutes ? `目标 ${task.targetMinutes} 分钟` : '点击完成打卡'}</small></span>
                </button>
              ))}
            </div>
          ) : <EmptyState icon={CheckCircle2} title="今天还没有任务" detail="添加一个小目标，让今天有清晰的落点。" action={<button className="secondary-button" onClick={() => navigate('study')}><Plus size={16} />添加任务</button>} />}
        </section>

        <section className="panel">
          <div className="section-heading"><div><span className="eyebrow">DEADLINES</span><h2>近期节点</h2></div><button className="text-button" onClick={() => navigate('calendar')}>日程<ChevronRight size={15} /></button></div>
          {upcomingJobs.length + upcomingEvents.length > 0 ? (
            <div className="timeline-list">
              {upcomingJobs.map((job) => <div className="timeline-row" key={job.id}><span className="timeline-date">{job.deadline?.slice(5).replace('-', '/')}</span><div><strong>{job.company}</strong><small>{job.title} · 网申截止</small></div><StatusBadge tone="warning">求职</StatusBadge></div>)}
              {upcomingEvents.map((event) => <div className="timeline-row" key={event.id}><span className="timeline-date">{event.startsAt.slice(5, 10).replace('-', '/')}</span><div><strong>{event.title}</strong><small>{event.type}</small></div><StatusBadge tone="accent">日程</StatusBadge></div>)}
            </div>
          ) : <EmptyState icon={CalendarDays} title="近期没有截止事项" detail="添加网申、考试或笔面试日期后会出现在这里。" />}
        </section>
      </div>

      <section className="panel quick-panel">
        <div className="section-heading"><div><span className="eyebrow">QUICK ADD</span><h2>快速记录</h2></div></div>
        <div className="quick-actions">
          <button onClick={() => navigate('study')}><span><BookOpen size={19} /></span>学习记录</button>
          <button onClick={() => navigate('jobs')}><span><BriefcaseBusiness size={19} /></span>招聘信息</button>
          <button onClick={() => navigate('drinks')}><span><Coffee size={19} /></span>饮品</button>
          <button onClick={() => navigate('calendar')}><span><CalendarDays size={19} /></span>日程</button>
        </div>
      </section>
    </div>
  )
}

function DonutChart({ values, selected, onSelect, totalLabel, totalCaption = '今日累计' }: { values: Array<{ id: string; label: string; value: number; color: string }>; selected?: string; onSelect?: (id: string) => void; totalLabel: string; totalCaption?: string }) {
  const total = values.reduce((sum, item) => sum + item.value, 0)
  let current = -90
  const polar = (angle: number) => ({ x: 100 + 76 * Math.cos(angle * Math.PI / 180), y: 100 + 76 * Math.sin(angle * Math.PI / 180) })
  const pathFor = (start: number, end: number) => {
    const from = polar(start)
    const to = polar(end)
    return `M ${from.x} ${from.y} A 76 76 0 ${end - start > 180 ? 1 : 0} 1 ${to.x} ${to.y}`
  }

  return (
    <div className="donut-wrap">
      <svg className="donut" viewBox="0 0 200 200" role="img" aria-label="学习时间科目占比">
        <circle cx="100" cy="100" r="76" fill="none" stroke="var(--line)" strokeWidth="26" />
        {total > 0 && values.map((item) => {
          const start = current
          const angle = item.value / total * 360
          current += angle
          return <path key={item.id} d={pathFor(start + 0.8, current - 0.8)} fill="none" stroke={item.color} strokeWidth={selected === item.id ? 34 : 27} strokeLinecap="round" className="donut-segment" onClick={() => onSelect?.(item.id)} />
        })}
      </svg>
      <div className="donut-center"><strong>{totalLabel}</strong><small>{total ? totalCaption : '暂无记录'}</small></div>
    </div>
  )
}

function StudyView({ state, setState, setToast }: ViewProps) {
  const [startOpen, setStartOpen] = useState(false)
  const [finishOpen, setFinishOpen] = useState(false)
  const [manualOpen, setManualOpen] = useState(false)
  const [taskOpen, setTaskOpen] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>()
  const [selectedDate, setSelectedDate] = useState(() => localDate())
  const elapsed = useClock(state.timer)
  const today = localDate()
  const isToday = selectedDate === today
  const daySessions = state.sessions.filter((session) => session.date === selectedDate)
  const subjects = state.subjects.filter((subject) => subject.active && subject.parentId !== null)
  const dayValues = subjects.map((subject) => ({
    id: subject.id,
    label: subject.name,
    color: subject.color,
    value: daySessions.filter((session) => session.subjectId === subject.id).reduce((sum, session) => sum + session.durationMinutes, 0),
  })).filter((item) => item.value > 0)
  const dayMinutes = dayValues.reduce((sum, item) => sum + item.value, 0)
  const selectedSessions = selectedSubject ? daySessions.filter((session) => session.subjectId === selectedSubject) : daySessions
  const dayTasks = state.tasks.filter((task) => task.date === selectedDate).sort((a, b) => Number(a.status === 'completed') - Number(b.status === 'completed'))
  const month = selectedDate.slice(0, 7)
  const monthSessions = state.sessions.filter((session) => session.date.startsWith(month))
  const monthMinutes = monthSessions.reduce((sum, session) => sum + session.durationMinutes, 0)
  const studyDays = new Set(monthSessions.map((session) => session.date)).size
  const questionSessions = monthSessions.filter((session) => session.totalQuestions)
  const totalQuestions = questionSessions.reduce((sum, session) => sum + (session.totalQuestions ?? 0), 0)
  const correctQuestions = questionSessions.reduce((sum, session) => sum + (session.correctQuestions ?? 0), 0)
  const selectedDayTitle = isToday ? '今日' : `${Number(selectedDate.slice(5, 7))}月${Number(selectedDate.slice(8, 10))}日`
  const selectedWeekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(new Date(`${selectedDate}T12:00:00`))
  const monthLabel = `${Number(month.slice(5))}月${month.slice(0, 4) === today.slice(0, 4) ? '' : ` · ${month.slice(0, 4)}年`}`

  const activeSubject = state.subjects.find((subject) => subject.id === state.timer?.subjectId)

  const selectDate = (date: string) => {
    if (!date || date > today) return
    setSelectedDate(date)
    setSelectedSubject(undefined)
  }

  const moveDate = (amount: number) => {
    const next = new Date(`${selectedDate}T12:00:00`)
    next.setDate(next.getDate() + amount)
    selectDate(localDate(next))
  }

  const pauseOrResume = () => setState((current) => {
    if (!current.timer) return current
    if (current.timer.running) {
      return { ...current, timer: { ...current.timer, accumulatedMs: current.timer.accumulatedMs + Date.now() - current.timer.startedAt, running: false } }
    }
    return { ...current, timer: { ...current.timer, startedAt: Date.now(), running: true } }
  })

  const discardTimer = () => {
    if (!window.confirm('确定放弃本次计时吗？')) return
    setState((current) => ({ ...current, timer: null }))
  }

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const date = field(data, 'date')
    const task: Task = {
      id: uid(), seriesId: uid(), name: field(data, 'name'), date,
      subjectId: field(data, 'subjectId') || undefined,
      targetMinutes: numberField(data, 'targetMinutes') || undefined,
      repeat: field(data, 'repeat') as Task['repeat'], status: date < today ? 'missed' : 'pending',
    }
    setState((current) => ({ ...current, tasks: [...current.tasks, task] }))
    setTaskOpen(false)
    setToast('任务已添加')
  }

  const nextRepeatDate = (date: string, repeat: Task['repeat']) => {
    const next = new Date(`${date}T12:00:00`)
    next.setDate(next.getDate() + 1)
    if (repeat === 'weekdays') while ([0, 6].includes(next.getDay())) next.setDate(next.getDate() + 1)
    return localDate(next)
  }

  const toggleTask = (task: Task) => setState((current) => {
    const completing = task.status !== 'completed'
    const incompleteStatus = task.date < today ? 'missed' as const : 'pending' as const
    let tasks = current.tasks.map((item) => item.id === task.id ? { ...item, status: completing ? 'completed' as const : incompleteStatus, completedAt: completing ? new Date().toISOString() : undefined } : item)
    if (completing && task.repeat !== 'none' && task.date >= today) {
      const date = nextRepeatDate(task.date, task.repeat)
      if (!tasks.some((item) => item.seriesId === task.seriesId && item.date === date)) {
        tasks = [...tasks, { ...task, id: uid(), date, status: 'pending', completedAt: undefined, rolloverFrom: undefined }]
      }
    }
    return { ...current, tasks }
  })

  const beginTimer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setState((current) => ({ ...current, timer: {
      subjectId: field(data, 'subjectId'), mode: field(data, 'mode') as StudyMode,
      title: field(data, 'title'), hasQuestions: data.get('hasQuestions') === 'on',
      startedAt: Date.now(), accumulatedMs: 0, running: true,
    } }))
    setStartOpen(false)
  }

  const finishTimer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!state.timer) return
    const data = new FormData(event.currentTarget)
    const totalQuestions = numberField(data, 'totalQuestions') || undefined
    const correctQuestions = numberField(data, 'correctQuestions') || undefined
    if (totalQuestions && (correctQuestions ?? 0) > totalQuestions) return setToast('正确题数不能大于总题数')
    const currentMs = state.timer.accumulatedMs + (state.timer.running ? Date.now() - state.timer.startedAt : 0)
    const endedAt = new Date()
    const startedAt = new Date(endedAt.getTime() - currentMs)
    const session: StudySession = {
      id: uid(), date: localDate(endedAt), startedAt: startedAt.toISOString(), endedAt: endedAt.toISOString(),
      durationMinutes: Math.max(1, Math.round(currentMs / 60_000)), subjectId: state.timer.subjectId,
      mode: state.timer.mode, title: state.timer.title, totalQuestions, correctQuestions,
    }
    setState((current) => ({ ...current, timer: null, sessions: [...current.sessions, session] }))
    setFinishOpen(false)
    setToast('本次学习已记录')
  }

  const addManualSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const total = numberField(data, 'totalQuestions') || undefined
    const correct = numberField(data, 'correctQuestions') || undefined
    if (total && (correct ?? 0) > total) return setToast('正确题数不能大于总题数')
    const date = field(data, 'date')
    const duration = numberField(data, 'durationMinutes')
    const endedAt = new Date(`${date}T20:00:00`)
    const session: StudySession = {
      id: uid(), date, durationMinutes: duration, subjectId: field(data, 'subjectId'), mode: field(data, 'mode') as StudyMode,
      title: field(data, 'title'), startedAt: new Date(endedAt.getTime() - duration * 60_000).toISOString(), endedAt: endedAt.toISOString(),
      totalQuestions: total, correctQuestions: correct,
    }
    setState((current) => ({ ...current, sessions: [...current.sessions, session] }))
    setManualOpen(false)
    setToast('学习记录已添加')
  }

  return (
    <div className="page study-page">
      <section className="page-intro compact-intro">
        <div><span className="eyebrow">STUDY</span><h1>学习中心</h1><p>专注当下，也看见持续积累的轨迹。</p></div>
        <div className="button-row"><button className="secondary-button" onClick={() => setManualOpen(true)}><Pencil size={16} />手动记录</button><button className="primary-button" onClick={() => setStartOpen(true)} disabled={Boolean(state.timer)}><Play size={16} fill="currentColor" />开始计时</button></div>
      </section>

      {state.timer && (
        <section className="focus-timer">
          <div className="focus-meta"><span className="live-dot" /><span>正在学习</span><StatusBadge tone="accent">{state.timer.mode}</StatusBadge></div>
          <div className="timer-main"><div><strong>{activeSubject?.name}</strong><small>{state.timer.title || '专注进行中'}</small></div><time>{formatStopwatch(elapsed)}</time></div>
          <div className="timer-actions"><button className="timer-secondary" onClick={discardTimer}><Square size={17} />放弃</button><button className="timer-secondary" onClick={pauseOrResume}>{state.timer.running ? <Pause size={17} /> : <Play size={17} />}{state.timer.running ? '暂停' : '继续'}</button><button className="timer-finish" onClick={() => setFinishOpen(true)}><Check size={17} />结束并记录</button></div>
        </section>
      )}

      <section className="study-date-nav" aria-label="选择要查看的学习日期">
        <button className="icon-button bordered" onClick={() => moveDate(-1)} aria-label="查看前一天"><ChevronLeft size={19} /></button>
        <label className="study-date-current">
          <CalendarDays size={19} />
          <input type="date" value={selectedDate} max={today} onChange={(event) => selectDate(event.target.value)} aria-label="选择学习日期" />
          <small>{selectedWeekday}</small>
        </label>
        <button className="icon-button bordered" onClick={() => moveDate(1)} disabled={isToday} aria-label="查看后一天"><ChevronRight size={19} /></button>
        <button className="secondary-button small-button study-today-button" onClick={() => selectDate(today)} disabled={isToday}>回到今天</button>
      </section>

      <div className="study-grid">
        <section className="panel study-donut-panel">
          <div className="section-heading"><div><span className="eyebrow">DAILY</span><h2>{selectedDayTitle}学习圆盘</h2></div><StatusBadge tone="neutral">{daySessions.length} 条记录</StatusBadge></div>
          <div className="donut-layout">
            <DonutChart values={dayValues} selected={selectedSubject} onSelect={(id) => setSelectedSubject((current) => current === id ? undefined : id)} totalLabel={formatMinutes(dayMinutes)} totalCaption={isToday ? '今日累计' : '当日累计'} />
            <div className="legend-list">
              {dayValues.length ? dayValues.map((item) => <button className={selectedSubject === item.id ? 'selected' : ''} key={item.id} onClick={() => setSelectedSubject((current) => current === item.id ? undefined : item.id)}><span style={{ background: item.color }} /><strong>{item.label}</strong><em>{formatMinutes(item.value)}</em></button>) : <p className="muted-copy">这一天还没有学习记录。</p>}
            </div>
          </div>
          {selectedSessions.length > 0 && <div className="session-list">{selectedSessions.map((session) => {
            const subject = state.subjects.find((item) => item.id === session.subjectId)
            return <div className="session-row" key={session.id}><span className="subject-dot" style={{ background: subject?.color }} /><div><strong>{session.title || subject?.name}</strong><small>{subject?.name} · {session.mode}{session.totalQuestions ? ` · ${session.correctQuestions}/${session.totalQuestions}题` : ''}</small></div><time>{formatMinutes(session.durationMinutes)}</time><button className="icon-button danger-hover" onClick={() => { if (window.confirm('删除这条学习记录？')) setState((current) => ({ ...current, sessions: current.sessions.filter((item) => item.id !== session.id) })) }} aria-label="删除记录"><Trash2 size={15} /></button></div>
          })}</div>}
        </section>

        <section className="panel task-panel">
          <div className="section-heading"><div><span className="eyebrow">CHECK IN</span><h2>{selectedDayTitle}任务</h2></div><button className="icon-button bordered" onClick={() => setTaskOpen(true)} aria-label="添加任务"><Plus size={18} /></button></div>
          {dayTasks.length ? <div className="task-list">{dayTasks.map((task) => {
            const subject = state.subjects.find((item) => item.id === task.subjectId)
            return <div className={`task-row static ${task.status}`} key={task.id}><button className="task-check" onClick={() => toggleTask(task)} aria-label={task.status === 'completed' ? '取消完成' : '完成任务'}>{task.status === 'completed' && <Check size={15} />}</button><span><strong>{task.name}</strong><small>{[subject?.name, task.targetMinutes ? `${task.targetMinutes}分钟` : '', task.repeat === 'daily' ? '每天' : task.repeat === 'weekdays' ? '工作日' : '', !isToday ? '历史记录' : ''].filter(Boolean).join(' · ') || '普通待办'}</small></span><button className="icon-button danger-hover" onClick={() => setState((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))} aria-label="删除任务"><Trash2 size={15} /></button></div>
          })}</div> : <EmptyState icon={Target} title={`${selectedDayTitle}没有任务`} detail={isToday ? '添加普通待办，也可以设为每天或工作日重复。' : '可以补录当天任务并标记完成状态。'} action={<button className="secondary-button" onClick={() => setTaskOpen(true)}><Plus size={16} />添加任务</button>} />}
        </section>
      </div>

      <section className="panel monthly-panel">
        <div className="section-heading"><div><span className="eyebrow">MONTHLY</span><h2>{month === today.slice(0, 7) ? '本月' : '当月'}学习汇总</h2></div><span className="month-label">{monthLabel}</span></div>
        <div className="monthly-stats">
          <div><small>总时长</small><strong>{formatMinutes(monthMinutes)}</strong></div><div><small>学习天数</small><strong>{studyDays} 天</strong></div><div><small>日均时长</small><strong>{formatMinutes(studyDays ? monthMinutes / studyDays : 0)}</strong></div><div><small>做题正确率</small><strong>{totalQuestions ? `${Math.round(correctQuestions / totalQuestions * 100)}%` : '--'}</strong></div>
        </div>
        <MonthTrend sessions={monthSessions} month={month} />
      </section>

      {startOpen && <Modal title="开始一次学习" onClose={() => setStartOpen(false)}><form className="form-stack" onSubmit={beginTimer}><FormFields subjects={subjects} /><label className="checkbox-line"><input type="checkbox" name="hasQuestions" />本次会记录题量和正确率</label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setStartOpen(false)}>取消</button><button className="primary-button"><Play size={16} />开始计时</button></div></form></Modal>}
      {finishOpen && state.timer && <Modal title="完成本次学习" onClose={() => setFinishOpen(false)}><form className="form-stack" onSubmit={finishTimer}><div className="finish-summary"><Clock3 size={20} /><span><strong>{formatStopwatch(elapsed)}</strong><small>{activeSubject?.name} · {state.timer.mode}</small></span></div>{state.timer.hasQuestions && <div className="form-grid"><label>总题量<input name="totalQuestions" type="number" min="1" required /></label><label>正确题数<input name="correctQuestions" type="number" min="0" required /></label></div>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setFinishOpen(false)}>继续学习</button><button className="primary-button"><Check size={16} />保存记录</button></div></form></Modal>}
      {manualOpen && <Modal title="手动添加学习记录" onClose={() => setManualOpen(false)}><form className="form-stack" onSubmit={addManualSession}><label>日期<input name="date" type="date" defaultValue={selectedDate} max={today} required /></label><FormFields subjects={subjects} /><label>学习时长（分钟）<input name="durationMinutes" type="number" min="1" required /></label><div className="form-grid"><label>总题量（可选）<input name="totalQuestions" type="number" min="1" /></label><label>正确题数（可选）<input name="correctQuestions" type="number" min="0" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setManualOpen(false)}>取消</button><button className="primary-button">保存</button></div></form></Modal>}
      {taskOpen && <Modal title="添加学习任务" onClose={() => setTaskOpen(false)}><form className="form-stack" onSubmit={addTask}><label>任务名称<input name="name" placeholder="例如：资料分析 20 题" required /></label><div className="form-grid"><label>日期<input name="date" type="date" defaultValue={selectedDate} required /></label><label>目标时长（可选）<input name="targetMinutes" type="number" min="1" placeholder="分钟" /></label></div><label>关联科目（可选）<select name="subjectId"><option value="">不关联</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>重复<select name="repeat" defaultValue="none"><option value="none">不重复</option><option value="daily">每天</option><option value="weekdays">工作日</option></select></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setTaskOpen(false)}>取消</button><button className="primary-button">添加任务</button></div></form></Modal>}
    </div>
  )
}

function FormFields({ subjects }: { subjects: Subject[] }) {
  return <><label>学习科目<select name="subjectId" required defaultValue=""><option value="" disabled>选择科目</option>{subjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label><label>学习方式<select name="mode" defaultValue="刷题">{MODES.map((mode) => <option key={mode}>{mode}</option>)}</select></label><label>记录标题（可选）<input name="title" placeholder="例如：增长率题型" /></label></>
}

function MonthTrend({ sessions, month }: { sessions: StudySession[]; month: string }) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const days = month === localDate().slice(0, 7) ? new Date().getDate() : daysInMonth
  const values = Array.from({ length: days }, (_, index) => sessions.filter((session) => Number(session.date.slice(8)) === index + 1).reduce((sum, session) => sum + session.durationMinutes, 0))
  const max = Math.max(60, ...values)
  return <div className="trend-chart" aria-label="本月每日学习时长趋势">{values.map((value, index) => <div key={index} title={`${index + 1}日：${formatMinutes(value)}`}><span style={{ height: `${Math.max(value ? 8 : 2, value / max * 100)}%` }} className={value ? 'has-value' : ''} /><small>{[0, 6, 13, 20, days - 1].includes(index) ? index + 1 : ''}</small></div>)}</div>
}

function daysUntil(date?: string) {
  if (!date) return null
  const today = new Date(`${localDate()}T00:00:00`).getTime()
  const target = new Date(`${date.slice(0, 10)}T00:00:00`).getTime()
  return Math.ceil((target - today) / 86_400_000)
}

function JobsView({ state, setState, setToast, refreshJobs }: ViewProps & { refreshJobs: (manual?: boolean) => Promise<void> }) {
  const [addOpen, setAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('全部状态')
  const allStatuses = [...DEFAULT_JOB_STATUSES, ...state.settings.customJobStatuses]
  const jobs = useMemo(() => state.jobs
    .filter((job) => !query || `${job.company}${job.title}${job.city}`.toLowerCase().includes(query.toLowerCase()))
    .filter((job) => status === '全部状态' || job.status === status)
    .sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
      return (a.deadline || '9999').localeCompare(b.deadline || '9999')
    }), [state.jobs, query, status])

  const addJob = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const job: Job = {
      id: uid(), company: field(data, 'company'), title: field(data, 'title'), city: field(data, 'city'),
      organizationType: field(data, 'organizationType'), recruitmentType: field(data, 'recruitmentType'),
      startDate: field(data, 'startDate') || undefined, deadline: field(data, 'deadline') || undefined,
      officialUrl: field(data, 'officialUrl'), sourceName: field(data, 'sourceName') || '手动添加',
      verifiedAt: new Date().toISOString(), favorite: false, status: field(data, 'status') || '待投递',
      resumeId: field(data, 'resumeId') || undefined, writtenDate: field(data, 'writtenDate') || undefined,
      interviewDate: field(data, 'interviewDate') || undefined, notes: field(data, 'notes'), origin: 'manual',
    }
    setState((current) => ({ ...current, jobs: [...current.jobs, job] }))
    setAddOpen(false)
    setToast('招聘信息已添加')
  }

  const addDeadlineEvent = (job: Job) => {
    if (!job.deadline) return
    const exists = state.events.some((event) => event.relatedJobId === job.id && event.type === '网申截止')
    if (exists) return setToast('该截止日期已在日程中')
    const event: CalendarEvent = { id: uid(), title: `${job.company} · ${job.title}`, type: '网申截止', startsAt: `${job.deadline}T09:00`, allDay: true, relatedJobId: job.id, notes: job.officialUrl }
    setState((current) => ({ ...current, events: [...current.events, event] }))
    setToast('已加入工作台日程')
  }

  const activeApplications = state.jobs.filter((job) => ['已投递', '笔试', '面试', '体检/政审'].includes(job.status)).length
  const urgent = state.jobs.filter((job) => { const days = daysUntil(job.deadline); return days !== null && days >= 0 && days <= 7 }).length

  return (
    <div className="page jobs-page">
      <section className="page-intro compact-intro">
        <div><span className="eyebrow">CAREER</span><h1>求职中心</h1><p>聚焦江苏，用一条清晰的流程管理每次机会。</p></div>
        <button className="primary-button" onClick={() => setAddOpen(true)}><Plus size={17} />添加招聘</button>
      </section>

      <section className="metric-grid jobs-metrics">
        <div className="metric-card"><span className="metric-icon"><BriefcaseBusiness size={19} /></span><small>全部机会</small><strong>{state.jobs.length}</strong><em>手动与官方来源</em></div>
        <div className="metric-card"><span className="metric-icon green"><Gauge size={19} /></span><small>进行中</small><strong>{activeApplications}</strong><em>投递至体检政审</em></div>
        <div className="metric-card"><span className="metric-icon rose"><Bell size={19} /></span><small>7天内截止</small><strong>{urgent}</strong><em>记得核对官网</em></div>
      </section>

      <section className="source-banner">
        <span><RefreshCw size={18} /></span>
        <div><strong>{state.meta.lastJobSyncNote || '已配置官方招聘入口'}</strong><small>{state.meta.lastJobSyncAt ? `上次检查：${new Date(state.meta.lastJobSyncAt).toLocaleString('zh-CN')}` : '先从官方来源查看公告，再将目标职位加入投递流程。'}</small></div>
        <button className="secondary-button small-button" onClick={() => refreshJobs(true)}><RefreshCw size={15} />立即检查</button>
      </section>

      <section className="panel source-center">
        <div className="section-heading"><div><span className="eyebrow">OFFICIAL SOURCES</span><h2>官方信息来源</h2></div><StatusBadge tone="success">5 个入口</StatusBadge></div>
        <div className="source-grid">
          {OFFICIAL_JOB_SOURCES.map((source, index) => source.url ? (
            <a href={source.url} target="_blank" rel="noreferrer" className="source-card" key={source.name}>
              <span className={`source-logo source-${index + 1}`}>{source.name.slice(0, 1)}</span>
              <div><strong>{source.name}</strong><p>{source.description}</p><small>{source.kind} · 点击打开</small></div>
              <ExternalLink size={16} />
            </a>
          ) : (
            <button className="source-card" key={source.name} onClick={() => setAddOpen(true)}>
              <span className={`source-logo source-${index + 1}`}>{source.name.slice(0, 1)}</span>
              <div><strong>{source.name}</strong><p>{source.description}</p><small>{source.kind} · 手动录入公告</small></div>
              <Plus size={16} />
            </button>
          ))}
        </div>
        <p className="source-footnote"><CircleAlert size={14} />官网结构和微信公众号内容可能变化；工作台只把带官方链接、来源和核验时间的信息视为真实职位。</p>
      </section>

      <section className="panel job-list-panel">
        <div className="filter-bar">
          <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索公司、岗位或城市" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}><option>全部状态</option>{allStatuses.map((item) => <option key={item}>{item}</option>)}</select>
        </div>
        {jobs.length ? <div className="job-list">{jobs.map((job) => {
          const remaining = daysUntil(job.deadline)
          return <article className="job-card" key={job.id}>
            <div className="job-card-head"><div className="company-avatar">{job.company.slice(0, 1)}</div><div><h3>{job.company}</h3><p>{job.title}</p></div><button className={`icon-button favorite ${job.favorite ? 'on' : ''}`} onClick={() => setState((current) => ({ ...current, jobs: current.jobs.map((item) => item.id === job.id ? { ...item, favorite: !item.favorite } : item) }))} aria-label={job.favorite ? '取消收藏' : '收藏'}><Target size={18} /></button></div>
            <div className="job-tags"><StatusBadge tone="neutral">{job.city || '江苏'}</StatusBadge><StatusBadge tone="neutral">{job.organizationType || '单位类型待补充'}</StatusBadge><StatusBadge tone="accent">{job.recruitmentType || '招聘类型待补充'}</StatusBadge></div>
            <div className="job-deadline"><CalendarDays size={16} /><span>{job.deadline ? `${formatDate(job.deadline)}截止` : '截止日期待核验'}</span>{remaining !== null && remaining >= 0 && <strong className={remaining <= 3 ? 'urgent' : ''}>剩 {remaining} 天</strong>}</div>
            <div className="job-controls"><select aria-label="投递状态" value={job.status} onChange={(event) => setState((current) => ({ ...current, jobs: current.jobs.map((item) => item.id === job.id ? { ...item, status: event.target.value } : item) }))}>{allStatuses.map((item) => <option key={item}>{item}</option>)}</select><button className="icon-button bordered" onClick={() => addDeadlineEvent(job)} disabled={!job.deadline} aria-label="加入日程"><CalendarDays size={17} /></button>{job.officialUrl && <a className="icon-button bordered" href={job.officialUrl} target="_blank" rel="noreferrer" aria-label="打开官网"><ExternalLink size={17} /></a>}<button className="icon-button danger-hover" onClick={() => { if (window.confirm('删除这条招聘记录？')) setState((current) => ({ ...current, jobs: current.jobs.filter((item) => item.id !== job.id) })) }} aria-label="删除"><Trash2 size={17} /></button></div>
            <footer><span>{job.sourceName || '手动添加'} · {job.verifiedAt ? `核验于 ${new Date(job.verifiedAt).toLocaleDateString('zh-CN')}` : '待核验'}</span><em>最终以官网为准</em></footer>
          </article>
        })}</div> : <EmptyState icon={BriefcaseBusiness} title={state.jobs.length ? '没有符合筛选的机会' : '还没有加入投递流程的职位'} detail={state.jobs.length ? '调整关键词或投递状态后再看。' : '从上方官方来源查看公告，把感兴趣的真实职位添加到这里。'} action={<button className="primary-button" onClick={() => setAddOpen(true)}><Plus size={16} />手动添加职位</button>} />}
      </section>

      {addOpen && <Modal title="添加招聘信息" onClose={() => setAddOpen(false)} wide><form className="form-stack" onSubmit={addJob}><div className="form-grid"><label>单位名称<input name="company" required /></label><label>岗位名称<input name="title" required /></label></div><div className="form-grid"><label>工作城市<input name="city" placeholder="例如：南京" /></label><label>单位类型<select name="organizationType"><option>央企</option><option>国企</option><option>事业单位</option><option>银行</option><option>政策性金融机构</option><option>运营商</option><option>其他</option></select></label></div><div className="form-grid"><label>招聘类型<select name="recruitmentType"><option>校招</option><option>实习</option><option>社招</option><option>人才引进</option></select></label><label>投递状态<select name="status">{allStatuses.map((item) => <option key={item}>{item}</option>)}</select></label></div><div className="form-grid"><label>开始日期<input name="startDate" type="date" /></label><label>截止日期<input name="deadline" type="date" /></label></div><label>官方链接<input name="officialUrl" type="url" placeholder="https://" /></label><label>信息来源<input name="sourceName" placeholder="例如：中国移动招聘官网" /></label><div className="form-grid"><label>笔试日期<input name="writtenDate" type="datetime-local" /></label><label>面试日期<input name="interviewDate" type="datetime-local" /></label></div><label>使用的简历<select name="resumeId"><option value="">尚未选择</option>{state.resources.filter((item) => item.category === '简历').map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>备注<textarea name="notes" rows={3} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAddOpen(false)}>取消</button><button className="primary-button">保存招聘</button></div></form></Modal>}
    </div>
  )
}

function BrandMark({ brand, small = false }: { brand?: DrinkBrand; small?: boolean }) {
  if (!brand) return <span className={`brand-logo ${small ? 'small' : ''}`}>?</span>
  const logo = brand.logoDataUrl || DEFAULT_BRAND_LOGOS[brand.id]
  return <span className={`brand-logo ${small ? 'small' : ''}`} style={{ background: brand.color }}><span className="brand-fallback">{brand.mark}</span>{logo && <img src={logo} alt={`${brand.name} Logo`} onError={(event) => { event.currentTarget.style.display = 'none' }} />}</span>
}

function DrinksView({ state, setState, setToast }: ViewProps) {
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [addDate, setAddDate] = useState<string>()
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const monthKey = localDate(cursor).slice(0, 7)
  const year = cursor.getFullYear()
  const monthRecords = state.drinks.filter((drink) => drink.date.startsWith(monthKey))
  const cups = monthRecords.reduce((sum, drink) => sum + drink.cups, 0)
  const spend = monthRecords.reduce((sum, drink) => sum + drink.amount, 0)
  const limitExceeded = cups > state.settings.drinkLimit
  const daysInMonth = new Date(year, cursor.getMonth() + 1, 0).getDate()
  const firstDay = new Date(year, cursor.getMonth(), 1).getDay()
  const blanks = (firstDay + 6) % 7
  const activeBrands = state.drinkBrands.filter((brand) => brand.active)

  const moveMonth = (amount: number) => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))

  const openDrinkEntry = (date: string) => {
    const brandId = activeBrands[0]?.id ?? ''
    setSelectedBrandId(brandId)
    setSelectedProduct(BRAND_PRODUCTS[brandId]?.[0] ?? '__custom__')
    setAddDate(date)
  }

  const chooseBrand = (brandId: string) => {
    setSelectedBrandId(brandId)
    setSelectedProduct(BRAND_PRODUCTS[brandId]?.[0] ?? '__custom__')
  }

  const addDrink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const product = field(data, 'product') === '__custom__' ? field(data, 'customProduct') : field(data, 'product')
    const record: DrinkRecord = { id: uid(), date: field(data, 'date'), time: field(data, 'time'), brandId: field(data, 'brandId'), product, amount: numberField(data, 'amount'), cups: Math.max(1, numberField(data, 'cups')) }
    setState((current) => ({ ...current, drinks: [...current.drinks, record] }))
    setAddDate(undefined)
    setToast('饮品已记入日历')
  }

  const yearMonths = Array.from({ length: 12 }, (_, monthIndex) => {
    const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`
    const records = state.drinks.filter((drink) => drink.date.startsWith(key))
    return { month: monthIndex + 1, cups: records.reduce((sum, drink) => sum + drink.cups, 0), spend: records.reduce((sum, drink) => sum + drink.amount, 0) }
  })

  return (
    <div className="page drinks-page">
      <section className="page-intro compact-intro"><div><span className="eyebrow">DRINKS</span><h1>饮品日历</h1><p>享受喜欢的味道，也守住每月的小约定。</p></div><button className="primary-button" onClick={() => openDrinkEntry(localDate())}><Plus size={17} />记录一杯</button></section>
      <section className={`drink-hero ${limitExceeded ? 'over' : ''}`}><div><span>{limitExceeded ? '本月已超过计划' : '本月饮品计划'}</span><strong>{cups}<small> / {state.settings.drinkLimit} 杯</small></strong><p>{limitExceeded ? `超出 ${cups - state.settings.drinkLimit} 杯，下个月重新开始。` : `还可以喝 ${Math.max(0, state.settings.drinkLimit - cups)} 杯，慢慢挑喜欢的。`}</p></div><div className="spend-block"><small>本月开销</small><strong>¥{spend.toFixed(2)}</strong></div></section>

      <section className="panel calendar-panel">
        <div className="calendar-toolbar"><button className="icon-button" onClick={() => moveMonth(-1)} aria-label="上个月"><ChevronLeft /></button><div><strong>{year}年{cursor.getMonth() + 1}月</strong><small>{monthRecords.length} 次记录</small></div><button className="icon-button" onClick={() => moveMonth(1)} aria-label="下个月"><ChevronRight /></button></div>
        <div className="calendar-weekdays">{['一', '二', '三', '四', '五', '六', '日'].map((day) => <span key={day}>{day}</span>)}</div>
        <div className="drink-calendar-grid">
          {Array.from({ length: blanks }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const date = `${monthKey}-${String(day).padStart(2, '0')}`
            const records = monthRecords.filter((record) => record.date === date)
            return <button key={date} className={`${date === localDate() ? 'today' : ''} ${records.length ? 'has-drink' : ''}`} onClick={() => openDrinkEntry(date)}><time>{day}</time>{records.length ? <div className="calendar-logos">{records.slice(0, 2).map((record) => <BrandMark key={record.id} brand={state.drinkBrands.find((brand) => brand.id === record.brandId)} small />)}{records.reduce((sum, record) => sum + record.cups, 0) > 1 && <em>{records.reduce((sum, record) => sum + record.cups, 0)}</em>}</div> : <Plus size={13} className="day-plus" />}</button>
          })}
        </div>
      </section>

      {monthRecords.length > 0 && <section className="panel drink-details"><div className="section-heading"><div><span className="eyebrow">THIS MONTH</span><h2>本月明细</h2></div></div><div className="drink-list">{[...monthRecords].sort((a, b) => b.date.localeCompare(a.date)).map((record) => { const brand = state.drinkBrands.find((item) => item.id === record.brandId); return <div className="drink-row" key={record.id}><BrandMark brand={brand} /><div><strong>{brand?.name}</strong><small>{record.product || '未填写产品'} · {formatDate(record.date)}</small></div><span>{record.cups}杯</span><strong>¥{record.amount.toFixed(2)}</strong><button className="icon-button danger-hover" onClick={() => setState((current) => ({ ...current, drinks: current.drinks.filter((item) => item.id !== record.id) }))} aria-label="删除"><Trash2 size={15} /></button></div>})}</div></section>}

      <section className="panel year-overview"><div className="section-heading"><div><span className="eyebrow">YEARLY</span><h2>{year}年度总览</h2></div><span className="month-label">{yearMonths.filter((month) => month.cups > state.settings.drinkLimit).length} 个月超限</span></div><div className="year-month-grid">{yearMonths.map((month) => <button key={month.month} className={month.cups > state.settings.drinkLimit ? 'over' : 'within'} onClick={() => setCursor(new Date(year, month.month - 1, 1))}><span>{month.month}月</span><strong>{month.cups}杯</strong><small>¥{month.spend.toFixed(0)}</small></button>)}</div></section>

      {addDate && <Modal title={`${formatDate(addDate)} · 记录饮品`} onClose={() => setAddDate(undefined)}><form className="form-stack" onSubmit={addDrink}><input type="hidden" name="date" value={addDate} /><label>选择品牌<div className="brand-picker">{activeBrands.map((brand) => <label key={brand.id}><input type="radio" name="brandId" value={brand.id} checked={selectedBrandId === brand.id} onChange={() => chooseBrand(brand.id)} /><span><BrandMark brand={brand} /><small>{brand.name}</small></span></label>)}</div></label><div className="form-grid"><label>时间<input name="time" type="time" defaultValue={new Date().toTimeString().slice(0, 5)} required /></label><label>杯数<input name="cups" type="number" min="1" defaultValue="1" required /></label></div><label>产品名称<select name="product" value={selectedProduct} onChange={(event) => setSelectedProduct(event.target.value)}>{(BRAND_PRODUCTS[selectedBrandId] ?? []).map((product) => <option key={product} value={product}>{product}</option>)}<option value="__custom__">其他 / 自定义</option></select></label>{selectedProduct === '__custom__' && <label>自定义产品名称<input name="customProduct" placeholder="输入饮品名称" required /></label>}<label>金额<input name="amount" type="number" min="0" step="0.01" placeholder="0.00" required /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAddDate(undefined)}>取消</button><button className="primary-button"><Check size={16} />保存记录</button></div></form></Modal>}
    </div>
  )
}

function CalendarView({ state, setState, setToast }: ViewProps) {
  const [addOpen, setAddOpen] = useState(false)
  const today = localDate()
  const events = [...state.events].sort((a, b) => a.startsAt.localeCompare(b.startsAt))

  const addEvent = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const item: CalendarEvent = { id: uid(), title: field(data, 'title'), type: field(data, 'type') as EventType, startsAt: field(data, 'startsAt'), allDay: data.get('allDay') === 'on', relatedJobId: field(data, 'relatedJobId') || undefined, notes: field(data, 'notes') }
    setState((current) => ({ ...current, events: [...current.events, item] }))
    setAddOpen(false)
    setToast('日程已添加')
  }

  const exportIcs = (item: CalendarEvent) => {
    const escape = (value: string) => value.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n')
    const start = item.startsAt.replace(/[-:]/g, '').replace('T', 'T').slice(0, 15)
    const dateOnly = item.startsAt.slice(0, 10).replace(/-/g, '')
    const dtStart = item.allDay ? `DTSTART;VALUE=DATE:${dateOnly}` : `DTSTART:${start}`
    const content = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Xiaoyang Workbench//CN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT', `UID:${item.id}@xiaoyang-workbench`, dtStart, `SUMMARY:${escape(item.title)}`, `DESCRIPTION:${escape(item.notes || item.type)}`, 'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${escape(item.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
    downloadBlob(new Blob([content], { type: 'text/calendar;charset=utf-8' }), `${item.title}.ics`)
    setToast('日历文件已生成，请选择加入苹果日历')
  }

  return <div className="page calendar-page">
    <section className="page-intro compact-intro"><div><span className="eyebrow">SCHEDULE</span><h1>日程与倒计时</h1><p>把报名、网申、考试和笔面试放在同一条时间线上。</p></div><button className="primary-button" onClick={() => setAddOpen(true)}><Plus size={17} />添加日程</button></section>
    <section className="panel schedule-panel">{events.length ? <div className="schedule-list">{events.map((item) => { const remaining = daysUntil(item.startsAt); const past = item.startsAt.slice(0, 10) < today; return <article className={`schedule-card ${past ? 'past' : ''}`} key={item.id}><div className="schedule-date"><strong>{item.startsAt.slice(8, 10)}</strong><span>{Number(item.startsAt.slice(5, 7))}月</span></div><div className="schedule-content"><div><StatusBadge tone={item.type === '网申截止' ? 'warning' : 'accent'}>{item.type}</StatusBadge>{remaining !== null && !past && <em>{remaining === 0 ? '今天' : `还有 ${remaining} 天`}</em>}</div><h3>{item.title}</h3><p>{item.allDay ? '全天' : item.startsAt.slice(11, 16)}{item.notes ? ` · ${item.notes}` : ''}</p></div><div className="schedule-actions"><button className="secondary-button small-button" onClick={() => exportIcs(item)}><CalendarDays size={15} />加入苹果日历</button><button className="icon-button danger-hover" onClick={() => setState((current) => ({ ...current, events: current.events.filter((event) => event.id !== item.id) }))} aria-label="删除"><Trash2 size={16} /></button></div></article>})}</div> : <EmptyState icon={CalendarDays} title="日程还是空的" detail="添加第一个考试、网申截止或面试时间。" action={<button className="primary-button" onClick={() => setAddOpen(true)}><Plus size={16} />添加日程</button>} />}</section>
    {addOpen && <Modal title="添加日程" onClose={() => setAddOpen(false)}><form className="form-stack" onSubmit={addEvent}><label>事项名称<input name="title" required /></label><label>类型<select name="type">{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label>日期和时间<input name="startsAt" type="datetime-local" required /></label><label className="checkbox-line"><input type="checkbox" name="allDay" />全天事项</label><label>关联招聘（可选）<select name="relatedJobId"><option value="">不关联</option>{state.jobs.map((job) => <option key={job.id} value={job.id}>{job.company} · {job.title}</option>)}</select></label><label>备注<textarea name="notes" rows={3} /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAddOpen(false)}>取消</button><button className="primary-button">保存日程</button></div></form></Modal>}
  </div>
}

function ResourcesView({ state, setState, setToast }: ViewProps) {
  const [pdfOpen, setPdfOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const totalBytes = state.resources.reduce((sum, item) => sum + (item.size ?? 0), 0)

  const addPdf = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const file = data.get('file')
    if (!(file instanceof File) || !file.size) return setToast('请选择 PDF 文件')
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setToast('只支持 PDF 文件')
    const item: ResourceItem = { id: uid(), name: field(data, 'name') || file.name.replace(/\.pdf$/i, ''), type: 'pdf', category: field(data, 'category') as ResourceItem['category'], blob: file, size: file.size, createdAt: new Date().toISOString() }
    setState((current) => ({ ...current, resources: [...current.resources, item] }))
    setPdfOpen(false)
    setToast('PDF 已保存在本机')
  }

  const addLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const item: ResourceItem = { id: uid(), name: field(data, 'name'), type: 'link', category: field(data, 'category') as ResourceItem['category'], url: field(data, 'url'), createdAt: new Date().toISOString() }
    setState((current) => ({ ...current, resources: [...current.resources, item] }))
    setLinkOpen(false)
    setToast('资料链接已保存')
  }

  const openPdf = (item: ResourceItem) => {
    if (!item.blob) return setToast('本地 PDF 文件已缺失')
    const url = URL.createObjectURL(item.blob)
    window.open(url, '_blank')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  const sharePdf = async (item: ResourceItem) => {
    if (!item.blob) return
    const file = new File([item.blob], `${item.name}.pdf`, { type: 'application/pdf' })
    try {
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share({ files: [file], title: item.name })
      else downloadBlob(item.blob, `${item.name}.pdf`)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') downloadBlob(item.blob, `${item.name}.pdf`)
    }
  }

  return <div className="page resources-page">
    <section className="page-intro compact-intro"><div><span className="eyebrow">FILES</span><h1>资料中心</h1><p>简历保存在本机，大文件不进入普通备份。</p></div><div className="button-row"><button className="secondary-button" onClick={() => setLinkOpen(true)}><LinkIcon size={16} />添加链接</button><button className="primary-button" onClick={() => setPdfOpen(true)}><Upload size={16} />上传 PDF</button></div></section>
    <section className="storage-strip"><span><FolderOpen size={19} /></span><div><strong>本地附件 {state.resources.filter((item) => item.type === 'pdf').length} 个</strong><small>共 {(totalBytes / 1024 / 1024).toFixed(2)} MB · 建议长期保留不超过10份简历</small></div></section>
    <section className="panel resource-panel">{state.resources.length ? <div className="resource-grid">{state.resources.map((item) => <article className="resource-card" key={item.id}><span className={`resource-icon ${item.type}`} >{item.type === 'pdf' ? <FileText /> : <LinkIcon />}</span><div><StatusBadge tone="neutral">{item.category}</StatusBadge><h3>{item.name}</h3><p>{item.type === 'pdf' ? `${((item.size ?? 0) / 1024 / 1024).toFixed(2)} MB` : item.url}</p></div><footer>{item.type === 'pdf' ? <><button className="icon-button bordered" onClick={() => openPdf(item)} aria-label="预览"><FolderOpen size={17} /></button><button className="icon-button bordered" onClick={() => sharePdf(item)} aria-label="分享至WPS"><Share2 size={17} /></button></> : <a className="icon-button bordered" href={item.url} target="_blank" rel="noreferrer" aria-label="打开链接"><ExternalLink size={17} /></a>}<button className="icon-button danger-hover" onClick={() => { if (window.confirm(`删除“${item.name}”？`)) setState((current) => ({ ...current, resources: current.resources.filter((resource) => resource.id !== item.id) })) }} aria-label="删除"><Trash2 size={17} /></button></footer></article>)}</div> : <EmptyState icon={FolderOpen} title="资料中心还是空的" detail="上传简历 PDF，或收藏考试公告、招聘公告和课程链接。" />}</section>
    {pdfOpen && <Modal title="上传 PDF" onClose={() => setPdfOpen(false)}><form className="form-stack" onSubmit={addPdf}><label>文件名称<input name="name" placeholder="例如：国企技术岗简历 V3" /></label><label>分类<select name="category" defaultValue="简历"><option>简历</option><option>考试公告</option><option>招聘公告</option><option>其他</option></select></label><label className="file-drop"><Upload size={22} /><span>选择 PDF 文件</span><small>文件只保存在当前设备</small><input name="file" type="file" accept="application/pdf,.pdf" required /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setPdfOpen(false)}>取消</button><button className="primary-button">保存到本机</button></div></form></Modal>}
    {linkOpen && <Modal title="添加资料链接" onClose={() => setLinkOpen(false)}><form className="form-stack" onSubmit={addLink}><label>名称<input name="name" required /></label><label>分类<select name="category"><option>考试公告</option><option>招聘公告</option><option>课程资料</option><option>其他</option></select></label><label>网址<input name="url" type="url" placeholder="https://" required /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setLinkOpen(false)}>取消</button><button className="primary-button">保存链接</button></div></form></Modal>}
  </div>
}

function CustomModuleView({ module, setState, setToast }: ViewProps & { module: CustomModule }) {
  const [addOpen, setAddOpen] = useState(false)
  const today = localDate()
  const template = MODULE_TEMPLATES[module.template]
  const ModuleIcon = SIDEBAR_ICONS[module.icon]
  const sortedItems = [...module.items].sort((a, b) => {
    if (module.template === 'calendar') return (a.date || '9999').localeCompare(b.date || '9999')
    if (module.template === 'notes') return b.createdAt.localeCompare(a.createdAt)
    if (module.template === 'checklist') return Number(Boolean(a.completed)) - Number(Boolean(b.completed))
    return a.title.localeCompare(b.title, 'zh-CN')
  })
  const completedCount = module.template === 'habit'
    ? module.items.filter((item) => item.checkins?.includes(today)).length
    : module.items.filter((item) => item.completed).length
  const secondaryCount = module.template === 'habit'
    ? module.items.reduce((sum, item) => sum + (item.checkins?.length ?? 0), 0)
    : module.template === 'calendar'
      ? module.items.filter((item) => item.date && item.date >= today && !item.completed).length
      : module.template === 'notes'
        ? module.items.filter((item) => item.createdAt.slice(0, 7) === today.slice(0, 7)).length
        : module.items.length ? Math.round(completedCount / module.items.length * 100) : 0

  const updateItems = (updater: (items: CustomModuleItem[]) => CustomModuleItem[]) => {
    setState((current) => ({
      ...current,
      customModules: current.customModules.map((item) => item.id === module.id ? { ...item, items: updater(item.items) } : item),
    }))
  }

  const addItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const item: CustomModuleItem = {
      id: uid(),
      title: field(data, 'title'),
      note: field(data, 'note'),
      date: module.template === 'calendar' ? field(data, 'date') : undefined,
      completed: false,
      checkins: module.template === 'habit' ? [] : undefined,
      createdAt: new Date().toISOString(),
    }
    updateItems((items) => [...items, item])
    setAddOpen(false)
    setToast(`${template.label}内容已添加`)
  }

  const toggleItem = (item: CustomModuleItem) => {
    updateItems((items) => items.map((candidate) => {
      if (candidate.id !== item.id) return candidate
      if (module.template === 'habit') {
        const checkins = candidate.checkins ?? []
        return { ...candidate, checkins: checkins.includes(today) ? checkins.filter((date) => date !== today) : [...checkins, today] }
      }
      return { ...candidate, completed: !candidate.completed }
    }))
  }

  const itemStatus = (item: CustomModuleItem) => module.template === 'habit' ? Boolean(item.checkins?.includes(today)) : Boolean(item.completed)

  return <div className="page custom-module-page">
    <section className="page-intro compact-intro custom-module-intro" style={{ '--module-color': module.color } as CSSProperties}>
      <div className="custom-module-title"><span className="custom-module-mark"><ModuleIcon size={22} /></span><div><span className="eyebrow">CUSTOM · {template.label}</span><h1>{module.name}</h1><p>{template.detail}</p></div></div>
      <button className="primary-button" onClick={() => setAddOpen(true)}><Plus size={17} />新增内容</button>
    </section>

    <section className="custom-summary" aria-label={`${module.name}统计`}>
      <div><small>全部内容</small><strong>{module.items.length}</strong></div>
      <div><small>{module.template === 'habit' ? '今日完成' : module.template === 'notes' ? '本月新增' : '已完成'}</small><strong>{module.template === 'notes' ? secondaryCount : completedCount}</strong></div>
      <div><small>{module.template === 'habit' ? '累计打卡' : module.template === 'calendar' ? '即将发生' : module.template === 'notes' ? '全部笔记' : '完成率'}</small><strong>{module.template === 'checklist' ? `${secondaryCount}%` : module.template === 'notes' ? module.items.length : secondaryCount}</strong></div>
    </section>

    <section className="panel custom-items-panel">
      <div className="section-heading"><div><span className="eyebrow">CONTENTS</span><h2>{template.label}内容</h2></div><StatusBadge tone={completedCount ? 'success' : 'neutral'}>{completedCount} 项完成</StatusBadge></div>
      {sortedItems.length ? <div className="custom-item-list">{sortedItems.map((item) => {
        const done = itemStatus(item)
        const itemMeta = module.template === 'habit'
          ? `累计 ${item.checkins?.length ?? 0} 天`
          : module.template === 'calendar'
            ? formatDate(item.date)
            : module.template === 'notes'
              ? new Date(item.createdAt).toLocaleDateString('zh-CN')
              : done ? '已完成' : '待完成'
        return <article className={`custom-item-row ${done ? 'completed' : ''}`} key={item.id}>
          {module.template === 'notes'
            ? <span className="custom-item-note-icon"><NotebookPen size={18} /></span>
            : <button className={`custom-item-check ${done ? 'done' : ''}`} onClick={() => toggleItem(item)} aria-label={done ? '取消完成' : module.template === 'habit' ? '今日打卡' : '标记完成'}>{done ? <Check size={16} /> : module.template === 'habit' ? <HeartPulse size={16} /> : null}</button>}
          <div><strong>{item.title}</strong><small>{itemMeta}</small>{item.note && <p>{item.note}</p>}</div>
          <button className="icon-button danger-hover" onClick={() => { if (window.confirm(`删除“${item.title}”？`)) updateItems((items) => items.filter((candidate) => candidate.id !== item.id)) }} aria-label="删除"><Trash2 size={16} /></button>
        </article>
      })}</div> : <EmptyState icon={ModuleIcon} title={`还没有${template.label}内容`} detail={`点击“新增内容”，开始使用${module.name}。`} action={<button className="secondary-button" onClick={() => setAddOpen(true)}><Plus size={16} />新增第一项</button>} />}
    </section>

    {addOpen && <Modal title={`新增${template.label}内容`} onClose={() => setAddOpen(false)}><form className="form-stack" onSubmit={addItem}>
      <label>{module.template === 'notes' ? '标题' : module.template === 'habit' ? '打卡项目' : '名称'}<input name="title" required placeholder={module.template === 'habit' ? '例如：早睡、运动、阅读' : module.template === 'notes' ? '输入笔记标题' : '输入内容名称'} /></label>
      {module.template === 'calendar' && <label>日期<input name="date" type="date" defaultValue={today} required /></label>}
      <label>{module.template === 'notes' ? '正文' : '备注（可选）'}<textarea name="note" rows={module.template === 'notes' ? 7 : 3} required={module.template === 'notes'} /></label>
      <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAddOpen(false)}>取消</button><button className="primary-button"><Plus size={16} />添加</button></div>
    </form></Modal>}
  </div>
}

async function stateForExport(state: AppState, includeFiles: boolean) {
  const resources = await Promise.all(state.resources.map(async (item) => ({
    ...item,
    blob: undefined,
    fileDataUrl: includeFiles && item.blob ? await blobToDataUrl(item.blob) : undefined,
  })))
  return { ...state, resources, exportedAt: new Date().toISOString(), backupIncludesFiles: includeFiles }
}

function BackupView({ state, setState, setToast }: ViewProps) {
  const [storage, setStorage] = useState<{ usage?: number; quota?: number }>({})
  useEffect(() => { navigator.storage?.estimate?.().then(setStorage).catch(() => undefined) }, [state.resources])

  const exportBackup = async (includeFiles: boolean) => {
    const payload = await stateForExport(state, includeFiles)
    const stamp = localDate().replace(/-/g, '')
    downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `小阳的工作台-${includeFiles ? '完整' : '普通'}备份-${stamp}.json`)
    setState((current) => ({ ...current, meta: { ...current.meta, lastBackupAt: new Date().toISOString() } }))
    setToast(includeFiles ? '完整备份已生成' : '普通备份已生成')
  }

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as Omit<AppState, 'resources'> & { resources: Array<ResourceItem & { fileDataUrl?: string }> }
      if (!Array.isArray(parsed.subjects) || !Array.isArray(parsed.sessions) || !parsed.settings) throw new Error('invalid')
      const resources = await Promise.all((parsed.resources ?? []).map(async ({ fileDataUrl, ...item }) => ({ ...item, blob: fileDataUrl ? await dataUrlToBlob(fileDataUrl) : undefined })))
      if (!window.confirm('恢复会覆盖当前工作台数据，确定继续吗？')) return
      setState(normalizeState({ ...parsed, resources, meta: { ...parsed.meta, lastBackupAt: new Date().toISOString() } }))
      setToast('备份恢复成功')
    } catch {
      setToast('无法识别这个备份文件')
    } finally {
      event.target.value = ''
    }
  }

  const exportCsv = () => {
    const rows: string[][] = [['类型', '日期', '名称', '分类或状态', '时长/杯数', '金额/正确率']]
    state.sessions.forEach((item) => rows.push(['学习', item.date, item.title || state.subjects.find((subject) => subject.id === item.subjectId)?.name || '', item.mode, String(item.durationMinutes), item.totalQuestions ? `${item.correctQuestions}/${item.totalQuestions}` : '']))
    state.tasks.forEach((item) => rows.push(['任务', item.date, item.name, item.status, item.targetMinutes ? String(item.targetMinutes) : '', '']))
    state.jobs.forEach((item) => rows.push(['求职', item.deadline || '', `${item.company} ${item.title}`, item.status, item.city, item.officialUrl]))
    state.drinks.forEach((item) => rows.push(['饮品', item.date, state.drinkBrands.find((brand) => brand.id === item.brandId)?.name || '', item.product, String(item.cups), String(item.amount)]))
    state.customModules.forEach((module) => module.items.forEach((item) => rows.push([`自定义-${MODULE_TEMPLATES[module.template].label}`, item.date || item.createdAt.slice(0, 10), `${module.name}：${item.title}`, item.completed ? '已完成' : item.checkins?.length ? `打卡${item.checkins.length}次` : '', item.note, ''])))
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`
    downloadBlob(new Blob([`\uFEFF${rows.map((row) => row.map(escape).join(',')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' }), `小阳的工作台数据-${localDate()}.csv`)
    setToast('CSV 总表已导出')
  }

  const usageMb = (storage.usage ?? 0) / 1024 / 1024
  const quotaMb = (storage.quota ?? 0) / 1024 / 1024

  return <div className="page backup-page">
    <section className="page-intro compact-intro"><div><span className="eyebrow">BACKUP</span><h1>数据备份</h1><p>本机保存很私密，但备份才能抵御清理浏览器或更换手机。</p></div></section>
    <section className="backup-status"><div className="backup-ring"><CloudDownload size={29} /></div><div><span>最近一次备份</span><strong>{state.meta.lastBackupAt ? new Date(state.meta.lastBackupAt).toLocaleString('zh-CN') : '还没有备份'}</strong><p>建议每月导出一次到 iCloud Drive。</p></div></section>
    <div className="backup-grid">
      <section className="panel backup-card"><span className="backup-icon"><Download /></span><div><h2>普通备份</h2><p>包含学习、任务、求职、饮品、日程和资料链接，不包含 PDF，文件很小。</p></div><button className="primary-button" onClick={() => exportBackup(false)}><Download size={16} />导出 JSON</button></section>
      <section className="panel backup-card"><span className="backup-icon full"><Archive /></span><div><h2>完整备份</h2><p>额外包含所有 PDF，文件可能较大。适合换手机前使用。</p></div><button className="secondary-button" onClick={() => exportBackup(true)}><Archive size={16} />包含 PDF 导出</button></section>
      <section className="panel backup-card"><span className="backup-icon green"><Upload /></span><div><h2>恢复备份</h2><p>选择以前导出的 JSON。确认后会覆盖当前数据。</p></div><label className="secondary-button file-button"><Upload size={16} />选择备份<input type="file" accept="application/json,.json" onChange={importBackup} /></label></section>
      <section className="panel backup-card"><span className="backup-icon rose"><FileText /></span><div><h2>导出总表</h2><p>生成可用 WPS 或 Excel 打开的 CSV 汇总表。</p></div><button className="secondary-button" onClick={exportCsv}><FileText size={16} />导出 CSV</button></section>
    </div>
    <section className="panel storage-panel"><div className="section-heading"><div><span className="eyebrow">DEVICE</span><h2>本机存储</h2></div><span>{usageMb.toFixed(1)} MB{quotaMb ? ` / ${quotaMb.toFixed(0)} MB` : ''}</span></div><div className="storage-bar"><span style={{ width: `${Math.min(100, quotaMb ? usageMb / quotaMb * 100 : 0)}%` }} /></div><p>具体配额由 iPhone 和 Safari 决定。删除桌面应用或清除网站数据都可能移除本地记录。</p></section>
  </div>
}

function SettingsView({ state, setState, setToast }: ViewProps) {
  const [subjectOpen, setSubjectOpen] = useState(false)
  const [brandOpen, setBrandOpen] = useState(false)
  const [moduleOpen, setModuleOpen] = useState(false)
  const [editingNav, setEditingNav] = useState<ViewId>()
  const roots = state.subjects.filter((subject) => subject.parentId === null)
  const manageableNavItems = sidebarItemsForState(state, true).filter((item) => item.kind !== 'fixed')
  const editingCore = editingNav && !editingNav.startsWith('custom:') ? state.settings.navigation.find((item) => item.id === editingNav) : undefined
  const editingCustom = editingNav?.startsWith('custom:') ? state.customModules.find((item) => `custom:${item.id}` === editingNav) : undefined

  const addSubject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const subject: Subject = { id: uid(), name: field(data, 'name'), parentId: field(data, 'parentId') || null, color: field(data, 'color') || '#ef5a2f', active: true }
    setState((current) => ({ ...current, subjects: [...current.subjects, subject] }))
    setSubjectOpen(false)
    setToast('学习科目已添加')
  }

  const addBrand = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const file = data.get('logo')
    const logoDataUrl = file instanceof File && file.size ? await blobToDataUrl(file) : undefined
    const brand: DrinkBrand = { id: uid(), name: field(data, 'name'), mark: field(data, 'mark').slice(0, 2), color: field(data, 'color') || '#ef5a2f', logoDataUrl, active: true }
    setState((current) => ({ ...current, drinkBrands: [...current.drinkBrands, brand] }))
    setBrandOpen(false)
    setToast('饮品品牌已添加')
  }

  const replaceBrandLogo = async (brandId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return setToast('请选择图片文件')
    const logoDataUrl = await blobToDataUrl(file)
    setState((current) => ({ ...current, drinkBrands: current.drinkBrands.map((brand) => brand.id === brandId ? { ...brand, logoDataUrl } : brand) }))
    event.target.value = ''
    setToast('品牌 Logo 已更新')
  }

  const moveNavigationItem = (id: ViewId, amount: number) => {
    setState((current) => {
      const ids = sidebarItemsForState(current, true).filter((item) => item.kind !== 'fixed').map((item) => item.id)
      const index = ids.indexOf(id)
      const target = index + amount
      if (index < 0 || target < 0 || target >= ids.length) return current
      ;[ids[index], ids[target]] = [ids[target], ids[index]]
      const orders = new Map(ids.map((itemId, itemIndex) => [itemId, (itemIndex + 1) * 10]))
      return {
        ...current,
        settings: { ...current.settings, navigation: current.settings.navigation.map((item) => ({ ...item, order: orders.get(item.id) ?? item.order })) },
        customModules: current.customModules.map((item) => ({ ...item, order: orders.get(`custom:${item.id}`) ?? item.order })),
      }
    })
  }

  const toggleNavigationItem = (id: ViewId) => {
    setState((current) => id.startsWith('custom:') ? {
      ...current,
      customModules: current.customModules.map((item) => `custom:${item.id}` === id ? { ...item, visible: !item.visible } : item),
    } : {
      ...current,
      settings: { ...current.settings, navigation: current.settings.navigation.map((item) => item.id === id ? { ...item, visible: !item.visible } : item) },
    })
  }

  const addCustomModule = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const template = field(data, 'template') as CustomModuleTemplate
    const configuredOrders = [...state.settings.navigation.map((item) => item.order), ...state.customModules.map((item) => item.order)]
    const module: CustomModule = {
      id: uid(),
      name: field(data, 'name'),
      template,
      icon: (field(data, 'icon') || MODULE_TEMPLATES[template].icon) as SidebarIconKey,
      color: field(data, 'color') || '#3d72c7',
      visible: true,
      order: Math.max(0, ...configuredOrders) + 10,
      items: [],
    }
    setState((current) => ({ ...current, customModules: [...current.customModules, module] }))
    setModuleOpen(false)
    setToast(`${module.name}已添加到侧边栏`)
  }

  const editNavigationItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingNav) return
    const data = new FormData(event.currentTarget)
    const label = field(data, 'label')
    const icon = field(data, 'icon') as SidebarIconKey
    const color = field(data, 'color')
    setState((current) => editingNav.startsWith('custom:') ? {
      ...current,
      customModules: current.customModules.map((item) => `custom:${item.id}` === editingNav ? { ...item, name: label, icon, color: color || item.color } : item),
    } : {
      ...current,
      settings: { ...current.settings, navigation: current.settings.navigation.map((item) => item.id === editingNav ? { ...item, label, icon } : item) },
    })
    setEditingNav(undefined)
    setToast('侧边栏项目已更新')
  }

  const deleteCustomModule = (module: CustomModule) => {
    const detail = module.items.length ? `其中的 ${module.items.length} 条内容也会删除。` : ''
    if (!window.confirm(`删除“${module.name}”？${detail}`)) return
    setState((current) => ({ ...current, customModules: current.customModules.filter((item) => item.id !== module.id) }))
    setToast('自定义模块已删除')
  }

  return <div className="page settings-page">
    <section className="page-intro compact-intro"><div><span className="eyebrow">SETTINGS</span><h1>设置</h1><p>让这个工作台更贴合你的节奏。</p></div></section>
    <section className="panel settings-section"><div className="section-heading"><div><span className="eyebrow">INSTALL</span><h2>安装到 iPhone 主屏幕</h2></div></div><div className="install-steps"><span>1</span><p>使用 Safari 打开部署网址</p><ChevronRight /><span>2</span><p>点击底部“共享”按钮</p><ChevronRight /><span>3</span><p>选择“添加到主屏幕”</p></div></section>
    <section className="panel settings-section"><div className="section-heading"><div><span className="eyebrow">PREFERENCES</span><h2>偏好设置</h2></div></div><div className="settings-list"><label><span><Coffee size={18} /><div><strong>每月饮品上限</strong><small>超过上限的月份会标红</small></div></span><input className="number-input" type="number" min="1" value={state.settings.drinkLimit} onChange={(event) => setState((current) => ({ ...current, settings: { ...current.settings, drinkLimit: Number(event.target.value) || 1 } }))} /></label><button onClick={() => setState((current) => ({ ...current, settings: { ...current.settings, darkMode: !current.settings.darkMode } }))}><span>{state.settings.darkMode ? <Moon size={18} /> : <Sun size={18} />}<div><strong>界面外观</strong><small>{state.settings.darkMode ? '深色模式' : '浅色模式'}</small></div></span><em>{state.settings.darkMode ? '深色' : '浅色'}</em></button></div></section>
    <section className="panel settings-section sidebar-settings"><div className="section-heading"><div><span className="eyebrow">SIDEBAR</span><h2>侧边栏管理</h2></div><div className="button-row"><StatusBadge tone="neutral">3 项固定</StatusBadge><button className="secondary-button small-button" onClick={() => setModuleOpen(true)}><Plus size={15} />新建模块</button></div></div><div className="nav-manage-list">{manageableNavItems.map((navItem, index) => {
      const coreItem = navItem.kind === 'core' ? state.settings.navigation.find((item) => item.id === navItem.id) : undefined
      const customItem = navItem.kind === 'custom' ? state.customModules.find((item) => `custom:${item.id}` === navItem.id) : undefined
      const visible = coreItem?.visible ?? customItem?.visible ?? true
      const NavIcon = navItem.icon
      return <div className={`nav-manage-row ${visible ? '' : 'hidden'}`} key={navItem.id}>
        <span className="nav-manage-icon" style={customItem ? { color: customItem.color, background: `color-mix(in srgb, ${customItem.color} 12%, var(--surface))` } : undefined}><NavIcon size={18} /></span>
        <div className="nav-manage-copy"><strong>{navItem.label}</strong><small>{customItem ? `自定义 · ${MODULE_TEMPLATES[customItem.template].label}` : '内置模块'}</small></div>
        <div className="nav-manage-actions"><div className="nav-order-controls"><button className="icon-button" onClick={() => moveNavigationItem(navItem.id, -1)} disabled={index === 0} aria-label="上移" title="上移"><ChevronUp size={17} /></button><button className="icon-button" onClick={() => moveNavigationItem(navItem.id, 1)} disabled={index === manageableNavItems.length - 1} aria-label="下移" title="下移"><ChevronDown size={17} /></button></div><button className="icon-button bordered" onClick={() => setEditingNav(navItem.id)} aria-label="编辑" title="编辑名称和图标"><Pencil size={15} /></button><button className={`switch ${visible ? 'on' : ''}`} onClick={() => toggleNavigationItem(navItem.id)} aria-label={visible ? '隐藏模块' : '显示模块'} title={visible ? '隐藏模块' : '显示模块'}><span /></button>{customItem && <button className="icon-button danger-hover" onClick={() => deleteCustomModule(customItem)} aria-label="删除自定义模块" title="删除自定义模块"><Trash2 size={16} /></button>}</div>
      </div>
    })}</div><div className="fixed-nav-strip"><span><Home size={16} />首页总览</span><span><Archive size={16} />数据备份</span><span><Settings size={16} />设置</span></div></section>
    <section className="panel settings-section"><div className="section-heading"><div><span className="eyebrow">SUBJECTS</span><h2>学习科目</h2></div><button className="secondary-button small-button" onClick={() => setSubjectOpen(true)}><Plus size={15} />添加</button></div><div className="manage-list">{state.subjects.map((subject) => <div key={subject.id} style={{ paddingLeft: `${state.subjects.find((item) => item.id === subject.parentId)?.parentId ? 36 : subject.parentId ? 18 : 0}px` }}><span className="subject-dot" style={{ background: subject.color }} /><strong>{subject.name}</strong><button className={`switch ${subject.active ? 'on' : ''}`} onClick={() => setState((current) => ({ ...current, subjects: current.subjects.map((item) => item.id === subject.id ? { ...item, active: !item.active } : item) }))} aria-label={subject.active ? '停用科目' : '启用科目'}><span /></button></div>)}</div></section>
    <section className="panel settings-section"><div className="section-heading"><div><span className="eyebrow">BRANDS</span><h2>饮品品牌</h2></div><button className="secondary-button small-button" onClick={() => setBrandOpen(true)}><Plus size={15} />添加</button></div><div className="brand-manage-grid">{state.drinkBrands.map((brand) => <div key={brand.id} className={`brand-manage-card ${!brand.active ? 'inactive' : ''}`}><BrandMark brand={brand} /><button className="brand-toggle" onClick={() => setState((current) => ({ ...current, drinkBrands: current.drinkBrands.map((item) => item.id === brand.id ? { ...item, active: !item.active } : item) }))}><strong>{brand.name}</strong><small>{brand.active ? '已启用' : '已停用'}</small></button><label className="brand-upload" aria-label={`更换${brand.name} Logo`}><Upload size={13} /><span>换 Logo</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => replaceBrandLogo(brand.id, event)} /></label></div>)}</div></section>
    <section className="danger-zone"><CircleAlert size={19} /><div><strong>重置工作台</strong><p>清除所有本地记录和 PDF。请先导出完整备份。</p></div><button className="danger-button" onClick={() => { if (window.confirm('此操作会清除所有数据，且无法撤销。确定重置吗？')) { setState(createDefaultState()); setToast('工作台已重置') } }}>重置全部数据</button></section>
    {subjectOpen && <Modal title="添加学习科目" onClose={() => setSubjectOpen(false)}><form className="form-stack" onSubmit={addSubject}><label>科目名称<input name="name" required /></label><label>上级科目<select name="parentId"><option value="">作为一级科目</option>{state.subjects.map((subject) => <option value={subject.id} key={subject.id}>{subject.name}</option>)}</select></label><label>识别颜色<input name="color" type="color" defaultValue="#ef5a2f" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setSubjectOpen(false)}>取消</button><button className="primary-button">添加科目</button></div></form></Modal>}
    {brandOpen && <Modal title="添加饮品品牌" onClose={() => setBrandOpen(false)}><form className="form-stack" onSubmit={addBrand}><label>品牌名称<input name="name" required /></label><div className="form-grid"><label>简称（1-2字）<input name="mark" maxLength={2} required /></label><label>品牌颜色<input name="color" type="color" defaultValue="#ef5a2f" /></label></div><label>品牌 Logo（可选）<input name="logo" type="file" accept="image/png,image/jpeg,image/webp" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setBrandOpen(false)}>取消</button><button className="primary-button">添加品牌</button></div></form></Modal>}
    {moduleOpen && <Modal title="新建自定义模块" onClose={() => setModuleOpen(false)}><form className="form-stack" onSubmit={addCustomModule}><label>模块名称<input name="name" required placeholder="例如：阅读计划、运动记录" /></label><label>模块模板<select name="template" defaultValue="checklist">{(Object.entries(MODULE_TEMPLATES) as Array<[CustomModuleTemplate, typeof MODULE_TEMPLATES[CustomModuleTemplate]]>).map(([key, option]) => <option value={key} key={key}>{option.label} · {option.detail}</option>)}</select></label><div className="form-grid"><label>侧边栏图标<select name="icon" defaultValue=""><option value="">跟随模板</option>{(Object.keys(SIDEBAR_ICONS) as SidebarIconKey[]).map((key) => <option key={key} value={key}>{ICON_LABELS[key]}</option>)}</select></label><label>识别颜色<input name="color" type="color" defaultValue="#3d72c7" /></label></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setModuleOpen(false)}>取消</button><button className="primary-button"><Plus size={16} />创建模块</button></div></form></Modal>}
    {editingNav && (editingCore || editingCustom) && <Modal title="编辑侧边栏项目" onClose={() => setEditingNav(undefined)}><form className="form-stack" onSubmit={editNavigationItem}><label>显示名称<input name="label" defaultValue={editingCore?.label ?? editingCustom?.name} required /></label><label>侧边栏图标<select name="icon" defaultValue={editingCore?.icon ?? editingCustom?.icon}>{(Object.keys(SIDEBAR_ICONS) as SidebarIconKey[]).map((key) => <option key={key} value={key}>{ICON_LABELS[key]}</option>)}</select></label>{editingCustom && <label>识别颜色<input name="color" type="color" defaultValue={editingCustom.color} /></label>}<div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditingNav(undefined)}>取消</button><button className="primary-button">保存修改</button></div></form></Modal>}
  </div>
}

export default App
