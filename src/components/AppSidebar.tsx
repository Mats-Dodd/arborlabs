import { Home, Search, Settings, Upload } from "lucide-react"
import { useState } from "react"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
  SidebarFooter,
} from "./ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog"
import { Skeleton } from "./ui/skeleton"
import { useLiveQuery } from "@tanstack/react-db"
import { todoCollection } from "@/lib/collections"

export function AppSidebar() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const { data: todos } = useLiveQuery((q) => q.from({ todoCollection }))

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5 transition-[gap] duration-300 ease-in-out group-data-[collapsible=icon]:gap-0 group-data-[collapsible=icon]:justify-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              A
            </div>
            <span className="truncate font-semibold opacity-100 transition-opacity duration-300 ease-in-out group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:hidden">
              Arbor
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Home">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton tooltip="Search">
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup>
            <SidebarGroupLabel>Todos</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 py-1 group-data-[collapsible=icon]:hidden min-w-0">
                {!todos ? (
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-5 w-24 ml-4" />
                    <Skeleton className="h-5 w-28 ml-4" />
                    <Skeleton className="h-5 w-20 ml-4" />
                  </div>
                ) : todos.length === 0 ? (
                  <div className="text-sm text-muted-foreground px-2">
                    No todos found
                  </div>
                ) : (
                  <div className="space-y-1">
                    {todos.slice(0, 5).map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center gap-2 px-2 py-1 text-sm rounded-md hover:bg-accent/50"
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            todo.completed ? "bg-green-500" : "bg-yellow-500"
                          }`}
                        />
                        <span
                          className={`truncate ${
                            todo.completed
                              ? "line-through text-muted-foreground"
                              : ""
                          }`}
                        >
                          {todo.text}
                        </span>
                      </div>
                    ))}
                    {todos.length > 5 && (
                      <div className="text-xs text-muted-foreground px-2 py-1">
                        +{todos.length - 5} more todos
                      </div>
                    )}
                  </div>
                )}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Upload"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4" />
                <span>Upload</span>
              </SidebarMenuButton>
              <SidebarMenuButton tooltip="Settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Drag and drop files or click to browse. You can upload multiple
              files at once.
            </DialogDescription>
          </DialogHeader>
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              File upload functionality coming soon...
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
