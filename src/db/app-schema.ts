import {
  pgTable,
  integer,
  varchar,
  boolean,
  timestamp,
  text,
} from "drizzle-orm/pg-core"
import { users } from "./auth-schema"

export const todosTable = pgTable(`todos`, {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  text: varchar({ length: 500 }).notNull(),
  completed: boolean().notNull().default(false),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  user_id: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
})
