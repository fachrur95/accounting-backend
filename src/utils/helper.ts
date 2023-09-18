export const isJSONString = (str: string) => {
  try {
    JSON.parse(str);
    return true;
  } catch (e) {
    return false;
  }
}

export const jsonParse = <T>(str: string): T | undefined => {
  if (!isJSONString(str)) return undefined;

  return JSON.parse(str) as T;
}
