import { con } from './connectMysql.mjs'
import AWS from 'aws-sdk'
const s3 = new AWS.S3()
// 當s3有資料進來就執行儲存到DB的動作
export const handler = async (event) => {
  const object = event.Records[0].s3
  const params = {
    Bucket: 'paragraphArticle',
    Key: object.object.key
  }
  return await new Promise((resolve, reject) => {
    s3.getObject(params, (err, result) => {
      if (err)reject(err)
      else {
        const contents = result.Body.data
        for (const content of contents) {
          con.query('INSERT INTO `Paragraph_articles`(`article_id`, `paragraph_id`) VALUES (?,?)', [content.article_id, content.paragraph_id], (err) => {
            if (err) console.log(err)
          })
        }
        resolve({})
      }
    })
  })
}
