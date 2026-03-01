/**
 * [K-Palantir] Neo4J 서비스
 *
 * 정적 SPA (output: 'export') 환경에서 neo4j-driver를 브라우저에서 직접 사용합니다.
 * Neo4J Desktop (bolt://localhost:7687) 또는 Neo4J Aura (bolt+s://) 연결 지원.
 */

export interface Neo4jConfig {
    uri: string;
    user: string;
    pass: string;
    mode?: "api" | "direct"; // 하위 호환성 유지 (실제로는 direct 모드로 동작)
}

export interface Neo4jQueryResult {
    success: boolean;
    stats?: {
        queriesExecuted?: number;
        nodesCreated?: number;
        relationshipsCreated?: number;
    };
    message?: string;
    error?: string;
}

let driver: any = null;

export const Neo4jService = {
    // Neo4J 연결 초기화
    async connect(config: Neo4jConfig): Promise<boolean> {
        try {
            if (driver) {
                try { await driver.close(); } catch (_) {}
            }
            const neo4j = (await import("neo4j-driver")).default;
            driver = neo4j.driver(config.uri, neo4j.auth.basic(config.user, config.pass));
            await driver.getServerInfo();
            console.log("[Neo4jService] Connected successfully");
            return true;
        } catch (error: any) {
            console.error("[Neo4jService] Connection failed:", error);
            driver = null;
            throw error;
        }
    },

    // Cypher 쿼리 실행 (세미콜론 분리 지원)
    async runQuery(cypher: string): Promise<Neo4jQueryResult> {
        if (!driver) {
            throw new Error("Neo4J가 연결되지 않았습니다. 먼저 연결해 주세요.");
        }
        const session = driver.session();
        try {
            const queries = cypher
                .split(";")
                .map((q: string) => q.trim())
                .filter((q: string) => q.length > 0 && !q.startsWith("//"));

            let totalNodes = 0;
            let totalRels = 0;

            for (const q of queries) {
                const result = await session.run(q);
                const summary = result.summary.counters.updates();
                totalNodes += summary.nodesCreated || 0;
                totalRels += summary.relationshipsCreated || 0;
            }
            return {
                success: true,
                stats: {
                    queriesExecuted: queries.length,
                    nodesCreated: totalNodes,
                    relationshipsCreated: totalRels
                }
            };
        } catch (error: any) {
            console.error("[Neo4jService] Query error:", error);
            throw error;
        } finally {
            await session.close();
        }
    },

    // 연결 종료
    async disconnect(): Promise<void> {
        if (driver) {
            await driver.close();
            driver = null;
        }
    },

    // 현재 드라이버 인스턴스 (syncService와 공유용)
    getDriver() {
        return driver;
    },

    isConnected(): boolean {
        return !!driver;
    }
};
