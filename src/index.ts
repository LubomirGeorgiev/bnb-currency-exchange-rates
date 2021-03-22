import 'dotenv-defaults/config'

import Axios from 'axios'
import { URLSearchParams } from 'url'
import faker from 'faker'
import {
  format,
  subDays,
  isAfter,
  isValid as isValiDate
} from 'date-fns'

import isNumeric from 'isnumeric'

import { createWriteStream, existsSync, mkdir as mkd } from 'fs'

import { promisify } from 'util'

import cheerio from 'cheerio'

import { AsyncParser } from 'json2csv'

const mkdir = promisify(mkd)

let numberOfRequests = 0;
console.time('Execution Time')

process.on('exit', () => {
  console.timeEnd('Execution Time')
  console.log(`Number of requests: ${numberOfRequests}`)
})

const BulgarianNationalBank = Axios.create({
  baseURL: 'https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies'
});

BulgarianNationalBank.interceptors.request.use(request => {
  numberOfRequests++;
  return request
});

const endPeriod = new Date(process.env.END_DATE!);

if (!isValiDate(endPeriod)) {
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
  const fields = {
    date: 'date',
    rate: 'rate',
    reverseRate: 'reverseRate',
    isoCode: 'isoCode'
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
        fields: Object.values(fields)
      }).toOutput(createWriteStream(`${process.env.DATA_DIR}/${currencyISOCode}.csv`, { encoding: 'utf8' }))

      commonParamObject.append('valutes', currencyISOCode)
    }
  })

  for (const [paramKey, paramValue] of Object.entries(commonParams)) {
    commonParamObject.append(paramKey, paramValue)
  }

  const currentTime = new Date();
  const stepInDays = 90;

  for (
    let cursor = new Date(currentTime), requestIndex = 0;
    isAfter(cursor, endPeriod);
    cursor = subDays(cursor, stepInDays), requestIndex++
  ) {
    const periodEnd = requestIndex === 0 ? cursor : subDays(cursor, 1)
    const periodStart = subDays(cursor, stepInDays);

    console.log({
      periodEnd,
      periodStart
    })

    const periodParams = new URLSearchParams()

    periodParams.append('periodStartDays', format(new Date(periodStart), 'd'))
    periodParams.append('periodStartMonths', format(new Date(periodStart), 'L'))
    periodParams.append('periodStartYear', format(new Date(periodStart), 'Y'))
    periodParams.append('periodEndDays', format(new Date(periodEnd), 'd'))
    periodParams.append('periodEndMonths', format(new Date(periodEnd), 'L'));
    periodParams.append('periodEndYear', format(new Date(periodEnd), 'Y'))

    const XMLResponse = await BulgarianNationalBank.get(`index.htm?${periodParams.toString()}&${commonParamObject.toString()}`, {
      headers: {
        'user-agent': faker.internet.userAgent()
      }
    })

    const $ParsedXML = cheerio.load(XMLResponse?.data, {
      xmlMode: true
    })

    $ParsedXML('ROW').toArray().reverse().map(($row) => {
      const rate = $ParsedXML($row).find('RATE').text()

      if (isNumeric(rate)) {
        const code = $ParsedXML($row).find('CODE').text().trim()
        const reverseRate = $ParsedXML($row).find('REVERSERATE').text().trim()

        csvFiles[code].input.push(JSON.stringify({
          [fields.date]: new Date($ParsedXML($row).find('S2_CURR_DATE').text().trim()).toISOString(),
          [fields.rate]: $ParsedXML($row).find('RATE').text().trim(),
          [fields.reverseRate]: reverseRate === 'n/a' ? '' : reverseRate,
          [fields.isoCode]: code
        }))
      }
    })

  }
})()
