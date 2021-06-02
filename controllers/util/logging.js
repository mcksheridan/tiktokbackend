const Rollbar = require('rollbar');

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_KEY,
  captureUncaught: true,
  captureUnhandledRejections: true,
});

const logLevel = {
  critical: 'critical',
  error: 'error',
  warning: 'warning',
  info: 'info',
  debug: 'debug',
};

const sendToLog = (level, info, ...params) => {
  if (level === logLevel.critical) {
    rollbar.critical(info, ...params);
    console.error(info, ...params);
  }
  if (level === logLevel.error) {
    rollbar.error(info, ...params);
    console.error(info, ...params);
  }
  if (level === logLevel.warning) {
    rollbar.warning(info, ...params);
    console.warn(info, ...params);
  }
  if (level === logLevel.info) {
    console.log(info, ...params);
  }
  if (level === logLevel.debug) {
    console.debug(info, ...params);
  }
};

module.exports = { logLevel, sendToLog };
