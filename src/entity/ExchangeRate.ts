import { Entity, Column, Unique } from 'typeorm'

import { BaseTable } from '../utils'

@Entity('exchange_rates')
@Unique('UQ_RATE', [
  'isoCode',
  'date',
  'rate',
  'backfilled'
])
export class ExchangeRate extends BaseTable {

  @Column('datetime')
    date: Date

  @Column('varchar', {
    length: 3
  })
    isoCode: string

  @Column('decimal')
    rate: number

  @Column('boolean', {
    nullable: true
  })
    backfilled: boolean
}
