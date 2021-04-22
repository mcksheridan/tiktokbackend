const {
  checkFileData, extractLikeListData, extractDateToString,
  extractVideoToString, createVideoDateObjects, removeNullVideoDateEntries,
} = require('../controllers/handleLikeList');

const oneEntryLikeList = 'Date: 2020-08-10 19:48:52 Video Link: https://www.tiktokv.com/share/video/6857021290482633989/';
const twoEntryLikeList = 'Date: 2020-08-10 20:08:25 Video Link: https://www.tiktokv.com/share/video/6854224536993287429/ Date: 2020-08-10 19:48:52 Video Link: https://www.tiktokv.com/share/video/6857021290482633989/';
const oneEntryLikeListArray = extractLikeListData(oneEntryLikeList);
const twoEntryLikeListArray = extractLikeListData(twoEntryLikeList);

describe('Only files with content and without invalid characters will be returned', () => {
  const emptyLikeList = '';
  const invalidCharLikeList = `Date: $ 2020-08-10 19:48:52
  Video Link: https://www.tiktokv.com/share/video/6857021290482633989/`;
  it('Returns a valid like list', () => {
    const result = checkFileData(oneEntryLikeList);
    expect(result).toEqual({
      data: oneEntryLikeList,
      status: 'Valid',
    });
  });
  it('Returns a message saying the Like List is empty', () => {
    const result = checkFileData(emptyLikeList);
    expect(result).toEqual({
      data: emptyLikeList,
      status: 'Empty',
    });
  });
  it('Returns a message saying the Like List contains invalid characters', () => {
    const result = checkFileData(invalidCharLikeList);
    expect(result).toEqual({
      data: invalidCharLikeList,
      status: 'Invalid',
    });
  });
});

describe('Strings with Like List content can be parsed into arrays with video/date pairs as entries', () => {
  const invalidLikeList = 'Date: 2020-08-10 19:48:52 Video Link: https://www.tiktok.com/share/video/6857021290482633989/';
  const mixedLikeListString = `${oneEntryLikeList} ${invalidLikeList}`;
  it('Returns an array with one date/video pair', () => {
    const result = extractLikeListData(oneEntryLikeList);
    expect(result).toEqual([oneEntryLikeList]);
  });
  it('Returns an array with two date/video pairs', () => {
    const result = extractLikeListData(twoEntryLikeList);
    expect(result).toEqual(['Date: 2020-08-10 20:08:25 Video Link: https://www.tiktokv.com/share/video/6854224536993287429/', 'Date: 2020-08-10 19:48:52 Video Link: https://www.tiktokv.com/share/video/6857021290482633989/']);
  });
  it('Returns null because the content does not match the regular express', () => {
    const result = extractLikeListData(invalidLikeList);
    expect(result).toEqual([]);
  });
  it('Returns only one entry because one date/video pair was invalid', () => {
    const result = extractLikeListData(mixedLikeListString);
    expect(result).toEqual([oneEntryLikeList]);
  });
});

describe('A date in valid date format can be extracted from a string', () => {
  it('Extracts one date', () => {
    const result = extractDateToString(oneEntryLikeList);
    expect(result).toBe('2020-08-10 19:48:52');
  });
  it('Extracts one date, even though two dates are available', () => {
    const result = extractDateToString(twoEntryLikeList);
    expect(result).toBe('2020-08-10 20:08:25');
  });
  it('Does not extract a date because there is no date with a valid format', () => {
    const invalidDateFormat = '202-08-10 20:08:25';
    const result = extractDateToString(invalidDateFormat);
    expect(result).toBe(null);
  });
});

describe('A video in valid video format can be extracted from a string', () => {
  it('Extracts one video', () => {
    const result = extractVideoToString(oneEntryLikeList);
    expect(result).toBe('https://www.tiktokv.com/share/video/6857021290482633989/');
  });
  it('Extracts one video, even though two videos are available', () => {
    const result = extractVideoToString(twoEntryLikeList);
    expect(result).toBe('https://www.tiktokv.com/share/video/6854224536993287429/');
  });
  it('Does not extract a video because there is no video with a valid format', () => {
    const invalidVideoFormat = 'https://www.tiktok.com/share/video/6854224536993287429/';
    const result = extractVideoToString(invalidVideoFormat);
    expect(result).toBe(null);
  });
});

describe('Arrays with pairs of valid date/video strings can be separated into key/value ', () => {
  it('Adds one video/date pair to an array', () => {
    const result = createVideoDateObjects(oneEntryLikeListArray);
    expect(result).toEqual([{
      video: extractVideoToString(oneEntryLikeList),
      date: extractDateToString(oneEntryLikeList),
    }]);
  });
  it('Adds two video/date pairs to an array', () => {
    const result = createVideoDateObjects(twoEntryLikeListArray);
    expect(result).toEqual([
      {
        video: 'https://www.tiktokv.com/share/video/6854224536993287429/',
        date: '2020-08-10 20:08:25',
      },
      {
        video: 'https://www.tiktokv.com/share/video/6857021290482633989/',
        date: '2020-08-10 19:48:52',
      }]);
  });
  it('Adds null entry to array for a nonexistent date/video pair', () => {
    const emptyArray = [];
    const result = createVideoDateObjects(emptyArray);
    expect(result).toEqual([]);
  });
  it('Adds one video/date pair to an array and creates a null entry for an invalid date/video pair', () => {
    const mixedValidityArray = [];
    mixedValidityArray.push(oneEntryLikeList);
    mixedValidityArray.push('asodifjasdfa');
    const result = createVideoDateObjects(mixedValidityArray);
    expect(result).toEqual([
      {
        video: extractVideoToString(oneEntryLikeList),
        date: extractDateToString(oneEntryLikeList),
      },
      {
        video: null,
        date: null,
      },
    ]);
  });
});

describe('Arrays and video and date objects with null values are filtered out', () => {
  const validArray = createVideoDateObjects(twoEntryLikeListArray);
  const nullObjects = {
    video: null,
    date: null,
  };
  const mixedValidityArray = createVideoDateObjects(oneEntryLikeListArray);
  mixedValidityArray.push(nullObjects);
  const invalidArray = [nullObjects];
  it('Preserves an array of objects with no null video/date values', () => {
    const result = removeNullVideoDateEntries(validArray);
    expect(result).toEqual(createVideoDateObjects(twoEntryLikeListArray));
  });
  it('Removes null video/date values from an array', () => {
    const result = removeNullVideoDateEntries(mixedValidityArray);
    expect(result).toEqual(createVideoDateObjects(oneEntryLikeListArray));
  });
  it('Returns an empty array when there are only null video/date values', () => {
    const result = removeNullVideoDateEntries(invalidArray);
    expect(result).toEqual([]);
  });
});
