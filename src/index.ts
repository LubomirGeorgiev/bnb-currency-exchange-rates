import 'reflect-metadata'
import 'dotenv-defaults/config'

console.time('Execution Time')

import { Connection, createConnection } from 'typeorm'
import Axios from 'axios'
import { URL, URLSearchParams } from 'url'
import {
  max as maxDate,
  subDays,
  isAfter as isAfterDate,
  isValid as isValiDate,
} from 'date-fns'
import cheerio from 'cheerio'
import publicIP from 'public-ip'
import intlFormat from 'date-fns/intlFormat'

import { ExchangeRateRepository } from './repository/ExchangeRate'

let numberOfRequests = 0
const currentTime = new Date()
const stepInDays = parseFloat(process.env.STEP_IN_DAYS || '')
const timeZone = 'Europe/Sofia'
const fakeUserAgents = [
  'Mozilla/5.0 (compatible; MSIE 10.0; Windows 95; Trident/3.0)',
  'Mozilla/5.0 (Windows; U; Windows NT 6.2) AppleWebKit/534.7.1 (KHTML, like Gecko) Version/4.0.4 Safari/534.7.1',
  'Mozilla/5.0 (Macintosh; U; PPC Mac OS X 10_7_4) AppleWebKit/5341 (KHTML, like Gecko) Chrome/37.0.884.0 Mobile Safari/5341',
  'Mozilla/5.0 (Windows; U; Windows NT 4.0) AppleWebKit/532.36.1 (KHTML, like Gecko) Version/4.0.4 Safari/532.36.1',
  'Mozilla/5.0 (X11; Linux i686) AppleWebKit/5330 (KHTML, like Gecko) Chrome/38.0.898.0 Mobile Safari/5330',
  'Mozilla/5.0 (Windows NT 4.0) AppleWebKit/5331 (KHTML, like Gecko) Chrome/36.0.814.0 Mobile Safari/5331',
  'Mozilla/5.0 (compatible; MSIE 10.0; Windows NT 6.2; Trident/3.1)',
  'Mozilla/5.0 (Windows NT 6.2; en-US; rv:1.9.2.20) Gecko/20180529 Firefox/35.0',
  'Mozilla/5.0 (Windows NT 6.2) AppleWebKit/5350 (KHTML, like Gecko) Chrome/37.0.838.0 Mobile Safari/5350'
]

const isNumber = (num: number) => typeof num === 'number' && !isNaN(num)

const endDate = new Date(process.env.END_DATE || '')

if (!isValiDate(endDate)) {
  throw new Error('The env variable "END_DATE" must be a valid date')
}

if (!isNumber(stepInDays)) {
  throw new Error('The env variable "STEP_IN_DAYS" must be a number')
}

let connection: undefined | Connection = undefined

const BulgarianNationalBank = Axios.create({
  baseURL: 'https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies'
})

process.on('exit', () => {
  const domain = `${new URL(BulgarianNationalBank.defaults.baseURL || '').hostname}`
  console.log('\n')
  console.timeEnd('Execution Time')
  console.log(`Number of requests to ${domain}: ${numberOfRequests}`)
})

BulgarianNationalBank.interceptors.request.use(request => {
  numberOfRequests++
  return request
});

(async () => {
  const userAgent = fakeUserAgents[Math.floor(Math.random() * fakeUserAgents.length)]
  console.log(`Current IP Address is: ${await publicIP.v4()}`)
  console.log(`User Agent: ${userAgent}\n`)

  connection = await createConnection()
  global.typeormConnection = connection

  const ExchangeRateRepo = connection.getCustomRepository(ExchangeRateRepository)
  const QB_ALIAS = 'r'
  const createQueryBuilder = () => ExchangeRateRepo.createQueryBuilder(QB_ALIAS)

  const queryParams = new URLSearchParams({
    type: 'XML',
    downloadOper: 'true',
    group1: 'second',
    search: 'true',
    showChart: 'false',
    showChartButton: 'true'
  })
  const $ = cheerio.load((await BulgarianNationalBank.get('?search=true')).data)

  $('select#valutes > option').toArray().map(($currencyOption) => {
    const currencyISOCode = $($currencyOption).text().trim()

    if (currencyISOCode.length === 3) {
      queryParams.append('valutes', currencyISOCode)
    }
  })

  for (
    let cursor = currentTime, requestIndex = 0;
    isAfterDate(cursor, endDate);
    cursor = subDays(cursor, stepInDays), requestIndex++
  ) {
    const periodEnd = requestIndex === 0 ? cursor : subDays(cursor, 1)
    const periodStart = maxDate([
      subDays(cursor, stepInDays), endDate
    ])

    console.log(`${JSON.stringify({ request: numberOfRequests, periodStart, periodEnd })}`)

    const periodQueryParams = new URLSearchParams()

    periodQueryParams.append('periodStartDays', intlFormat(periodStart, { timeZone, day: 'numeric' }))
    periodQueryParams.append('periodStartMonths', intlFormat(periodStart, { timeZone, month: 'numeric' }))
    periodQueryParams.append('periodStartYear', intlFormat(periodStart, { timeZone, year: 'numeric' }))
    periodQueryParams.append('periodEndDays', intlFormat(periodEnd, { timeZone, day: 'numeric' }))
    periodQueryParams.append('periodEndMonths', intlFormat(periodEnd, { timeZone, month: 'numeric' }))
    periodQueryParams.append('periodEndYear', intlFormat(periodEnd, { timeZone, year: 'numeric' }))

    const XMLResponse = await BulgarianNationalBank.get(`index.htm?${periodQueryParams.toString()}&${queryParams.toString()}`, {
      headers: {
        'user-agent': userAgent
      }
    })

    const $XML = cheerio.load(XMLResponse?.data, { xmlMode: true })

    for (const [_rowKey, $row] of $XML('ROW').toArray().reverse().entries()) {
      const rate = parseFloat($XML($row).find('RATE').text())

      if (isNumber(rate)) {
        const isoCode = $XML($row).find('CODE').text().trim()
        const date = new Date(`${$XML($row).find('S2_CURR_DATE').text().trim()} 13:00`)

        try {
          await createQueryBuilder()
            .insert()
            .values(ExchangeRateRepo.create({
              date,
              isoCode,
              rate
            }))
            // Don't make a SELECT query after the insert: https://github.com/typeorm/typeorm/issues/4651#issuecomment-575991809
            .updateEntity(false)
            .execute()
        } catch {}
      }
    }
  }
})()
