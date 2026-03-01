/**
 * [K-Palantir] Firebase ↔ Neo4J 실시간 동기화 서비스
 * SKILL.md: Agent Builder Pattern 적용
 *
 * 정적 SPA 환경: neo4j-driver WebSocket bolt로 브라우저에서 직접 연결
 * 에러 처리: 5가지 실패 케이스별 한국어 진단 메시지 제공
 */

import { db } from "./firebase";
import { collection, onSnapshot, Unsubscribe } from "firebase/firestore";
import { ObjectType, LinkType, PropertyType } from "./ontology-service";

// ────────────────────────────────────────────────────────────────────────────
// 타입 정의
// ────────────────────────────────────────────────────────────────────────────
export interface SyncTool {
    name: string;
    description: string;
    execute: (...args: any[]) => Promise<any>;
}

export interface SyncStatus {
    isRunning: boolean;
    lastSyncAt: Date | null;
    lastSyncResult: "success" | "failed" | "pending" | null;
    totalSyncs: number;
    objectCount: number;
    linkCount: number;
    propertyCount: number;
    logs: SyncLog[];
    neo4jConnected: boolean;
    connectionDiagnostics?: string;
}

export interface SyncLog {
    timestamp: Date;
    level: "info" | "success" | "warning" | "error";
    message: string;
    details?: any;
}

export interface Neo4jConnectionConfig {
    uri: string;
    user: string;
    pass: string;
}

// ────────────────────────────────────────────────────────────────────────────
// 에러 코드 → 진단 메시지 매핑
// ────────────────────────────────────────────────────────────────────────────
function diagnoseNeo4jError(error: any, uri: string): { message: string; hint: string } {
    const code = error?.code || "";
    const msg = (error?.message || "").toLowerCase();

    if (code === "ECONNREFUSED" || msg.includes("econnrefused") || msg.includes("connection refused")) {
        return {
            message: "Neo4J 서버에 연결할 수 없습니다",
            hint: `Neo4J Desktop이 실행 중인지 확인하세요. (${uri})\n` +
                  "▶ Neo4J Desktop을 열고 'Start' 버튼을 눌러 서버를 시작하세요."
        };
    }
    if (code === "ENOTFOUND" || msg.includes("enotfound") || msg.includes("getaddrinfo")) {
        return {
            message: `호스트를 찾을 수 없습니다: '${uri}'`,
            hint: "bolt://localhost:7687 또는 bolt://127.0.0.1:7687 로 시도해보세요.\n" +
                  "Docker 환경이라면 컨테이너 이름을 확인하세요."
        };
    }
    if (
        code === "Neo.ClientError.Security.Unauthorized" ||
        msg.includes("unauthorized") ||
        msg.includes("authentication") ||
        msg.includes("invalid credentials")
    ) {
        return {
            message: "인증 실패: 사용자명 또는 비밀번호가 올바르지 않습니다",
            hint: "Neo4J Desktop에서 직접 로그인하여 비밀번호를 확인하세요.\n" +
                  "초기 설정 시 neo4j/neo4j → 비밀번호 변경이 필요합니다."
        };
    }
    if (msg.includes("websocket") || msg.includes("ws://") || msg.includes("wss://")) {
        return {
            message: "WebSocket 연결 실패",
            hint: "bolt:// 대신 neo4j:// 를 시도해보세요.\n" +
                  "HTTPS 환경이라면 bolt+s:// 또는 neo4j+s:// 를 사용하세요."
        };
    }
    if (
        code === "ServiceUnavailable" ||
        msg.includes("service unavailable") ||
        msg.includes("serviceunavailable")
    ) {
        return {
            message: "Neo4J 서비스를 사용할 수 없습니다",
            hint: "서버가 아직 시작 중이거나 메모리가 부족할 수 있습니다. 잠시 후 다시 시도하세요."
        };
    }
    if (msg.includes("timeout") || msg.includes("timed out")) {
        return {
            message: "연결 시간이 초과되었습니다",
            hint: "방화벽 설정이나 네트워크 상태를 확인하세요. 포트 7687이 열려 있는지 확인하세요."
        };
    }

    return {
        message: `연결 오류: ${error?.message || "알 수 없는 오류"}`,
        hint: "Neo4J Desktop을 재시작하거나 URI/인증정보를 다시 확인해보세요."
    };
}

