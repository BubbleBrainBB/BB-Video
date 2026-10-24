// net.mjs: make Node's fetch use the proxy the machine is already set up with.
//   curl, Python and Chrome honour https_proxy / HTTPS_PROXY; Node's built-in fetch ignores them unless NODE_USE_ENV_PROXY=1 (Node 22.21+ / 24.5+).
//   Behind a proxy, direct connections time out (UND_ERR_CONNECT_TIMEOUT) — so a script that downloads calls useEnvProxy() first:
//   when a proxy is set and the switch isn't, it runs itself again with the switch on and exits with that run's code.
import { spawnSync } from 'node:child_process';

export function useEnvProxy() {
  const e = process.env;
  if (!(e.https_proxy || e.HTTPS_PROXY || e.http_proxy || e.HTTP_PROXY) || e.NODE_USE_ENV_PROXY) return;
  const r = spawnSync(process.execPath, [...process.execArgv, ...process.argv.slice(1)], { stdio: 'inherit', env: { ...e, NODE_USE_ENV_PROXY: '1' } });
  process.exit(r.status ?? 1);
}
