// scripts/patch-plugin-openai.mjs
// Patch @elizaos/plugin-openai to use Chat Completions API instead of Responses API
// Needed because @ai-sdk/openai@2.x defaults languageModel() to Responses API,
// which is not supported by vLLM (Nosana GPU endpoints).
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const pluginPath = resolve('node_modules/@elizaos/plugin-openai/dist/node/index.node.js');

try {
  let content = readFileSync(pluginPath, 'utf-8');
  const original = 'openai.languageModel(modelName)';
  const patched = 'openai.chat(modelName)';

  if (content.includes(original)) {
    content = content.replaceAll(original, patched);
    writeFileSync(pluginPath, content, 'utf-8');
    console.log('[patch] plugin-openai: languageModel -> chat (Chat Completions API)');
  } else if (content.includes(patched)) {
    console.log('[patch] plugin-openai: already patched');
  } else {
    console.log('[patch] plugin-openai: pattern not found, manual check needed');
  }
} catch (e) {
  console.error('[patch] Failed:', e.message);
}
