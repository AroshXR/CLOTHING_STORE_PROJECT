const { ImageKit, toFile } = require('@imagekit/nodejs');
const HttpError = require('../utils/HttpError');

let client;

function getClient() {
  if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    throw new HttpError(503, 'Image storage is not configured');
  }
  if (!client) {
    client = new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY });
  }
  return client;
}

async function upload({ file, fileName, ...rest }) {
  const sdk = getClient();
  const uploadFile = Buffer.isBuffer(file) ? await toFile(file, fileName || 'upload') : file;
  return sdk.files.upload({ ...rest, file: uploadFile, fileName });
}

function url({ path, src, urlEndpoint, ...rest }) {
  const sdk = getClient();
  return sdk.helper.buildSrc({
    urlEndpoint: urlEndpoint || process.env.IMAGEKIT_URL_ENDPOINT,
    src: src || path,
    ...rest
  });
}

module.exports = { upload, url };
