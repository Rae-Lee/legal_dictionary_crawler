import fetch from 'node-fetch'
import cheerio from 'cheerio'
import dns from 'dns'
import webdriver from 'selenium-webdriver'
const { By, until } = webdriver

// 送出查詢頁面
export const submitSearchPage = async (driver) => {
  try {
    // 送出查詢
    const submitBtn = await driver.wait(until.elementLocated(By.name('ctl00$cp_content$btnQry')), 3000)
    submitBtn.click()
    // 檢查是否成功跳轉
    await driver.wait(until.elementLocated(By.xpath('//*[@id="form1"]/div[3]/div/div[1]/div')), 5000)
    return true
  } catch (err) {
    console.log(err)
    return false // 終止後續的爬蟲
  }
}
// 處理判決名稱
export const processVerditName = (referenceName) => {
  const judYear = referenceName.match(/\d+/g)[0]
  let judCase
  if (referenceName.includes('台上大')) {
    judCase = '台上大'
  } else {
    judCase = '台上'
  }
  const judNo = referenceName.match(/\d+/g)[1]
  return { judYear, judCase, judNo }
}
// 處理判決類別
export const processVerditType = (judType) => {
  // 勾選案件類別
  let judXpath
  switch (judType) {
    case '刑事':
      judXpath = '//*[@id="vtype_M"]/input'
      break
    case '民事':
      judXpath = '//*[@id="vtype_V"]/input'
      break
    case '行政':
      judXpath = '//*[@id="vtype_A"]/input'
      break
  }
  return judXpath
}
// 輸入要爬蟲的案件
export const inputVerdit = async (driver, judXpath, date) => {
  try {
    // 勾選裁判類型
    const category = await driver.wait(until.elementLocated(By.xpath(judXpath)), 3000)
    category.click()
    // 輸入裁判期間
    const [uploadYear, uploadMonth, uploadDate] = date.split('-')
    const dateStart = await driver.wait(until.elementLocated(By.name('dy1')), 3000)
    dateStart.sendKeys(uploadYear)
    await driver.findElement(By.name('dm1')).sendKeys(uploadMonth)
    await driver.findElement(By.name('dd1')).sendKeys(uploadDate)
    await driver.findElement(By.name('dy2')).sendKeys(uploadYear)
    await driver.findElement(By.name('dm2')).sendKeys(uploadMonth)
    await driver.findElement(By.name('dd2')).sendKeys(uploadDate)
  } catch (err) {
    console.log(err)
  }
}
// 輸入被引用的案件
export const inputSingleVerdit = async (driver, judXpath, judYear, judCase, judNo) => {
  try {
    const category = await driver.wait(until.elementLocated(By.xpath(judXpath)), 3000)
    category.click()
    // 輸入裁判字號
    const judgeYear = await driver.wait(until.elementLocated(By.name('jud_year')), 5000)
    judgeYear.sendKeys(judYear)
    await driver.findElement(By.name('jud_case')).sendKeys(judCase)
    await driver.findElement(By.name('jud_no')).sendKeys(judNo)
    await driver.findElement(By.name('jud_no_end')).sendKeys(judNo)
  } catch (err) {
    console.log(err)
  }
}

// 載入頁面
export const loadPage = async (link) => {
  try {
    dns.setDefaultResultOrder('ipv4first')
    const response = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/ 537.36(KHTML, like Gecko) Chrome/ 57.0.2987.133 Safari / 537.36' } })
    const pageText = await response.text()
    const $ = cheerio.load(pageText)
    return $
  } catch (err) {
    console.log(err)
  }
}
