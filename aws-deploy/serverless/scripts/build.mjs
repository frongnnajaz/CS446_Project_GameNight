// bundle Lambda ทั้ง 2 ตัวเป็นไฟล์เดียวด้วย esbuild แล้ว zip ไว้ใน dist/
// AWS SDK v3 มีอยู่แล้วใน runtime nodejs22.x จึงไม่ต้อง bundle เข้าไป
import { build } from 'esbuild'
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'

rmSync('dist', { recursive: true, force: true })
for (const name of ['api', 'deals']) {
  await build({
    entryPoints: [`src/${name}.ts`],
    outfile: `dist/${name}/index.mjs`,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    external: ['@aws-sdk/*'],
    // express ใช้ require() ภายใน ต้องมี require ใน ESM bundle
    banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
    minify: true,
    sourcemap: false,
  })
  mkdirSync('dist', { recursive: true })
  execFileSync('python', ['-c', `import zipfile;z=zipfile.ZipFile('dist/${name}.zip','w',zipfile.ZIP_DEFLATED);z.write('dist/${name}/index.mjs','index.mjs');z.close()`])
  console.log(`dist/${name}.zip`)
}
