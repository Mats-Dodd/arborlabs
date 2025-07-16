import { useEditor, EditorContent } from "@tiptap/react"
import { FloatingMenu, BubbleMenu } from "@tiptap/react/menus"
import StarterKit from "@tiptap/starter-kit"

const extensions = [StarterKit]

const content = "<p>Hello World!</p>"

const Tiptap = () => {
  const editor = useEditor({
    extensions,
    content,
  })

  return (
    <>
      <EditorContent editor={editor} />
      <FloatingMenu editor={editor}>This is the floating menu</FloatingMenu>
      <BubbleMenu editor={editor}>This is the bubble menu</BubbleMenu>
    </>
  )
}

export default Tiptap
