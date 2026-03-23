import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import OpenAI from 'openai';
import { NodeContext } from './nodeChatService';
import { createBlock, deleteManimBlockBySlug } from './blockService';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Directory helpers ────────────────────────────────────────────────────────

const PROJECT_ROOT = path.join(process.cwd(), '..');
const MANIM_ROOT = path.join(PROJECT_ROOT, 'manim');
const VENV_MANIM = path.join(PROJECT_ROOT, 'manim_env', 'bin', 'manim');

export function getManimDir(nodeId: number): string {
  const dir = path.join(MANIM_ROOT, `node_${nodeId}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// ─── Script listing ───────────────────────────────────────────────────────────

export interface ManimScriptInfo {
  name: string;
  hasVideo: boolean;
}

export function listScripts(nodeId: number): ManimScriptInfo[] {
  const dir = getManimDir(nodeId);
  let files: string[];
  try {
    files = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return files
    .filter((f) => f.endsWith('.py'))
    .map((f) => {
      const name = f.replace(/\.py$/, '');
      const hasVideo = fs.existsSync(path.join(dir, `${name}.mp4`));
      return { name, hasVideo };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Save script ──────────────────────────────────────────────────────────────

export function saveScript(nodeId: number, slug: string, code: string): string {
  const dir = getManimDir(nodeId);
  let finalSlug = slug;
  let counter = 2;
  while (fs.existsSync(path.join(dir, `${finalSlug}.py`))) {
    finalSlug = `${slug}_v${counter}`;
    counter++;
  }
  fs.writeFileSync(path.join(dir, `${finalSlug}.py`), code, 'utf-8');
  createBlock(nodeId, 'manim', finalSlug);
  return finalSlug;
}

// ─── Delete node manim directory ─────────────────────────────────────────────

export function deleteNodeDir(nodeId: number): void {
  const dir = path.join(MANIM_ROOT, `node_${nodeId}`);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

// ─── Read script ─────────────────────────────────────────────────────────────

export function readScript(nodeId: number, scriptName: string): string | null {
  const pyPath = path.join(getManimDir(nodeId), `${scriptName}.py`);
  if (!fs.existsSync(pyPath)) return null;
  return fs.readFileSync(pyPath, 'utf-8');
}

// ─── Delete script ────────────────────────────────────────────────────────────

export function deleteScript(nodeId: number, scriptName: string): void {
  const dir = getManimDir(nodeId);
  const pyPath = path.join(dir, `${scriptName}.py`);
  const mp4Path = path.join(dir, `${scriptName}.mp4`);
  if (fs.existsSync(pyPath)) fs.unlinkSync(pyPath);
  if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
  deleteManimBlockBySlug(nodeId, scriptName);
}

// ─── Run script ───────────────────────────────────────────────────────────────

function findMp4Recursive(dir: string): string | null {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMp4Recursive(full);
      if (found) return found;
    } else if (entry.isFile() && entry.name.endsWith('.mp4')) {
      return full;
    }
  }
  return null;
}

function removeDirRecursive(dir: string): void {
  if (!fs.existsSync(dir)) return;
  fs.rmSync(dir, { recursive: true, force: true });
}

export function runScript(nodeId: number, scriptName: string): string {
  const dir = getManimDir(nodeId);
  const scriptPath = path.join(dir, `${scriptName}.py`);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptName}.py`);
  }

  const tmpMediaDir = path.join(dir, `tmp_${scriptName}`);
  removeDirRecursive(tmpMediaDir);
  fs.mkdirSync(tmpMediaDir, { recursive: true });

  if (!fs.existsSync(VENV_MANIM)) {
    throw new Error(
      'Manim venv not found. Run: python3 -m venv manim_env && manim_env/bin/pip install manim'
    );
  }

  try {
    execSync(
      `"${VENV_MANIM}" render --media_dir "${tmpMediaDir}" -ql "${scriptPath}"`,
      { timeout: 120000, stdio: 'pipe' }
    );
  } catch (err: unknown) {
    removeDirRecursive(tmpMediaDir);
    const errObj = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const stderr = errObj.stderr?.toString() ?? errObj.message ?? String(err);
    throw new Error(`Manim render failed:\n${stderr}`);
  }

  const mp4 = findMp4Recursive(tmpMediaDir);
  if (!mp4) {
    removeDirRecursive(tmpMediaDir);
    throw new Error('Manim ran but no .mp4 output was found');
  }

  const destPath = path.join(dir, `${scriptName}.mp4`);
  fs.copyFileSync(mp4, destPath);
  removeDirRecursive(tmpMediaDir);

  return `${scriptName}.mp4`;
}

