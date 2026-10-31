/**
 * Implementasi in-memory dari port repository. Dipakai unit & e2e test supaya
 * logika aplikasi dan lapisan HTTP bisa diverifikasi tanpa PostgreSQL.
 * (Query SQL di Pg*Repository TIDAK teruji di sini — butuh database nyata.)
 */
import { randomUUID } from 'crypto';
import {
  Category,
  Product,
  ProductModifierGroupLink,
} from '../../src/modules/catalog/domain/catalog.entities';
import { CatalogRepository } from '../../src/modules/catalog/domain/catalog.repository';
import {
  OtpRecord,
  OtpRepository,
  OtpSender,
  RefreshTokenRecord,
  RefreshTokenRepository,
  User,
  UserRepository,
} from '../../src/modules/auth/domain/auth.ports';
import { haversineKm } from '../../src/modules/store/domain/haversine';
import {
  NearbyStoreQuery,
  Store,
  StoreRepository,
  StoreWithDistance,
} from '../../src/modules/store/domain/store.repository';
import * as fx from '../fixtures/catalog.fixtures';

export class InMemoryCatalogRepository implements CatalogRepository {
  constructor(
    private readonly categories: Category[] = fx.categories,
    private readonly products: Product[] = fx.products,
    private readonly links: ProductModifierGroupLink[] = fx.links,
  ) {}

  async findActiveCategories() {
    return [...this.categories].sort((a, b) => a.displayOrder - b.displayOrder);
  }
  async findAvailableProducts() {
    const active = new Set(this.categories.map((c) => c.id));
    return this.products.filter((p) => p.isAvailable && active.has(p.categoryId));
  }
  async findAvailableProductById(id: string) {
    return (await this.findAvailableProducts()).find((p) => p.id === id) ?? null;
  }
  async findModifierGroupsForProducts(ids: string[]) {
    return this.links.filter((l) => ids.includes(l.productId));
  }
}

export class InMemoryStoreRepository implements StoreRepository {
  constructor(private readonly stores: Store[] = fx.stores) {}

  async findNearby(q: NearbyStoreQuery): Promise<StoreWithDistance[]> {
    return this.stores
      .filter((s) => s.isActive)
      .map((s) => ({ ...s, distanceKm: haversineKm(q, s) }))
      .filter((s) => s.distanceKm <= q.radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, q.limit);
  }
  async findActiveById(id: string) {
    return this.stores.find((s) => s.id === id && s.isActive) ?? null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  readonly users: User[] = [];
  async findById(id: string) {
    return this.users.find((u) => u.id === id) ?? null;
  }
  async findByPhone(phone: string) {
    return this.users.find((u) => u.phoneNumber === phone) ?? null;
  }
  async create(data: { phoneNumber: string; fullName: string }) {
    const user: User = {
      id: randomUUID(),
      phoneNumber: data.phoneNumber,
      fullName: data.fullName,
      email: null,
      role: 'CUSTOMER',
      loyaltyPoints: 0,
    };
    this.users.push(user);
    return user;
  }
}

export class InMemoryOtpRepository implements OtpRepository {
  readonly records: OtpRecord[] = [];
  constructor(private readonly now: () => Date = () => new Date()) {}

  async findLatest(phone: string) {
    const list = this.records.filter((r) => r.phoneNumber === phone);
    return list[list.length - 1] ?? null;
  }
  async create(data: { phoneNumber: string; codeHash: string; expiresAt: Date }) {
    const rec: OtpRecord = { id: randomUUID(), attempts: 0, consumedAt: null, createdAt: this.now(), ...data };
    this.records.push(rec);
    return rec;
  }
  async incrementAttempts(id: string) {
    const rec = this.records.find((r) => r.id === id)!;
    rec.attempts += 1;
    return rec.attempts;
  }
  async consume(id: string, at: Date) {
    const rec = this.records.find((r) => r.id === id);
    if (!rec || rec.consumedAt) return false;
    rec.consumedAt = at;
    return true;
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  readonly records: (RefreshTokenRecord & { replacedBy?: string })[] = [];
  async create(data: { id: string; userId: string; tokenHash: string; expiresAt: Date }) {
    this.records.push({ ...data, revokedAt: null });
  }
  async findById(id: string) {
    return this.records.find((r) => r.id === id) ?? null;
  }
  async revoke(id: string, at: Date, replacedBy?: string) {
    const rec = this.records.find((r) => r.id === id);
    if (!rec || rec.revokedAt) return false;
    rec.revokedAt = at;
    rec.replacedBy = replacedBy;
    return true;
  }
  async revokeAllForUser(userId: string, at: Date) {
    this.records.filter((r) => r.userId === userId && !r.revokedAt).forEach((r) => (r.revokedAt = at));
  }
}

/** Menangkap OTP terkirim agar test bisa "membaca WhatsApp". */
export class CapturingOtpSender implements OtpSender {
  readonly sent: { phone: string; code: string }[] = [];
  async send(phone: string, code: string) {
    this.sent.push({ phone, code });
  }
  lastCodeFor(phone: string) {
    return [...this.sent].reverse().find((s) => s.phone === phone)?.code;
  }
}