// ────────────────────────────────────────────────────────────────────────────
// FirebaseNeo4jSyncService (Agent-Loop 기반)
// ────────────────────────────────────────────────────────────────────────────
export class FirebaseNeo4jSyncService {
    private driver: any = null;
    private unsubscribers: Unsubscribe[] = [];
    private statusCallbacks: ((status: SyncStatus) => void)[] = [];
    private status: SyncStatus = {
        isRunning: false,
        lastSyncAt: null,
        lastSyncResult: null,
        totalSyncs: 0,
        objectCount: 0,
        linkCount: 0,
        propertyCount: 0,
        logs: [],
        neo4jConnected: false
    };
    private cache = {
        objects: [] as ObjectType[],
        links: [] as LinkType[],
        properties: [] as PropertyType[],
        dirty: false
    };
    private syncInProgress = false;

    // ── SKILL.md: Tool 정의 ────────────────────────────────────────
    private tools: SyncTool[] = [
        {
            name: "fetch_firebase_data",
            description: "캐시된 Firebase 최신 온톨로지 데이터를 반환합니다",
            execute: async () => ({
                objects: this.cache.objects,
                links: this.cache.links,
                properties: this.cache.properties
            })
        },
        {
            name: "push_to_neo4j",
            description: "Firebase 데이터를 Neo4J에 동기화합니다",
            execute: async (data: { objects: ObjectType[]; links: LinkType[]; properties: PropertyType[] }) => {
                if (!this.driver) throw new Error("Neo4J 드라이버가 초기화되지 않았습니다.");
                const session = this.driver.session();
                const results: string[] = [];
                try {
                    await session.run("MATCH (n:OntologyType) DETACH DELETE n");
                    await session.run("MATCH (n:PropertyDef) DETACH DELETE n");
                    results.push("기존 노드 초기화");

                    for (const obj of data.objects) {
                        const neo4jLabel = (obj.metadata?.neo4j_label || obj.name).replace(/\s/g, "_");
                        await session.run(
                            `MERGE (n:OntologyType {id: $id})
                             SET n += {name: $name, description: $description, category: $category,
                                       neo4j_label: $neo4jLabel, source: $source,
                                       property_names: $propNames, synced_at: datetime()}`,
                            {
                                id: obj.id || obj.name,
                                name: obj.name,
                                description: obj.description || "",
                                category: obj.category || "general",
                                neo4jLabel,
                                source: obj.source || "ai-mapped",
                                propNames: obj.properties?.map((p: any) => p.name).join(",") || ""
                            }
                        );
                    }
                    results.push(`Object ${data.objects.length}개 동기화`);

                    for (const link of data.links) {
                        const relType = (link.neo4jType || link.name).toUpperCase().replace(/\s/g, "_");
                        try {
                            await session.run(
                                `MATCH (a:OntologyType {name: $from}), (b:OntologyType {name: $to})
                                 MERGE (a)-[r:\`${relType}\` {id: $id}]->(b)
                                 SET r += {name: $name, bidirectional: $bidirectional, synced_at: datetime()}`,
                                {
                                    from: link.fromType,
                                    to: link.toType,
                                    id: link.id || `${link.fromType}_${relType}_${link.toType}`,
                                    name: link.name,
                                    bidirectional: link.bidirectional || false
                                }
                            );
                        } catch (_) {}
                    }
                    results.push(`Link ${data.links.length}개 동기화`);

                    for (const prop of data.properties) {
                        await session.run(
                            `MERGE (p:PropertyDef {id: $id})
                             SET p += {name: $name, dataType: $dataType, description: $description,
                                       used_by: $usedBy, source: $source, synced_at: datetime()}`,
                            {
                                id: prop.id || prop.name,
                                name: prop.name,
                                dataType: prop.dataType,
                                description: prop.description || "",
                                usedBy: Array.isArray(prop.usedBy) ? prop.usedBy.join(",") : "",
                                source: prop.source || "ai-mapped"
                            }
                        );
                        if (Array.isArray(prop.usedBy)) {
                            for (const objName of prop.usedBy) {
                                try {
                                    await session.run(
                                        `MATCH (p:PropertyDef {name: $propName}), (o:OntologyType {name: $objName})
                                         MERGE (o)-[:HAS_PROPERTY]->(p)`,
                                        { propName: prop.name, objName }
                                    );
                                } catch (_) {}
                            }
                        }
                    }
                    results.push(`Property ${data.properties.length}개 동기화`);

                    return { success: true, logs: results };
                } finally {
                    await session.close();
                }
            }
        },
        {
            name: "run_cypher",
            description: "임의 Cypher 쿼리를 Neo4J에 실행합니다",
            execute: async (cypher: string) => {
                if (!this.driver) throw new Error("Neo4J 드라이버가 초기화되지 않았습니다.");
                const session = this.driver.session();
                try {
                    const queries = cypher
                        .split(";")
                        .map((q: string) => q.trim())
                        .filter((q: string) => q.length > 0 && !q.startsWith("//"));
                    let nodesCreated = 0;
                    let relsCreated = 0;
                    for (const q of queries) {
                        const result = await session.run(q);
                        const updates = result.summary.counters.updates();
                        nodesCreated += updates.nodesCreated || 0;
                        relsCreated += updates.relationshipsCreated || 0;
                    }
                    return { success: true, stats: { queriesExecuted: queries.length, nodesCreated, relsCreated } };
                } finally {
                    await session.close();
                }
            }
        }
    ];

