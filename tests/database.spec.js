const addVideoToAllVideos = jest.fn();
const addVideoToUsersVideos = jest.fn();

const addVideo = async (isUsersVideosDuplicate, isAllVideosDuplicate, video, userId) => {
  if (!isUsersVideosDuplicate) {
    if (!isAllVideosDuplicate) {
      try {
        await addVideoToAllVideos(video);
      } catch (error) {
        return 'Error';
      }
    }
    try {
      await addVideoToUsersVideos(userId, video);
      return;
    } catch (error) {
      return 'Error';
    }
  }
  if (isUsersVideosDuplicate) {
    const videoExistsInDatabaseMessage = 'This video already exists in the database';
    // eslint-disable-next-line consistent-return
    return videoExistsInDatabaseMessage;
  }
};

describe('Test how addVideo() handles different videos that may or may not already exist in different places in the database', () => {
  beforeEach(() => {
    addVideoToAllVideos.mockClear();
    addVideoToUsersVideos.mockClear();
  });
  it('Will call addVideoToAllVideos() and addVideoToUsersVideos() because it is a video that does not exist in the database', async () => {
    await addVideo(false, false, 5, 87);
    expect(addVideoToAllVideos).toHaveBeenCalledTimes(1);
    expect(addVideoToUsersVideos).toHaveBeenCalledTimes(1);
  });
  it('Will call addVideoToUsersVideos() but not addVideoToAllVideos() because it exists in the video table but not the users videos table', async () => {
    await addVideo(false, true, 5, 87);
    expect(addVideoToAllVideos).toHaveBeenCalledTimes(0);
    expect(addVideoToUsersVideos).toHaveBeenCalledTimes(1);
  });
  it('Will call neither addVideoToUsersVideos() nor addVideoToAllVideos() because it already exists in the users videos table', async () => {
    await addVideo(true, true, 5, 87);
    expect(addVideoToAllVideos).toHaveBeenCalledTimes(0);
    expect(addVideoToUsersVideos).toHaveBeenCalledTimes(0);
  });
  it('Returns a message indicating the video already exists when a video exists in all videos and in the users videos table', async () => {
    expect(addVideo(true, true, 5, 8)).resolves.toBe('This video already exists in the database');
  });
});
