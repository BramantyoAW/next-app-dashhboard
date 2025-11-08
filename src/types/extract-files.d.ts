declare module 'extract-files' {
  export function extractFiles<T>(
    value: T,
    path?: string
  ): { clone: T; files: Map<any, any> }
}
