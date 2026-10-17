/** Worker thread: runs jobs posted by the sweep and posts results back. */
import {parentPort} from 'node:worker_threads';
import {runOne} from './runner.js';

parentPort.on('message', (job) => {
    try {
        const r = runOne(job);
        // Broods carry a Map of visits; drop it before structured cloning.
        if (r.broods) r.broods = r.broods.map(({visits, ...b}) => b);
        parentPort.postMessage({ok: true, result: r});
    } catch (e) {
        parentPort.postMessage({ok: false, error: e.stack, job});
    }
});
