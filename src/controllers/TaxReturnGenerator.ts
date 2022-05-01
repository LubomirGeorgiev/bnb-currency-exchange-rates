import ExcelJS from 'exceljs'
import Xlsx from 'xlsx'
import { Connection, createConnection } from 'typeorm'
import { parse as parseDate, getTime } from 'date-fns'
import { toNumber } from '../utils'

import { ExchangeRateRepository } from '../repository/ExchangeRate'

type EtoroReportReaderConstructorArgs = {
  fileName?: string
}

enum TaxReturnColumns {
  number = '№',
  code = 'Код',
  closeDate = 'Дата на прехвърляне',
  sellPrice = 'Продажна цена',
  buyPrice = 'Цена на придобиване',
  profit = 'Печалба',
  loss = 'Загуба',
  info = 'Допълнителна информация',
}

type TableObjectType = Record<keyof typeof TaxReturnColumns, any>
type Columns = keyof typeof TaxReturnColumns

const stringToDate = (dateString: string) => parseDate(dateString, 'dd/MM/yyyy HH:mm:ss', new Date())

const freezeFirstRow: Partial<ExcelJS.WorksheetView>[] = [
  { state: 'frozen', ySplit: 1 }
]

class EtoroReportReader {
  public fileName: string
  /**
   * The sheetjs file instance
   */
  private etoroReportWorkBook: ExcelJS.Workbook
  private taxReturnWorkbook: ExcelJS.Workbook

  #etoroReportSheetName = 'Closed Positions'
  #etoroDividendColumn = 'Is Dividend'

  #taxReturnProfitSheetName = 'Печалби'
  #taxReturnDividendSheetName = 'Дивиденти'

  public etoroReportSheet: ExcelJS.Worksheet & { _rows?: ExcelJS.Row[] }
  public taxReturnProfitSheet: ExcelJS.Worksheet
  public taxReturnDividendSheet: ExcelJS.Worksheet

  connection: Connection

  ExchangeRateRepo: ExchangeRateRepository

  numberOfRows?: number

  constructor({
    fileName
  }: EtoroReportReaderConstructorArgs) {
    if (!fileName) {
      throw new Error('Please provide a file')
    }

    this.fileName = fileName
  }

  getColumnLetterFromFullAddress(cellAddress: string) {
    return cellAddress.replace(/[0-9]/g, '')
  }

  async setupDBConnection() {
    this.connection = await createConnection()

    this.ExchangeRateRepo = this.connection.getCustomRepository(ExchangeRateRepository)

    global.typeormConnection = this.connection
  }

  /**
   *
   * [exceljs](https://github.com/exceljs/exceljs/) can't read certain files and in order to fix them they need to be opened and resaved in
   * Microsoft Excel or another program.
   *
   * Our workaround is to open the file with [SheetJS](https://github.com/SheetJS/sheetjs) and output it as a buffer and then pass the buffer
   * to exceljs
   *
   * FOR MORE INFROMATION PLEASE REFER TO [https://github.com/exceljs/exceljs/issues/962](https://github.com/exceljs/exceljs/issues/962)
   * @link https://github.com/exceljs/exceljs/issues/962
   */
  repairFile(file: string) {
    const XlsxWorkbook = Xlsx.readFile(file)

    return Xlsx.write(XlsxWorkbook, { type: 'buffer' }) as Buffer
  }

