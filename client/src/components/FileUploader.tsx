import { useState } from 'react';

interface FileUploaderProps {
  onFileUpload: (result: any) => void;
}

interface ImageFieldInputProps {
  field: {
    id: string;
    label?: string;
    required?: boolean;
  };
  onImageUpload: (fieldId: string, dataUrl: string) => void;
}

interface UploadedDocument {
  documentId: string;
  pageCount: number;
  fileSize: number;
}

// FileUploader Component
function FileUploader({ onFileUpload }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((file: File) => file.type === 'application/pdf');

    if (pdfFile) {
      await uploadFile(pdfFile);
    } else {
      alert('Please drop a PDF file');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      await uploadFile(file);
    } else {
      alert('Please select a PDF file');
    }
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch('http://localhost:3001/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      onFileUpload(result);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload PDF');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-4 border-dashed rounded-lg p-12 text-center transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 bg-gray-50'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <svg
            className="w-16 h-16 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          <div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              {uploading ? 'Uploading...' : 'Drop your PDF here'}
            </p>
            <p className="text-sm text-gray-500">or</p>
          </div>

          <label className="cursor-pointer">
            <span className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition inline-block">
              Browse Files
            </span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
          </label>

          <p className="text-xs text-gray-400 mt-2">
            Maximum file size: 10MB
          </p>
        </div>
      </div>
    </div>
  );
}

// ImageFieldInput Component (for signer mode)
function ImageFieldInput({ field, onImageUpload }: ImageFieldInputProps) {
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        onImageUpload(field.id, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setPreview(null);
    onImageUpload(field.id, '');
  };

  return (
    <div className="mb-4 p-3 border-2 border-dashed border-gray-300 rounded-lg">
      <label className="block text-sm font-medium mb-2">
        {field.label || 'IMAGE'}
        {field.required && <span className="text-red-500">*</span>}
      </label>

      {preview ? (
        <div className="space-y-2">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-32 object-contain bg-gray-100 rounded"
          />
          <div className="flex gap-2">
            <label className="flex-1 cursor-pointer">
              <span className="block text-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">
                Change Image
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            <button
              onClick={clearImage}
              className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label className="block cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-sm text-gray-600">Click to upload image</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </label>
      )}
    </div>
  );
}

// Demo Component
export default function App() {
  const [mode, setMode] = useState<'upload' | 'image'>('upload');
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);

  const handleFileUpload = (result: UploadedDocument) => {
    console.log('File uploaded:', result);
    setUploadedDoc(result);
    alert(`PDF uploaded successfully!\nDocument ID: ${result.documentId}\nPages: ${result.pageCount}`);
  };

  const handleImageUpload = (fieldId: string, dataUrl: string) => {
    console.log('Image uploaded for field:', fieldId, 'Data URL length:', dataUrl.length);
  };

  // Mock image field for demo
  const mockImageField = {
    id: 'img-1',
    label: 'Profile Photo',
    required: true
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">
          PDF Document Manager
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Upload PDFs and add images to your documents
        </p>

        <div className="flex gap-4 justify-center mb-8">
          <button
            onClick={() => setMode('upload')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              mode === 'upload'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📄 Upload PDF
          </button>
          <button
            onClick={() => setMode('image')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              mode === 'image'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🖼️ Add Images
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          {mode === 'upload' ? (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                Upload Your PDF
              </h2>
              <FileUploader onFileUpload={handleFileUpload} />
              
              {uploadedDoc && (
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">
                    ✓ Upload Successful
                  </h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Document ID:</strong> {uploadedDoc.documentId}</p>
                    <p><strong>Pages:</strong> {uploadedDoc.pageCount}</p>
                    <p><strong>File Size:</strong> {(uploadedDoc.fileSize / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-800">
                Image Field Example
              </h2>
              <p className="text-gray-600 mb-6">
                This is how users will upload images to fill image fields in your PDF documents.
              </p>
              <ImageFieldInput
                field={mockImageField}
                onImageUpload={handleImageUpload}
              />
            </div>
          )}
        </div>

        <div className="mt-8 p-6 bg-white rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">
            📋 Implementation Instructions
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="p-3 bg-blue-50 rounded">
              <strong>1. Backend:</strong> Add the upload endpoint to server.js (see code below)
            </div>
            <div className="p-3 bg-green-50 rounded">
              <strong>2. App.tsx:</strong> Replace with the enhanced version that includes FileUploader
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <strong>3. PDFSigner.tsx:</strong> Add ImageFieldInput for image type fields
            </div>
            <div className="p-3 bg-orange-50 rounded">
              <strong>4. Install:</strong> npm install multer (for file uploads)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { FileUploader, ImageFieldInput };