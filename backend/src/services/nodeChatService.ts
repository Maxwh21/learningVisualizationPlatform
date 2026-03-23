import OpenAI from 'openai';
import { db } from '../db/database';
import { generateManimScript, saveScript, editManimScript, readScript } from './manimService';
import { getBlocks } from './blockService';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── DB types ──────────────────────────────────────────────────────────────

interface DbNode {
  id: number;
  tree_id: number;
  parent_node_id: number | null;
  title: string;
  summary: string | null;
  learning_goal: string | null;
  why_it_matters: string | null;
  depth: number;
  order_index: number;
}

interface DbTree {
  id: number;
  topic_name: string;
}

// ─── Context loading ────────────────────────────────────────────────────────

function getNode(nodeId: number): DbNode | undefined {
  return db.prepare('SELECT * FROM tree_nodes WHERE id = ?').get(nodeId) as DbNode | undefined;
}

/** Walk up the parent chain and return titles from root → current node. */
function buildBreadcrumb(node: DbNode): string[] {
  const path: string[] = [];
  let current: DbNode | undefined = node;
  while (current) {
    path.unshift(current.title);
    if (current.parent_node_id === null) break;
    current = getNode(current.parent_node_id);
  }
  return path;
}

export interface NodeContext {
  treeTopic: string;
  nodeTitle: string;
  nodeSummary: string;
  learningGoal: string;
  whyItMatters: string;
  breadcrumb: string[];          // ['Root topic', ..., 'Current node']
  parentTitle: string | null;
  childTitles: string[];
  nextSiblingNode: { id: number; title: string } | null;
}

export function loadNodeContext(nodeId: number): NodeContext | null {
  const node = getNode(nodeId);
  if (!node) return null;

  const tree = db
    .prepare('SELECT id, topic_name FROM trees WHERE id = ?')
    .get(node.tree_id) as DbTree | undefined;
  if (!tree) return null;

  const parent = node.parent_node_id
    ? (db.prepare('SELECT title FROM tree_nodes WHERE id = ?').get(node.parent_node_id) as { title: string } | undefined)
    : undefined;

  const children = db
    .prepare('SELECT title FROM tree_nodes WHERE parent_node_id = ? ORDER BY order_index ASC')
    .all(node.id) as { title: string }[];

  const nextSibling = node.parent_node_id
    ? (db
        .prepare('SELECT id, title FROM tree_nodes WHERE parent_node_id = ? AND order_index = ? LIMIT 1')
        .get(node.parent_node_id, node.order_index + 1) as { id: number; title: string } | undefined)
    : undefined;

  return {
    treeTopic: tree.topic_name,
    nodeTitle: node.title,
    nodeSummary: node.summary ?? '',
    learningGoal: node.learning_goal ?? '',
    whyItMatters: node.why_it_matters ?? '',
    breadcrumb: buildBreadcrumb(node),
    parentTitle: parent?.title ?? null,
    childTitles: children.map((c) => c.title),
    nextSiblingNode: nextSibling ?? null,
  };
}

// ─── System prompt ──────────────────────────────────────────────────────────

function buildBlocksContext(nodeId: number): string {
  const blocks = getBlocks(nodeId);
  if (blocks.length === 0) return '';

  const notes = blocks
    .filter((b) => b.type === 'text' && b.content.trim())
    .map((b) => `- ${b.content.trim()}`)
    .join('\n');

  const scripts = blocks
    .filter((b) => b.type === 'manim')
    .map((b) => `- ${b.content}`)
    .join('\n');

  const parts: string[] = [];
  if (notes) parts.push(`## User's notes for this topic\n${notes}`);
  if (scripts) parts.push(`## Manim animations already created\n${scripts}`);

  return parts.length > 0 ? '\n\n' + parts.join('\n\n') : '';
}

function buildSystemPrompt(ctx: NodeContext, nodeId: number): string {
  const breadcrumbStr = ctx.breadcrumb.join(' › ');

  const childrenStr =
    ctx.childTitles.length > 0
      ? `The subtopics within this node are: ${ctx.childTitles.join(', ')}.`
      : 'This is a leaf-level concept with no further subtopics.';

  const parentStr = ctx.parentTitle
    ? `The parent concept is: ${ctx.parentTitle}.`
    : 'This is a top-level concept in the tree.';

  return `You are an expert AI tutor embedded inside a structured learning-tree application. Your job is to teach the user the current concept through short, paced bursts — one section at a time.

## Learning tree context

Overall topic: ${ctx.treeTopic}
Learning path to this node: ${breadcrumbStr}
${parentStr}
${childrenStr}

## Current node

Title: ${ctx.nodeTitle}
Summary: ${ctx.nodeSummary || '(not provided)'}
Learning goal: ${ctx.learningGoal || '(not provided)'}
Why it matters: ${ctx.whyItMatters || '(not provided)'}

## Teaching style — follow this strictly

Teach in short, focused bursts. Cover exactly ONE idea, step, or sub-concept per reply. Never dump the whole explanation at once.

- Each reply should be concise: typically 3 to 8 sentences, or a short focused list.
- After each section, stop and wait. Do not continue to the next idea unprompted.
- At the end of most teaching replies, lightly indicate the natural next moves — for example: "Ready to continue, or want to go deeper on this?" — but vary your phrasing so it feels natural, not robotic.
- Do NOT write long multi-part responses by default. If the user has not asked for a full overview, do not give one.

## Interpreting user signals

- "continue" / "next" / "go on" → move to the next section or sub-concept in the explanation
- "go deeper" / "expand" / "tell me more" / "I don't get it" → stay on the current section and unpack it further with more detail, an analogy, or an example
- "example" / "show me" → give a concrete, specific example of the current idea only
- "explain simply" / "simpler" → re-explain the current idea in plainer language without advancing
- "full overview" / "explain everything" → only then may you give a longer multi-part explanation
- Use common sense for other phrasings that carry the same intent

## Additional rules

- Start with the most foundational idea in the node, then build up step by step across replies
- If you detect a gap in prerequisite knowledge, name it and briefly address it before continuing
- Connect the concept to the broader topic (${ctx.treeTopic}) when it is natural, but do not overdo it
- Stay focused on this node. Do not drift into unrelated topics unless the user explicitly asks
- Do not repeat what you have already taught unless the user asks for a recap
- Do not add disclaimers, caveats, or filler phrases. Be direct and useful.

## Mathematical notation

When writing any mathematical expression, symbol, formula, or equation, always use LaTeX:
- Inline math: wrap in single dollar signs, e.g. $e = \lim_{n \to \infty}(1 + \frac{1}{n})^n$
- Display math (standalone equations): wrap in double dollar signs, e.g. $$e^{i\pi} + 1 = 0$$
- Never write math as plain text like "(1 + 1/n)^n" — always use LaTeX delimiters so it renders correctly.

You are NOT a general chatbot. You are a paced tutor for: "${ctx.nodeTitle}" within "${ctx.treeTopic}". Teach one section at a time and let the user control the pace.${buildBlocksContext(nodeId)}${ctx.nextSiblingNode ? `

## Next topic in the learning path

The next node the user should visit after this one is: "${ctx.nextSiblingNode.title}"

If the user's question or the natural flow of the conversation is clearly moving toward that topic (e.g. they ask about it directly, or you have finished covering the current concept and they seem ready to move on), you may suggest it naturally within your reply. When you do, end your reply with exactly this marker on its own line:
SUGGEST_NEXT_NODE
Do NOT include this marker unless you genuinely think the user is ready or asking about the next topic. Do not add it on every reply.` : ''}`;
}

