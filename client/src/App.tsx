import { useState } from 'react';
import PDFEditor from './components/PDFEditor';
import PDFSigner from './components/PDFSigner';

function App() {
  const [mode, setMode] = useState<'editor' | 'signer'>('editor');
  const [documentId] = useState('sample-doc-1');
  
  // Original external PDF URL
  const externalPdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  
  // Proxy through backend to avoid CORS
  const [pdfUrl] = useState(
    `http://localhost:3001/proxy-pdf?url=${encodeURIComponent(externalPdfUrl)}`
  );

  return (
    <div className="h-screen">
      <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Signature Injection Engine</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setMode('editor')}
            className={`px-4 py-2 rounded ${
              mode === 'editor' ? 'bg-white text-blue-600' : 'bg-blue-500'
            }`}
          >
            Editor Mode
          </button>
          <button
            onClick={() => setMode('signer')}
            className={`px-4 py-2 rounded ${
              mode === 'signer' ? 'bg-white text-blue-600' : 'bg-blue-500'
            }`}
          >
            Signer Mode
          </button>
        </div>
      </div>

      {mode === 'editor' ? (
        <PDFEditor documentId={documentId} pdfUrl={pdfUrl} />
      ) : (
        <PDFSigner documentId={documentId} pdfUrl={pdfUrl} />
      )}
    </div>
  );
}

export default App;