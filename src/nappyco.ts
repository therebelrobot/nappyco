require('es6-promise').polyfill()
require('isomorphic-fetch')
import {
  parse as parseHtml,
  parseFragment,
  DefaultTreeDocument,
  DefaultTreeElement,
  DefaultTreeTextNode,
} from 'parse5'


/*
TODO: Primary Call:
- ✅ retreive CDATA object from bottom of body, with ajax_url and security token
- ✅ store both on Nappy object
- call load more for further pagination
  - POST to AJAX_URL with post form parameters:
    - action=pd_load_more&security=SECURITY&loadcount=&curcount=40&cat=a
    - curcount = multiples of 40, page 0 = 0, 1 = 40, 2 = 80
- add parser for loaded content

TODO: Search Call:
- grab search url from website
- add parsing for search results
- inspect load more calls
- add parser for loaded content
*/
const htmlApi = (location, initOpts = {}): Promise<string> => {
  return fetch(location, initOpts)
    .then((response) => {
      if (response.status >= 400) {
        throw new Error('Bad response from server')
      }
      return response.text()
    })
    .catch((err) => {
      console.error('There was an error retrieving information for', location)
      console.error(err)
      return err
    })
}

const isDefaultTreeDocument = (tree: unknown): tree is DefaultTreeDocument =>
  tree.hasOwnProperty('childNodes')
const isDefaultTreeElement = (tree: unknown): tree is DefaultTreeElement =>
  tree.hasOwnProperty('attrs')
const isDefaultTreeTextNode = (tree: unknown): tree is DefaultTreeTextNode =>
  tree.hasOwnProperty('value')

const getNodeClass = (node) => {
  if (!node.attrs) return false
  const attr = node.attrs.filter((attr) => {
    return attr.name === 'class'
  })[0]
  if (!attr) return false
  return attr.value
}

const getTreeResult = (tree: unknown, filter) => {
  console.log('getTreeResult', filter)
  if (!isDefaultTreeDocument(tree)) {
    console.error(tree)
    throw Error('invalid HTML tree object')
  }
  const filterArray = filter.split('.')
  const currentFilter = filterArray.shift()
  const newChild = tree.childNodes.filter(
    (node: any) =>
      node.nodeName === currentFilter ||
      `${getNodeClass(node)}`.includes(currentFilter)
  )[0]
  if (!newChild) return false
  if (filterArray.length === 0) {
    // on last filter, return result
    return newChild
  }
  return getTreeResult(newChild, filterArray.join('.'))
}

const extractAjaxSecurityValue = (parsedDocument) => {
  const body = getTreeResult(
    parsedDocument,
    'html.body'
  )
  // console.log(body.childNodes)
  const relevantScripts = body.childNodes.filter(cn => cn.nodeName === 'script' && cn.attrs.length === 1)
  const relevantChildNodes = relevantScripts.map(n => n.childNodes).flat(1)
  console.log(relevantChildNodes)
  const securityScript = relevantChildNodes.filter(rs => rs.value && rs.value.includes('admin-ajax.php'))[0]
  const securityValue = securityScript.value.split('var ajax_object = ')[1].split(';')[0]
  const ajaxSecurity = JSON.parse(securityValue)
  console.log(ajaxSecurity)
  return ajaxSecurity
}

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

interface ImageApiResults {
  security?: SecurityObject
  images?: ImageResult[]
}

const imageapi = async (location, initOpts = {}): Promise<ImageApiResults> => {
  const htmlResults = await htmlApi(location, initOpts)
  // console.log({ htmlResults })
  const parsedDocument = await parseHtml(htmlResults)
  if (!isDefaultTreeDocument(parsedDocument)) return {}
  const results = getTreeResult(
    parsedDocument,
    'html.body.wrapper.work.offset.stream'
  )

  const security = extractAjaxSecurityValue(parsedDocument)
  
  const images = results.childNodes.filter((node) =>
    `${getNodeClass(node)}`.includes('image')
  )
  const enrichedImages = images.map((node) => {
    const newImage = { ...node }
    const dataAttrs = node.attrs.filter((attr) => attr.name.includes('data-'))
    for (const data of dataAttrs) {
      const name = data.name.split('data-')[1]
      newImage[name] = data.value
    }

    const captionNode = parseFragment(newImage.caption)
    if (!isDefaultTreeDocument(captionNode)) return newImage
    const linkNode = captionNode.childNodes[0]
    if (!isDefaultTreeElement(linkNode)) return newImage

    const photographerLink = linkNode.attrs[0].value
    newImage.photographerLink = photographerLink
    const textNode = linkNode.childNodes[1]
    if (!isDefaultTreeTextNode(textNode)) return newImage
    const photographer = textNode.value
    newImage.photographer = photographer
    return newImage
  })
  return {
    security: security,
    images: enrichedImages.map((node) => ({
      url: node.url,
      width: node.width,
      height: node.height,
      thumbnail: node.imagethumbnail,
      photographerLink: node.photographerLink,
      photographer: node.photographer,
    }))
  }
}

interface NappyOpts {
  baseHost?: string
  basePath?: string
}

export class Nappy {
  private baseHost = 'https://www.nappy.co'
  private basePath = '/'
  private security = {
    ajax_url: null,
    security: null,
  }

  constructor(options: NappyOpts = {}) {
    this.baseHost = options.baseHost || this.baseHost
    this.basePath = options.basePath || this.basePath
    return this
  }
  async fetchPosts(page = 1, limit = 40) {
    const {security, images} = await imageapi(`${this.baseHost}${this.basePath}`)
    this.security = security
    console.log(this.security)
    console.log(images.length)
    return images
  }
}

export default Nappy
