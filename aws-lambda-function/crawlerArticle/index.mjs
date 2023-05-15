import { con } from './connectMysql.mjs'
import { getDate } from './getDate.mjs'
import fetch from 'node-fetch'
import cheerio from 'cheerio'
import dns from 'dns'
// 爬取全國法規資料庫的最新訊息頁面
const crawlerArticle = async (date) => {
  // 抓取所有更新頁面連結
  const links = []
  const isGet = await getAllLink(links, date)
  // 更新法規資料
  if (isGet && links.length !== 0) {
    try {
      await Promise.all(
        links.map(
          async (link) => {
            // 請求內容頁面
            const $ = await loadPage(link)
            const title = $('h2').text()
            // 1. 制定法規
            if (title.includes('制定')) {
              // 新增法規
              const code = await createCode(title)
              // 整理並新增法條
              await addArticle($, code)
            }
            // 2. 廢止法規
            else if (title.includes('廢止')) {
              return await deleteCode(title)
            }
            // 3. 增訂、刪除並修正法規
            else {
              return await correctCode($, title)
            }
          })
      )
    } catch (error) {
      console.log(error)
    }
  }
}
// -----------function-------------------

// 建立連結陣列
const getAllLink = async (links, date) => {
  let pageTotal = 1
  let pageNumber = 1
  try {
    while (links.length === 20 * (pageNumber - 1) && pageTotal !== (pageNumber - 1)) {
      // 請求頁面
      const $ = await loadPage(`https://law.moj.gov.tw/News/NewsList.aspx?type=l&page=${pageNumber}&psize=20`)
      // 抓取頁次數目
      const pageInfo = $('li.pageinfo').text()
      const indexStart = pageInfo.indexOf('/') + 1
      const indexEnd = pageInfo.indexOf('顯示')
      pageTotal = pageInfo.slice(indexStart, indexEnd)
      // 抓取更新頁面連結
      await getPageLink($, links, date)
      pageNumber++
    }
    return true
  } catch (error) {
    console.log(error)
    return false
  }
}
// 載入頁面
const loadPage = async (link) => {
  dns.setDefaultResultOrder('ipv4first')
  const response = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/ 537.36(KHTML, like Gecko) Chrome/ 57.0.2987.133 Safari / 537.36' } })
  const pageText = await response.text()
  const $ = cheerio.load(pageText)
  return $
}
// 抓取單頁上次更新時間以後的連結
const getPageLink = async ($, links, date) => {
  $('.table tbody tr td').each((i, e) => {
    if ($(e).text() === '法律') {
      const publishDate = $(e).prev().text()
      const [publishYear, publishMonth, pulishDate] = publishDate.split('-')
      const [dateYear, dateMonth, dateDate] = date.split('-')
      if (publishYear > dateYear || (publishYear === dateYear && publishMonth > dateMonth) || (publishYear === dateYear && publishMonth === dateMonth && pulishDate >= dateDate)) {
        links.push('https://law.moj.gov.tw/News/' + $(e).next().find('a').attr('href'))
      }
    }
  })
}
// 新增法規
const createCode = async (title) => {
  const values = []
  let code = {}
  const indexStart = title.indexOf('制定') + 2
  const indexEnd = title.includes('法') ? title.indexOf('法') + 1 : title.indexOf('條例') + 2
  const name = title.slice(indexStart, indexEnd)
  values.push(name)
  con.query('INSERT INTO `Codes` (`name`) VALUES (?)', values, (err, result) => {
    if (err) throw err
    code = result[0]
  })
  return code
}
// 處理並新增法條
const addArticle = async ($, code) => {
  const array = $('td.text-pre').html().split('<br>')
  const articleNo = []
  const articleIndex = []
  const values = []
  for (const [entries, a] of array.entries()) {
    if (a[0] === '第' && a.includes('條') && !a.includes('，') && !a.includes('。')) {
      const indexEnd = a.indexOf('條')
      const number = a.slice(1, indexEnd).trim()
      articleIndex.push(entries)
      articleNo.push(number)
    }
  }
  for (let i = 0; i < articleNo.length; i++) {
    let content = ''
    if (i === articleNo.length - 1) {
      for (let j = articleIndex[i] + 1; j <= array.length - 1; j++) {
        content += array[j]
        content += '\r\n'
      }
    }
    for (let j = articleIndex[i] + 1; j < articleIndex[i + 1]; j++) {
      content += array[j]
      content += '\r\n'
    }
    values.push(content)
    values.push(articleNo[i])
    values.push(code.id)
    con.query('INSERT INTO `Articles`(`content`, `article_no`,`code_id`) VALUES (?,?,?)', values, (err) => {
      if (err) throw err
    })
  }
}
// 廢止法規
const deleteCode = async (title) => {
  const indexStart = title.indexOf('廢止') + 2
  const indexEnd = title.includes('法') ? title.indexOf('法') + 1 : title.indexOf('條例') + 2
  const name = title.slice(indexStart, indexEnd)
  con.query('UPDATE`Codes`SET `is_abandon`= true WHERE `name`= ?', [name], (err) => {
    if (err) throw (err)
  })
}
// 增訂、刪除並修正法規
const correctCode = async ($, title) => {
  // 查找法規
  const array = ['修正', '增訂', '刪除', '、', '並']
  array.forEach(a => { title = title.replace(a, '') })
  const indexEnd = title.includes('法') ? title.indexOf('法') + 1 : title.indexOf('條例') + 2
  const name = title.slice(0, indexEnd)
  let code = {}
  con.query('SELECT * FROM`Codes`WHERE`name` = ?', [name], (err, result) => {
    if (err) throw err
    code = result[0]
  })
  // 查找法條
  const article = []
  processArticle($, code, article)// 處理法條
  await Promise.all(
    article.map(
      async (article) => {
        let articleFinded = {}
        con.query('SELECT * FROM `Articles`WHERE `article_no`= ? AND `code_id` = ?', [article.articleNo, article.codeId], (err, result) => {
          if (err) throw err
          articleFinded = result[0]
        })
        //  新增法條
        if (articleFinded === null) {
          con.query('INSERT INTO `Articles`(`content`, `article_no`,`code_id`) VALUES (?,?,?)', [article.content, article.articleNo, article.codeId], (err) => {
            if (err) throw err
          })
          // 修正或刪除法條
        } else {
          con.query('UPDATE `Articles`SET `content` = ? WHERE `article_no`= ? AND `code_id` = ? ', [article.content, article.articleNo, article.codeId], (err) => {
            if (err) throw err
          })
        }
      }
    )
  )
}
// 處理法條
const processArticle = async ($, code, article) => {
  const array = $('td.text-pre').html().split('<br>')
  const articleNo = []
  const articleIndex = []
  for (const [entries, a] of array.entries()) {
    if (a[0] === '第' && a.includes('條') && !a.includes('，') && !a.includes('。')) {
      const indexEnd = a.indexOf('條')
      const number = a.slice(1, indexEnd).trim()
      articleIndex.push(entries)
      articleNo.push(number)
    }
  }
  for (let i = 0; i < articleNo.length; i++) {
    let content = ''
    if (i === articleNo.length - 1) {
      for (let j = articleIndex[i] + 1; j <= array.length - 1; j++) {
        content += array[j]
        content += '\r\n'
      }
    }
    for (let j = articleIndex[i] + 1; j < articleIndex[i + 1]; j++) {
      content += array[j]
      content += '\r\n'
    }
    article.push({
      articleNo: articleNo[i],
      codeId: code.id,
      content
    })
  }
}
export const handler = async () => {
  try {
    const date = await getDate()
    await crawlerArticle(date)
    return 'created'
  } catch (err) {
    console.log(err)
  }
}
