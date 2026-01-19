import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateAuditLogTable1768827621990 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create ENUM for severity
        await queryRunner.query(`
            CREATE TYPE "public"."audit_logs_severity_enum" AS ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL')
        `);

        // Create audit_logs table
        await queryRunner.createTable(new Table({
            name: "audit_logs",
            columns: [
                {
                    name: "id",
                    type: "uuid",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "uuid",
                    default: "uuid_generate_v4()",
                },
                {
                    name: "action",
                    type: "varchar",
                    length: "100",
                },
                {
                    name: "resourceType",
                    type: "varchar",
                    length: "100",
                    isNullable: true,
                },
                {
                    name: "resourceId",
                    type: "varchar",
                    length: "100",
                    isNullable: true,
                },
                {
                    name: "userId",
                    type: "uuid",
                    isNullable: true,
                },
                {
                    name: "details",
                    type: "jsonb",
                    isNullable: true,
                },
                {
                    name: "severity",
                    type: "enum",
                    enum: ["INFO", "WARNING", "ERROR", "CRITICAL"],
                    enumName: "audit_logs_severity_enum",
                    default: "'INFO'",
                },
                {
                    name: "ipAddress",
                    type: "varchar",
                    length: "45",
                    isNullable: true,
                },
                {
                    name: "userAgent",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "isSuccess",
                    type: "boolean",
                    default: true,
                },
                {
                    name: "errorMessage",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "createdAt",
                    type: "timestamp",
                    default: "now()",
                },
            ]
        }), true);

        // Add Foreign Key for userId
        await queryRunner.createForeignKey("audit_logs", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL",
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop table (FKs are dropped automatically)
        await queryRunner.dropTable("audit_logs");

        // Drop ENUM type
        await queryRunner.query(`
            DROP TYPE "public"."audit_logs_severity_enum"
        `);
    }

}
