import 'dotenv-defaults/config'

import ExchangeRateController from './controllers/ExchangeRateController'

console.time('Execution Time')

const dates = [
  '2021-01-09T11:00:00.000Z',
  '2021-01-10T11:00:00.000Z',
  '2021-01-12T11:00:00.000Z',
  '2021-01-13T11:00:00.000Z',
  '2021-01-18T11:00:00.000Z',
  '2021-01-20T11:00:00.000Z',
].map(date => ({
  date: new Date(date)
}))

describe('Main Class', () => {
  test('returns missing dates correctly', () => {
    const controller = new ExchangeRateController()

    expect(controller.getMissingDays(dates)).toEqual([
      new Date('2021-01-11T11:00:00.000Z'),
      new Date('2021-01-14T11:00:00.000Z'),
      new Date('2021-01-15T11:00:00.000Z'),
      new Date('2021-01-16T11:00:00.000Z'),
      new Date('2021-01-17T11:00:00.000Z'),
      new Date('2021-01-19T11:00:00.000Z'),
    ])

  })
})
