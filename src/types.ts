interface SecurityObject {
  ajax_url: string
  security: string
}

interface ImageResult {
  url: string
  width: number
  height: number
  thumbnail: string
  photographerLink: string
  photographer: string
}

export interface ImageStore {
  [id: string]: ImageResult
}

export interface ImageApiResults {
  security?: SecurityObject
  images?: ImageStore
}

export interface NappyOpts {
  baseHost?: string
  basePath?: string
}
