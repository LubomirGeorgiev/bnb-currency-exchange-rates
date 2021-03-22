import 'dotenv-defaults/config'

import {
  readFile as rf,
  writeFile as wf,
  readdir as rd
} from 'fs'
import { exec as exe } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import prettier from 'prettier'
import { format } from 'date-fns'

const readFile = promisify(rf);
const writeFile = promisify(wf);
const readDir = promisify(rd);
const exec = promisify(exe);

(async () => {

  const dataDir = join(__dirname, `../${process.env.DATA_DIR}`)
  const readmeFilePath = join(__dirname, '../README.md')
  const readmeFileAsText = await readFile(readmeFilePath, 'utf8');
  const listOfCsvFiles = await readDir(dataDir)

  const fileLineCount = async (fileLocation) => {
    const { stdout } = await exec(`cat ${fileLocation} | wc -l`);
    return parseInt(stdout);
  }

  const buildURL = (currency: string) =>
    `https://media.githubusercontent.com/media/LubomirGeorgiev/bnb-currency-exchange-rates/main/data/${currency}.csv`

  let markdown = `
  Last Update: ${format(new Date(), 'PPppp')} (${new Date().toISOString()})\n
  | Currency | URL | Number of records |
  |-|-|-|
  `.trim()

  for (const file of listOfCsvFiles) {
    const currencyISOCode = file.replace('.csv', '')
    const numberOfLines = await fileLineCount(`${dataDir}/${file}`)

    markdown = markdown + `\n| ${currencyISOCode} | ${buildURL(currencyISOCode)} | ${numberOfLines} |`
  }

  const editedReadme = readmeFileAsText.replace(/(<\!--.*?-->)([\s\S]*?)(<\!--.*?-->)/gmi, `$1\n${markdown}\n$3`)

  writeFile(readmeFilePath, prettier.format(editedReadme, {
    parser: 'markdown'
  }))

})()
