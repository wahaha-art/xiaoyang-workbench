import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import * as cheerio from 'cheerio'

const OUTPUT_PATH = new URL('../public/jobs.json', import.meta.url)
const USER_AGENT = 'XiaoyangWorkbench/1.0 (personal low-frequency job monitor)'
const REQUEST_HEADERS = {
  'user-agent': USER_AGENT,
  accept: 'text/html,application/xhtml+xml',
  'accept-language': 'zh-CN,zh;q=0.9',
}

const SOURCES = [
  {
    id: 'jshrss-provincial',
    name: '江苏省属事业单位招聘',
    url: 'https://jshrss.jiangsu.gov.cn/col/col93339/index.html',
    assumeJiangsu: true,
    organizationType: '事业单位',
  },
  {
    id: 'jshrss-technical-schools',
    name: '江苏公办技工院校招聘',
    url: 'https://jshrss.jiangsu.gov.cn/col/col93485/index.html',
    assumeJiangsu: true,
    organizationType: '事业单位',
  },
  {
    id: 'ciic',
    name: '中智招聘',
    url: 'https://www.ciiczhaopin.com/index',
  },
  {
    id: 'iguopin',
    name: '国聘行动',
    url: 'https://www.iguopin.com/',
    dynamic: true,
  },
  {
    id: 'sasac',
    name: '国务院国资委',
    url: 'https://www.sasac.gov.cn/',
  },
]

const RECRUITMENT_PATTERN = /招聘|招考|招录|人才引进|校园招聘|社会招聘|实习|岗位/
const TECH_KEYWORDS = [
  '计算机', '软件', '开发', '程序', '信息技术', '信息化', '网络安全', '网络工程', '数据',
  '数据库', '通信', '人工智能', '机器学习', '算法', '测试', '运维', '云计算', '大数据',
  '数字化', '电子信息', '智能科学', '物联网', '密码', '系统集成', '产品经理',
]
const JIANGSU_LOCATIONS = [
  '江苏', '南京', '苏州', '无锡', '常州', '镇江', '扬州', '泰州', '南通', '盐城',
  '淮安', '宿迁', '徐州', '连云港',
]

const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim()
const chinaDate = (value = new Date()) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(value)
const isoNow = () => new Date().toISOString()
const stableId = (sourceId, url, title) => `${sourceId}-${createHash('sha256').update(`${url}|${title}`).digest('hex').slice(0, 14)}`

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const fetchText = async (url, timeout = 18_000) => {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return { text: await response.text(), finalUrl: response.url, status: response.status }
}

const robotsCache = new Map()

const parseRobots = (content) => {
  const groups = []
  let agents = []
  let rules = []
  const flush = () => {
    if (agents.length) groups.push({ agents, rules })
    agents = []
    rules = []
  }

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    if (!line) continue
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()
    if (key === 'user-agent') {
      if (rules.length) flush()
      agents.push(value.toLowerCase())
    } else if ((key === 'allow' || key === 'disallow') && agents.length) {
      rules.push({ type: key, path: value })
    }
  }
  flush()
  return groups
}

const robotsAllows = async (targetUrl) => {
  const url = new URL(targetUrl)
  const origin = url.origin
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, (async () => {
      try {
        const response = await fetch(new URL('/robots.txt', origin), {
          headers: REQUEST_HEADERS,
          signal: AbortSignal.timeout(8_000),
        })
        if (!response.ok) return []
        return parseRobots(await response.text())
      } catch {
        return []
      }
    })())
  }

  const groups = await robotsCache.get(origin)
  const agentName = USER_AGENT.split('/')[0].toLowerCase()
  const exact = groups.filter((group) => group.agents.some((agent) => agentName.includes(agent) || agent.includes(agentName)))
  const selected = exact.length ? exact : groups.filter((group) => group.agents.includes('*'))
  const path = `${url.pathname}${url.search}`
  const matches = selected.flatMap((group) => group.rules)
    .filter((rule) => rule.path && path.startsWith(rule.path))
    .sort((a, b) => b.path.length - a.path.length)
  return matches[0]?.type !== 'disallow'
}

const linksFromHtml = (html, baseUrl) => {
  const page = cheerio.load(html)
  const seen = new Set()
  return page('a').map((_, element) => {
    const title = cleanText(page(element).text())
    const href = page(element).attr('href')
    if (!title || !href || href.startsWith('javascript:') || href.startsWith('#')) return null
    let url
    try {
      url = new URL(href, baseUrl).href
    } catch {
      return null
    }
    const key = `${url}|${title}`
    if (seen.has(key)) return null
    seen.add(key)
    return { title, url }
  }).get().filter(Boolean)
}

