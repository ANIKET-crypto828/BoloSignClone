# BoloSignClone

A full-stack PDF signature engine inspired by BoloForms. Upload, edit, and sign PDF documents with custom fields, including text, date, radio, image, and signature.

---

## Features

- **PDF Upload:** Drag & drop or browse to upload PDF files.
- **Document Management:** List, select, and delete uploaded PDFs.
- **Field Editor:** Add, move, resize, and label fields on PDFs (signature, text, image, date, radio).
- **Signer Mode:** Fill fields and sign documents with a drawn or uploaded signature.
- **Image Support:** Upload images for image fields and signatures.
- **Audit Trail:** MongoDB-backed document and signing history.
- **Download Signed PDFs:** Get processed, signed documents.
- **REST API:** Express.js backend for all operations.

---

## Tech Stack

- **Frontend:** React, Tailwind CSS, react-pdf, react-rnd
- **Backend:** Node.js, Express, MongoDB (Mongoose), pdf-lib, Multer
- **Storage:** Local filesystem for PDFs, MongoDB for metadata

---

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- MongoDB (local or Atlas)

### Backend Setup

1. **Install dependencies:**
   ```sh
   cd server
   npm install
   ```

2. **Configure environment:**
   - Copy `.env.example` to `.env` and set your `MONGODB_URI`.

3. **Run the server:**
   ```sh
   npm run dev
   ```
   - Server runs on [http://localhost:3001](http://localhost:3001)

### Frontend Setup

1. **Install dependencies:**
   ```sh
   cd client
   npm install
   ```

2. **Run the client:**
   ```sh
   npm start
   ```
   - Client runs on [http://localhost:3000](http://localhost:3000)

---

## Usage

1. **Upload a PDF:** Use the "Upload New" tab.
2. **Select a Document:** Choose from the list.
3. **Edit Fields:** Drag fields from the toolbox, position and label them.
4. **Save Fields:** Click "Save Fields" to persist.
5. **Sign Document:** Switch to "Signer" mode, fill fields, draw/upload signature, and submit.
6. **Download:** After signing, download the signed PDF.

---

## API Endpoints (Backend)

- `POST /upload-pdf` — Upload a PDF
- `GET /documents` — List documents
- `DELETE /documents/:documentId` — Delete document
- `GET /fields/:documentId` — Get fields for document
- `POST /fields/:documentId` — Save fields
- `DELETE /fields/delete/:fieldId` — Delete field
- `POST /sign-pdf` — Sign PDF with field data
- `GET /download/:filename` — Download signed PDF
- `GET /audit/:pdfId` — Get audit trail
- `POST /verify` — Verify PDF integrity
- `GET /health` — Health check

---

## Folder Structure

```
/backend
  server.js
  uploaded-pdfs/   # auto-created for uploads
  signed-pdfs/     # signed outputs
  sample-pdfs/

/frontend
  src/components/
    FileUploader.tsx
    DocumentSelector.tsx
    PDFEditor.tsx
    PDFSigner.tsx
  src/utils/
    coords.ts
  src/lib/
    api.ts

```

---

## License

ISC

---

## Credits

- [pdf-lib](https://pdf-lib.js.org/)
- [react-pdf](https://github.com/wojtekmaj/react-pdf)
- [react-rnd](https://github.com/bokuweb/react-rnd)
