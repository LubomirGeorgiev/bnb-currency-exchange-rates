import 'dotenv-defaults/config'

import Axios from 'axios'
import { URLSearchParams } from 'url'
import faker from 'faker'
import {
  format as formatDate,
  max as maxDate,
  subDays,
  addDays,
  isAfter as isAfterDate,
  isValid as isValiDate,
  differenceInDays
} from 'date-fns'

import isNumeric from 'isnumeric'

import { createWriteStream, existsSync, mkdir as mkd } from 'fs'

import { promisify } from 'util'

import cheerio from 'cheerio'

import { AsyncParser } from 'json2csv'

import { PrevDates } from './types'

const mkdir = promisify(mkd)

let numberOfRequests = 0
console.time('Execution Time')

process.on('exit', () => {
  console.timeEnd('Execution Time')
  console.log(`Number of requests: ${numberOfRequests}`)
})

const BulgarianNationalBank = Axios.create({
  baseURL: 'https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies'
})

BulgarianNationalBank.interceptors.request.use(request => {
  numberOfRequests++
  return request
})

const endDate = new Date(process.env.END_DATE!)

if (!isValiDate(endDate)) {
  throw new Error('The env variable "END_DATE" must be a valid date')
}

export const commonParams = {
  type: 'XML',
  downloadOper: 'true',
  group1: 'second',
  search: 'true',
  showChart: 'false',
  showChartButton: 'true'
};

(async () => {
  const columns = {
    date: 'date',
    rate: 'rate',
    reverseRate: 'reverseRate',
    isoCode: 'isoCode',
    wasMissing: 'wasMissing'
  }

  const commonParamObject = new URLSearchParams()
  const $ = cheerio.load((await BulgarianNationalBank.get('?search=true')).data)

  const csvFiles = {}

  if (!existsSync(process.env.DATA_DIR!)) {
    await mkdir(process.env.DATA_DIR!, {
      recursive: true
    })
  }

  // Get all available currencies
  $('select#valutes > option').toArray().map(($currencyOption) => {
    const currencyISOCode = $($currencyOption).text().trim()

    if (currencyISOCode.length === 3) {
      csvFiles[currencyISOCode] = new AsyncParser({
        fields: Object.values(columns)
      }).toOutput(createWriteStream(`${process.env.DATA_DIR}/${currencyISOCode}.csv`, { encoding: 'utf8' }))

      commonParamObject.append('valutes', currencyISOCode)
    }
  })

  for (const [paramKey, paramValue] of Object.entries(commonParams)) {
    commonParamObject.append(paramKey, paramValue)
  }

  const currentTime = new Date()
  const stepInDays = 240

  for (
    let cursor = currentTime, requestIndex = 0;
    isAfterDate(cursor, endDate);
    cursor = subDays(cursor, stepInDays), requestIndex++
  ) {
    const periodEnd = requestIndex === 0 ? cursor : subDays(cursor, 1)
    const periodStart = maxDate([
      subDays(cursor, stepInDays), endDate
    ])

    console.log({
      periodEnd,
      periodStart
    })

    const periodParams = new URLSearchParams()

    periodParams.append('periodStartDays', formatDate(new Date(periodStart), 'd'))
    periodParams.append('periodStartMonths', formatDate(new Date(periodStart), 'L'))
    periodParams.append('periodStartYear', formatDate(new Date(periodStart), 'Y'))
    periodParams.append('periodEndDays', formatDate(new Date(periodEnd), 'd'))
    periodParams.append('periodEndMonths', formatDate(new Date(periodEnd), 'L'))
    periodParams.append('periodEndYear', formatDate(new Date(periodEnd), 'Y'))

    const XMLResponse = await BulgarianNationalBank.get(`index.htm?${periodParams.toString()}&${commonParamObject.toString()}`, {
      headers: {
        'user-agent': faker.internet.userAgent()
      }
    })

    const $ParsedXML = cheerio.load(XMLResponse?.data, {
      xmlMode: true
    })

    const previousDates: PrevDates = {}

    $ParsedXML('ROW').toArray().reverse().map(($row) => {
      const rate = $ParsedXML($row).find('RATE').text()

      if (isNumeric(rate)) {
        const code = $ParsedXML($row).find('CODE').text().trim()
        const reverseRate = $ParsedXML($row).find('REVERSERATE').text().trim()
        const date = new Date($ParsedXML($row).find('S2_CURR_DATE').text().trim())
        const previousDate = previousDates?.[code]
        const numberOfMissingDays = previousDate ? differenceInDays(previousDate, addDays(date, 1)) : 0

        previousDates[code] = date

        const csvData = {
          [columns.date]: date.toISOString(),
          [columns.rate]: rate,
          [columns.reverseRate]: reverseRate === 'n/a' ? '' : reverseRate,
          [columns.isoCode]: code
        }

        // Fill in missing dates
        Array(numberOfMissingDays).fill('')
          .map((_, missingDayIndex) => addDays(date, missingDayIndex + 1))
          .reverse()
          .forEach(dateToAdd => {
            csvFiles[code].input.push(JSON.stringify({
              ...csvData,
              [columns.date]: dateToAdd,
              [columns.wasMissing]: 1
            }))
          })

        csvFiles[code].input.push(JSON.stringify(csvData))
      }
    })

  }
})()
