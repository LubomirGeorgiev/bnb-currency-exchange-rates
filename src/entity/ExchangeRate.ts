import { Entity, Column, BeforeInsert, PrimaryColumn } from "typeorm";
import { nanoid } from 'nanoid'


import { BaseTable } from '../utils'

@Entity()
export class ExchangeRate extends BaseTable {

  @Column('datetime')
  date: Date;

  @Column('varchar', {
    length: 3
  })
  isoCode: string;

  @Column('decimal')
  rate: number;
}
