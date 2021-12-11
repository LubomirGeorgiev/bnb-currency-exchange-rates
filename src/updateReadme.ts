import 'dotenv-defaults/config'

import { exec as exe } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import prettier from 'prettier'
import { format } from 'date-fns'
import {
  readFile,
  writeFile,
  readdir as readDir,
  unlink
} from 'fs/promises'

const exec = promisify(exe);

(async () => {

  // TODO We should read from the sqlite db instead of the file system
  const dataDir = join(__dirname, `../${process.env.DATA_DIR}`)
  const readmeFilePath = join(__dirname, '../README.md')
  const readmeFileAsText = await readFile(readmeFilePath, 'utf8')
  const listOfCsvFiles = await readDir(dataDir)

  const csvStats = async (fileLocation) => {
    const { stdout: numOfLines } = await exec(`cat ${fileLocation} | wc -l`)
    const { stdout: numberOfMissingDays } = await exec(`cat ${fileLocation} | grep -i '",1' | wc -l`)

    return {
      numOfLines: parseInt(numOfLines),
      numberOfMissingDays: parseInt(numberOfMissingDays)
    }
  }

  const buildURL = (currency: string) =>
    `https://raw.githubusercontent.com/LubomirGeorgiev/bnb-currency-exchange-rates/main/data/${currency}.csv`

  let markdown = `
  Last Update: ${format(new Date(), 'PPppp')} (${new Date().toISOString()})\n
  | Currency | URL | Number of records | Number of missing days that were filled in |
  |:-:|-|:-:|:-:|
  `.trim()

  let csvMap = new Map()

  for (const file of listOfCsvFiles) {
    const filePath = `${dataDir}/${file}`
    const fileStats = await csvStats(filePath)
    csvMap.set(file, fileStats)
  }

  csvMap = new Map([...csvMap.entries()].sort((a, b) => b?.[1]?.numOfLines - a?.[1]?.numOfLines))


  for (const [fileName, { numOfLines, numberOfMissingDays }] of csvMap.entries()) {
    const currencyISOCode = fileName.replace('.csv', '')
    const filePath = `${dataDir}/${fileName}`

    if (numOfLines < 2) {
      await unlink(filePath)
    } else {
      markdown = markdown + `\n| ${currencyISOCode} | ${buildURL(currencyISOCode)} | ${numOfLines} | ${numberOfMissingDays} |`
    }
  }

  const editedReadme = readmeFileAsText.replace(/(<!--.*?-->)([\s\S]*?)(<!--.*?-->)/gmi, `$1\n${markdown}\n$3`)

  writeFile(readmeFilePath, prettier.format(editedReadme, {
    parser: 'markdown'
  }))

})()
