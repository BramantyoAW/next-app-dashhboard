declare module 'file-saver' {
  export function saveAs(data: Blob | File | string, filename?: string, options?: any): void
}

declare module 'xlsx' {
  const XLSX: any
  export = XLSX
}

declare module 'extract-files' {
  export function extractFiles(value: any): {
    clone: any
    files: Map<any, File>
  }
}
