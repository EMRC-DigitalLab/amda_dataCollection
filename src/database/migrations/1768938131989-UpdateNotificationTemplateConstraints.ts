import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateNotificationTemplateConstraints1768938131989 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop the existing unique constraint on 'name'
        await queryRunner.query(`ALTER TABLE "notification_templates" DROP CONSTRAINT IF EXISTS "UQ_4118447024198c4ac2203a8218b"`);
        
        // Create the new composite unique index
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_notification_templates_name_channel" ON "notification_templates" ("name", "channel")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert: Drop the new index
        await queryRunner.query(`DROP INDEX "IDX_notification_templates_name_channel"`);

        // Revert: Add back the unique constraint on 'name'
        await queryRunner.query(`ALTER TABLE "notification_templates" ADD CONSTRAINT "UQ_4118447024198c4ac2203a8218b" UNIQUE ("name")`);
    }
}
