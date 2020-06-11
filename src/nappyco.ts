require('es6-promise').polyfill()
require('isomorphic-fetch')
import {
  parse as parseHtml,
  parseFragment,
  DefaultTreeDocument,
  DefaultTreeElement,
  DefaultTreeTextNode,
} from 'parse5'

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

const imageapi = async (location, initOpts = {}) => {
  const htmlResults = await htmlApi(location, initOpts)
  // console.log({ htmlResults })
  const parsedDocument = await parseHtml(htmlResults)
  // console.log({ parsedDocument })
  const results = getTreeResult(
    parsedDocument,
    'html.body.wrapper.work.offset.stream'
  )
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
    // TODO: parse caption for photographer, photographer link

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
  return enrichedImages.map((node) => ({
    url: node.url,
    width: node.width,
    height: node.height,
    thumbnail: node.imagethumbnail,
    photographerLink: node.photographerLink,
    photographer: node.photographer,
  }))

  // console.log({ images })
}

interface NappyOpts {
  baseHost?: string
  basePath?: string
}

export class Nappy {
  private baseHost = 'https://www.nappy.co'
  private basePath = '/'
  constructor(options: NappyOpts = {}) {
    this.baseHost = options.baseHost || this.baseHost
    this.basePath = options.basePath || this.basePath
    return this
  }
  async fetchPosts() {
    const results = await imageapi(`${this.baseHost}${this.basePath}`)
    console.log(results)
    return results
  }
}

export default Nappy
