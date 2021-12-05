import {MigrationInterface, QueryRunner} from "typeorm";

export class InitDB1638737763392 implements MigrationInterface {
    name = 'InitDB1638737763392'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "exchange_rate" ("id" varchar(18) PRIMARY KEY NOT NULL, "created" datetime NOT NULL DEFAULT (datetime('now')), "updated" datetime NOT NULL DEFAULT (datetime('now')), "isoCode" varchar(3) NOT NULL, "rate" decimal NOT NULL, "reverseRate" decimal NOT NULL, "wasMissing" boolean NOT NULL DEFAULT (0))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "exchange_rate"`);
    }

}
