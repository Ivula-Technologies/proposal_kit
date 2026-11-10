import { generateHTML } from "@tiptap/html/server";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/core";

/**
 * Render a TipTap JSON document to an HTML string on the server.
 * Used by the public proposal view (so clients download no editor JS)
 * and by the PDF renderer. The browser-side `generateHTML` from
 * `@tiptap/core` requires a DOM and crashes in Node — this one doesn't.
 */
export function renderProposalContentHtml(content: unknown): string {
  if (!content) return "";
  try {
    return generateHTML(content as JSONContent, [StarterKit, Image]);
  } catch {
    return "";
  }
}
