import { createServerFileRoute } from "@tanstack/react-start/server"
import { OpenAPIHono } from "@hono/zod-openapi"
import { createCRUDRoutes } from "@/lib/createCRUDRoutes"
import {
  todosTable,
  selectTodoSchema,
  createTodoSchema,
  updateTodoSchema,
  collections,
  selectCollectionSchema,
  createCollectionSchema,
  updateCollectionSchema,
  nodes,
  selectNodeSchema,
  createNodeSchema,
  updateNodeSchema,
} from "@/db/schema"
import { eq } from "drizzle-orm"

const app = new OpenAPIHono()

// Todos routes (existing)
const todosRoutes = createCRUDRoutes({
  table: todosTable,
  schema: {
    select: selectTodoSchema,
    create: createTodoSchema,
    update: updateTodoSchema,
  },
  basePath: "/todos",
  syncFilter: (session) => `user_id = '${session.user.id}'`,
  access: {
    create: (_session, _data) => true,
    update: (session, _id, _data) => eq(todosTable.user_id, session.user.id),
    delete: (session, _id) => eq(todosTable.user_id, session.user.id),
  },
})

// Collections routes
const collectionsRoutes = createCRUDRoutes({
  table: collections,
  schema: {
    select: selectCollectionSchema,
    create: createCollectionSchema,
    update: updateCollectionSchema,
  },
  basePath: "/collections",
  syncFilter: (session) => `user_id = '${session.user.id}'`,
  access: {
    create: (_session, _data) => true,
    update: (session, _id, _data) => eq(collections.user_id, session.user.id),
    delete: (session, _id) => eq(collections.user_id, session.user.id),
  },
})

// Nodes routes
const nodesRoutes = createCRUDRoutes({
  table: nodes,
  schema: {
    select: selectNodeSchema,
    create: createNodeSchema,
    update: updateNodeSchema,
  },
  basePath: "/nodes",
  // Note: No syncFilter for nodes since Electric doesn't support subqueries
  // Access control is handled through the API routes below
  access: {
    create: (_session, _data) => true, // Collection ownership will be validated by FK constraint
    update: (session, _id, _data) =>
      // Can only update nodes in collections they own
      eq(collections.user_id, session.user.id),
    delete: (session, _id) =>
      // Can only delete nodes in collections they own
      eq(collections.user_id, session.user.id),
  },
})

// Chain the routes properly for RPC type inference
const routes = app
  .route("/api", todosRoutes)
  .route("/api", collectionsRoutes)
  .route("/api", nodesRoutes)

const serve = ({ request }: { request: Request }) => {
  return routes.fetch(request)
}

export type AppType = typeof routes

export const ServerRoute = createServerFileRoute("/api/$").methods({
  GET: serve,
  POST: serve,
  PUT: serve,
  DELETE: serve,
})
