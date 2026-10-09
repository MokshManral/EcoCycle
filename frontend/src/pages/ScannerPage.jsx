import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScanLine } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import ErrorState from '../components/common/ErrorState';
import FileUpload from '../components/waste/FileUpload';
import ImagePreview from '../components/waste/ImagePreview';
import { validateImage } from '../utils/validators';
import { wasteService } from '../services/wasteService';
import { useAnalysis } from '../context/AnalysisContext';

export default function ScannerPage() {
  const navigate = useNavigate();
  const { setAnalysis } = useAnalysis();
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Temporary preview URL: revoked whenever it's replaced and on unmount.
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleSelect(f) {
    const problem = validateImage(f);
    setApiError(null);
    if (problem) { setFileError(problem); return; }
    setFileError(''); setFile(f);
  }

  async function analyze() {
    if (loading) return;
    const problem = validateImage(file);
    if (problem) { setFileError(problem); return; }
    setLoading(true); setApiError(null);
    try {
      const result = await wasteService.analyze(file);
      setAnalysis(result, file);
      navigate('/analysis');
    } catch (err) {
      setApiError(err);
      setLoading(false);
    }
  }

  const replaceInput = () => document.getElementById('replace-input')?.click();

  return (
    <>
      <PageHeader title="Identify waste" description="Upload a clear photo of one item. EcoCycle will suggest its category and how to dispose of it." />
      <div className="max-w-2xl space-y-5">
        {!file ? (
          <FileUpload onSelect={handleSelect} error={fileError} />
        ) : (
          <>
            <ImagePreview src={previewUrl} name={file.name} scanning={loading} disabled={loading}
              onRemove={() => { setFile(null); setApiError(null); }} onReplace={replaceInput} />
            <input id="replace-input" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Choose a replacement image"
              onChange={(e) => { if (e.target.files?.[0]) handleSelect(e.target.files[0]); e.target.value = ''; }} />
            {fileError && <p role="alert" className="text-sm text-clay">{fileError}</p>}
            {apiError && <ErrorState error={apiError} title="Analysis failed" onRetry={analyze} />}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" icon={ScanLine} onClick={analyze} loading={loading}>{loading ? 'Analyzing…' : 'Analyze waste'}</Button>
              {apiError && !loading && <Button size="lg" variant="outline" onClick={() => { setFile(null); setApiError(null); }}>Try another image</Button>}
            </div>
            {loading && <p className="text-sm text-muted" role="status">Looking at your photo. This usually takes a few seconds.</p>}
          </>
        )}
      </div>
    </>
  );
}
