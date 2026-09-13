/**
 * Copia o runtime WebAssembly do MediaPipe do node_modules para public/face.
 *
 * Os arquivos passam de 20 MB somados e sao reproduziveis a partir da versao
 * fixada no package.json, entao nao vao para o repositorio: roda antes do dev
 * e do build. O modelo .tflite, por ser pequeno e vir de download externo,
 * fica versionado.
 *
 * Se o runtime faltar, a deteccao de rosto se desliga sozinha no front e a
 * captura segue funcionando — por isso aqui so avisa, nao derruba o build.
 */
import { cp, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const origem = join(raiz, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const destino = join(raiz, 'public', 'face');

// O MediaPipe escolhe a variante em tempo de execucao, conforme o navegador
// tenha SIMD e conforme carregue como modulo. Copiar todas evita um 404 que
// desligaria a deteccao em parte dos aparelhos. Cada navegador baixa uma so.
const ARQUIVOS = [
  'vision_wasm_internal.js',
  'vision_wasm_internal.wasm',
  'vision_wasm_module_internal.js',
  'vision_wasm_module_internal.wasm',
  'vision_wasm_nosimd_internal.js',
  'vision_wasm_nosimd_internal.wasm',
];

try {
  await access(origem);
} catch {
  console.warn('[mediapipe] runtime nao encontrado em node_modules; deteccao de rosto ficara desligada');
  process.exit(0);
}

await mkdir(destino, { recursive: true });
for (const arquivo of ARQUIVOS) {
  await cp(join(origem, arquivo), join(destino, arquivo));
}
console.log(`[mediapipe] ${ARQUIVOS.length} arquivos copiados para public/face`);
