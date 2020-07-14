import { parse as parseHtml, parseFragment } from 'parse5'
import { ImageApiResults } from './types'
import {
  isDefaultTreeDocument,
  getTreeResult,
  extractAjaxSecurityValue,
  getNodeClass,
  isDefaultTreeElement,
  isDefaultTreeTextNode,
} from './utils'
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

const enrichImages = (node) => {
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
}

export const imageapi = async (
  location,
  initOpts = {}
): Promise<ImageApiResults> => {
  const htmlResults = await htmlApi(location, initOpts)
  // console.log({ htmlResults })
  const parsedDocument = await parseHtml(htmlResults)
  if (!isDefaultTreeDocument(parsedDocument)) return {}
  const results = getTreeResult(
    parsedDocument,
    'html.body.wrapper.work.offset.stream'
  )

  const security = extractAjaxSecurityValue(parsedDocument)

  const rawImages = results.childNodes.filter((node) =>
    `${getNodeClass(node)}`.includes('image')
  )
  const enrichedImages = rawImages.map(enrichImages)
  const images = {}
  enrichedImages.forEach((node) => {
    const result = {
      url: node.url,
      width: node.width,
      height: node.height,
      thumbnail: node.imagethumbnail,
      photographerLink: node.photographerLink,
      photographer: node.photographer,
    }
    images[node.url] = result
  })
  return {
    security,
    images,
  }
}
