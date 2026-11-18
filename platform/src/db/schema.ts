import { pgTable, text, timestamp, uuid, integer, index, uniqueIndex } from "drizzle-orm/pg-core";

/**
 * Phase 1 (scaffold) tables.
 *
 * This is deliberately the *authentication + durable queue* slice only — the
 * part every later feature depends on. Domain tables (customer, technician,
 * zone, asset, job, quote_version, resource_block, payment, warranty_claim,
 * consent, reminder) land in Phase 2 after you review the shape, because
 * their constraints encode business rules we should agree on first.
 *
 * Kept in sync by hand with src/db/migrations/*.sql, which is what actually
 * runs. Drizzle is used here for typed queries, not to generate migrations.
 */

/** One row per verified phone number, across both portals. */
export const identity = pgTable(
  "identity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** E.164, unique. The only stable handle a customer or expert has. */
    phone: text("phone").notNull(),
    displayName: text("display_name"),
    /** "bn" | "hi" | "en" — mirrored onto messages and receipts. */
    language: text("language").notNull().default("bn"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ phone: uniqueIndex("identity_phone_key").on(t.phone) }),
);

/** Grants portal access. Customer membership is self-serve; expert is ops-provisioned. */
export const membership = pgTable(
  "membership",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    identityId: uuid("identity_id")
      .notNull()
      .references(() => identity.id, { onDelete: "cascade" }),
    /** "customer" | "expert" */
    portal: text("portal").notNull(),
    /** "invited" | "active" | "suspended" | "revoked" */
    status: text("status").notNull().default("active"),
    approvedBy: uuid("approved_by"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    onePerPortal: uniqueIndex("membership_identity_portal_key").on(t.identityId, t.portal),
    byIdentity: index("membership_identity_idx").on(t.identityId),
  }),
);

/** Server-side session. Revoking a membership must invalidate these. */
export const session = pgTable(
  "session",
  {
    /** SHA-256 of the cookie value — the raw token is never stored. */
    id: text("id").primaryKey(),
    identityId: uuid("identity_id")
      .notNull()
      .references(() => identity.id, { onDelete: "cascade" }),
    portal: text("portal").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byIdentity: index("session_identity_idx").on(t.identityId) }),
);

/** Inbound WhatsApp/provider event, deduplicated on the provider message id. */
export const inboundEvent = pgTable(
  "inbound_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Meta message id (or our own key for web-originated work). Unique. */
    externalId: text("external_id").notNull(),
    channel: text("channel").notNull().default("whatsapp"),
    payload: text("payload").notNull(),
    /** "received" | "processed" | "failed" | "dead" */
    status: text("status").notNull().default("received"),
    attempts: integer("attempts").notNull().default(0),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
  (t) => ({
    externalKey: uniqueIndex("inbound_event_external_id_key").on(t.externalId),
    pending: index("inbound_event_status_idx").on(t.status, t.receivedAt),
  }),
);

/** Transactional outbox: side effects are queued in the same tx as the write. */
export const outbox = pgTable(
  "outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Idempotency key for the action, e.g. `job/<id>/confirm`. */
    actionKey: text("action_key").notNull(),
    /** "whatsapp.send" | "receipt.issue" | "reminder.send" … */
    kind: text("kind").notNull(),
    payload: text("payload").notNull(),
    /** "pending" | "leased" | "done" | "failed" | "dead" */
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    actionKey: uniqueIndex("outbox_action_key_key").on(t.actionKey),
    due: index("outbox_due_idx").on(t.status, t.nextAttemptAt),
  }),
);

/** Provider delivery receipts, applied idempotently. */
export const deliveryEvent = pgTable(
  "delivery_event",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    providerMessageId: text("provider_message_id").notNull(),
    status: text("status").notNull(),
    detail: text("detail"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ byMessage: index("delivery_event_message_idx").on(t.providerMessageId) }),
);
