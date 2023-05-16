import { con } from './connectMysql.mjs'
import AWS from 'aws-sdk'
const s3 = new AWS.S3()
const findQuote = async (paragraphs) => {
  const result = []
  const judType = '刑事'
  for (const paragraph of paragraphs) {
    const referenceNames = paragraph.content.match(/\d{2,3}[\u4e00-\u9fa5]{5,7}\d+[\u4e00-\u9fa5]/g)
    for (const referenceName of referenceNames) {
      const name = await getReferenceName(referenceName, judType) // 處理判決名稱
      let reference = {}
      if (name) {
        // 查找reference的id
        con.query('SELECT * FROM `References` WHERE `name` = ?', [name], (err, result) => {
          if (err) throw err
          reference = result[0]
        })
        if (reference) {
          result.push({
            paragraph_id: paragraph.id,
            reference_id: reference.id
          })
        }
      }
    }
  }
  return result
}

// --------------------function--------------
// 搜尋被引用判決名稱
const getReferenceName = async (referenceName, judType) => {
  const judYear = referenceName.match(/\d+/g)[0]
  const judNo = referenceName.match(/\d+/g)[1]
  let name = ''// 被引用判決名稱
  if ((referenceName.includes('台上大') || referenceName.includes('臺上大')) && judYear >= 39) {
    name = `最高法院 ${judYear} 年度 台上大 字第 ${judNo} 號${judType}裁定`
  } else if ((referenceName.includes('台上') || referenceName.includes('臺上')) && judYear >= 39) {
    name = `最高法院 ${judYear} 年度 台上 字第 ${judNo} 號${judType}判決`
  }
  return name
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
    await findQuote(paragraphs)
    return 'created'
  } catch (err) {
    console.log(err)
  }
}
