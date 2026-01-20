import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class CreateRefreshTokens1234567890 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if table exists first
        const tableExists = await queryRunner.hasTable("refresh_tokens");
        
        if (!tableExists) {
            await queryRunner.createTable(
                new Table({
                    name: "refresh_tokens",
                    columns: [
                        { name: "id", type: "uuid", isPrimary: true, default: "uuid_generate_v4()" },
                        { name: "createdAt", type: "timestamp", default: "now()" },
                        { name: "updatedAt", type: "timestamp", default: "now()" },
                        { name: "deletedAt", type: "timestamp", isNullable: true },
                        { name: "userId", type: "uuid" },
                        { name: "tokenHash", type: "varchar", length: "255" },
                        { name: "expiresAt", type: "timestamp" },
                        { name: "revokedAt", type: "timestamp", isNullable: true },
                        { name: "lastUsedAt", type: "timestamp", isNullable: true },
                        { name: "userAgent", type: "varchar", length: "255", isNullable: true },
                        { name: "ipAddress", type: "varchar", length: "45", isNullable: true },
                    ],
                })
            );

            await queryRunner.createIndex("refresh_tokens", new TableIndex({
                name: "IDX_c25bc63d248ca90e8dcc1d92d0",
                columnNames: ["tokenHash"],
                isUnique: true
            }));

            await queryRunner.createIndex("refresh_tokens", new TableIndex({
                name: "IDX_610102b60fea1455310ccd299d",
                columnNames: ["userId"]
            }));

            await queryRunner.createIndex("refresh_tokens", new TableIndex({
                name: "IDX_56b91d98f71e3d1b649ed6e9f3",
                columnNames: ["expiresAt"]
            }));

            await queryRunner.createIndex("refresh_tokens", new TableIndex({
                name: "IDX_2ccd871bc19d6ec5dcc93cc5bb",
                columnNames: ["revokedAt"]
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("refresh_tokens", true);
    }
}