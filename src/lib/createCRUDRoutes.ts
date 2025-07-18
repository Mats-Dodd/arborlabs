import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi"
import { db } from "@/db/connection"
import { eq, sql, and, SQL } from "drizzle-orm"
import type { InferSelectModel, InferInsertModel } from "drizzle-orm"
import { PgTable, PgColumn } from "drizzle-orm/pg-core"
import * as HttpStatusCodes from "stoker/http-status-codes"
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers"
import createMessageObjectSchema from "stoker/openapi/schemas/create-message-object"
import * as HttpStatusPhrases from "stoker/http-status-phrases"
import { createErrorSchema } from "stoker/openapi/schemas"
import IdParamsSchema from "stoker/openapi/schemas/id-params"
import { auth } from "@/lib/auth"

// Type for better-auth session
type BetterAuthSession = {
  user: {
    id: string
    email: string
    name: string
    emailVerified: boolean
    image?: string | null
    createdAt: Date
    updatedAt: Date
  }
  session: {
    id: string
    userId: string
    expiresAt: Date
    createdAt: Date
    updatedAt: Date
    token: string
    ipAddress?: string | null
    userAgent?: string | null
  }
}

/**
 * Generates a unique transaction ID for database operations
 * @param tx - Database transaction object
 * @returns Promise resolving to transaction ID string
 */
async function generateTxId(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0]
): Promise<string> {
  const txidResult = await tx.execute(sql`SELECT txid_current() as txid`)
  return String(txidResult.rows[0].txid)
}

/**
 * Configuration for CRUD route generation
 *
 * @example
 * ```typescript
 * // Simple user-owned todos
 * createCRUDRoutes({
 *   table: todosTable,
 *   schema: { select: selectTodoSchema, create: createTodoSchema, update: updateTodoSchema },
 *   basePath: "/api/todos",
 *   syncFilter: (session) => `user_id = '${session.user.id}'`,
 *   access: {
 *     create: (_session, _data) => true,
 *     update: (session, _id, _data) => eq(todosTable.user_id, session.user.id),
 *     delete: (session, _id) => eq(todosTable.user_id, session.user.id),
 *   },
 * })
 *
 * // Organization-based with role checks
 * createCRUDRoutes({
 *   table: projectsTable,
 *   schema: { select: selectProjectSchema, create: createProjectSchema, update: updateProjectSchema },
 *   basePath: "/api/projects",
 *   syncFilter: (session) => `org_id = '${session.user.org_id}'`,
 *   access: {
 *     create: (session, data) => {
 *       if (session.user.org_id !== data.org_id) {
 *         throw new Error("Can only create projects in your organization")
 *       }
 *       return true
 *     },
 *     update: (session, _id, _data) => and(
 *       eq(projectsTable.org_id, session.user.org_id),
 *       eq(projectsTable.team_id, session.user.team_id)
 *     ),
 *     delete: (session, _id) => {
 *       if (session.user.role !== 'admin') {
 *         throw new Error("Only admins can delete projects")
 *       }
 *       return eq(projectsTable.org_id, session.user.org_id)
 *     },
 *   },
 * })
 * ```
 */
