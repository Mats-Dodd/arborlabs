import {
  pgTable,
  integer,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  pgEnum,
  index,
  customType,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"
import { users } from "./auth-schema"

// ---------------------------------------------------------------------------
// Custom types & enums
// ---------------------------------------------------------------------------

// Drizzle doesn't ship a built‑in bytea helper. We declare a minimal custom one
// so Node.loroSnapshot can stay a true PostgreSQL BYTEA column.
// Using Uint8Array for browser compatibility instead of Buffer
export const bytea = customType<{ data: Uint8Array }>({
  dataType() {
    return "bytea"
  },
})

export const nodeKindEnum = pgEnum("node_kind", ["folder", "file"])

// ---------------------------------------------------------------------------
// Todos (existing)
// ---------------------------------------------------------------------------

export const todosTable = pgTable(`todos`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: varchar({ length: 500 }).notNull(),
  completed: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

export const collections = pgTable("collection", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar("name", { length: 255 }).notNull(),
  metadata: jsonb("metadata").notNull(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
})

// ---------------------------------------------------------------------------
// Node (self‑referencing, belongs to Collection)
// ---------------------------------------------------------------------------

export const nodes = pgTable(
  "node",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 255 }).notNull(),
    kind: nodeKindEnum("kind").notNull(),
    loroSnapshot: bytea("loro_snapshot").notNull(),

    parentId: integer("parent_id"), // self‑reference; FK added in the callback
    metadata: jsonb("metadata").notNull(),

    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, {
        onDelete: "restrict",
        onUpdate: "restrict",
      }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => {
    return {
      parentIdx: index("idx_node_parent").on(table.parentId),
      collectionIdx: index("idx_node_collection").on(table.collectionId),
    }
  }
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const collectionRelations = relations(collections, ({ many, one }) => ({
  nodes: many(nodes),
  user: one(users, {
    fields: [collections.user_id],
    references: [users.id],
  }),
}))

export const nodeRelations = relations(nodes, ({ one, many }) => ({
  parent: one(nodes, {
    fields: [nodes.parentId],
    references: [nodes.id],
    relationName: "node_parent",
  }),
  children: many(nodes, {
    relationName: "node_parent",
  }),
  collection: one(collections, {
    fields: [nodes.collectionId],
    references: [collections.id],
  }),
}))
