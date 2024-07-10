import dicomParser from 'dicom-parser/dist/dicomParser';

function parseRawData(byteArray: Uint8Array) {
  try
  {
    // Allow raw files
    const options = { TransferSyntaxUID: '1.2.840.10008.1.2' };
    // Parse the byte array to get a DataSet object that has the parsed contents
    var dataSet = dicomParser.parseDicom(byteArray, options);

    // access a string element
    var studyInstanceUid = dataSet.string('x0020000d');

    // get the pixel data element (contains the offset and length of the data)
    var pixelDataElement = dataSet.elements.x7fe00010;

    // create a typed array on the pixel data (this example assumes 16 bit unsigned data)
    var pixelData = new Uint16Array(dataSet.byteArray.buffer, pixelDataElement.dataOffset, pixelDataElement.length / 2);
  }
  catch(ex)
  {
    console.log('Error parsing byte stream', ex);
  }
}

function loadRawData(evt) {
  if (evt.target.readyState == FileReader.DONE) {
    let byteArray = new Uint8Array(evt.target.result);
    parseRawData(byteArray);
  }
}

function loadRawDataFromFiles(files: FileList) {
  // create a Uint8Array or node.js Buffer with the contents of the DICOM P10 byte stream
  // you want to parse (e.g. XMLHttpRequest to a WADO server)
  for (const file of files) {
    try {
      let reader = new FileReader();
      reader.readAsArrayBuffer(file);
      reader.addEventListener("load", loadRawData);
    }
    catch (ex) {
      console.log('Error loading byte array', ex);
    }
  }


}
