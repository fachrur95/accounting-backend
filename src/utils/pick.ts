const pick = (obj: object, keys: string[]) => {
  // keys.map(key => key.)
  return keys.reduce<{ [key: string]: unknown }>((finalObj, key) => {
    if (obj && Object.hasOwnProperty.call(obj, key)) {
      finalObj[key] = obj[key as keyof typeof obj];
    }
    return finalObj;
  }, {});
};

/* const pick = (obj: object, keys: string[]) => {
  return keys.reduce<{ [key: string]: unknown }>((finalObj, key) => {
    if (obj && Object.hasOwnProperty.call(obj, key)) {
      console.log(typeof obj[key as keyof typeof obj])
      if (typeof obj[key as keyof typeof obj] === "object") {
        finalObj[key] = pick(obj[key as keyof typeof obj], [key]);
      } else {
        finalObj[key] = obj[key as keyof typeof obj];
      }
    }
    return finalObj;
  }, {});
}; */

export default pick;