interface CRUDConfig<TTable extends PgTable> {
  /** Database table to perform operations on */
  table: TTable
  /** Zod schemas for validation */
  schema: {
    select: z.ZodTypeAny
    create: z.ZodTypeAny
    update: z.ZodTypeAny
  }
  /** Base path for the API routes (e.g., "/api/todos") */
  basePath: string
  /**
   * Function to generate Electric sync filter for user-specific data
   * @example `(session) => \`user_id = '\${session.user.id}'\``
   */
  syncFilter?: (session: BetterAuthSession) => string
  /** Access control configuration for CRUD operations */
  access?: {
    /**
     * Create access control - return true to allow, throw error to deny
     * @param session - Better-auth session object
     * @param data - Data being created
     * @returns true to allow creation
     * @throws Error to deny with custom message
     * @example
     * ```typescript
     * create: (session, data) => {
     *   if (session.user.org_id !== data.org_id) {
     *     throw new Error("Can only create items in your organization")
     *   }
     *   return true
     * }
     * ```
     */
    create?: (
      session: BetterAuthSession,
      data: InferInsertModel<TTable>
    ) => true | never
    /**
     * Update access control - return true to allow, drizzle condition to filter, throw error to deny
     * @param session - Better-auth session object
     * @param id - ID of item being updated
     * @param data - Data being updated
     * @returns true to allow, drizzle where condition to filter, or throws error to deny
     * @example
     * ```typescript
     * update: (session, id, data) => eq(table.user_id, session.user.id)
     * // or with multiple conditions
     * update: (session, id, data) => and(
     *   eq(table.org_id, session.user.org_id),
     *   eq(table.team_id, session.user.team_id)
     * )
     * ```
     */
    update?: (
      session: BetterAuthSession,
      id: string,
      data: Partial<InferInsertModel<TTable>>
    ) => true | SQL
    /**
     * Delete access control - return true to allow, drizzle condition to filter, throw error to deny
     * @param session - Better-auth session object
     * @param id - ID of item being deleted
     * @returns true to allow, drizzle where condition to filter, or throws error to deny
     * @example
     * ```typescript
     * delete: (session, id) => {
     *   if (session.user.role !== 'admin') {
     *     throw new Error("Only admins can delete items")
     *   }
     *   return eq(table.user_id, session.user.id)
     * }
     * ```
     */
    delete?: (session: BetterAuthSession, id: string) => true | SQL
  }
}

/**
 * Creates CRUD routes with authentication and authorization for a given table
 * @param config - Configuration object for the CRUD routes
 * @returns OpenAPIHono router with GET, POST, PUT, DELETE routes
 */
