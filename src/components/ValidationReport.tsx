import { AlertTriangle, Award, CheckCircle, Gauge, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ValidationTestResult } from '../lib/testRunner';
import { summarizeValidation } from '../lib/testRunner';

interface Props {
  results: ValidationTestResult[];
}

export function ValidationReport({ results }: Props) {
  if (results.length === 0) return null;

  const report = summarizeValidation(results);
  const failures = results.filter(result => !result.pass);

  return (
    <section className="bg-slate-800/60 rounded-xl border border-slate-700 p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">Rapport final</h3>
          <p className="text-xs text-slate-400">Synthese automatique de la campagne de validation</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-900/70 px-3 py-2">
          <Award className="w-4 h-4 text-cyan-300" />
          <span className="text-sm text-slate-300">ReliabilityScore</span>
          <span className={`text-lg font-bold ${report.reliabilityScore >= 80 ? 'text-emerald-300' : report.reliabilityScore >= 55 ? 'text-amber-300' : 'text-red-300'}`}>
            {report.reliabilityScore}/100
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <ReportCard label="Tests" value={report.total.toString()} tone="neutral" />
        <ReportCard label="PASS" value={report.passed.toString()} tone="ok" />
        <ReportCard label="FAIL" value={report.failed.toString()} tone={report.failed ? 'error' : 'ok'} />
        <ReportCard label="CFL max" value={(report.worstCfl?.metrics.cflMax ?? 0).toFixed(2)} tone={(report.worstCfl?.metrics.cflMax ?? 0) > 1 ? 'error' : 'ok'} />
        <ReportCard label="Erreur energie" value={`${(report.worstEnergy?.metrics.energyError ?? 0).toFixed(1)}%`} tone={(report.worstEnergy?.metrics.energyError ?? 0) > 5 ? 'error' : 'ok'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <SummaryLine icon={<CheckCircle className="w-4 h-4 text-emerald-300" />} label="Meilleur scenario" value={report.bestScenario?.name ?? '-'} />
        <SummaryLine icon={<XCircle className="w-4 h-4 text-red-300" />} label="Pire scenario" value={report.worstScenario?.name ?? '-'} />
        <SummaryLine icon={<Gauge className="w-4 h-4 text-amber-300" />} label="Plus instable" value={report.mostUnstable?.name ?? '-'} />
        <SummaryLine icon={<CheckCircle className="w-4 h-4 text-cyan-300" />} label="Plus realiste" value={report.mostRealistic?.name ?? '-'} />
      </div>

      {failures.length > 0 && (
        <div className="rounded-lg border border-red-700/40 bg-red-950/20 p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-300" />
            <span className="text-sm font-semibold text-red-200">Echecs detectes</span>
          </div>
          <div className="space-y-2">
            {failures.map(result => (
              <div key={result.id} className="text-xs text-red-100">
                <span className="font-semibold">{result.name}</span>
                <span className="text-red-300"> - {result.errors.join(' | ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-3">
        <div className="text-xs font-semibold text-slate-300 mb-2">Recommandations</div>
        {report.recommendations.map((item, index) => (
          <div key={index} className="text-xs text-slate-400">- {item}</div>
        ))}
        <div className="mt-2 text-xs text-slate-500">
          Temps moyen de calcul: {report.averageRuntimeMs.toFixed(0)} ms/test
        </div>
      </div>
    </section>
  );
}

function ReportCard({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'ok' | 'error' }) {
  const toneClass = {
    neutral: 'text-slate-200 bg-slate-900/60',
    ok: 'text-emerald-300 bg-emerald-950/30',
    error: 'text-red-300 bg-red-950/30',
  }[tone];

  return (
    <div className={`rounded-lg p-3 ${toneClass}`}>
      <div className="text-xs opacity-75">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}

function SummaryLine({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-900/50 p-3">
      {icon}
      <div>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="text-sm text-slate-200">{value}</div>
      </div>
    </div>
  );
}
