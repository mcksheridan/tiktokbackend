const BigNumber = require('big-number');

const getTiktokId = (url) => {
  const idRegexPattern = new RegExp(/\d+/);
  // Mobile URL format
  if (url.startsWith('https://m')) {
    const tiktokIdArray = url.match(idRegexPattern);
    const tiktokId = tiktokIdArray[0];
    return tiktokId;
  }
  // Desktop URL format
  if (url.startsWith('https://www')) {
    const videoRegexPattern = new RegExp(/video\/\d+/);
    const tiktokVideoPattern = url.match(videoRegexPattern);
    const tiktokVideoString = tiktokVideoPattern.toString();
    const tiktokIdArray = tiktokVideoString.match(idRegexPattern);
    const tiktokId = tiktokIdArray[0];
    return tiktokId;
  }
  return null;
};

const getBinaryIdArray = (id) => {
  const idBigIntBinaryArray = [];
  const idInteger = BigNumber(id);
  let currentInteger = idInteger;
  while (currentInteger > BigNumber(0)) {
    const remainder = BigNumber(currentInteger).mod(2); // modulo operation
    const remainderString = remainder.toString();
    idBigIntBinaryArray.unshift(remainderString);
    currentInteger = BigNumber(currentInteger).div(2);
    /* The current integer will return an object that roughly
    equals zero but will NOT strictly equal zero */
    // eslint-disable-next-line eqeqeq
    if (currentInteger == 0) {
      idBigIntBinaryArray.unshift('0');
    }
  }
  return idBigIntBinaryArray;
};

const getThirtyTwoLeftBits = (binaryArray) => {
  const binaryArrayIntegers = binaryArray.map((integerString) => parseInt(integerString, 10));
  const binaryString = binaryArrayIntegers.join('');
  const thirtyTwoLeftBits = binaryString.slice(0, 32);
  return thirtyTwoLeftBits;
};

const getDecimalFromBits = (bits) => {
  const bitsArray = bits.split('');
  const decimalArray = bitsArray.reduce((acc, currVal) => {
    const bitAsInteger = parseInt(currVal);
    return (acc * 2) + bitAsInteger;
  });
  const decimal = decimalArray.toString();
  return decimal;
};

const getDateAdded = (idDecimal) => {
  const dateAdded = new Date(idDecimal * 1000);
  return dateAdded;
};

// eslint-disable-next-line max-len
const getDateAddedFromTikTokId = (tiktokId) => getDateAdded(getDecimalFromBits(getThirtyTwoLeftBits(getBinaryIdArray(tiktokId))));

module.exports = {
  getTiktokId,
  getBinaryIdArray,
  getThirtyTwoLeftBits,
  getDecimalFromBits,
  getDateAdded,
  getDateAddedFromTikTokId,
};
