import { useState } from 'react';
import API from '../services/api';

export default function Receipts() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  function handleFileChange(e) {
    setFile(e.target.files[0]);
    setUploadError('');
    setUploadResult(null);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadError('');
    setUploadResult(null);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('receipt', file);
      const res = await API.post('/receipts/upload', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      setUploadResult(res.data);
      setFile(null);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="page-card">
      <h2>Upload Receipt</h2>
      <form onSubmit={handleUpload} style={{ display: 'flex', gap: '1em', alignItems: 'center', marginBottom: '1.5em', flexWrap: 'wrap' }}>
        <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} />
        <button type="submit" disabled={uploading || !file} style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '0.5em 1em', fontWeight: 600, cursor: 'pointer' }}>{uploading ? 'Uploading...' : 'Upload'}</button>
        {uploadError && <span style={{ color: 'crimson', marginLeft: 8 }}>{uploadError}</span>}
      </form>
      {uploadResult && (
        <div style={{ background: '#f1f5f9', borderRadius: 6, padding: '1em', marginTop: '1em' }}>
          <div><strong>File:</strong> {uploadResult.file?.originalName}</div>
          <div><strong>Extracted Text:</strong> <pre style={{ whiteSpace: 'pre-wrap', background: '#fff', padding: '0.5em', borderRadius: 4 }}>{uploadResult.extractedText}</pre></div>
          {uploadResult.extractedData && (
            <div style={{ marginTop: '0.5em' }}>
              <strong>Extracted Data:</strong>
              <ul>
                {uploadResult.extractedData.total && <li>Total: {uploadResult.extractedData.total}</li>}
                {uploadResult.extractedData.date && <li>Date: {uploadResult.extractedData.date}</li>}
                {uploadResult.extractedData.merchant && <li>Merchant: {uploadResult.extractedData.merchant}</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 