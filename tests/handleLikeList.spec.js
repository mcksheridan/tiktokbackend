const {
  checkFileData, extractLikeListData, extractDateToString,
  extractVideoToString, createVideoDateObjects,
} = require('../controllers/handleLikeList');

const oneEntryLikeList = 'Date: 2020-08-10 19:48:52 Video Link: https://www.tiktokv.com/share/video/6857021290482633989/';
const twoEntryLikeList = 'Date: 2020-08-10 20:08:25 Video Link: https://www.tiktokv.com/share/video/6854224536993287429/ Date: 2020-08-10 19:48:52 Video Link: https://www.tiktokv.com/share/video/6857021290482633989/';
const oneEntryLikeListArray = extractLikeListData(oneEntryLikeList);
const twoEntryLikeListArray = extractLikeListData(twoEntryLikeList);

describe('Only files with content and without invalid characters will be returned', () => {
  const emptyLikeList = '';
  const invalidCharLikeList = `Date: $ 2020-08-10 19:48:52
  Video Link: https://www.tiktokv.com/share/video/6857021290482633989/`;
  const res = {};
  res.send = (message) => message;
  it('Returns a valid like list', () => {
    const result = checkFileData(oneEntryLikeList);
    expect(result).toBe(oneEntryLikeList);
  });
  it('Returns a message saying the Like List is empty', () => {
    const result = checkFileData(emptyLikeList, res);
    expect(result).toBe('Your Like List is empty');
  });
  it('Returns a message saying the Like List contains invalid characters', () => {
    const result = checkFileData(invalidCharLikeList, res);
    expect(result).toBe('Your file contains invalid characters. Please upload your Like List file.');
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
    expect(result).toEqual(null);
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
  it('Adds null entry to array for an invalid date/video pair', () => {
    const invalidArray = ['asdofijad'];
    const result = createVideoDateObjects(invalidArray);
    expect(result).toEqual([{
      video: null,
      date: null,
    }]);
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
