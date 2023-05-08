const { initDrive } = require('./tools/initDrive.js')
const { crawlerParagraph } = require('./tools/crawlerParagraph.js')
const { crawlerReference } = require('./tools/crawlerReference.js')
const { crawlerArticle } = require('./tools/crawlerArticle.js')
const crawler = async () => {
  const date = await getDate()
  const driver = await initDrive()
  // driver不存在就結束程式
  if (!driver) {
    return
  }
  const paragraph = await crawlerParagraph(driver, date)
  const reference = await crawlerReference(driver, date)
  const article = await crawlerArticle(date)
  driver.quit()
}

const getDate = () => {
  const today = new Date()
  const year = today.getFullYear() - 1911
  const month = (today.getMonth() + 1) >= 10 ? (today.getMonth() + 1) : ('0' + (today.getMonth() + 1))
  const date = today.getDate() < 10 ? ('0' + today.getDate()) : today.getDate()
  const updateDate = `${year}-${month}-${date}`
  return updateDate
}
module.exports = { crawler }
