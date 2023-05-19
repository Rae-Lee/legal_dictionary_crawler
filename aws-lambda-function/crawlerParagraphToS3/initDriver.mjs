import webdriver from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome'
import path from 'path'
import fs from 'fs'
const options = new chrome.Options()
options.addArguments('blink-settings=imagesEnabled=false')
options.addArguments('--headless')
options.addArguments('--log-level=3')
options.addArguments('--disable-dev-shm-usage')
options.addArguments('--disable-gpu')
const { Builder, Browser } = webdriver
export const initDriver = async () => {
  try {
    if (!checkDriver()) { // 檢查Driver是否是設定，如果無法設定就結束程式
      return
    }
    const driver = await new Builder().forBrowser(Browser.CHROME).withCapabilities(options).build()
    await driver.manage().window().setRect({
      width: 1280, height: 800, x: 0, y: 0
    }) // 固定視窗大小
    return driver
  } catch (err) {
    console.log(err)
  }
}
const checkDriver = () => {
  try {
    chrome.getDefaultService()// 確認是否有預設
  } catch {
    console.log('找不到預設driver!')
    // 確認路徑下是否有 chromedriver.exe 的檔案
    const file_path = './chromedriver.exe'
    console.log(path.join(__dirname, file_path))
    if (fs.existsSync(path.join(__dirname, file_path))) {
      // 設定driver路徑
      const service = new chrome.ServiceBuilder(path.join(__dirname, file_path)).build()
      chrome.setDefaultService(service)
      console.log('設定driver路徑')
    } else {
      console.error('無法設定driver路徑')
      return false
    }
  }
  return true
}
