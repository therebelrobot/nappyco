require('es6-promise').polyfill()
require('isomorphic-fetch')
import { imageapi } from './api'
import { ImageStore, NappyOpts } from './types'

export class Nappy {
  private baseHost = 'https://www.nappy.co'
  private basePath = '/'
  private security = {
    ajax_url: null,
    security: null,
  }

  private imageCache: ImageStore = {}

  constructor(options: NappyOpts = {}) {
    this.baseHost = options.baseHost || this.baseHost
    this.basePath = options.basePath || this.basePath
    return this
  }
  async fetchPosts(page = 1, limit = 40) {
    const { security, images } = await imageapi(
      `${this.baseHost}${this.basePath}`
    )
    this.imageCache = images
    this.security = security
    console.log(this.security)
    console.log(images.length)
    return images
  }
}

export default Nappy
