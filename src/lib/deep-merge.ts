type O = { [key: string]: any };

export function deepMerge<T extends O, U extends O>(
  original: T,
  updated: U
): T & U {
  const output: O = Object.assign({}, original);

  if (isObject(original) && isObject(updated)) {
    Object.keys(updated).forEach((key: string) => {
      if (isObject(updated[key])) {
        if (!(key in original)) Object.assign(output, { [key]: updated[key] });
        else output[key] = deepMerge(original[key], updated[key]);
      } else {
        Object.assign(output, { [key]: updated[key] });
      }
    });
  }

  return output as T & U;
}

function isObject(item: any): item is object {
  return item !== null && typeof item === 'object';
}
