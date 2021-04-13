const {
  getTiktokId, getBinaryIdArray, getThirtyTwoLeftBits, getDecimalFromBits, getDateAdded,
} = require('../controllers/handleTikTokId');

describe('ID numbers can be extracted from URLs, regardless of URL pattern', () => {
  const mobileUrlA = 'https://m.tiktok.com/v/6857021290482633989';
  const desktopUrlAPatternA = 'https://www.tiktokv.com/share/video/6857021290482633989/';
  const desktopUrlAPatternB = 'https://www.tiktok.com/@josieviolet/video/6857021290482633989';
  const mobileUrlB = 'https://m.tiktok.com/v/6859174501062642949';
  const desktopUrlBPatternA = 'https://www.tiktokv.com/share/video/6859174501062642949/';
  const desktopUrlBPatternB = 'https://www.tiktok.com/@chasethetenor/video/6859174501062642949';
  it('Returns an ID number from a mobile URL', () => {
    const result = getTiktokId(mobileUrlA);
    expect(result).toBe('6857021290482633989');
  });
  it('Returns the same number from the corresponding desktop URL', () => {
    const result = getTiktokId(desktopUrlAPatternA);
    expect(result).toBe('6857021290482633989');
  });
  it('Returns the same number from a different desktop URL pattern', () => {
    const result = getTiktokId(desktopUrlAPatternB);
    expect(result).toBe('6857021290482633989');
  });
  it('Returns a different ID number from a different mobile URL', () => {
    const result = getTiktokId(mobileUrlB);
    expect(result).toBe('6859174501062642949');
  });
  it('Returns the same number from the corresponding desktop URL', () => {
    const result = getTiktokId(desktopUrlBPatternA);
    expect(result).toBe('6859174501062642949');
  });
  it('Returns the same number from a different desktop URL pattern', () => {
    const result = getTiktokId(desktopUrlBPatternB);
    expect(result).toBe('6859174501062642949');
  });
  it('Returns null for an invalid URL format', () => {
    const result = getTiktokId('https://vm.tiktok.com/ZMeuWL2jU');
    expect(result).toBe(null);
  });
});

describe('Decimal numbers, including numbers greater than 2^53, can be expressed as an array of binary numbers', () => {
  // https://www.binaryhexconverter.com/binary-to-decimal-converter
  it('Returns 0, 1, 0, 1 as string entries in an array when given the number 5', () => {
    const result = getBinaryIdArray('5');
    expect(result).toEqual(['0', '1', '0', '1']);
  });
  it('Returns 0101111100101001000010001000100010011100100000100000110100000101, as separated string entries in an array when given the ID number of 6857021290482633989', () => {
    const arrayString = '0101111100101001000010001000100010011100100000100000110100000101'.split('');
    const result = getBinaryIdArray('6857021290482633989');
    expect(result).toEqual(arrayString);
  });
  it('Returns 0101111100110000101011101101111000000100010000011000110100000101, as separated string entries in an array when given the ID number of 6859174501062642949', () => {
    const arrayString = '0101111100110000101011101101111000000100010000011000110100000101'.split('');
    const result = getBinaryIdArray('6859174501062642949');
    expect(result).toEqual(arrayString);
  });
});

describe('An array of numbers expressed as strings can be joined together, returning only the first 32 characters', () => {
  it('Returns "01234567890123456789012345678901" from an array where of 40 number strings', () => {
    const string = '0123456789012345678901234567890123456789';
    const array = string.split('');
    const stringThirtyTwo = string.slice(0, 32);
    const result = getThirtyTwoLeftBits(array);
    expect(result).toBe(stringThirtyTwo);
  });
  it('Returns the first 32 digits of 0101111100110000101011101101111000000100010000011000110100000101', () => {
    const string = '0101111100110000101011101101111000000100010000011000110100000101';
    const array = string.split('');
    const stringThirtyTwo = string.slice(0, 32); // 01011111001100001010111011011110
    const result = getThirtyTwoLeftBits(array);
    expect(result).toBe(stringThirtyTwo);
  });
  it('Returns the first 32 digits of ', () => {
    const string = '0101111100101001000010001000100010011100100000100000110100000101';
    const array = string.split('');
    const stringThirtyTwo = string.slice(0, 32); // 01011111001010010000100010001000
    const result = getThirtyTwoLeftBits(array);
    expect(result).toBe(stringThirtyTwo);
  });
});

describe('Convert a short (i.e. < 2^53) string of binary numbers to a decimal number', () => {
  it('Returns 5 from 0101', () => {
    const result = getDecimalFromBits('0101');
    expect(result).toBe('5');
  });
  it('Returns 1596524680 from 01011111001010010000100010001000', () => {
    const result = getDecimalFromBits('01011111001010010000100010001000');
    expect(result).toBe('1596524680');
  });
  it('Returns 1597026014 from 01011111001100001010111011011110', () => {
    const result = getDecimalFromBits('01011111001100001010111011011110');
    expect(result).toBe('1597026014');
  });
});

describe('This function will take a series of numbers and turn them into a new date object', () => {
  /*
  I use TikTok to externally check the accuracy of this getDateAdded() function.
  Depending on the time a video was added at (which is not visibly available on the TikTok video),
  the video may appear to be added on either the same day or the following day in the UTC time zone.
  */
  it('Returns a date of 8/3/2020 or 8/4/2020 UTC from 1596524680', () => {
    // Note: The video with the date listed is available here: https://www.tiktok.com/@josieviolet/video/6857021290482633989
    const result = getDateAdded('1596524680');
    expect(result).toEqual(new Date('2020-08-04T07:04:40.000Z'));
  });
  it('Returns a date of 8/9/2020 or 8/10/2020 UTC from 1597026014', () => {
    // Note: The video with the date listed is available here: https://www.tiktok.com/@chasethetenor/video/6859174501062642949
    const result = getDateAdded('1597026014');
    expect(result).toEqual(new Date('2020-08-10T02:20:14.000Z'));
  })
});
