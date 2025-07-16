import { createFileRoute } from "@tanstack/react-router"
import { useLiveQuery } from "@tanstack/react-db"
import { useState } from "react"
import { authClient } from "@/lib/auth-client"
// import { type Todo } from "@/db/schema"
import {
  todoCollection,
  collectionCollection,
  nodeCollection,
} from "@/lib/collections"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import Tiptap from "@/components/editor/editor"

export const Route = createFileRoute(`/_authenticated/`)({
  component: App,
  ssr: false,
  loader: async () => {
    await todoCollection.preload()
    await collectionCollection.preload()
    await nodeCollection.preload()

    return null

    // Use this once it's working.
    // const query = createLiveQueryCollection({ query: new Query().from({ todoCollection }) })
    //
    // await query.preload()
    // return query
    //
  },
})

function App() {
  const { data: session } = authClient.useSession()
  const [newCollectionName, setNewCollectionName] = useState("")

  // Live queries for all collections
  const { data: collections } = useLiveQuery((q) =>
    q.from({ collectionCollection })
  )
  const { data: allNodes } = useLiveQuery((q) => q.from({ nodeCollection }))

  // Filter nodes to only show those in collections the user owns
  const nodes =
    allNodes?.filter((node) =>
      collections?.some((collection) => collection.id === node.collectionId)
    ) || []

  // Collection functions (new)
  const addCollection = () => {
    if (newCollectionName.trim()) {
      collectionCollection.insert({
        id: Math.floor(Math.random() * 100000),
        name: newCollectionName.trim(),
        metadata: {},
        user_id: session?.user.id ?? "",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      setNewCollectionName("")
    }
  }

  const deleteCollection = (id: number) => {
    collectionCollection.delete(id)
  }

  // Node functions (new)
  const addNodeToCollection = (collectionId: number) => {
    nodeCollection.insert({
      id: Math.floor(Math.random() * 100000),
      name: "New Document",
      kind: "file" as const,
      loroSnapshot: Buffer.from("empty"),
      parentId: null,
      metadata: {},
      collectionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Document Management System</h1>

      <Separator />

      {/* Collections Section (new) */}
      <Card>
        <CardHeader>
          <CardTitle>Document Collections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Collection name..."
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addCollection()}
            />
            <Button onClick={addCollection}>Add Collection</Button>
          </div>

          <div className="grid gap-4">
            {collections?.map((collection) => {
              const collectionNodes =
                nodes?.filter((node) => node.collectionId === collection.id) ||
                []
              return (
                <Card
                  key={collection.id}
                  className="border-l-4 border-l-blue-500"
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-lg">
                        {collection.name}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => addNodeToCollection(collection.id)}
                        >
                          Add Document
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteCollection(collection.id)}
                        >
                          Delete Collection
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-gray-600 mb-2">
                      {collectionNodes.length} document(s)
                    </div>
                    <div className="space-y-1">
                      {collectionNodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center gap-2 p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm">
                            {node.kind === "folder" ? "📁" : "📄"}
                          </span>
                          <span>{node.name}</span>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => nodeCollection.delete(node.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Editor Section (existing) */}
      <Card>
        <CardHeader>
          <CardTitle>Rich Text Editor</CardTitle>
        </CardHeader>
        <CardContent>
          <Tiptap />
        </CardContent>
      </Card>
    </div>
  )
}
