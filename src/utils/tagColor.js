// 自定义标签配色：基于标签名哈希取色，保证同一标签每次颜色一致

const PALETTE = [
  '#2196f3', // 蓝
  '#4caf50', // 绿
  '#ff9800', // 橙
  '#9c27b0', // 紫
  '#00bcd4', // 青
  '#e91e63', // 粉
  '#795548', // 棕
  '#607d8b', // 蓝灰
  '#8bc34a', // 黄绿
  '#f06292', // 玫红
]

const cache = {}

export function tagColor(tag) {
  if (!tag) return PALETTE[9]
  if (cache[tag]) return cache[tag]
  let hash = 0
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0
  }
  const color = PALETTE[hash % PALETTE.length]
  cache[tag] = color
  return color
}