  /**
   * Tag each cell with the name of the column so we can then easily find them with `row.getCell('Amount')` for example
   */
  #attachKeyToEachCell() {
    const headRow = this.etoroReportSheet.getRow(1)
    headRow.eachCell((cell, colNumber) => this.etoroReportSheet.getColumn(colNumber).key = cell.text)
  }

  #enumToColumns(columnEnum: Record<string, string>): Partial<ExcelJS.Column>[] {
    return Object.entries(columnEnum).map(([key, header]) => ({ key, header }))
  }

  getColumnRange(columnKey: Columns) {
    const columnLetter = this.taxReturnProfitSheet.getColumn(columnKey).letter

    return `${columnLetter}1:${columnLetter}${this.numberOfRows}`
  }

  async generateTaxReturn({
    sheet,
    ignoreDividendColumn,
  }: { sheet: ExcelJS.Worksheet, ignoreDividendColumn: boolean }) {
    for (const row of this.etoroReportSheet._rows!) {
      const rowNumber = row.number

      if (Boolean(row.getCell(this.#etoroDividendColumn).text.length) === ignoreDividendColumn || rowNumber === 1) {
        continue
      }

      const units = toNumber(row.getCell('Units').text)
      const closeRate = toNumber(row.getCell('Close Rate').text)
      const openRate = toNumber(row.getCell('Open Rate').text)
      const closeDate = stringToDate(row.getCell('Close Date').text)
      const openDate = stringToDate(row.getCell('Open Date').text)
      const action = row.getCell('Action')
      const isin = row.getCell('ISIN').text
      const isStock = Boolean(isin?.length)

      const closeExchangeRate = (await this.ExchangeRateRepo.getByDate(closeDate)).rate
      const openExchangeRate = (await this.ExchangeRateRepo.getByDate(openDate)).rate
      const sellPrice = closeRate * units * closeExchangeRate
      const buyPrice = openRate * units * openExchangeRate
      const profit = sellPrice - buyPrice

      sheet.addRow({
        number: rowNumber,
        code: 508,
        closeDate: row.getCell('Close Date').text,
        sellPrice,
        buyPrice,
        profit: profit >= 0 ? profit : '-',
        loss: profit < 0 ? Math.abs(profit) : '-',
        info: `${isStock ? `Акции (ISIN номер: ${isin}) - ` : ''}${action}`
      } as TableObjectType)
    }

    this.numberOfRows = sheet.rowCount

    const formulasRow = sheet.addRow({})
    this.addStyles(formulasRow)

    // Add SUM formulas
    formulasRow.getCell('profit').value = {
      formula: `SUM(${this.getColumnRange('profit')})`, date1904: false
    }

    formulasRow.getCell('loss').value = {
      formula: `SUM(${this.getColumnRange('loss')})`, date1904: false
    }

    const totalsRow = sheet.addRow({})
    this.addStyles(totalsRow)

    totalsRow.getCell('buyPrice').value = 'Облагаем доход (ПЕЧАЛБА - ЗАГУБА)'

    sheet.mergeCells(`${totalsRow.getCell('profit').address}:${totalsRow.getCell('loss').address}`)

    totalsRow.getCell('profit').value = {
      formula: `${formulasRow.getCell('profit').address}-${formulasRow.getCell('loss').address}`,
      date1904: false
    }

    this.fixCellWidth(sheet)
  }

  addStyles(cellOrRow: ExcelJS.Row | ExcelJS.Column | ExcelJS.Cell) {
    cellOrRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'e1e1e1' }
    }

    cellOrRow.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    }

    cellOrRow.font = { bold: true }
  }

  createTaxReturnTable() {
    this.taxReturnWorkbook = new ExcelJS.Workbook()
    this.taxReturnProfitSheet = this.taxReturnWorkbook.addWorksheet(this.#taxReturnProfitSheetName, {
      views: freezeFirstRow
    })
    this.taxReturnProfitSheet.columns = this.#enumToColumns(TaxReturnColumns)

    this.taxReturnDividendSheet = this.taxReturnWorkbook.addWorksheet(this.#taxReturnDividendSheetName, {
      views: freezeFirstRow
    })
    this.taxReturnDividendSheet.columns = this.#enumToColumns(TaxReturnColumns)
  }

  async parse({ fileName }: Pick<EtoroReportReaderConstructorArgs, 'fileName'> = {}) {
    await this.setupDBConnection()

    const file = fileName || this.fileName
    const etoroReport = new ExcelJS.Workbook()

    // FIXME If this kind of seems weird please have a look at https://github.com/exceljs/exceljs/issues/962
    // When they resolve the issue we should get rid of this
    try {
      this.etoroReportWorkBook = await etoroReport.xlsx.readFile(file)
    } catch (err) {
      this.etoroReportWorkBook = await etoroReport.xlsx.load(this.repairFile(file))
    }

    this.etoroReportSheet = this.etoroReportWorkBook.getWorksheet(this.#etoroReportSheetName)
    this.#attachKeyToEachCell()

    this.createTaxReturnTable()
    await this.generateTaxReturn({
      sheet: this.taxReturnProfitSheet,
      ignoreDividendColumn: true,
    })

    await this.generateTaxReturn({
      sheet: this.taxReturnDividendSheet,
      ignoreDividendColumn: false,
    })

    await this.taxReturnWorkbook.xlsx.writeFile(`generated/generated-tax-return-${getTime(new Date())}.xlsx`)
  }

  /**
   * Source: https://github.com/exceljs/exceljs/issues/83#issuecomment-801895920
   */
  fixCellWidth(worksheet: ExcelJS.Worksheet, minimalWidth = 10) {
    worksheet.columns.forEach((column) => {
      let maxColumnLength = 0

      if (!column?.eachCell) {
        return
      }

      column.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle'
        }

        maxColumnLength = Math.max(
          maxColumnLength,
          minimalWidth,
          cell.value ? cell.value.toString().length : 0
        )
      })
      column.width = maxColumnLength + 6
    })
  }
}

export default EtoroReportReader
