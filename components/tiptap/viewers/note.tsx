'use client';

import '@/components/tiptap/tiptap.css';
import { NOTE_HEADERS_CLASS_NAME } from '@/libs/constants';
import Heading from '@tiptap/extension-heading';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import { EditorContent, mergeAttributes, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

export default function TipTapJsonNoteRenderer({ jsonString }: { jsonString: string }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, // disable Heading extension in StarterKit, because we use extended Heading extension.
      }),
      Underline,
      Heading.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            class: {
              default: NOTE_HEADERS_CLASS_NAME,
            },
          };
        },
        renderHTML({ node, HTMLAttributes }) {
          return [
            'h' + node.attrs.level,
            {
              ...HTMLAttributes,
              id: node.textContent, // ノードのテキスト内容をid属性として設定
            },
            0,
          ];
        },
      }),
      Image.extend({
        renderHTML({ node, HTMLAttributes }) {
          return [
            'a',
            {
              href: node.attrs.src,
              class: 'note-image-anchor',
              target: '_blank',
              rel: 'noopener noreferrer',
            },
            ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)],
          ];
        },
      }),
    ],
    content: JSON.parse(jsonString),
    editable: false,
  });
  return <EditorContent editor={editor} />;
}