    private async executeTool(toolName: string, args?: any): Promise<any> {
        const tool = this.tools.find(t => t.name === toolName);
        if (!tool) throw new Error(`Unknown tool: ${toolName}`);
        return tool.execute(args);
    }

    private addLog(level: SyncLog["level"], message: string, details?: any) {
        const log: SyncLog = { timestamp: new Date(), level, message, details };
        this.status.logs = [log, ...this.status.logs].slice(0, 50);
        this.notifyStatusUpdate();
    }

    private notifyStatusUpdate() {
        this.statusCallbacks.forEach(cb => cb({ ...this.status }));
    }

    subscribeToStatus(callback: (status: SyncStatus) => void): () => void {
        this.statusCallbacks.push(callback);
        callback({ ...this.status });
        return () => {
            this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
        };
    }

    // ── Agent Loop ─────────────────────────────────────────────────
    private async agentSyncCycle(): Promise<void> {
        if (!this.cache.dirty || this.syncInProgress) return;
        if (!this.driver || !this.status.neo4jConnected) {
            this.addLog("warning", "Neo4J 미연결 - 동기화 대기 중");
            return;
        }

        this.syncInProgress = true;
        this.cache.dirty = false;
        this.addLog("info", "동기화 사이클 시작 (Firebase → Neo4J)");

        try {
            const data = await this.executeTool("fetch_firebase_data");
            const result = await this.executeTool("push_to_neo4j", data);

            this.status.lastSyncAt = new Date();
            this.status.lastSyncResult = "success";
            this.status.totalSyncs++;
            this.status.objectCount = data.objects.length;
            this.status.linkCount = data.links.length;
            this.status.propertyCount = data.properties.length;

            this.addLog("success",
                `동기화 완료: Objects(${data.objects.length}) Links(${data.links.length}) Props(${data.properties.length})`,
                { logs: result.logs }
            );
        } catch (error: any) {
            this.status.lastSyncResult = "failed";
            const { message } = diagnoseNeo4jError(error, "Neo4J");
            this.addLog("error", `동기화 실패: ${message}`);
        } finally {
            this.syncInProgress = false;
            this.notifyStatusUpdate();
        }
    }

    // ── Firebase 리스너 시작 ───────────────────────────────────────
    private startFirebaseListeners(): void {
        this.addLog("info", "Firebase 실시간 리스너 시작 (objectTypes / linkTypes / propertyTypes)");

        const unsubObjects = onSnapshot(collection(db, "objectTypes"), (snap) => {
            this.cache.objects = snap.docs.map(d => ({ id: d.id, ...d.data() } as ObjectType));
            this.cache.dirty = true;
            this.agentSyncCycle();
        }, (err) => this.addLog("error", `objectTypes 구독 오류: ${err.message}`));

        const unsubLinks = onSnapshot(collection(db, "linkTypes"), (snap) => {
            this.cache.links = snap.docs.map(d => ({ id: d.id, ...d.data() } as LinkType));
            this.cache.dirty = true;
            this.agentSyncCycle();
        }, (err) => this.addLog("error", `linkTypes 구독 오류: ${err.message}`));

        const unsubProps = onSnapshot(collection(db, "propertyTypes"), (snap) => {
            this.cache.properties = snap.docs.map(d => ({ id: d.id, ...d.data() } as PropertyType));
            this.cache.dirty = true;
            this.agentSyncCycle();
        }, (err) => this.addLog("error", `propertyTypes 구독 오류: ${err.message}`));

        this.unsubscribers = [unsubObjects, unsubLinks, unsubProps];
        this.status.isRunning = true;
        this.notifyStatusUpdate();
    }

