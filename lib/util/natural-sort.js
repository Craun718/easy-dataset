// 自然排序比较器：数字按数值大小比较，非数字按字符串比较。
// 例如: "part-2" 排在 "part-10" 之前。
/**
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
export function naturalCompare(a, b) {
  const ax = [];
  const bx = [];
  const aStr = String(a ?? '');
  const bStr = String(b ?? '');
  aStr.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
    ax.push($1 ? Number($1) : $2);
    return '';
  });
  bStr.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
    bx.push($1 ? Number($1) : $2);
    return '';
  });

  let i = 0;
  while (i < ax.length && i < bx.length) {
    const av = ax[i];
    const bv = bx[i];
    const aIsNum = typeof av === 'number';
    const bIsNum = typeof bv === 'number';
    if (aIsNum !== bIsNum) {
      return aIsNum ? -1 : 1;
    }
    if (aIsNum) {
      if (av !== bv) return av < bv ? -1 : 1;
    } else if (av !== bv) {
      return av < bv ? -1 : 1;
    }
    i++;
  }
  return ax.length - bx.length;
}

/**
 * 按 name 字段做自然排序的数组排序函数。
 * @param {Array<{name: string}>} items
 * @returns {Array} sorted items (新数组)
 */
export function sortByName(items) {
  return [...items].sort((a, b) => naturalCompare(a.name, b.name));
}
