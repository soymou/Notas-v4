import { Parser } from 'acorn'
import jsx from 'acorn-jsx'

import { mkdirSync, writeFileSync } from 'node:fs'
const myParser = Parser.extend(jsx())
const acornOptions = { ecmaVersion: /** @type {const} */ 2024, sourceType: 'module' }
export function recRemoveObject(obj, keys) {
  // find keys recursively and delete them
  Object.keys(obj).forEach((k) => {
    if (keys.includes(k)) {
      delete obj[k]
    }
    if (typeof obj[k] === 'object' && obj[k] !== null) {
      recRemoveObject(obj[k], keys)
    }
  })
  return obj
}
export const getRehypeStealMdxmdast = (fileName) => {
  const remarkStealMdxmdast = () => {
    return function (tree, file) {
      mkdirSync('out', { recursive: true })
      writeFileSync(`out/${fileName}.json`, JSON.stringify(tree, null, 2))
    }
  }
  return remarkStealMdxmdast
}

export function addOwnEsTree(node) {
  if (node.type === 'mdxjsEsm' ||
    node.type === 'mdxTextExpression' ||
    node.type === 'mdxFlowExpression' ||
    node.type === 'mdxJsxAttribute' ||
    node.type === 'mdxJsxAttributeValueExpression' ||
    node.type === 'mdxJsxExpressionAttribute') {
      try {
        const myEsTree = myParser.parse(node.value, acornOptions)
        node.data.estree = myEsTree
      } catch (e) {
        console.log("<<<<<< SyntaxError when parsing", node.type, node.value)
        console.log(e)
      }
  } else if (node.children) {
    node.children.forEach(addOwnEsTree)
  }
}


export const rehypeStealMdxhast = () => {
  /**
   * @param {any} tree
   * @param {any} file
   */
  return function (tree, file) {
    // 创建一个新对象，将新属性放在前面
    let newTree = {}

    if (file.value) {
      newTree.__value = file.value
    } else {
      newTree.__file = file
    }

    // 将原对象的所有属性复制到新对象
    Object.assign(newTree, tree)


    // newTree = recRemoveObject(newTree, ['__value', '__file', 'estree'])
    addOwnEsTree(newTree)
    mkdirSync('out', { recursive: true })
    writeFileSync(`out/typst.json`, JSON.stringify(newTree, null, 2))
    // return newTree
  }
}
