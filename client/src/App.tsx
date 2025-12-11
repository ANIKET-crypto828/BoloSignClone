import { useState } from 'react';
import PDFEditor from './components/PDFEditor';
import PDFSigner from './components/PDFSigner';
import { FileUploader } from './components/FileUploader';
import DocumentSelector from './components/DocumentSelector';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

function App() {
  const [mode, setMode] = useState<'upload' | 'select' | 'editor' | 'signer'>('select');
  const [documentId, setDocumentId] = useState<string>('');
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const byPrefixAndName = {
  fas: fas,
};

  const handleFileUpload = (result: any) => {
    setDocumentId(result.documentId);
    setPdfUrl(result.pdfUrl);
    setMode('editor');
  };

  const handleDocumentSelect = (doc: any) => {
    setDocumentId(doc.documentId);
    setPdfUrl(doc.pdfUrl);
    setMode('editor');
  };

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Signature Injection Engine</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('select')}
            className={`px-4 py-2 rounded ${
              mode === 'select' ? 'bg-white text-blue-600' : 'bg-blue-500'
            }`}
          >
            📋 Select PDF
          </button>
          <button
            onClick={() => setMode('upload')}
            className={`px-4 py-2 rounded ${
              mode === 'upload' ? 'bg-white text-blue-600' : 'bg-blue-500'
            }`}
          >
            📄 Upload New
          </button>
          <button
            onClick={() => setMode('editor')}
            disabled={!documentId}
            className={`px-4 py-2 rounded ${
              mode === 'editor' ? 'bg-white text-blue-600' : 'bg-blue-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <FontAwesomeIcon icon={byPrefixAndName.fas['spell-check']} />
             Editor
          </button>
          <button
            onClick={() => setMode('signer')}
            disabled={!documentId}
            className={`px-4 py-2 rounded ${
              mode === 'signer' ? 'bg-white text-blue-600' : 'bg-blue-500'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <FontAwesomeIcon icon={byPrefixAndName.fas['signature']} />
             Signer
          </button>
        </div>
      </div>

      {mode === 'select' && (
        <div className="flex-1 overflow-auto bg-gray-100">
          <DocumentSelector onDocumentSelect={handleDocumentSelect} />
        </div>
      )}

      {mode === 'upload' && (
        <div className="flex-1 overflow-auto bg-gray-100">
          <FileUploader onFileUpload={handleFileUpload} />
        </div>
      )}
      
      {mode === 'editor' && documentId && (
        <PDFEditor documentId={documentId} pdfUrl={pdfUrl} />
      )}
      
      {mode === 'signer' && documentId && (
        <PDFSigner documentId={documentId} pdfUrl={pdfUrl} />
      )}

      {!documentId && (mode === 'editor' || mode === 'signer') && (
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <p className="text-xl text-gray-600 mb-4">No document selected</p>
            <button
              onClick={() => setMode('select')}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Select a Document
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;