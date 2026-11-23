import { defineConfig } from 'jsrepo';

// Dogfooded WyattAu/solid-fx — vendored components live flat in
// src/components/solid/fx (upstream target is src/components/<Name>/).
// `jsrepo update <Name>` surfaces upstream diffs per file; biome ignores
// this directory so vendored files stay byte-identical to upstream
// unless deliberately re-vendored. Drift report: bun scripts/fx-drift-check.mjs
export default defineConfig({
	registries: ['github/WyattAu/solid-fx'],
	paths: {
		component: 'src/components/solid/fx',
		lib: 'src/lib',
	},
});