const publishedDateFrom = (url, text) => {
  const urlMatch = url.match(/\/(20\d{2})\/(\d{1,2})\/(\d{1,2})\//)
  if (urlMatch) return `${urlMatch[1]}-${urlMatch[2].padStart(2, '0')}-${urlMatch[3].padStart(2, '0')}`
  const textMatch = text.match(/(20\d{2})[年/.\-](\d{1,2})[月/.\-](\d{1,2})日?/)
  return textMatch ? `${textMatch[1]}-${textMatch[2].padStart(2, '0')}-${textMatch[3].padStart(2, '0')}` : undefined
}

const normalizedDate = (year, month, day) => {
  const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return Number.isNaN(Date.parse(`${date}T00:00:00+08:00`)) ? undefined : date
}

const deadlineFrom = (text) => {
  const windows = [...text.matchAll(/(?:截止|报名时间|报名截止|网申截止|申请截止|至)[^。；\n]{0,80}/g)].map((match) => match[0])
  for (const window of windows) {
    const full = [...window.matchAll(/(20\d{2})年(\d{1,2})月(\d{1,2})日/g)]
    if (full.length) {
      const last = full.at(-1)
      return normalizedDate(last[1], last[2], last[3])
    }
    const currentYear = chinaDate().slice(0, 4)
    const short = [...window.matchAll(/(\d{1,2})月(\d{1,2})日/g)]
    if (short.length) {
      const last = short.at(-1)
      return normalizedDate(currentYear, last[1], last[2])
    }
  }
  return undefined
}

const organizationTypeFrom = (text, fallback = '') => {
  if (/事业单位|院校|医院|研究院/.test(text)) return '事业单位'
  if (/银行|金融机构/.test(text)) return '银行/金融机构'
  if (/电信|移动|联通|运营商/.test(text)) return '运营商'
  if (/央企|中央企业/.test(text)) return '央企'
  if (/国企|国有/.test(text)) return '国企'
  return fallback || '单位类型待核验'
}

const recruitmentTypeFrom = (text) => {
  if (/实习/.test(text)) return '实习'
  if (/校园招聘|校招|应届/.test(text)) return '校招'
  if (/人才引进/.test(text)) return '人才引进'
  if (/社会招聘|社招/.test(text)) return '社招'
  return '公开招聘'
}

const companyFrom = (title) => {
  const value = title
    .replace(/^关于/, '')
    .replace(/20\d{2}年(?:度)?(?:第[一二三四五六七八九十]+批)?/g, '')
    .split(/公开招聘|招聘公告|招聘启事|校园招聘|社会招聘|人才引进|招聘/)[0]
    .replace(/[（(【\[]$/, '')
    .trim()
  return value.length >= 2 && value.length <= 38 ? value : title.slice(0, 38)
}

const cityFrom = (text, assumeJiangsu) => JIANGSU_LOCATIONS.find((location) => location !== '江苏' && text.includes(location)) || (assumeJiangsu ? '江苏' : '')

const recentlyPublished = (publishedDate, days = 60) => {
  if (!publishedDate) return false
  const age = Date.now() - Date.parse(`${publishedDate}T00:00:00+08:00`)
  return age >= -86_400_000 && age <= days * 86_400_000
}

const inspectCandidate = async (source, candidate, previousById) => {
  let detail = ''
  let finalUrl = candidate.url
  try {
    if (await robotsAllows(candidate.url)) {
      const response = await fetchText(candidate.url, 15_000)
      finalUrl = response.finalUrl
      const page = cheerio.load(response.text)
      page('script, style, noscript, nav, footer').remove()
      detail = cleanText(page('body').text()).slice(0, 80_000)
      await sleep(120)
    }
  } catch {
    // Anchor text is still usable when a linked detail page is unavailable.
  }

  const combined = cleanText(`${candidate.title} ${detail}`)
  const techMatches = TECH_KEYWORDS.filter((keyword) => combined.includes(keyword))
  const locationMatches = JIANGSU_LOCATIONS.filter((location) => combined.includes(location))
  const isJiangsu = source.assumeJiangsu || locationMatches.length > 0
  if (!isJiangsu || techMatches.length === 0 || !RECRUITMENT_PATTERN.test(combined)) return null

  const publishedDate = publishedDateFrom(finalUrl, combined)
  const deadline = deadlineFrom(combined)
  const today = chinaDate()
  if (deadline && deadline < today) return null
  if (!deadline && !recentlyPublished(publishedDate)) return null

  const id = stableId(source.id, finalUrl, candidate.title)
  const previous = previousById.get(id)
  const checkedAt = isoNow()
  return {
    id,
    company: companyFrom(candidate.title),
    title: candidate.title,
    city: cityFrom(combined, source.assumeJiangsu),
    organizationType: organizationTypeFrom(combined, source.organizationType),
    recruitmentType: recruitmentTypeFrom(combined),
    startDate: publishedDate,
    deadline,
    officialUrl: finalUrl,
    sourceId: source.id,
    sourceName: source.name,
    verifiedAt: checkedAt,
    firstSeenAt: previous?.firstSeenAt || checkedAt,
    lastSeenAt: checkedAt,
    matchedKeywords: techMatches.slice(0, 6),
    summary: `${techMatches.slice(0, 3).join('、')}相关机会${deadline ? `，截止 ${deadline}` : '，截止时间需查看原文核验'}`,
    stale: false,
    favorite: false,
    status: '收藏',
    notes: '',
    origin: 'feed',
  }
}

const collectSource = async (source, previousById) => {
  const checkedAt = isoNow()
  try {
    if (!(await robotsAllows(source.url))) {
      return { source: { ...source, status: 'blocked', checkedAt, found: 0, matched: 0, message: 'robots.txt 不允许自动访问，保留人工入口' }, jobs: [] }
    }

    const response = await fetchText(source.url)
    const candidates = linksFromHtml(response.text, response.finalUrl)
      .filter((candidate) => RECRUITMENT_PATTERN.test(candidate.title))
      .slice(0, 36)

    if (!candidates.length && source.dynamic) {
      return { source: { ...source, status: 'limited', checkedAt, found: 0, matched: 0, message: '动态页面未公开可解析列表，保留官网人工入口' }, jobs: [] }
    }

    const jobs = []
    for (const candidate of candidates) {
      const job = await inspectCandidate(source, candidate, previousById)
      if (job) jobs.push(job)
    }
    return {
      source: {
        ...source,
        status: 'ok',
        checkedAt,
        found: candidates.length,
        matched: jobs.length,
        message: jobs.length ? `发现 ${jobs.length} 条江苏计算机相关机会` : '检查完成，今日未发现符合条件的新机会',
      },
      jobs,
    }
  } catch (error) {
    return { source: { ...source, status: 'error', checkedAt, found: 0, matched: 0, message: `访问失败：${error.message}` }, jobs: [] }
  }
}

const readPrevious = async () => {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, 'utf8'))
  } catch {
    return { jobs: [] }
  }
}

