import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMemberIdToAuditLogs1768834391387 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add memberId column
        await queryRunner.query(`
            ALTER TABLE "audit_logs" 
            ADD COLUMN "memberId" uuid
        `);

        // Add Foreign Key for memberId
        await queryRunner.query(`
            ALTER TABLE "audit_logs" 
            ADD CONSTRAINT "FK_audit_logs_memberId" 
            FOREIGN KEY ("memberId") 
            REFERENCES "members"("id") 
            ON DELETE SET NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop Foreign Key
        await queryRunner.query(`
            ALTER TABLE "audit_logs" 
            DROP CONSTRAINT "FK_audit_logs_memberId"
        `);

        // Drop column
        await queryRunner.query(`
            ALTER TABLE "audit_logs" 
            DROP COLUMN "memberId"
        `);
    }

}
