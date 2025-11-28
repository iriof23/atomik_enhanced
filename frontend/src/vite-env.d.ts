/// \u003creference types="vite/client" /\u003e

interface ImportMetaEnv {
    readonly VITE_API_URL?: string
    readonly VITE_CLERK_PUBLISHABLE_KEY: string
    readonly VITE_PADDLE_CLIENT_TOKEN?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare module '*.png' {
    const value: string
    export default value
}

declare module '*.jpg' {
    const value: string
    export default value
}

declare module '*.svg' {
    const value: string
    export default value
}
