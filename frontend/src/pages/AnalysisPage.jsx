import { useNavigate } from 'react-router-dom';
import { ScanLine, Truck } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import AnalysisResultCard from '../components/waste/AnalysisResultCard';
import { useAnalysis } from '../context/AnalysisContext';

export default function AnalysisPage() {
  const { analysis, clearAnalysis } = useAnalysis();
  const navigate = useNavigate();

  if (!analysis) {
    return (
      <>
        <PageHeader title="Analysis result" />
        <EmptyState icon={ScanLine} title="No analysis yet" description="Upload a photo of an item to see what it is and how to dispose of it." action={{ label: 'Identify waste', to: '/citizen/scan', icon: ScanLine }} />
      </>
    );
  }
  const { result, imageUrl } = analysis;
  const identified = Boolean(result?.item_name && result?.category);

  return (
    <>
      <PageHeader title="Analysis result" description="Review the suggestion before requesting a pickup."
        actions={<Button variant="outline" icon={ScanLine} onClick={() => { clearAnalysis(); navigate('/citizen/scan'); }}>Analyze another item</Button>} />
      <AnalysisResultCard result={result} imageUrl={imageUrl} />
      <div className="mt-8 flex flex-wrap gap-3">
        {identified
          ? <Button size="lg" icon={Truck} to="/citizen/pickup/new">Request pickup</Button>
          : <Button size="lg" icon={ScanLine} onClick={() => { clearAnalysis(); navigate('/citizen/scan'); }}>Try another photo</Button>}
      </div>
    </>
  );
}
