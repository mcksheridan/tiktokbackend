const checkFileData = (file, res) => {
  const regexCheck = new RegExp(/[^A-z0-9\s:\-/.]/);
  if (file === '') {
    const emptyFileMessage = 'Your Like List is empty';
    res.send(emptyFileMessage);
    return emptyFileMessage;
  }
  if (file.match(regexCheck)) {
    const invalidCharacterMessage = 'Your file contains invalid characters. Please upload your Like List file.';
    res.send(invalidCharacterMessage);
    return invalidCharacterMessage;
  }
  console.log('Like List data is valid');
  return file;
};

const extractLikeListData = (file) => {
  const videoDatePattern = new RegExp(/Date: \d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d\sVideo Link: https:\/\/www.tiktokv.com\/share\/video\/\d*\//, 'g');
  const dateVideoArray = file.match(videoDatePattern);
  return dateVideoArray;
};

const extractDateToString = (array) => {
  const datePattern = new RegExp(/\d{4}-\d\d-\d\d\s\d\d:\d\d:\d\d/);
  const dateArray = array.match(datePattern);
  if (!dateArray) {
    return null;
  }
  const dateString = dateArray.toString();
  return dateString;
};

const extractVideoToString = (array) => {
  const videoPattern = new RegExp(/https:\/\/www.tiktokv.com\/share\/video\/\d*\//);
  const videoArray = array.match(videoPattern);
  if (!videoArray) {
    return null;
  }
  const videoString = videoArray.toString();
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

module.exports = {
  checkFileData,
  extractLikeListData,
  extractDateToString,
  extractVideoToString,
  createVideoDateObjects,
};
