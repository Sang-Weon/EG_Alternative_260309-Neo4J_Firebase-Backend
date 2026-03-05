export const dynamic = 'force-dynamic'

import { streamText, tool } from 'ai';
import { z } from 'zod';
import { Neo4jService } from '@/lib/neo4j-service';

// System prompt
const systemPrompt = `# Palantir Ontology Agent
You are an expert AI Assistant operating within a Palantir Foundry-style Digital Twin platform. Your primary role is to help users analyze manufacturing and supply chain data.

## Persona
- You are strictly professional and analytical.
- You answer questions based ON THE DATA provided by the knowledge graph.
- Never make up factory data or metrics.

## Capabilities
1. You can traverse the ontology to find nodes (Factories, Processes, Equipment, Products).
2. You can identify bottlenecks or root causes of quality issues by analyzing the graph.
3. You can execute Cypher queries using your tools to fetch real-time data from Neo4j.

## Rules
- When the user asks a question about the factory, supply chain, or operations, ALWAYS use the query_neo4j_graph tool to fetch data before answering.
- If the tool returns no data, inform the user that the information is not present in the current ontology.
- Present findings clearly, often using bullet points or small markdown tables for readability.
- Translate technical Cypher results into accessible business insights.`;

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

// 서버사이드: 환경변수로 Neo4j 자동 연결 (요청마다 연결 상태 확인)
async function ensureNeo4jConnected() {
  if (Neo4jService.isConnected()) return;
  const uri  = process.env.NEO4J_URI;
  const user = process.env.NEO4J_USER;
  const pass = process.env.NEO4J_PASSWORD;
  if (uri && user && pass) {
    try {
      await Neo4jService.connect({ uri, user, pass });
      console.log('[Agent] Neo4j 서버사이드 자동 연결 성공');
    } catch (e: any) {
      console.error('[Agent] Neo4j 자동 연결 실패:', e?.message);
    }
  } else {
    console.warn('[Agent] NEO4J_URI/USER/PASSWORD 환경변수 미설정');
  }
}

export async function POST(req: Request) {
  const { messages } = await req.json();

  await ensureNeo4jConnected();

  const result = streamText({
    model: 'anthropic/claude-3-5-sonnet-latest',
    system: systemPrompt,
    messages,
    tools: {
      query_neo4j_graph: tool({
        description: 'Execute a Cypher query against the Neo4j Ontology Database to fetch real-time operational or supply chain data.',
        parameters: z.object({
          cypher: z.string().describe('The strict Cypher query to execute. Example: MATCH (n:Factory) RETURN n'),
          explanation: z.string().describe('Brief explanation of what this query aims to find.')
        }),
        execute: async ({ cypher, explanation }: { cypher: string; explanation: string }) => {
          console.log(`[Agent] Executing Cypher Tool: ${explanation}\nQuery: ${cypher}`);
          try {
            const result = await Neo4jService.runQuery(cypher);
            if (result.success && result.stats) {
               return `Query executed successfully. Result: ${JSON.stringify(result.stats)}`;
            } else {
               return `Query executed.`;
            }
          } catch (error: any) {
            return `Error executing query: ${error.message}`;
          }
        },
      }),
    },
    maxSteps: 3,
  });

  return result.toDataStreamResponse();
}
