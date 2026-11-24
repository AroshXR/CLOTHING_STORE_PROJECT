const ImageKit = require('imagekit');
const HttpError = require('../utils/HttpError');
let client;
function getClient() {
  if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) throw new HttpError(503, 'Image storage is not configured');
  if (!client) client = new ImageKit({ publicKey: process.env.IMAGEKIT_PUBLIC_KEY, privateKey: process.env.IMAGEKIT_PRIVATE_KEY, urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT });
  return client;
}
module.exports = { upload: (...args) => getClient().upload(...args), url: (...args) => getClient().url(...args) };