export function createCRUDRoutes<TTable extends PgTable>(
  config: CRUDConfig<TTable>
) {
  const { table, schema, basePath, syncFilter, access } = config

  // Helper to get the id column - assumes table has an 'id' column
  const getIdColumn = () => {
    const tableWithId = table as TTable & { id: PgColumn }
    if (!tableWithId.id) {
      throw new Error(`Table must have an 'id' column`)
    }
    return tableWithId.id
  }

  return new OpenAPIHono()
    .openapi(
      createRoute({
        path: basePath,
        method: "get",
        responses: {
          [HttpStatusCodes.OK]: {
            description: `shape response`,
          },
        },
      }),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session) {
          return c.json({ error: "Unauthorized" }, HttpStatusCodes.UNAUTHORIZED)
        }

        const url = new URL(c.req.raw.url)
        const originUrl = new URL(`http://localhost:3000/v1/shape`)

        url.searchParams.forEach((value, key) => {
          if ([`live`, `table`, `handle`, `offset`, `cursor`].includes(key)) {
            originUrl.searchParams.set(key, value)
          }
        })

        if (syncFilter) {
          const filter = syncFilter(session)
          originUrl.searchParams.set("where", filter)
        }

        const response = await fetch(originUrl)
        const headers = new Headers(response.headers)
        headers.delete(`content-encoding`)
        headers.delete(`content-length`)

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers,
        })
      }
    )
    .openapi(
      createRoute({
        path: basePath,
        method: "post",
        request: {
          body: jsonContentRequired(schema.create, "The item to create"),
        },
        responses: {
          [HttpStatusCodes.OK]: jsonContent(
            z.object({
              txid: z.string(),
              item: schema.select,
            }),
            "The created item"
          ),
          [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            createMessageObjectSchema("Unauthorized"),
            "Unauthorized"
          ),
          [HttpStatusCodes.FORBIDDEN]: jsonContent(
            createMessageObjectSchema("Forbidden"),
            "Forbidden"
          ),
          [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(schema.create),
            "The validation error(s)"
          ),
        },
      }),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session) {
          return c.json(
            { message: "Unauthorized" },
            HttpStatusCodes.UNAUTHORIZED
          )
        }

        const body = c.req.valid("json")

        try {
          if (access?.create) {
            access.create(session, body as InferInsertModel<TTable>)
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Access denied"
          return c.json({ message }, HttpStatusCodes.FORBIDDEN)
        }

        const result = await db.transaction(async (tx) => {
          const txid = await generateTxId(tx)
          const insertResult = (await tx
            .insert(table)
            .values(body)
            .returning()) as InferSelectModel<TTable>[]
          const newItem = insertResult[0]
          return { item: newItem, txid }
        })

        return c.json(result, HttpStatusCodes.OK)
      }
    )
    .openapi(
      createRoute({
        path: `${basePath}/{id}`,
        method: "put",
        request: {
          params: IdParamsSchema,
          body: jsonContentRequired(schema.update, "The item to update"),
        },
        responses: {
          [HttpStatusCodes.OK]: jsonContent(
            z.object({
              txid: z.string(),
              item: schema.select,
            }),
            "The updated item"
          ),
          [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            createMessageObjectSchema("Unauthorized"),
            "Unauthorized"
          ),
          [HttpStatusCodes.FORBIDDEN]: jsonContent(
            createMessageObjectSchema("Forbidden"),
            "Forbidden"
          ),
          [HttpStatusCodes.NOT_FOUND]: jsonContent(
            createMessageObjectSchema(HttpStatusPhrases.NOT_FOUND),
            HttpStatusPhrases.NOT_FOUND
          ),
          [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
            createErrorSchema(schema.update),
            "The validation error(s)"
          ),
        },
      }),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session) {
          return c.json(
            { message: "Unauthorized" },
            HttpStatusCodes.UNAUTHORIZED
          )
        }

        const { id } = c.req.valid("param")
        const body = c.req.valid("json")

        const idColumn = getIdColumn()
        let whereCondition = eq(idColumn, id)

        try {
          if (access?.update) {
            const accessResult = access.update(
              session,
              String(id),
              body as Partial<InferInsertModel<TTable>>
            )
            if (accessResult !== true) {
              whereCondition =
                and(whereCondition, accessResult) || whereCondition
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Access denied"
          return c.json({ message }, HttpStatusCodes.FORBIDDEN)
        }

        const result = await db.transaction(async (tx) => {
          const txid = await generateTxId(tx)
          const updateResult = (await tx
            .update(table)
            .set(body)
            .where(whereCondition)
            .returning()) as InferSelectModel<TTable>[]
          const updatedItem = updateResult[0]
          return { item: updatedItem, txid }
        })

        if (!result.item) {
          return c.json(
            { message: "Item not found" },
            HttpStatusCodes.NOT_FOUND
          )
        } else {
          return c.json(result, HttpStatusCodes.OK)
        }
      }
    )
    .openapi(
      createRoute({
        path: `${basePath}/{id}`,
        method: "delete",
        request: {
          params: IdParamsSchema,
        },
        responses: {
          [HttpStatusCodes.OK]: jsonContent(
            z.object({
              txid: z.string(),
              item: schema.select,
            }),
            "The deleted item"
          ),
          [HttpStatusCodes.UNAUTHORIZED]: jsonContent(
            createMessageObjectSchema("Unauthorized"),
            "Unauthorized"
          ),
          [HttpStatusCodes.FORBIDDEN]: jsonContent(
            createMessageObjectSchema("Forbidden"),
            "Forbidden"
          ),
          [HttpStatusCodes.NOT_FOUND]: jsonContent(
            createMessageObjectSchema("Item not found"),
            "Item not found"
          ),
        },
      }),
      async (c) => {
        const session = await auth.api.getSession({
          headers: c.req.raw.headers,
        })
        if (!session) {
          return c.json(
            { message: "Unauthorized" },
            HttpStatusCodes.UNAUTHORIZED
          )
        }

        const { id } = c.req.valid("param")

        const idColumn = getIdColumn()
        let whereCondition = eq(idColumn, id)

        try {
          if (access?.delete) {
            const accessResult = access.delete(session, String(id))
            if (accessResult !== true) {
              whereCondition =
                and(whereCondition, accessResult) || whereCondition
            }
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Access denied"
          return c.json({ message }, HttpStatusCodes.FORBIDDEN)
        }

        const result = await db.transaction(async (tx) => {
          const txid = await generateTxId(tx)
          const deleteResult = (await tx
            .delete(table)
            .where(whereCondition)
            .returning()) as InferSelectModel<TTable>[]
          const deletedItem = deleteResult[0]
          return { item: deletedItem, txid }
        })

        if (!result.item) {
          return c.json(
            { message: "Item not found" },
            HttpStatusCodes.NOT_FOUND
          )
        }

        return c.json(result, HttpStatusCodes.OK)
      }
    )
}
