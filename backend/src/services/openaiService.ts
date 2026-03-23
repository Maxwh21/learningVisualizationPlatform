import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AiTreeNode {
  title: string;
  summary: string;
  learningGoal: string;
  whyItMatters: string;
  children: AiTreeNode[];
}

export interface AiTree {
  topicName: string;
  nodes: AiTreeNode[];
}

const SYSTEM_PROMPT = `You are an expert curriculum designer and educator.

Your task is to generate a structured learning tree for a given topic, where each node represents a clear learning objective.

Return ONLY valid JSON — no markdown, no code blocks, no extra text.

The JSON must follow this exact structure:
{
  "topicName": "The topic name",
  "nodes": [
    {
      "title": "Main concept title",
      "summary": "A concise explanation of the concept.",
      "learningGoal": "What the learner should understand or be able to do after this.",
      "whyItMatters": "Why this concept is important in the broader topic.",
      "children": [
        {
          "title": "Sub-concept title",
          "summary": "A concise explanation.",
          "learningGoal": "What the learner should understand after this.",
          "whyItMatters": "Why this matters.",
          "children": []
        }
      ]
    }
  ]
}

Rules:
- Start with the most foundational concepts first
- The structure must represent a logical learning progression
- Each node must represent a meaningful step in understanding the topic
- Each node should be teachable on its own
- Each major node should have 3 to 6 children where appropriate
- Keep the tree 2 to 3 levels deep
- Do NOT repeat concepts across nodes
- Keep summaries concise (1–2 sentences)
- learningGoal should be specific and actionable
- whyItMatters should connect the concept to the broader topic
- Avoid vague or generic phrasing
- Ensure the progression builds naturally from simple to more advanced concepts`;

export async function generateLearningTree(topic: string): Promise<AiTree> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `Generate a learning tree for: ${topic}` },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content) as AiTree;

  if (!parsed.topicName || !Array.isArray(parsed.nodes)) {
    throw new Error('Invalid tree structure returned from OpenAI');
  }

  return parsed;
}
