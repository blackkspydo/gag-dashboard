import { Migration } from '@mikro-orm/migrations';

export class Migration20250810033305 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`create table if not exists "phone_verification" ("id" text not null, "phone_number" text not null, "otp_code" text not null, "expires_at" timestamptz not null, "is_verified" boolean not null default false, "attempts" integer not null default 0, "max_attempts" integer not null default 3, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "phone_verification_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_phone_verification_deleted_at" ON "phone_verification" (deleted_at) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_phone_verification_phone_number" ON "phone_verification" (phone_number) WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_phone_verification_expires_at" ON "phone_verification" (expires_at) WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "phone_verification" cascade;`);
  }

}
