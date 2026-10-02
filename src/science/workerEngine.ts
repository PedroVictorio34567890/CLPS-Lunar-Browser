import type { ScienceEngine } from './engine';
import type { ComparisonReport } from '../models';

// Computation never blocks the orbit controls or form interactions.
export const workerEngine: ScienceEngine = {
  compare(sites, period) {
    return new Promise((resolve, reject) => {
      const worker = new Worker(new URL('./science.worker.ts', import.meta.url), { type: 'module' });
      const fail = (message: string) => { worker.terminate(); reject(new Error(message)); };
      worker.onerror = () => fail('No se pudo iniciar el motor de cálculo. Recarga la aplicación.');
      worker.onmessageerror = () => fail('No se pudo leer el resultado del motor.');
      worker.onmessage = (event: MessageEvent<{ report?: ComparisonReport; error?: string }>) => {
        worker.terminate();
        if (event.data.report) resolve(event.data.report);
        else reject(new Error(event.data.error ?? 'Respuesta de cálculo inválida.'));
      };
      worker.postMessage({ sites, period });
    });
  },
};