    // ── 서비스 시작 (강화된 에러 처리) ───────────────────────────
    async start(config: Neo4jConnectionConfig): Promise<{ success: boolean; message: string; hint?: string }> {
        this.addLog("info", `Neo4J 연결 시도: ${config.uri} (사용자: ${config.user})`);

        try {
            const neo4j = (await import("neo4j-driver")).default;

            if (this.driver) {
                try { await this.driver.close(); } catch (_) {}
                this.driver = null;
            }

            // 연결 타임아웃: 10초
            this.driver = neo4j.driver(
                config.uri,
                neo4j.auth.basic(config.user, config.pass),
                { connectionTimeout: 10000, maxConnectionPoolSize: 10 }
            );

            const info = await this.driver.getServerInfo();
            this.status.neo4jConnected = true;
            this.status.connectionDiagnostics = undefined;

            this.addLog("success",
                `Neo4J 연결 성공`,
                { address: info.address, agent: info.agent, protocol: info.protocolVersion }
            );

            this.stopFirebaseListeners();
            this.startFirebaseListeners();

            // 초기 전체 동기화
            this.cache.dirty = true;
            setTimeout(() => this.agentSyncCycle(), 500);

            return { success: true, message: `연결 성공: ${info.address}` };

        } catch (error: any) {
            const { message, hint } = diagnoseNeo4jError(error, config.uri);

            this.status.neo4jConnected = false;
            this.status.connectionDiagnostics = hint;
            if (this.driver) {
                try { await this.driver.close(); } catch (_) {}
                this.driver = null;
            }

            this.addLog("error", `Neo4J 연결 실패: ${message}`, {
                hint,
                errorCode: error?.code,
                uri: config.uri
            });

            return { success: false, message, hint };
        }
    }

    // ── 수동 전체 동기화 ──────────────────────────────────────────
    async manualSync(): Promise<{ success: boolean; message: string; stats?: any }> {
        if (!this.status.neo4jConnected) {
            return { success: false, message: "Neo4J가 연결되지 않았습니다. 먼저 연결하세요." };
        }
        this.addLog("info", "수동 동기화 요청");
        this.cache.dirty = true;
        try {
            await this.agentSyncCycle();
            return {
                success: this.status.lastSyncResult === "success",
                message: this.status.lastSyncResult === "success" ? "동기화 완료" : "동기화 실패",
                stats: {
                    objects: this.status.objectCount,
                    links: this.status.linkCount,
                    properties: this.status.propertyCount
                }
            };
        } catch (error: any) {
            return { success: false, message: error.message };
        }
    }

    // ── Cypher 직접 실행 ──────────────────────────────────────────
    async runCypher(cypher: string): Promise<{ success: boolean; message: string; stats?: any }> {
        try {
            const result = await this.executeTool("run_cypher", cypher);
            this.addLog("success", `Cypher 실행: ${result.stats?.queriesExecuted}개 쿼리`, result.stats);
            return { success: true, message: "쿼리 실행 완료", stats: result.stats };
        } catch (error: any) {
            const { message } = diagnoseNeo4jError(error, "");
            this.addLog("error", `Cypher 실행 오류: ${message}`);
            return { success: false, message };
        }
    }

    private stopFirebaseListeners(): void {
        this.unsubscribers.forEach(u => u());
        this.unsubscribers = [];
    }

    async stop(): Promise<void> {
        this.stopFirebaseListeners();
        if (this.driver) {
            try { await this.driver.close(); } catch (_) {}
            this.driver = null;
        }
        this.status.isRunning = false;
        this.status.neo4jConnected = false;
        this.addLog("info", "동기화 서비스 중지");
        this.notifyStatusUpdate();
    }

    getStatus(): SyncStatus { return { ...this.status }; }

    getCachedData() {
        return {
            objects: [...this.cache.objects],
            links: [...this.cache.links],
            properties: [...this.cache.properties]
        };
    }
}

export const syncService = new FirebaseNeo4jSyncService();