// ─── Edit existing manim script via OpenAI ───────────────────────────────────

export async function editManimScript(
  nodeId: number,
  scriptName: string,
  instruction: string
): Promise<void> {
  const dir = getManimDir(nodeId);
  const pyPath = path.join(dir, `${scriptName}.py`);
  if (!fs.existsSync(pyPath)) {
    throw new Error(`Script not found: ${scriptName}.py`);
  }

  const currentCode = fs.readFileSync(pyPath, 'utf-8');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert Manim Community Edition programmer. Modify the Manim script below according to the user's instruction — for example changing what is graphed, adjusting parameters, adding or removing elements. Preserve the overall structure and intent unless told otherwise. Return only the complete modified Python — no markdown, no prose.`,
      },
      {
        role: 'user',
        content: `Instruction: ${instruction}\n\nScript:\n${currentCode}`,
      },
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });

  let updatedCode = response.choices[0]?.message?.content ?? '';
  updatedCode = updatedCode.replace(/^```python\n?/i, '').replace(/^```\n?/i, '').replace(/```$/, '').trim();
  if (!updatedCode) throw new Error('Empty response from OpenAI');

  // Delete stale video if present
  const mp4Path = path.join(dir, `${scriptName}.mp4`);
  if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);

  fs.writeFileSync(pyPath, updatedCode, 'utf-8');
}

// ─── Generate manim script via OpenAI ────────────────────────────────────────

export async function generateManimScript(
  ctx: NodeContext,
  userRequest: string,
  recentHistory: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<{ slug: string; code: string }> {
  // Step 1: generate a short snake_case slug
  const slugResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Return JSON with a single key "slug" containing a snake_case identifier (max 40 chars, lowercase letters, digits, underscores only) that briefly names this Manim animation request.',
      },
      { role: 'user', content: userRequest },
    ],
    temperature: 0.3,
    max_tokens: 60,
  });

  let slug = 'animation';
  try {
    const parsed = JSON.parse(slugResponse.choices[0]?.message?.content ?? '{}');
    if (typeof parsed.slug === 'string') {
      slug = parsed.slug.replace(/[^a-z0-9_]/g, '_').slice(0, 40) || 'animation';
    }
  } catch {
    // keep default
  }

  // Step 2: generate the actual Manim script
  const scriptResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `You are an expert Manim Community Edition programmer.
Generate a complete, self-contained Python script using Manim CE that visually demonstrates the concept described by the user.

Rules:
- Import only from manim (e.g. \`from manim import *\`)
- Define exactly ONE Scene class
- The class must have a \`construct(self)\` method
- Keep the animation concise (under 30 seconds of runtime)
- Use clear labelled visuals: MathTex for formulas, Text for labels, Axes where appropriate
- Do not use external assets, images, or files
- Output pure Python only — no prose, no markdown fences, no explanatory comments

Node context:
Topic: ${ctx.treeTopic}
Node: ${ctx.nodeTitle}
Summary: ${ctx.nodeSummary}`,
      },
      ...recentHistory.slice(-6),
      { role: 'user', content: userRequest },
    ],
    temperature: 0.4,
    max_tokens: 1200,
  });

  let code = scriptResponse.choices[0]?.message?.content ?? '';
  // Strip any accidental markdown fences
  code = code.replace(/^```python\n?/i, '').replace(/^```\n?/i, '').replace(/```$/, '').trim();

  return { slug, code };
}
