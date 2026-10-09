import { AlertTriangle, HelpCircle, Info, MapPin, Recycle, Sparkles } from 'lucide-react';
import Card from '../common/Card';
import WasteCategoryBadge from '../common/WasteCategoryBadge';
import { LOW_CONFIDENCE } from '../../utils/constants';
import { percent } from '../../utils/format';

export default function AnalysisResultCard({ result, imageUrl }) {
  const identified = Boolean(result?.item_name && result?.category);
  const lowConfidence = identified && typeof result.confidence === 'number' && result.confidence < LOW_CONFIDENCE;
  const conf = percent(result?.confidence);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
      <Card padded={false} className="overflow-hidden self-start">
        {imageUrl
          ? <img src={imageUrl} alt={identified ? `Photo of ${result.item_name}` : 'Uploaded waste photo'} className="max-h-[420px] w-full object-contain bg-sage-50" />
          : <div className="flex h-56 items-center justify-center bg-sage-50 text-sm text-muted">Image not available</div>}
      </Card>

      <div className="space-y-4">
        {!identified ? (
          <Card className="border-amber/30 bg-amber-soft">
            <div className="flex gap-3">
              <HelpCircle className="h-6 w-6 shrink-0 text-amber" aria-hidden="true" />
              <div>
                <h2 className="text-lg font-semibold">We couldn’t identify this item</h2>
                <p className="mt-1 text-sm text-ink/80">Try a clearer photo: one item, good light, plain background. If it still fails, check your local recycling guidance before disposing of it.</p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div className="flex flex-wrap items-center gap-2"><WasteCategoryBadge category={result.category} />{conf && <span className="text-sm text-muted">AI confidence {conf}</span>}</div>
              <h2 className="mt-3 text-2xl font-semibold">{result.item_name}</h2>
              {lowConfidence && (
                <p role="note" className="mt-3 flex gap-2 rounded-lg bg-amber-soft p-3 text-sm text-amber">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  The AI isn’t very sure about this result. Check that the item matches before you continue, or try another photo.
                </p>
              )}
              {!lowConfidence && conf && <p className="mt-2 text-xs text-muted">AI results can be wrong. Confirm the item before you rely on them.</p>}
            </Card>

            {result.hazard_warning && (
              <div role="alert" className="flex gap-3 rounded-xl border border-clay/30 bg-clay-soft p-4">
                <AlertTriangle className="h-5 w-5 shrink-0 text-clay" aria-hidden="true" />
                <div><p className="font-medium text-clay">Safety warning</p><p className="text-sm text-ink/85">{result.hazard_warning}</p></div>
              </div>
            )}

            <Card>
              <h3 className="flex items-center gap-2 text-base font-semibold"><Recycle className="h-4 w-4 text-moss" aria-hidden="true" />Recommended disposal</h3>
              <p className="mt-2 text-sm text-ink/85">{result.disposal_method || 'No disposal guidance was returned for this item.'}</p>
              {result.recycler && (
                <div className="mt-4 flex gap-2 border-t border-line pt-4 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-moss" aria-hidden="true" />
                  <p><span className="font-medium">{result.recycler.name}</span>{result.recycler.address && <span className="text-muted"> · {result.recycler.address}</span>}</p>
                </div>
              )}
            </Card>

            {typeof result.estimated_points === 'number' && (
              <div className="flex items-start gap-3 rounded-xl border-2 border-dashed border-moss/50 bg-sage-50 p-4">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-moss" aria-hidden="true" />
                <div>
                  <p className="font-display text-xl font-semibold text-forest">Up to {result.estimated_points} EcoPoints <span className="text-sm font-normal text-muted">(estimated)</span></p>
                  <p className="flex items-start gap-1.5 text-sm text-muted"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />Not earned yet. Points are added only after a collector’s handover is verified.</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
