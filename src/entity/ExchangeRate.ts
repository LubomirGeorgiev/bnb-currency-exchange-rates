import { Entity, Column, AfterLoad, Unique } from "typeorm";
import {
  format
} from 'date-fns'

import { BaseTable } from '../utils'

export const dateComparisonFormat = 'yyyy-MM-dd'

@Entity()
@Unique('UQ_RATE', ['isoCode', 'date', 'rate'])
export class ExchangeRate extends BaseTable {

  @Column('datetime')
  date: Date;

  @Column('varchar', {
    length: 3
  })
  isoCode: string;

  @Column('decimal')
  rate: number;

  DATE_TO_COMPARE: string

  @AfterLoad()
  afterLoad() {
    this.DATE_TO_COMPARE = format(this.date, dateComparisonFormat)
  }
}
