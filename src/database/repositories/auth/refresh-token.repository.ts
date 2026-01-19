import { DataSource, Repository } from 'typeorm';
import { RefreshToken } from '../../entities/refresh-token.entity';

export class RefreshTokenRepository extends Repository<RefreshToken> {
  constructor(private dataSource: DataSource) {
    super(RefreshToken, dataSource.manager);
  }

  async createRefreshToken(data: Partial<RefreshToken>): Promise<RefreshToken> {
    const token = this.create(data);
    return this.save(token);
  }

  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.findOne({ where: { tokenHash } });
  }

  async revokeToken(id: string): Promise<void> {
    await this.update(id, { revokedAt: new Date() });
  }

  async revokeUserTokens(userId: string): Promise<void> {
    await this.update({ userId, revokedAt: undefined }, { revokedAt: new Date() });
  }
}
