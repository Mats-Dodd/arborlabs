import { createServerFileRoute } from "@tanstack/react-start/server"
import { OpenAPIHono } from "@hono/zod-openapi"
import { createCRUDRoutes } from "@/lib/createCRUDRoutes"
import {
  todosTable,
  selectTodoSchema,
  createTodoSchema,
  updateTodoSchema,
} from "@/db/schema"
import { eq } from "drizzle-orm"

const app = new OpenAPIHono()

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

// Chain the routes properly for RPC type inference
const routes = app.route("/api", todosRoutes)

const serve = ({ request }: { request: Request }) => {
  return routes.fetch(request)
}

export type AppType = typeof routes

export const ServerRoute = createServerFileRoute("/api/$").methods({
  GET: serve,
  POST: serve,
  PUT: serve,
  DELETE: serve,
  PATCH: serve,
  OPTIONS: serve,
  HEAD: serve,
})
