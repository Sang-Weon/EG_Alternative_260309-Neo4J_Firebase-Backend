export const dynamic = 'force-dynamic'

/**
 * [K-Palantir] Server-Side Neo4J API Route
 * SKILL.md: Agent Builder Pattern - Tool Definition Layer
 *
 * Firebase (Firestore) ↔ Neo4J 양방향 동기화를 위한 서버사이드 엔드포인트.
 * 브라우저에서 직접 bolt 프로토콜을 사용하는 것보다 안전하고 안정적입니다.
 */

import { NextRequest, NextResponse } from "next/server";
import neo4j, { Driver, Session } from "neo4j-driver";

// ────────────────────────────────────────────────────────────────────────────
// Module-level singleton: 개발 환경에서 연결 재사용
// ────────────────────────────────────────────────────────────────────────────
let driver: Driver | null = null;

async function getDriver(config?: { uri: string; user: string; pass: string }): Promise<Driver> {
    if (driver && config) {
        try {
            await driver.close();
        } catch (_) {}
        driver = null;
    }
    if (!driver) {
        if (!config) {
            throw new Error("Neo4J 연결 정보가 없습니다. 먼저 connect 액션을 호출하세요.");
        }
        driver = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.pass));
    }
    return driver;
}

// ────────────────────────────────────────────────────────────────────────────
// SKILL.md: Tool Definitions
// action: connect | query | sync | schema | status | disconnect
// ────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, config, cypher, syncData } = body;

        // ── Tool: connect ─────────────────────────────────────────
        if (action === "connect") {
            if (!config?.uri || !config?.user) {
                return NextResponse.json({ success: false, error: "URI와 사용자명이 필요합니다." }, { status: 400 });
            }
            const d = await getDriver(config);
            const info = await d.getServerInfo();
            return NextResponse.json({
                success: true,
                message: "Neo4J 연결 성공",
                serverInfo: {
                    address: info.address,
                    agent: info.agent,
                    protocolVersion: info.protocolVersion
                }
            });
        }

        // ── Tool: query (단일 Cypher 실행) ───────────────────────
        if (action === "query") {
            if (!cypher) {
                return NextResponse.json({ success: false, error: "Cypher 쿼리가 필요합니다." }, { status: 400 });
            }
            const d = await getDriver();
            const session: Session = d.session();
            try {
                // 세미콜론으로 분리된 다중 쿼리 지원
                const queries = cypher
                    .split(";")
                    .map((q: string) => q.trim())
                    .filter((q: string) => q.length > 0 && !q.startsWith("//"));

                let totalNodesCreated = 0;
                let totalRelsCreated = 0;
                let lastSummary: any = null;

                for (const q of queries) {
                    const result = await session.run(q);
                    const summary = result.summary.counters.updates();
                    totalNodesCreated += summary.nodesCreated || 0;
                    totalRelsCreated += summary.relationshipsCreated || 0;
                    lastSummary = summary;
                }

                return NextResponse.json({
                    success: true,
                    message: `${queries.length}개의 쿼리 실행 완료`,
                    stats: {
                        queriesExecuted: queries.length,
                        nodesCreated: totalNodesCreated,
                        relationshipsCreated: totalRelsCreated,
                    }
                });
            } finally {
                await session.close();
            }
        }

        // ── Tool: sync (Firebase 데이터 → Neo4J 완전 동기화) ────
        if (action === "sync") {
            if (!syncData) {
                return NextResponse.json({ success: false, error: "동기화할 syncData가 없습니다." }, { status: 400 });
            }
            const { objects = [], links = [], properties = [] } = syncData;
            const d = await getDriver();
            const session: Session = d.session();
            const results: string[] = [];

            try {
                // Step 1: 기존 OntologyType 노드 초기화
                await session.run("MATCH (n:OntologyType) DETACH DELETE n");
                results.push("기존 OntologyType 노드 초기화 완료");

                // Step 2: OntologyType 노드 생성 (카테고리별 레이블 포함)
                for (const obj of objects) {
                    const category = (obj.category || "general").toUpperCase();
                    const neo4jLabel = (obj.metadata?.neo4j_label || obj.name).replace(/\s/g, "_");
                    const propsJson = JSON.stringify(
                        obj.properties?.map((p: any) => p.name).join(",") || ""
                    );
                    await session.run(
                        `MERGE (n:OntologyType:\`${category}\` {id: $id})
                         SET n.name = $name,
                             n.description = $description,
                             n.category = $category,
                             n.neo4j_label = $neo4jLabel,
                             n.source = $source,
                             n.property_names = $propNames,
                             n.synced_at = datetime()
                         RETURN n`,
                        {
                            id: obj.id || obj.name,
                            name: obj.name,
                            description: obj.description,
                            category: obj.category || "general",
                            neo4jLabel,
                            source: obj.source || "ai-mapped",
                            propNames: obj.properties?.map((p: any) => p.name).join(",") || ""
                        }
                    );
                }
                results.push(`Object 노드 ${objects.length}개 동기화 완료`);

                // Step 3: OntologyLink 관계 생성
                for (const link of links) {
                    const relType = (link.neo4jType || link.name).toUpperCase().replace(/\s/g, "_");
                    await session.run(
                        `MATCH (a:OntologyType {name: $from}), (b:OntologyType {name: $to})
                         MERGE (a)-[r:\`${relType}\` {id: $id}]->(b)
                         SET r.name = $name,
                             r.bidirectional = $bidirectional,
                             r.description = $description,
                             r.synced_at = datetime()`,
                        {
                            from: link.fromType,
                            to: link.toType,
                            id: link.id || `${link.fromType}_${relType}_${link.toType}`,
                            name: link.name,
                            bidirectional: link.bidirectional || false,
                            description: link.description || ""
                        }
                    );
                    // 양방향인 경우 역방향 관계도 생성
                    if (link.bidirectional) {
                        await session.run(
                            `MATCH (a:OntologyType {name: $from}), (b:OntologyType {name: $to})
                             MERGE (b)-[r:\`${relType}_REVERSE\`]->(a)
                             SET r.synced_at = datetime()`,
                            { from: link.fromType, to: link.toType }
                        );
                    }
                }
                results.push(`Link 관계 ${links.length}개 동기화 완료`);

                // Step 4: PropertyType 노드 생성
                await session.run("MATCH (n:PropertyDef) DETACH DELETE n");
                for (const prop of properties) {
                    await session.run(
                        `MERGE (p:PropertyDef {id: $id})
                         SET p.name = $name,
                             p.dataType = $dataType,
                             p.description = $description,
                             p.used_by = $usedBy,
                             p.source = $source,
                             p.synced_at = datetime()`,
                        {
                            id: prop.id || prop.name,
                            name: prop.name,
                            dataType: prop.dataType,
                            description: prop.description,
                            usedBy: Array.isArray(prop.usedBy) ? prop.usedBy.join(",") : "",
                            source: prop.source || "ai-mapped"
                        }
                    );
                    // PropertyDef → OntologyType 관계 연결
                    if (Array.isArray(prop.usedBy)) {
                        for (const objName of prop.usedBy) {
                            await session.run(
                                `MATCH (p:PropertyDef {name: $propName}), (o:OntologyType {name: $objName})
                                 MERGE (o)-[:HAS_PROPERTY]->(p)`,
                                { propName: prop.name, objName }
                            );
                        }
                    }
                }
                results.push(`Property 노드 ${properties.length}개 동기화 완료`);

                return NextResponse.json({
                    success: true,
                    message: "Firebase → Neo4J 전체 동기화 완료",
                    stats: {
                        objects: objects.length,
                        links: links.length,
                        properties: properties.length,
                    },
                    logs: results
                });
            } finally {
                await session.close();
            }
        }

        // ── Tool: schema (현재 Neo4J 스키마 조회) ───────────────
        if (action === "schema") {
            const d = await getDriver();
            const session: Session = d.session();
            try {
                const result = await session.run(
                    "CALL db.schema.visualization() YIELD nodes, relationships RETURN nodes, relationships"
                );
                const record = result.records[0];
                return NextResponse.json({
                    success: true,
                    schema: {
                        nodes: record?.get("nodes") || [],
                        relationships: record?.get("relationships") || []
                    }
                });
            } finally {
                await session.close();
            }
        }

        // ── Tool: status (연결 상태 확인) ────────────────────────
        if (action === "status") {
            if (!driver) {
                return NextResponse.json({ connected: false, message: "Neo4J 미연결" });
            }
            try {
                const info = await driver.getServerInfo();
                return NextResponse.json({
                    connected: true,
                    address: info.address,
                    agent: info.agent
                });
            } catch {
                driver = null;
                return NextResponse.json({ connected: false, message: "연결이 끊어졌습니다." });
            }
        }

        // ── Tool: disconnect ──────────────────────────────────────
        if (action === "disconnect") {
            if (driver) {
                await driver.close();
                driver = null;
            }
            return NextResponse.json({ success: true, message: "Neo4J 연결 종료됨" });
        }

        return NextResponse.json({ error: `알 수 없는 action: ${action}` }, { status: 400 });

    } catch (error: any) {
        console.error("[Neo4J API] Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || "서버 오류가 발생했습니다.",
                code: error.code || "UNKNOWN"
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    const connected = !!driver;
    let serverInfo = null;
    if (driver) {
        try {
            serverInfo = await driver.getServerInfo();
        } catch {
            driver = null;
        }
    }
    return NextResponse.json({
        service: "K-Palantir Neo4J Sync API",
        connected,
        serverInfo: serverInfo ? { address: serverInfo.address, agent: serverInfo.agent } : null,
        tools: ["connect", "query", "sync", "schema", "status", "disconnect"]
    });
}
