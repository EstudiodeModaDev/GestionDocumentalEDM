/* ============================================================
   Utilidades para archivos (documentos, imágenes, Office, etc.)
   ============================================================ */

export function formatFileSize(sizeBytes?: number): string {
  if (!sizeBytes || sizeBytes <= 0) return "0 KB";

  const kb = sizeBytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

type FileLike = {
  mimeType?: string;
  name?: string;
};

/** 📄 ¿Es un PDF? */
export function isPdf(file: FileLike): boolean {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const name = file.name?.toLowerCase() ?? "";
  return mime.includes("pdf") || name.endsWith(".pdf");
}

/** 🖼 ¿Es una imagen? */
export function isImage(file: FileLike): boolean {
  const mime = file.mimeType?.toLowerCase() ?? "";
  return mime.startsWith("image/");
}

/** 📊 ¿Es un documento de Office (Word / Excel / PowerPoint)? */
export function isOfficeDocument(file: FileLike): boolean {
  const mime = file.mimeType?.toLowerCase() ?? "";
  const name = file.name?.toLowerCase() ?? "";

  if (
    mime.includes("officedocument") ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("presentation")
  ) {
    return true;
  }

  const exts = [".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"];
  return exts.some((ext) => name.endsWith(ext));
}
