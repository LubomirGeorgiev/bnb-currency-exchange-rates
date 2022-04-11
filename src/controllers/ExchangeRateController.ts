import { Connection, createConnection } from 'typeorm'
import Axios from 'axios'
import { URL, URLSearchParams } from 'url'
import toMilliseconds from 'ms'
import {
  join, dirname
} from 'path'
import { readFile, writeFile } from 'fs/promises'
import {
  max as maxDate,
  subDays,
  addDays,
  isAfter as isAfterDate,
  isValid as isValiDate,
  startOfDay,
  endOfDay,
  format,
} from 'date-fns'
import cheerio from 'cheerio'
import publicIP from 'public-ip'
import intlFormat from 'date-fns/intlFormat'
import prettier from 'prettier'

import { ExchangeRateRepository } from '../repository/ExchangeRate'
import { ExchangeRate } from 'entity/ExchangeRate'

const isNumber = (num: number) => typeof num === 'number' && !isNaN(num)

type MissingDateType = { date: Date, parent: ExchangeRate }

class ExchangeRateController {
  numberOfRequests = 0
  currentTime = new Date()
  stepInDays = parseFloat(process.env.STEP_IN_DAYS || '')
  endDate = new Date(process.env.END_DATE || '')
  timeZone = 'Europe/Sofia'
  BulgarianNationalBank = Axios.create({
    baseURL: 'https://www.bnb.bg/Statistics/StExternalSector/StExchangeRates/StERForeignCurrencies',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
    }
  })
  fakeUserAgents = [
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
  userAgent = this.fakeUserAgents[Math.floor(Math.random() * this.fakeUserAgents.length)]
  queryParams = new URLSearchParams({
    type: 'XML',
    downloadOper: 'true',
    group1: 'second',
    search: 'true',
    showChart: 'false',
    showChartButton: 'true'
  })
  readmeFilePath = join(dirname(require?.main?.filename ?? ''), '../README.md')

  currenciesToFetch: Array<string>
  readmeFileAsText: string
  connection: Connection
  ExchangeRateRepo: ExchangeRateRepository

  constructor() {
    this.#setupHTTPInterceptors()
    this.#setupOnExitEvent()
  }

  async init() {
    await this.#validateParams()
    await this.#setupDBConnection()
    console.log(`Current IP Address is: ${await publicIP.v4()}`)
    console.log(`User Agent: ${this.userAgent}\n`)
    await this.getReadmeFileContent()

    for (
      let cursor = this.currentTime, requestIndex = 0;
      isAfterDate(cursor, this.endDate);
      cursor = subDays(cursor, this.stepInDays), requestIndex++
    ) {
      const periodStart = startOfDay(maxDate([
        subDays(cursor, this.stepInDays), this.endDate
      ]))
      const periodEnd = endOfDay(requestIndex === 0 ? cursor : subDays(cursor, 1))

      const results = await this.ExchangeRateRepo.getByDate({
        startDate: startOfDay(subDays(periodStart, 1)),
        endDate: endOfDay(addDays(periodEnd, 1))
      })

      // We add padding to the start and end so we can detect the missing days
      results.unshift(this.ExchangeRateRepo.create({
        date: startOfDay(subDays(periodStart, 1))
      }))

      results.push(this.ExchangeRateRepo.create({
        date: endOfDay(addDays(periodEnd, 1))
      }))

      const hasMissingDays = Boolean(this.getMissingDays(results)?.length)

      if (hasMissingDays) {
        await this.#iteratePeriod(periodStart, periodEnd)
      }
    }

    // Back fill all of the missing days in the whole database
    const missingDays = this.getMissingDays(await this.ExchangeRateRepo.getByDate())
    await this.#backfillDates(missingDays)

    return this
  }

  async #backfillDates(missingDates: MissingDateType[]) {

    for (const missingDate of missingDates) {
      const missingDateToBackfill = this.ExchangeRateRepo.create({
        date: missingDate?.date,
        isoCode: missingDate?.parent?.isoCode,
        rate: missingDate?.parent?.rate,
        backfilled: true,
      })

      await this.ExchangeRateRepo.save(missingDateToBackfill, { reload: false })
    }
  }

  getMissingDays(arrayOfDates: ExchangeRate[]): MissingDateType[] {
    const missingDates: MissingDateType[] = []

    for (let i = 1; i < arrayOfDates.length; i++) {
      const currentEntity = arrayOfDates?.[i - 1]
      const currentDate = currentEntity?.date
      const daysDiff = ((arrayOfDates[i]?.date?.getTime() - currentDate?.getTime()) / toMilliseconds('1 day')) - 1

      for (let j = 1; j <= daysDiff; j++) {
        const missingDate = new Date(currentDate)
        missingDate.setDate(currentDate?.getDate() + j)
        missingDates.push({
          date: missingDate,
          parent: currentEntity
        })
      }
    }

    return missingDates
  }

  async #iteratePeriod(periodStart: Date, periodEnd: Date) {
    console.log(`${JSON.stringify({ request: this.numberOfRequests, periodStart, periodEnd })}`)

    const periodQueryParams = new URLSearchParams()
    const timeZone = this.timeZone

    periodQueryParams.append('periodStartDays', intlFormat(periodStart, { timeZone, day: 'numeric' }))
    periodQueryParams.append('periodStartMonths', intlFormat(periodStart, { timeZone, month: 'numeric' }))
    periodQueryParams.append('periodStartYear', intlFormat(periodStart, { timeZone, year: 'numeric' }))
    periodQueryParams.append('periodEndDays', intlFormat(periodEnd, { timeZone, day: 'numeric' }))
    periodQueryParams.append('periodEndMonths', intlFormat(periodEnd, { timeZone, month: 'numeric' }))
    periodQueryParams.append('periodEndYear', intlFormat(periodEnd, { timeZone, year: 'numeric' }))

    const XMLResponse = await this.BulgarianNationalBank.get(`index.htm?${periodQueryParams.toString()}&${this.queryParams.toString()}`, {
      headers: {
        'user-agent': this.userAgent
      }
    })

    const $XML = cheerio.load(XMLResponse?.data, { xmlMode: true })

    for (const [_rowKey, $row] of $XML('ROW').toArray().reverse().entries()) {
      const rate = parseFloat($XML($row).find('RATE').text())

      if (isNumber(rate)) {
        const isoCode = $XML($row).find('CODE').text().trim()
        const date = new Date(`${$XML($row).find('S2_CURR_DATE').text().trim()} 13:00`)

        try {
          await this.ExchangeRateRepo.save(this.ExchangeRateRepo.create({
            date,
            isoCode,
            rate
          }), { reload: false })
        } catch { }
      }
    }

    await this.#updateReadmeFile()
  }

  async #updateReadmeFile() {
    const uniqueRawIsoCodes = await this.ExchangeRateRepo.getUniqueIsoCodes()

    const uniqueIsoCodes = uniqueRawIsoCodes.map(entity => entity?.isoCode)
    let markdown = `\nLast Update: ${format(new Date(), 'PPppp')} _(${new Date().toISOString()})_\n\n| Currency (ISO Code) | Number of records |\n|:-:|:-:|`

    for (const uniqueIsoCode of uniqueIsoCodes) {
      const count = await this.ExchangeRateRepo.getCountByIsoCode(uniqueIsoCode)

      markdown = markdown + `\n| ${uniqueIsoCode} | ${count} |`
    }

    const modifiedReadmeFileContent = this.readmeFileAsText.replace(/(<!--.*?-->)([\s\S]*?)(<!--.*?-->)/gmi, `$1\n${markdown}\n$3`)

    writeFile(this.readmeFilePath, prettier.format(modifiedReadmeFileContent, {
      parser: 'markdown'
    }))
  }

  async #validateParams() {
    if (process.env.CURRENCIES_TO_FETCH) {
      this.currenciesToFetch = process.env.CURRENCIES_TO_FETCH.split(',')

      this.currenciesToFetch.map(isoCode => this.queryParams.append('valutes', isoCode))
    } else {
      await this.getAllCurrencies()
    }

    if (!isValiDate(this.endDate)) {
      throw new Error('The env variable "END_DATE" must be a valid date')
    }

    if (!isNumber(this.stepInDays)) {
      throw new Error('The env variable "STEP_IN_DAYS" must be a number')
    }
  }

  async #setupDBConnection() {
    this.connection = await createConnection()

    this.ExchangeRateRepo = this.connection.getCustomRepository(ExchangeRateRepository)

    global.typeormConnection = this.connection
  }

  #setupHTTPInterceptors() {
    this.BulgarianNationalBank.interceptors.request.use(request => {
      this.numberOfRequests = this.numberOfRequests + 1
      return request
    })
  }

  async getReadmeFileContent() {
    this.readmeFileAsText = await readFile(this.readmeFilePath, 'utf8')
  }

  #setupOnExitEvent() {
    process.on('exit', () => {
      const domain = `${new URL(this.BulgarianNationalBank.defaults.baseURL || '').hostname}`
      console.log('\n')
      console.timeEnd('Execution Time')
      console.log(`Number of requests to ${domain}: ${this.numberOfRequests}`)
    })
  }

  async getAllCurrencies() {
    const $ = cheerio.load((await this.BulgarianNationalBank.get('?search=true')).data)

    $('select#valutes > option').toArray().map(($currencyOption) => {
      const currencyISOCode = $($currencyOption).text().trim()

      if (this.#isValidCurrencyCode(currencyISOCode)) {
        this.queryParams.append('valutes', currencyISOCode)
      }
    })
  }

  #isValidCurrencyCode(cur: string) {
    return typeof cur === 'string' && cur.length === 3 && cur === cur.toUpperCase()
  }
}

export default ExchangeRateController
