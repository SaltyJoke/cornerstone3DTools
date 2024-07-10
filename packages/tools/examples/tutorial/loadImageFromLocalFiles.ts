import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import { Enums, RenderingEngine } from '@cornerstonejs/core';

const { ViewportType } = Enums;

/**
 * preloads imageIds metadata in memory
 **/
async function prefetchMetadataInformation(imageIdsToPrefetch) {
  for (let i = 0; i < imageIdsToPrefetch.length; i++) {
    await cornerstoneDICOMImageLoader.wadouri.loadImage(imageIdsToPrefetch[i])
      .promise;
  }
}

async function loadByStack(imageIds) {
  const content = document.getElementById('content');
  const element = document.createElement('div');
  element.style.width = '500px';
  element.style.height = '500px';

  content.appendChild(element);

  const renderingEngineId = 'myRenderingEngine';
  const viewportId = 'CT_AXIAL_STACK';
  const renderingEngine = new RenderingEngine(renderingEngineId);

  const viewportInput = {
    viewportId,
    element,
    type: ViewportType.STACK,
  };

  renderingEngine.enableElement(viewportInput);

  const viewport = renderingEngine.getViewport(viewportInput.viewportId);
  const stack = imageIds;
  await viewport.setStack(stack, 0);
  viewport.render();
}

async function loadImageFromLocalFiles(files: FileList) {
  const imageIds = [];
  const regex = new RegExp('dcm$', 'i');

  for (const file of files) {
    if (regex.test(file.name)) {
      const imageId = cornerstoneDICOMImageLoader.wadouri.fileManager.add(file);
      imageIds.push(imageId);
    }
  }

  await prefetchMetadataInformation(imageIds);
  await loadByStack(imageIds);

  return imageIds;
}

export default loadImageFromLocalFiles;
