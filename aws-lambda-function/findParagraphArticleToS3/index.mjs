import { con } from './connectMysql.mjs'
import AWS from 'aws-sdk'
const s3 = new AWS.S3()
const findParagraphArticle = async (paragraphs) => {
  const result = []
  for (const paragraph of paragraphs) {
    // 尋找段落中的法條id
    const articleId = await getArticleId(paragraph)
    if (articleId) {
      for (const id of articleId) {
        result.push({
          article_id: id,
          paragraph_id: paragraph.id
        })
      }
    }
  }
  return result
}

// --------------------function--------------
// 尋找段落中的法條
const getArticleId = async (paragraph) => {
  const articleId = [] // 記錄條號id清單
  // 找出條號
  const content = paragraph.content.replace(/\s/g, '')
  const numbers = content.match(/\u7b2c{1}\d+\u689D{1}/g) // 第..條
  if (numbers) {
    // 找出法條名稱
    const articleParagraph = content.split(/(?<=\u6cd5)|(?<=\u689d\u4f8b)/g) // 將內容依據法或條例做分段
    let codes = []
    con.query('SELECT * FROM `Codes`', (err, result) => {
      if (err) throw (err)
      codes = result
    })// 抓取所有法典名稱
    // 比對分段中是否有法典名稱
    for (const number of numbers) {
      for (let i = 0; i <= articleParagraph.length - 1; i++) {
        if (articleParagraph[i].includes(number)) {
        // 從有條號的該分段的前一段分段開始往前找尋有法典名稱的分段
          let articleName
          let index = i - 1
          while (articleName === undefined && index >= 0) {
            articleName = codes.find(code => {
              const name = code.name.replace('中華民國', '')
              return articleParagraph[index].includes(name)
            })
            index--
          }
          if (articleName) {
            const articleNo = number.match(/\d+/)[0]// 抓取法條數字
            const codeId = articleName.id// 抓取法典id
            // 找出法條id
            let article = {}
            con.query('SELECT * FROM `Articles` WHERE `article_no`= ? AND `code_id`= ?', [articleNo, codeId], (err, result) => {
              if (err) throw err
              article = result[0]
            })
            // 如果清單中尚未有該法條
            if (!articleId.includes(article.id)) {
              articleId.push(article.id)
            }
          }
        }
      }
    }
  }
  return articleId
}
const convertDataToJson = async (result) => {
  const json = JSON.stringify(result)
  const data = `{"data":${json}}`
  return data
}
const getS3Data = (event) => {
  const object = event.Records[0].s3
  const params = {
    Bucket: 'paragraph',
    Key: object.object.key
  }
  return new Promise((resolve, reject) => {
    s3.getObject(params, (err, result) => {
      if (err) reject(err)
      else {
        resolve(result)
      }
    })
  })
}
export const handler = async (event) => {
  try {
    // 當s3有資料進來就開始爬蟲
    // 從s3抓取資料
    const result = await getS3Data(event)
    const paragraphs = result.Body.data
    const article = await findParagraphArticle(paragraphs)
    // 將段落資料存進s3
    const Body = convertDataToJson(article)
    const params = {
      ACL: 'public-read',
      Body,
      ContentType: 'text/html',
      Bucket: 'paragraphArticle',
      Key: 'paragraphArticle.json'
    }
    return new Promise((resolve, reject) => {
      s3.putObject(params, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
  } catch (err) {
    console.log(err)
  }
}
