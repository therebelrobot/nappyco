import {
  DefaultTreeDocument,
  DefaultTreeElement,
  DefaultTreeTextNode,
} from 'parse5'

export const isDefaultTreeDocument = (
  tree: unknown
): tree is DefaultTreeDocument => tree.hasOwnProperty('childNodes')

export const isDefaultTreeElement = (
  tree: unknown
): tree is DefaultTreeElement => tree.hasOwnProperty('attrs')

export const isDefaultTreeTextNode = (
  tree: unknown
): tree is DefaultTreeTextNode => tree.hasOwnProperty('value')

export const getNodeClass = (node) => {
  if (!node.attrs) return false
  const attr = node.attrs.filter((attr) => {
    return attr.name === 'class'
  })[0]
  if (!attr) return false
  return attr.value
}

export const getTreeResult = (tree: unknown, filter) => {
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

export const extractAjaxSecurityValue = (parsedDocument) => {
  const body = getTreeResult(parsedDocument, 'html.body')
  // console.log(body.childNodes)
  const relevantScripts = body.childNodes.filter(
    (cn) => cn.nodeName === 'script' && cn.attrs.length === 1
  )
  const relevantChildNodes = relevantScripts.map((n) => n.childNodes).flat(1)
  console.log(relevantChildNodes)
  const securityScript = relevantChildNodes.filter(
    (rs) => rs.value && rs.value.includes('admin-ajax.php')
  )[0]
  const securityValue = securityScript.value
    .split('var ajax_object = ')[1]
    .split(';')[0]
  const ajaxSecurity = JSON.parse(securityValue)
  console.log(ajaxSecurity)
  return ajaxSecurity
}
