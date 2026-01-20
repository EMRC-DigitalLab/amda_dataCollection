import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTimestampsToAuditLogs1768840000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "audit_logs" 
            ADD COLUMN "updatedAt" timestamp DEFAULT now(),
            ADD COLUMN "deletedAt" timestamp
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "audit_logs" 
            DROP COLUMN "updatedAt",
            DROP COLUMN "deletedAt"
        `);
    }

}
