const { rollup } = require('rollup')
const typescript = require('@rollup/plugin-typescript')
const { terser } = require('rollup-plugin-terser')

async function build() {
	const bundle = await rollup({
		input: 'src/bookmarklet.ts',
		plugins: [typescript(), terser()],
	})

	await bundle.write({
		file: 'dist/bookmarklet.js',
		format: 'iife',
		name: 'SacITBookmarklet',
	})
}

build()