export const collectJobs = async () => {
  const previous = await readPrevious()
  const previousById = new Map((previous.jobs || []).map((job) => [job.id, job]))
  const sourceResults = []
  for (const source of SOURCES) sourceResults.push(await collectSource(source, previousById))

  const foundJobs = sourceResults.flatMap((result) => result.jobs)
  const foundIds = new Set(foundJobs.map((job) => job.id))
  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  const retained = (previous.jobs || []).filter((job) => {
    if (foundIds.has(job.id) || job.origin !== 'feed') return false
    if (job.deadline && job.deadline < chinaDate()) return false
    return Date.parse(job.lastSeenAt || job.verifiedAt || 0) >= sevenDaysAgo
  }).map((job) => ({ ...job, stale: true }))

  const jobs = [...foundJobs, ...retained].sort((a, b) => {
    const deadlineOrder = (a.deadline || '9999-12-31').localeCompare(b.deadline || '9999-12-31')
    return deadlineOrder || a.company.localeCompare(b.company, 'zh-CN')
  })
  const today = chinaDate()
  const deadlineSoon = jobs.filter((job) => job.deadline && job.deadline >= today && job.deadline <= chinaDate(new Date(Date.now() + 7 * 86_400_000))).length
  const newToday = jobs.filter((job) => chinaDate(new Date(job.firstSeenAt)) === today).length
  const successCount = sourceResults.filter((result) => result.source.status === 'ok').length
  const sourceNote = `今日检查 ${SOURCES.length} 个公开来源，${successCount} 个完成；保留 ${jobs.length} 条江苏计算机相关机会`
  const highlights = jobs.slice(0, 3).map((job) => `${job.company}：${job.title}${job.deadline ? `（${job.deadline}截止）` : ''}`)

  return {
    schemaVersion: 1,
    updatedAt: isoNow(),
    generatedFor: today,
    sourceNote,
    summary: {
      date: today,
      totalRelevant: jobs.length,
      newToday,
      deadlineSoon,
      needsReview: jobs.filter((job) => job.stale || !job.deadline).length,
      headline: jobs.length ? `今日保留 ${jobs.length} 条江苏计算机相关招聘信息` : '今日暂未发现符合条件且可核验的新机会',
      highlights,
    },
    sources: sourceResults.map(({ source }) => source),
    jobs,
  }
}

const main = async () => {
  const payload = await collectJobs()
  await writeFile(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  console.log(payload.sourceNote)
  for (const source of payload.sources) console.log(`[${source.status}] ${source.name}: ${source.message}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
