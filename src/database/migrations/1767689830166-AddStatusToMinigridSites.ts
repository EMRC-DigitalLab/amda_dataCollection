import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusToMinigridSites1767689830166 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 Starting AddStatusToMinigridSites migration...');

        // Step 1: Check if enum type already exists
        const enumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type 
            WHERE typname = 'minigrid_sites_status_enum'
        `);

        // Step 2: Create enum type if it doesn't exist
        if (enumExists.length === 0) {
            await queryRunner.query(`
                CREATE TYPE minigrid_sites_status_enum AS ENUM (
                    'Operational',
                    'Under Construction',
                    'Planned',
                    'Maintenance',
                    'Decommissioned'
                )
            `);
            console.log('  ✅ Created minigrid_sites_status_enum type');
        } else {
            console.log('  ℹ️  minigrid_sites_status_enum type already exists');
        }

        // Step 3: Check if column already exists
        const columnExists = await queryRunner.query(`
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'minigrid_sites' 
            AND column_name = 'status'
        `);

        // Step 4: Add column if it doesn't exist
        if (columnExists.length === 0) {
            await queryRunner.query(`
                ALTER TABLE minigrid_sites 
                ADD COLUMN status minigrid_sites_status_enum 
                NOT NULL DEFAULT 'Planned'::minigrid_sites_status_enum
            `);
            console.log('  ✅ Added status column to minigrid_sites');

            // Step 5: Update existing records based on commissioning date
            await queryRunner.query(`
                UPDATE minigrid_sites 
                SET status = 'Operational'::minigrid_sites_status_enum
                WHERE commissioningDate <= CURRENT_DATE
                AND commissioningDate IS NOT NULL
            `);
            console.log('  ✅ Updated existing records with appropriate status');
        } else {
            console.log('  ℹ️  status column already exists');
        }

        console.log('✅ AddStatusToMinigridSites migration completed successfully');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('🔄 Reverting AddStatusToMinigridSites migration...');

        // Step 1: Drop the column
        await queryRunner.query(`
            ALTER TABLE minigrid_sites 
            DROP COLUMN IF EXISTS status
        `);
        console.log('  ✅ Dropped status column from minigrid_sites');

        // Step 2: Drop the enum type
        await queryRunner.query(`
            DROP TYPE IF EXISTS minigrid_sites_status_enum
        `);
        console.log('  ✅ Dropped minigrid_sites_status_enum type');

        console.log('✅ AddStatusToMinigridSites migration reverted successfully');
    }

}