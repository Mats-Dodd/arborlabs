import { createSchemaFactory } from "drizzle-zod"
import { z } from "@hono/zod-openapi"
export * from "./auth-schema"
export * from "./app-schema"
import { todosTable, collections, nodes } from "./app-schema"

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
export const createCollectionSchema =
  createInsertSchema(collections).openapi(`CreateCollection`)
export const updateCollectionSchema = createUpdateSchema(collections)

// Nodes schemas
export const selectNodeSchema = createSelectSchema(nodes)
export const createNodeSchema = createInsertSchema(nodes).openapi(`CreateNode`)
export const updateNodeSchema = createUpdateSchema(nodes)

// TypeScript types
export type Todo = z.infer<typeof selectTodoSchema>
export type UpdateTodo = z.infer<typeof updateTodoSchema>

export type Collection = z.infer<typeof selectCollectionSchema>
export type CreateCollection = z.infer<typeof createCollectionSchema>
export type UpdateCollection = z.infer<typeof updateCollectionSchema>

export type Node = z.infer<typeof selectNodeSchema>
export type CreateNode = z.infer<typeof createNodeSchema>
export type UpdateNode = z.infer<typeof updateNodeSchema>
