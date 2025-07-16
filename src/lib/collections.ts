import { createCollection } from "@tanstack/react-db"
import { electricCollectionOptions } from "@tanstack/db-collections"
import { authClient } from "@/lib/auth-client"
import {
  selectTodoSchema,
  selectCollectionSchema,
  selectNodeSchema,
} from "@/db/schema"
import { getClient } from "@/api-client"

const client = getClient()

// Todos collection (existing)
export const todoCollection = createCollection(
  electricCollectionOptions({
    id: "todos",
    shapeOptions: {
      url: new URL(
        `/api/todos`,
        typeof window !== `undefined`
          ? window.location.origin
          : `http://localhost:5173`
      ).toString(),
      params: {
        table: "todos",
        // Set the user_id as a param as a cache buster for when
        // you log in and out to test different accounts.
        user_id: async () => {
          const session = await authClient.getSession()
          const userId = session.data?.user?.id
          if (!userId) {
            throw new Error("User not authenticated")
          }
          return userId
        },
      },
      parser: {
        // Parse timestamp columns into JavaScript Date objects
        timestamptz: (date: string) => {
          return new Date(date)
        },
      },
    },
    schema: selectTodoSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newTodo } = transaction.mutations[0]
      const result = await client.api.todos.$post({
        json: {
          user_id: newTodo.user_id,
          text: newTodo.text,
          completed: newTodo.completed,
        },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedTodo } = transaction.mutations[0]
      const result = await client.api.todos[":id"].$put({
        param: {
          id: updatedTodo.id,
        },
        json: {
          text: updatedTodo.text,
          completed: updatedTodo.completed,
        },
      })
      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedTodo } = transaction.mutations[0]
      const result = await client.api.todos[":id"].$delete({
        param: { id: deletedTodo.id },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
  })
)

// Collections collection
export const collectionCollection = createCollection(
  electricCollectionOptions({
    id: "collections",
    shapeOptions: {
      url: new URL(
        `/api/collections`,
        typeof window !== `undefined`
          ? window.location.origin
          : `http://localhost:5173`
      ).toString(),
      params: {
        table: "collection",
        user_id: async () => {
          const session = await authClient.getSession()
          const userId = session.data?.user?.id
          if (!userId) {
            throw new Error("User not authenticated")
          }
          return userId
        },
      },
      parser: {
        timestamptz: (date: string) => new Date(date),
      },
    },
    schema: selectCollectionSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newCollection } = transaction.mutations[0]
      const result = await client.api.collections.$post({
        json: {
          name: newCollection.name,
          metadata: newCollection.metadata,
        },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedCollection } = transaction.mutations[0]
      const result = await client.api.collections[":id"].$put({
        param: { id: updatedCollection.id },
        json: {
          name: updatedCollection.name,
          metadata: updatedCollection.metadata,
        },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedCollection } = transaction.mutations[0]
      const result = await client.api.collections[":id"].$delete({
        param: { id: deletedCollection.id },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
  })
)

// Nodes collection
export const nodeCollection = createCollection(
  electricCollectionOptions({
    id: "nodes",
    shapeOptions: {
      url: new URL(
        `/api/nodes`,
        typeof window !== `undefined`
          ? window.location.origin
          : `http://localhost:5173`
      ).toString(),
      params: {
        table: "node",
        // Note: No user_id filter since Electric doesn't support subqueries
        // Access control is handled by the API routes
      },
      parser: {
        timestamptz: (date: string) => new Date(date),
      },
    },
    schema: selectNodeSchema,
    getKey: (item) => item.id,
    onInsert: async ({ transaction }) => {
      const { modified: newNode } = transaction.mutations[0]
      const result = await client.api.nodes.$post({
        json: {
          name: newNode.name,
          kind: newNode.kind,
          loroSnapshot: newNode.loroSnapshot,
          parentId: newNode.parentId,
          metadata: newNode.metadata,
          collectionId: newNode.collectionId,
        },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updatedNode } = transaction.mutations[0]
      const result = await client.api.nodes[":id"].$put({
        param: { id: updatedNode.id },
        json: {
          name: updatedNode.name,
          kind: updatedNode.kind,
          loroSnapshot: updatedNode.loroSnapshot,
          parentId: updatedNode.parentId,
          metadata: updatedNode.metadata,
        },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
    onDelete: async ({ transaction }) => {
      const { original: deletedNode } = transaction.mutations[0]
      const result = await client.api.nodes[":id"].$delete({
        param: { id: deletedNode.id },
      })

      if (result.ok) {
        const data = await result.json()
        return { txid: data.txid }
      } else {
        const errorData = await result.json()
        throw new Error(JSON.stringify(errorData))
      }
    },
  })
)
