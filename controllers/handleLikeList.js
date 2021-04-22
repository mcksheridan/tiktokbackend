const checkFileData = (file) => {
  const fileData = {
    data: file,
    status: 'Valid', // Valid, invalid, or empty
  };
  const regexCheck = new RegExp(/[^A-z0-9\s:\-/.]/);
  if (!file) {
    fileData.status = 'Empty';
    return fileData;
  }
  if (file.match(regexCheck)) {
    fileData.status = 'Invalid';
    return fileData;
  }
  return fileData;
};

const extractLikeListData = (file) => {
  const videoDatePattern = new RegExp(/Date: \d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d\sVideo Link: https:\/\/www.tiktokv.com\/share\/video\/\d*\//, 'g');
  const dateVideoArray = file.match(videoDatePattern);
  if (dateVideoArray) {
    return dateVideoArray;
  }
  return [];
};

const extractDateToString = (videoDateString) => {
  const datePattern = new RegExp(/\d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d/);
  const dateArray = videoDateString.match(datePattern);
  if (!dateArray) {
    return null;
  }
  const [dateString] = dateArray;
  return dateString;
};

const extractVideoToString = (videoDateString) => {
  const videoPattern = new RegExp(/https:\/\/www.tiktokv.com\/share\/video\/\d*\//);
  const videoArray = videoDateString.match(videoPattern);
  if (!videoArray) {
    return null;
  }
  const [videoString] = videoArray;
  return videoString;
};

const createVideoDateObjects = (array) => {
  const videoAndDateObjectArray = [];
  array.forEach((videoAndDate, likeListIndex) => {
    const videoString = extractVideoToString(videoAndDate);
    const dateString = extractDateToString(videoAndDate);
    videoAndDateObjectArray[likeListIndex] = {
      video: videoString,
      date: dateString,
    };
  });
  return videoAndDateObjectArray;
};

const removeNullVideoDateEntries = (videoAndDateObjectArray) => {
  const cleanVideoAndDateObjectArray = videoAndDateObjectArray.filter((object) =>
    // eslint-disable-next-line implicit-arrow-linebreak
    object.video !== null && object.date !== null);
  return cleanVideoAndDateObjectArray;
};

module.exports = {
  checkFileData,
  extractLikeListData,
  extractDateToString,
  extractVideoToString,
  createVideoDateObjects,
  removeNullVideoDateEntries,
};
