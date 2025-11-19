// processors/site-processor.ts - Create or update MinigridSite records with dynamic KPI mapping

import { DataSource } from 'typeorm';
import { MinigridSite } from '../../../src/database/entities/minigrid-site.entity';
import { MinigridSiteRepository } from '../../../src/database/repositories/forms/minigrid-site.repository';
import { Member } from '../../../src/database/entities/member.entity';
import { SiteDataRow, MinigridSiteData } from '../types';
import { KPI_TO_MINIGRID_SITE_MAPPING, DEFAULT_SITE_DATA } from '../config';
import { logger } from '../utils/logger';

export class SiteProcessor {
  private siteRepository: MinigridSiteRepository;

  constructor(dataSource: DataSource) {
    this.siteRepository = new MinigridSiteRepository(dataSource);
  }

  /**
   * Process site - create if doesn't exist, otherwise return existing
   */
  async processSite(
    siteRow: SiteDataRow,
    member: Member,
    kpiToSlugMap: Map<string, string>
  ): Promise<MinigridSite> {
    logger.debug(`Processing site: ${siteRow.siteName}`);

    try {
      // Extract site data using dynamic KPI mapping
      const siteData = this.extractSiteData(siteRow, member, kpiToSlugMap);

      // Check if site exists
      const existingSites = await this.siteRepository.findByUserId(member.id);
      let site = existingSites.find(s => s.name.toLowerCase() === siteRow.siteName.toLowerCase());

      if (site) {
        logger.debug(`Site already exists: ${site.name} (ID: ${site.id})`);

        // Optionally update existing site with new data
        site = (await this.siteRepository.update(site.id, siteData as any)) || site;
        logger.debug(`Site updated: ${site.name}`);

        return site;
      }

      // Create new site
      logger.debug(`Creating new site: ${siteRow.siteName}`);
      site = await this.siteRepository.create(siteData as any);
      logger.success(`Site created: ${site.name} (ID: ${site.id})`);

      return site;
    } catch (error: any) {
      logger.error(`Failed to process site: ${siteRow.siteName}`, {
        rowIndex: siteRow.rowIndex,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Extract site data from row using dynamic KPI mapping
   */
  private extractSiteData(
    siteRow: SiteDataRow,
    member: Member,
    kpiToSlugMap: Map<string, string>
  ): Partial<MinigridSiteData> {
    const siteData: Partial<MinigridSiteData> = {
      ...DEFAULT_SITE_DATA,
      name: siteRow.siteName,
      memberId: member.memberId || member.id,
      memberUuid: member.id,
    };

    // Iterate through KPI mappings and extract corresponding values
    for (const [kpi, mapping] of Object.entries(KPI_TO_MINIGRID_SITE_MAPPING)) {
      // Find the slug for this KPI from the current sheet
      const slug = kpiToSlugMap.get(kpi);

      if (!slug) {
        // Try case-insensitive match
        const kpiLower = kpi.toLowerCase();
        for (const [key, value] of kpiToSlugMap.entries()) {
          if (key.toLowerCase() === kpiLower) {
            const foundSlug = value;
            const rawValue = siteRow.data[foundSlug];

            if (rawValue !== null && rawValue !== undefined) {
              const transformedValue = mapping.transform ? mapping.transform(rawValue) : rawValue;
              (siteData as any)[mapping.entityField] = transformedValue;
            }
            break;
          }
        }
        continue;
      }

      // Get value from site row data
      const rawValue = siteRow.data[slug];

      if (rawValue !== null && rawValue !== undefined) {
        // Apply transformation if specified
        const transformedValue = mapping.transform ? mapping.transform(rawValue) : rawValue;
        (siteData as any)[mapping.entityField] = transformedValue;
      }
    }

    return siteData;
  }

  /**
   * Build KPI to slug mapping from data sheet
   */
  static buildKpiToSlugMap(dataSheet: any): Map<string, string> {
    const map = new Map<string, string>();

    for (const category of dataSheet.categories) {
      for (const question of category.questions) {
        map.set(question.kpi, question.slug);
      }
    }

    return map;
  }
}
