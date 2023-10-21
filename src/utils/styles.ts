export const jsToCss = (obj: Record<string, string>): string => {
  let cssString = '';
  for (let objectKey in obj) {
    cssString +=
      objectKey.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`) +
      ': ' +
      obj[objectKey] +
      ';\n';
  }

  return cssString;
};

export const addStyleSheet = (css: string) => {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
};
