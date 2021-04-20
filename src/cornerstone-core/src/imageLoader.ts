import cache from './cache/cache'
import EVENTS from './enums/events'
import eventTarget from './eventTarget'
import { triggerEvent } from './utilities'
import { IImage, ImageLoaderFn, ImageLoadObject } from './types'

interface ImageLoaderOptions {
  [key: string]: any
}

/**
 * This module deals with ImageLoaders, loading images and caching images
 * @module ImageLoader
 */

const imageLoaders = {}

let unknownImageLoader

/**
 * Loads an image using a registered Cornerstone Image Loader.
 *
 * The image loader that is used will be
 * determined by the image loader scheme matching against the imageId.
 *
 * @param {String} imageId A Cornerstone Image Object's imageId
 * @param {Object} [options] Options to be passed to the Image Loader
 *
 * @returns {ImageLoadObject} An Object which can be used to act after an image is loaded or loading fails
 * @memberof ImageLoader
 */
function loadImageFromImageLoader(
  imageId: string,
  options: ImageLoaderOptions
): ImageLoadObject {
  // Extract the image loader scheme: wadors:https://image1 => wadors
  const colonIndex = imageId.indexOf(':')
  const scheme = imageId.substring(0, colonIndex)

  const loader = imageLoaders[scheme]

  if (loader === undefined || loader === null) {
    if (unknownImageLoader !== undefined) {
      return unknownImageLoader(imageId)
    }

    throw new Error('loadImageFromImageLoader: no image loader for imageId')
  }

  // Load using the registered loader
  const imageLoadObject = loader(imageId, options)

  // Broadcast an image loaded event once the image is loaded
  imageLoadObject.promise.then(
    function (image) {
      triggerEvent(eventTarget, EVENTS.IMAGE_LOADED, { image })
    },
    function (error) {
      const errorObject = {
        imageId,
        error,
      }

      triggerEvent(eventTarget, EVENTS.IMAGE_LOAD_FAILED, errorObject)
    }
  )

  return imageLoadObject
}

/**
 * Loads an image given an imageId and optional priority and returns a promise which will resolve to
 * the loaded image object or fail if an error occurred.  The loaded image is not stored in the cache.
 *
 * It first checks if the imageId and its cachedImage object is stored inside the
 * cache, if not, checks inside the already loaded volumes to copy the pixelData
 * from the exact slice in the volume to a cornerstoneImage.
 *
 * @param {String} imageId A Cornerstone Image Object's imageId
 * @param {Object} [options] Options to be passed to the Image Loader
 *
 * @returns {ImageLoadObject} An Object which can be used to act after an image is loaded or loading fails
 * @memberof ImageLoader
 */
export function loadImage(
  imageId: string,
  options: ImageLoaderOptions
): Promise<IImage> {
  if (imageId === undefined) {
    throw new Error('loadImage: parameter imageId must not be undefined')
  }

  // 1. Check inside the cache for image
  let imageLoadObject = cache.getImageLoadObject(imageId)

  if (imageLoadObject !== undefined) {
    return imageLoadObject.promise
  }

  // 2. Check if there exists a volume in the cache containing the imageId
  // we copy the pixelData over.
  const cachedVolumeInfo = cache.getVolumeContainingImageId(imageId)
  if (cachedVolumeInfo && cachedVolumeInfo.volume.loadStatus.loaded) {
    // 3. Convert the volume at the specific slice to a cornerstoneImage object.
    // this will copy the pixel data over.
    const { volume, imageIdIndex } = cachedVolumeInfo
    imageLoadObject = volume.convertToCornerstoneImage(imageId, imageIdIndex)
    return imageLoadObject.promise
  }

  // 3. if not in image cache nor inside the volume cache, we request the
  // image loaders to load it
  return loadImageFromImageLoader(imageId, options).promise
}

//

/**
 * Loads an image given an imageId and optional priority and returns a promise which will resolve to
 * the loaded image object or fail if an error occurred. The image is stored in the cache.
 *
 * It first checks if the imageId and its cachedImage object is stored inside the
 * cache, if not, checks inside the already loaded volumes to copy the pixelData
 * from the exact slice in the volume to a cornerstoneImage. Finally
 * the imageLoadObject will get cached.
 *
 * @param {String} imageId A Cornerstone Image Object's imageId
 * @param {Object} [options] Options to be passed to the Image Loader
 *
 * @returns {ImageLoadObject} Image Loader Object
 * @memberof ImageLoader
 */
export function loadAndCacheImage(
  imageId: string,
  options: ImageLoaderOptions
): Promise<IImage> {
  if (imageId === undefined) {
    throw new Error(
      'loadAndCacheImage: parameter imageId must not be undefined'
    )
  }

  // 1. Check inside the cache for image
  let imageLoadObject = cache.getImageLoadObject(imageId)

  if (imageLoadObject !== undefined) {
    return imageLoadObject.promise
  }
  // 2. Check if there exists a volume in the cache containing the imageId
  // we copy the pixelData over.
  const cachedVolumeInfo = cache.getVolumeContainingImageId(imageId)
  if (cachedVolumeInfo && cachedVolumeInfo.volume.loadStatus.loaded) {
    // 3. Convert the volume at the specific slice to a cornerstoneImage object.
    // this will copy the pixel data over.
    const { volume, imageIdIndex } = cachedVolumeInfo
    imageLoadObject = volume.convertToCornerstoneImage(imageId, imageIdIndex)
  } else {
    // 3. if not in image cache nor inside the volume cache, image loaders will
    // load the imageId
    imageLoadObject = loadImageFromImageLoader(imageId, options)
  }

  // 4. Caching the imageLoadObject
  cache.putImageLoadObject(imageId, imageLoadObject)

  return imageLoadObject.promise
}

/**
 * Registers an imageLoader plugin with cornerstone for the specified scheme
 *
 * @param {String} scheme The scheme to use for this image loader (e.g. 'dicomweb', 'wadouri', 'http')
 * @param {Function} imageLoader A Cornerstone Image Loader function
 * @returns {void}
 * @memberof ImageLoader
 */
export function registerImageLoader(
  scheme: string,
  imageLoader: ImageLoaderFn
): void {
  imageLoaders[scheme] = imageLoader
}

/**
 * Registers a new unknownImageLoader and returns the previous one
 *
 * @param {Function} imageLoader A Cornerstone Image Loader
 *
 * @returns {Function|Undefined} The previous Unknown Image Loader
 * @memberof ImageLoader
 */
export function registerUnknownImageLoader(
  imageLoader: ImageLoaderFn
): ImageLoaderFn {
  const oldImageLoader = unknownImageLoader

  unknownImageLoader = imageLoader

  return oldImageLoader
}

/**
 * Removes all registered and unknown image loaders
 *
 *
 * @returns {void}
 * @memberof Metadata
 */
export function unregisterAllImageLoaders(): void {
  Object.keys(imageLoaders).forEach(
    (imageLoader) => delete imageLoaders[imageLoader]
  )
  unknownImageLoader = undefined
}
