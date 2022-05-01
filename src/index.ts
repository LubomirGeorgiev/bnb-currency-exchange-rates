
process.env.TZ = 'UTC'
import 'reflect-metadata'
import 'dotenv-defaults/config'

import { Command } from 'commander'
import path from 'path'


import ExchangeRateController from './controllers/ExchangeRateController'
import TaxReturnGenerator from './controllers/TaxReturnGenerator'

const program = new Command()

program
  .command('exchange-rates', { isDefault: true })
  .description('Fetches exchange rates from bnb.bg and updates the database')
  .action(() => {
    new ExchangeRateController().init()
  })

program
  .command('gen-tax')
  .description('Generates tax return from an Etoro account statement')
  .requiredOption('-f, --file <file>', 'The Etoro account statement XLSX file that you want to use to generate the tax return')
  .action(async({ file }) => {
    const fileAbsolutePath = path.resolve(__dirname, '..', file)

    const table = new TaxReturnGenerator({
      fileName: fileAbsolutePath
    })

    await table.parse()
  })

program.parse()
