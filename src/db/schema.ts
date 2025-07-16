import { createSchemaFactory } from "drizzle-zod"
import { z } from "@hono/zod-openapi"
export * from "./auth-schema"
export * from "./app-schema"
import { todosTable, collections } from "./app-schema"

const { createInsertSchema, createSelectSchema, createUpdateSchema } =
  createSchemaFactory({ zodInstance: z })

// Todos schemas (existing)
export const selectTodoSchema = createSelectSchema(todosTable)
export const createTodoSchema = createInsertSchema(todosTable)
  .omit({
    created_at: true,
  })
  .openapi(`CreateTodo`)
export const updateTodoSchema = createUpdateSchema(todosTable)

// Collections schemas
export const selectCollectionSchema = createSelectSchema(collections)
export const createCollectionSchema = createInsertSchema(collections)
  .omit({ id: true, createdAt: true, updatedAt: true })
  .openapi(`CreateCollection`)
export const updateCollectionSchema = createUpdateSchema(collections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})

// Nodes schemas - manually defined to avoid circular reference issues with Uint8Array
export const selectNodeSchema = z.object({
  id: z.number(),
  name: z.string(),
  kind: z.enum(["file", "folder"]),
  loroSnapshot: z.instanceof(Uint8Array),
  parentId: z.number().nullable(),
  metadata: z.record(z.any()),
  collectionId: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const createNodeSchema = z
  .object({
    name: z.string(),
    kind: z.enum(["file", "folder"]),
    loroSnapshot: z.instanceof(Uint8Array).optional(),
    parentId: z.number().nullable().optional(),
    metadata: z.record(z.any()),
    collectionId: z.number(),
  })
  .openapi(`CreateNode`)

export const updateNodeSchema = z
  .object({
    name: z.string().optional(),
    kind: z.enum(["file", "folder"]).optional(),
    loroSnapshot: z.instanceof(Uint8Array).optional(),
    parentId: z.number().nullable().optional(),
    metadata: z.record(z.any()).optional(),
  })
  .openapi(`UpdateNode`)

// TypeScript types
export type Todo = z.infer<typeof selectTodoSchema>
export type UpdateTodo = z.infer<typeof updateTodoSchema>

export type Collection = z.infer<typeof selectCollectionSchema>
export type CreateCollection = z.infer<typeof createCollectionSchema>
export type UpdateCollection = z.infer<typeof updateCollectionSchema>

export type Node = z.infer<typeof selectNodeSchema>
export type CreateNode = z.infer<typeof createNodeSchema>
export type UpdateNode = z.infer<typeof updateNodeSchema>
