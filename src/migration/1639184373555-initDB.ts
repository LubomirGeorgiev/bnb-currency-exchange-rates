import {MigrationInterface, QueryRunner} from "typeorm";

export class initDB1639184373555 implements MigrationInterface {
    name = 'initDB1639184373555'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "exchange_rate" ("id" varchar(18) PRIMARY KEY NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "updated" datetime NOT NULL DEFAULT (datetime('now')), "date" datetime NOT NULL, "isoCode" varchar(3) NOT NULL, "rate" decimal NOT NULL, CONSTRAINT "UQ_RATE" UNIQUE ("isoCode", "date", "rate"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "exchange_rate"`);
    }

}
