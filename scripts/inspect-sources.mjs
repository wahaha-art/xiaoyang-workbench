import * as cheerio from 'cheerio'

const sources = [
  ['国聘行动', 'https://www.iguopin.com/'],
  ['国务院国资委', 'https://www.sasac.gov.cn/'],
  ['中智招聘', 'https://www.ciiczhaopin.com/'],
  ['江苏省人社厅', 'https://jshrss.jiangsu.gov.cn/'],
]

const headers = {
  'user-agent': 'Mozilla/5.0 (compatible; XiaoyangWorkbench/1.0; personal job monitor)',
  accept: 'text/html,application/xhtml+xml',
}

const inspect = async ([name, url]) => {
  try {
    const response = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(15_000) })
    const html = await response.text()
    const $ = cheerio.load(html)
    const links = $('a')
      .map((_, element) => ({ text: $(element).text().replace(/\s+/g, ' ').trim(), href: $(element).attr('href') }))
      .get()
      .filter((link) => /招聘|招考|人才|就业|校招|岗位|事业单位|公开招聘/.test(link.text))
      .slice(0, 40)

    let robots = ''
    try {
      const robotsResponse = await fetch(new URL('/robots.txt', url), { headers, signal: AbortSignal.timeout(8_000) })
      robots = (await robotsResponse.text()).slice(0, 800)
    } catch {
      robots = 'unavailable'
    }

    return { name, requestedUrl: url, finalUrl: response.url, status: response.status, title: $('title').first().text().replace(/\s+/g, ' ').trim(), bytes: html.length, links, robots }
  } catch (error) {
    return { name, requestedUrl: url, error: error.message }
  }
}

console.log(JSON.stringify(await Promise.all(sources.map(inspect)), null, 2))