// ─── Chat ───────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatReply {
  reply: string;
  manimScript?: string;
  suggestedNode?: { id: number; title: string };
}

type ManimAction =
  | { type: 'create'; request: string }
  | { type: 'fix'; scriptName: string; instruction: string }
  | { type: 'discuss'; scriptName: string; question: string }
  | null;

function parseManimAction(message: string): ManimAction {
  // Edit: @MANIM @FIX:scriptName instruction text
  const fixMatch = message.match(/^@MANIM\s+@FIX:([a-z0-9_]{1,60})\s+([\s\S]+)/i);
  if (fixMatch) {
    return { type: 'fix', scriptName: fixMatch[1], instruction: fixMatch[2].trim() };
  }
  // Discuss: @MANIM @DISCUSS:scriptName question
  const discussMatch = message.match(/^@MANIM\s+@DISCUSS:([a-z0-9_]{1,60})\s+([\s\S]+)/i);
  if (discussMatch) {
    return { type: 'discuss', scriptName: discussMatch[1], question: discussMatch[2].trim() };
  }
  // Create: @MANIM: request text
  const createMatch = message.match(/^@MANIM:\s*/i);
  if (createMatch) {
    const request = message.slice(createMatch[0].length).trim();
    if (request) return { type: 'create', request };
  }
  return null;
}

export async function getNodeChatReply(
  nodeId: number,
  userMessage: string,
  history: ChatMessage[]
): Promise<ChatReply> {
  const ctx = loadNodeContext(nodeId);
  if (!ctx) throw new Error('Node not found');

  const action = parseManimAction(userMessage);

  if (action?.type === 'create') {
    try {
      const { slug, code } = await generateManimScript(ctx, action.request, history);
      const finalSlug = saveScript(nodeId, slug, code);
      return {
        reply: `Script **${finalSlug}** created — find it in the Scripts panel on the left. Click it and then hit "Run script" to render the animation.`,
        manimScript: finalSlug,
      };
    } catch (err) {
      console.error('[manimGenerate]', err);
      return { reply: "Couldn't generate the Manim script — please try again." };
    }
  }

  if (action?.type === 'fix') {
    try {
      await editManimScript(nodeId, action.scriptName, action.instruction);
      return {
        reply: `Script **${action.scriptName}** updated. Hit "Run script" to render the new version.`,
        manimScript: action.scriptName,
      };
    } catch (err) {
      console.error('[manimEdit]', err);
      return { reply: "Couldn't update the script — please try again." };
    }
  }

  if (action?.type === 'discuss') {
    const code = readScript(nodeId, action.scriptName);
    if (!code) return { reply: `Couldn't find script **${action.scriptName}**.` };

    const discussMessages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(ctx, nodeId) },
      ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam)),
      {
        role: 'user',
        content: `I'm looking at this Manim script called "${action.scriptName}":\n\`\`\`python\n${code}\n\`\`\`\n\n${action.question}`,
      },
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: discussMessages,
      temperature: 0.7,
      max_tokens: 600,
    });

    const reply = response.choices[0]?.message?.content;
    if (!reply) throw new Error('Empty response from OpenAI');
    return { reply };
  }

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(ctx, nodeId) },
    ...history.map((m) => ({ role: m.role, content: m.content } as OpenAI.ChatCompletionMessageParam)),
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages,
    temperature: 0.7,
    max_tokens: 600,
  });

  let reply = response.choices[0]?.message?.content;
  if (!reply) throw new Error('Empty response from OpenAI');

  let suggestedNode: { id: number; title: string } | undefined;
  if (reply.includes('SUGGEST_NEXT_NODE') && ctx.nextSiblingNode) {
    suggestedNode = ctx.nextSiblingNode;
    reply = reply.replace(/\n?SUGGEST_NEXT_NODE\n?/g, '').trim();
  }

  return { reply, suggestedNode };
}
