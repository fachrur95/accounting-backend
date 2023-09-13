const pick = (obj: object, keys: string[]) => {
  // keys.map(key => key.)
  return keys.reduce<{ [key: string]: unknown }>((finalObj, key) => {
    if (obj && Object.hasOwnProperty.call(obj, key)) {
      const keys = key.split("."); // Membagi string menjadi array keys
      if (keys.length > 1) {
        const result: Record<string, any> = {};
        let temp = result;
        const nowKey = keys[0];
        for (let i = 0; i < keys.length; i++) {
          const currentKey = keys[i];
          if (i === keys.length - 1) {
            // Ini adalah elemen terakhir, tambahkan properti "value"
            temp[currentKey] = obj[key as keyof typeof obj];
          } else {
            // Ini bukan elemen terakhir, tambahkan objek kosong
            temp[currentKey] = {};
            temp = temp[currentKey];
          }
        }
        return finalObj[nowKey] = result;
      }
      finalObj[key] = obj[key as keyof typeof obj];
    }
    return finalObj;
  }, {});
};

export default pick;
