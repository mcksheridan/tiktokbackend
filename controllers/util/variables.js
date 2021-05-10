const TIKTOK_API = 'https://www.tiktok.com/oembed?url=';

const ERROR_MSG = {
  api: {
    tiktok: 'There was an error getting information from TikTok',
  },
  invalidFile: {
    type: 'This file has an invalid extension, size, or name',
    characters: 'This file has invalid characters',
    empty: 'This file has no content',
  },
  database: {
    read: 'There was an error reading from the database',
    write: 'There was an error writing to the database',
  },
};

module.exports = {
  TIKTOK_API,
  ERROR_MSG,
};
