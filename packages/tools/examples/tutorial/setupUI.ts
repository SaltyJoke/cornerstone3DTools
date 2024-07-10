import loadImageFromLocalFiles from "./loadImageFromLocalFiles";

function setupUI() {
  const content = document.getElementById('content');
  const form = document.createElement('form');
  const formInput = document.createElement('input');

  formInput.id = 'selectFileId';
  formInput.type = 'file';
  formInput.multiple = true;
  formInput.webkitdirectory = true;
  form.appendChild(formInput);

  if (!content) {
    throw new Error('No Content');
  }

  content.appendChild(form);

  const selectButton = document.getElementById('selectFileId');

  if (!selectButton) {
    throw new Error('No Select button');
  }

  selectButton.addEventListener('change', async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const files = target.files as FileList;

    const imageIds = await loadImageFromLocalFiles(files);
  });
}

export default setupUI;
