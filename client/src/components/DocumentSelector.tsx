
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';

interface Document {
  documentId: string;
  pdfUrl: string;
  fileName: string;
  pageCount: number;
  fileSize: number;
  createdAt: string;
  status: 'pending' | 'signed';
}

interface DocumentSelectorProps {
  onDocumentSelect: (doc: Document) => void;
}

export default function DocumentSelector({ onDocumentSelect }: DocumentSelectorProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const byPrefixAndName = {
    fas: fas,
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('https://bolosignclone-backend.onrender.com/documents');
      if (!response.ok) {
        throw new Error('Failed to load documents');
      }
      const data = await response.json();
      
      // Transform the data to match our interface
      const docs = data.documents
        .filter((doc: any) => doc.url) // Filter out documents with null URLs
        .map((doc: any) => ({
          documentId: doc.id,
          pdfUrl: `https://bolosignclone-backend.onrender.com${doc.url}`,
          fileName: doc.fileName || doc.url?.split('/').pop() || 'Unknown',
          pageCount: doc.pageCount || 0,
          fileSize: doc.fileSize || 0,
          createdAt: doc.createdAt,
          status: doc.status
        }));
      
      setDocuments(docs);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(documentId: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this document?')) {
      return;
    }

    setDeleting(documentId);
    try {
      const response = await fetch(`https://bolosignclone-backend.onrender.com/documents/${documentId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      // Remove from list
      setDocuments(documents.filter(doc => doc.documentId !== documentId));
      alert('Document deleted successfully');
    } catch (err: any) {
      console.error('Error deleting document:', err);
      alert(`Failed to delete document: ${err.message}`);
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatFileSize(bytes: number) {
    if (bytes === 0) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Loading documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4"><FontAwesomeIcon icon={byPrefixAndName.fas['xmark']} /></div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Documents</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={loadDocuments}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            Select a Document
          </h2>
          <p className="text-gray-600">
            Choose a PDF document to edit or sign
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              No Documents Yet
            </h3>
            <p className="text-gray-600 mb-6">
              Upload your first PDF document to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.documentId}
                onClick={() => onDocumentSelect(doc)}
                className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 overflow-hidden"
              >
                <div className="p-6">
                  {/* PDF Icon */}
                  <div className="flex items-center justify-center mb-4">
                    <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg
                        className="w-10 h-10 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* File Name */}
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 truncate text-center">
                    {doc.fileName}
                  </h3>

                  {/* Status Badge */}
                  <div className="flex justify-center mb-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        doc.status === 'signed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {doc.status === 'signed' ? '✓ Signed' : ' Pending'}
                    </span>
                  </div>

                  {/* Metadata */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Created:</span>
                      <span className="font-medium">{formatDate(doc.createdAt)}</span>
                    </div>
                    {doc.pageCount > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Pages:</span>
                        <span className="font-medium">{doc.pageCount}</span>
                      </div>
                    )}
                    {doc.fileSize > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">Size:</span>
                        <span className="font-medium">{formatFileSize(doc.fileSize)}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDocumentSelect(doc);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium text-sm"
                    >
                      Open
                    </button>
                    <button
                      onClick={(e) => handleDelete(doc.documentId, e)}
                      disabled={deleting === doc.documentId}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium text-sm disabled:opacity-50"
                    >
                      {deleting === doc.documentId ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Refresh Button */}
        <div className="mt-8 text-center">
          <button
            onClick={loadDocuments}
            className="px-6 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-50 shadow-lg font-medium"
          >
            <FontAwesomeIcon icon={byPrefixAndName.fas['rotate']} />
             Refresh List
          </button>
        </div>
      </div>
    </div>
  );
}