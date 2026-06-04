import { useMemo, useRef, useState } from 'react';
import { CheckCircle, ClipboardCheck, Play, Square, XCircle } from 'lucide-react';
import type { AllParameters } from '../lib/types';
import { getWeatherForMonth } from '../lib/weather';
import {
  createValidationMatrix,
  runValidationSuite,
  type TestCategory,
  type ValidationTestResult,
} from '../lib/testRunner';
import { ValidationReport } from './ValidationReport';

interface Props {
  params: AllParameters;
}

const categoryLabels: Record<TestCategory, string> = {
  numerical: 'Numerique',
  physical: 'Physique',
  ui: 'UI',
  performance: 'Performance',
};

export function TestSuite({ params }: Props) {
  const [running, setRunning] = useState(false);
  const [current, setCurrent] = useState<string>('');
  const [completed, setCompleted] = useState(0);
  const [results, setResults] = useState<ValidationTestResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const tests = useMemo(() => createValidationMatrix(params), [params]);

  const total = tests.length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

  const runSuite = async () => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setError(null);
    setResults([]);
    setCompleted(0);

    try {
      const finalResults = await runValidationSuite(
        params,
        getWeatherForMonth,
        update => {
          setCurrent(update.current ?? '');
          setCompleted(update.completed);
          setResults(update.results);
        },
        controller.signal
      );
      setResults(finalResults);
      setCompleted(finalResults.length);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Campagne annulee par utilisateur.');
      } else {
        setError(err instanceof Error ? err.message : 'Erreur inconnue pendant la validation.');
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const stopSuite = () => {
    abortRef.current?.abort();
  };

  const resultsById = new Map(results.map(result => [result.id, result]));

  return (
    <div className="space-y-6">
      <section className="bg-slate-800/60 rounded-xl border border-slate-700 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-5 h-5 text-cyan-300" />
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Validation & Tests</h2>
              <p className="text-xs text-slate-400">
                Campagne complete: horaires, durees, physique, UI, visuels et performance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!running ? (
              <button
                onClick={runSuite}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <Play className="w-4 h-4" />
                Lancer la suite de tests
              </button>
            ) : (
              <button
                onClick={stopSuite}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium text-white transition-colors"
              >
                <Square className="w-4 h-4" />
                Arreter
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>{running ? `En cours: ${current}` : 'Pret a rejouer la matrice de validation'}</span>
            <span>{completed}/{total} - {progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
            <div className="h-full bg-cyan-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200">
            {error}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {tests.map(test => {
          const result = resultsById.get(test.id);
          const status = result ? (result.pass ? 'pass' : 'fail') : running && current === test.name ? 'running' : 'pending';

          return (
            <div key={test.id} className="rounded-lg border border-slate-700 bg-slate-800/40 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={status} />
                    <span className="text-sm font-medium text-slate-100">{test.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{categoryLabels[test.category]}</div>
                </div>
                <StatusBadge status={status} />
              </div>

              {result && (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <Metric label="CFL max" value={result.metrics.cflMax.toFixed(2)} />
                  <Metric label="Energie" value={`${result.metrics.energyError.toFixed(1)}%`} />
                  <Metric label="dt min/max" value={`${result.metrics.dtMin.toFixed(3)}/${result.metrics.dtMax.toFixed(3)}s`} />
                  <Metric label="Runtime" value={`${result.metrics.runtimeMs.toFixed(0)}ms`} />
                </div>
              )}

              {result && (result.errors.length > 0 || result.warnings.length > 0) && (
                <div className="mt-3 space-y-1">
                  {result.errors.map((item, index) => (
                    <div key={`e-${index}`} className="text-xs text-red-300">Erreur: {item}</div>
                  ))}
                  {result.warnings.slice(0, 3).map((item, index) => (
                    <div key={`w-${index}`} className="text-xs text-amber-300">Alerte: {item}</div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <ValidationReport results={results} />
    </div>
  );
}

function StatusIcon({ status }: { status: 'pending' | 'running' | 'pass' | 'fail' }) {
  if (status === 'pass') return <CheckCircle className="w-4 h-4 text-emerald-300" />;
  if (status === 'fail') return <XCircle className="w-4 h-4 text-red-300" />;
  if (status === 'running') return <ClipboardCheck className="w-4 h-4 text-cyan-300 animate-pulse" />;
  return <ClipboardCheck className="w-4 h-4 text-slate-500" />;
}

function StatusBadge({ status }: { status: 'pending' | 'running' | 'pass' | 'fail' }) {
  const classes = {
    pending: 'bg-slate-900 text-slate-400',
    running: 'bg-cyan-950/60 text-cyan-300',
    pass: 'bg-emerald-950/60 text-emerald-300',
    fail: 'bg-red-950/60 text-red-300',
  }[status];

  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold uppercase ${classes}`}>
      {status}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-900/60 p-2">
      <div className="text-slate-500">{label}</div>
      <div className="text-slate-200 font-medium">{value}</div>
    </div>
  );
}
