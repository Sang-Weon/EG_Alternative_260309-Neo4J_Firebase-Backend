"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Plus, Sparkles, Database, LinkIcon, Tag, Network, Terminal,
  Share2, Loader2, Zap, Activity, CheckCircle2, AlertCircle,
  RefreshCw, Wifi, WifiOff, Clock, BarChart3
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { AIOntologyMappingDialog } from "./ai-ontology-mapping-dialog"
import { OntologyWizardDialog } from "./ontology-wizard-dialog"
import { OntologyService, ObjectType, PropertyType, LinkType } from "@/lib/ontology-service"
import { syncService, SyncStatus, SyncLog } from "@/lib/firebase-neo4j-sync-service"

// ── 카테고리별 색상 매핑 ─────────────────────────────────────────
const categoryColors: Record<string, { bg: string; text: string; border: string; label: string }> = {
  organization: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", label: "조직" },
  process:       { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30", label: "공정" },
  equipment:     { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30", label: "설비" },
  material:      { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30", label: "자재" },
  product:       { bg: "bg-green-500/10", text: "text-green-400", border: "border-green-500/30", label: "제품" },
  supply_chain:  { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30", label: "공급망" },
  quality:       { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30", label: "품질" },
  finance:       { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", label: "재무" },
}

function getCategoryStyle(category?: string) {
  return categoryColors[category || ""] || { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30", label: "기타" }
}

function LogIcon({ level }: { level: SyncLog["level"] }) {
  if (level === "success") return <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />
  if (level === "error")   return <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
  if (level === "warning") return <AlertCircle className="w-3 h-3 text-yellow-400 flex-shrink-0" />
  return <Activity className="w-3 h-3 text-blue-400 flex-shrink-0" />
}

export function OntologyConfigManager() {
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([])
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([])
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAIMappingDialog, setShowAIMappingDialog] = useState(false)
  const [showWizardDialog, setShowWizardDialog] = useState(false)
  const [cypherCode, setCypherCode] = useState("")

  const [neo4jConn, setNeo4jConn] = useState({ uri: "bolt://localhost:7687", user: "neo4j", pass: "" })
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getStatus())

  const { toast } = useToast()

  useEffect(() => {
    setIsLoading(true)
    const unsubObjects = OntologyService.subscribeToObjectTypes((data) => {
      setObjectTypes(data)
      setIsLoading(false)
    })
    const unsubProps = OntologyService.subscribeToPropertyTypes(setPropertyTypes)
    const unsubLinks = OntologyService.subscribeToLinkTypes(setLinkTypes)
    return () => { unsubObjects(); unsubProps(); unsubLinks() }
  }, [])

  useEffect(() => {
    if (objectTypes.length > 0 || linkTypes.length > 0) {
      setCypherCode(OntologyService.generateCypher(objectTypes, linkTypes))
    }
  }, [objectTypes, linkTypes])

  useEffect(() => {
    const unsub = syncService.subscribeToStatus((status) => {
      setSyncStatus(status)
      if (status.neo4jConnected) setIsConnected(true)
    })
    return unsub
  }, [])

  const handleNeo4jConnect = async () => {
    setIsConnecting(true)
    try {
      // 항상 syncService를 통해 연결 (Firebase 실시간 동기화 포함)
      const result = await syncService.start({
        uri: neo4jConn.uri,
        user: neo4jConn.user,
        pass: neo4jConn.pass
      })
      if (result.success) {
        setIsConnected(true)
        toast({ title: "Neo4J 연결 + 자동 동기화 시작", description: "Firebase 변경사항이 Neo4J에 실시간 반영됩니다." })
      } else {
        throw new Error(result.message)
      }
    } catch (e: any) {
      toast({ title: "Neo4j 연결 실패", description: e.message, variant: "destructive" })
    } finally {
      setIsConnecting(false)
    }
  }

  const handleRunCypher = async () => {
    if (!isConnected) {
      toast({ title: "연결 필요", description: "먼저 Neo4j에 연결해 주세요.", variant: "destructive" })
      return
    }
    setIsExecuting(true)
    try {
      const result = await syncService.runCypher(cypherCode)
      toast({
        title: "Neo4j 반영 완료",
        description: result.success
          ? `쿼리 ${result.stats?.queriesExecuted || 0}개 실행 | 노드 ${result.stats?.nodesCreated || 0}개 생성`
          : result.message
      })
    } catch (e: any) {
      toast({ title: "실행 오류", description: e.message, variant: "destructive" })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleFullSync = async () => {
    if (!isConnected) {
      toast({ title: "연결 필요", description: "먼저 Neo4j에 연결해 주세요.", variant: "destructive" })
      return
    }
    setIsSyncing(true)
    try {
      const result = await syncService.manualSync()
      if (result.success) {
        toast({
          title: "전체 동기화 완료",
          description: `Objects(${result.stats?.objects}) Links(${result.stats?.links}) Props(${result.stats?.properties}) → Neo4J 반영`
        })
      } else {
        throw new Error(result.message)
      }
    } catch (e: any) {
      toast({ title: "동기화 실패", description: e.message, variant: "destructive" })
    } finally {
      setIsSyncing(false)
    }
  }

  const handleAIAutoMapping = () => setShowAIMappingDialog(true)
  const handleWizardOpen = () => setShowWizardDialog(true)

  const handleMappingComplete = () => {
    toast({
      title: "AI 온톨로지 매핑 완료",
      description: "드림텍 모듈 비즈니스 데이터가 Firebase에 구축되었습니다."
    })
    setCypherCode(OntologyService.generateCypher(objectTypes, linkTypes))
  }

  const categoryCount = objectTypes.reduce((acc, obj) => {
    const cat = obj.category || "기타"
    acc[cat] = (acc[cat] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800 p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/5 blur-[100px] -z-1" />

        <div className="flex items-center justify-between mb-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Database className="w-5 h-5 text-purple-400" />
              온톨로지 구성 및 그래프 DB 관리
              <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px]">
                Firebase + Neo4J
              </Badge>
            </h2>
            <p className="text-sm text-zinc-400">
              드림텍 비즈니스 객체·관계·속성을 정의하고 Neo4j 그래프 엔진과 실시간 동기화합니다
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setCypherCode(OntologyService.generateCypher(objectTypes, linkTypes))}
              className="border-green-500/50 text-green-400 hover:bg-green-500/10"
            >
              <Network className="w-4 h-4 mr-2" />
              Cypher 갱신
            </Button>
            <Button
              variant="outline"
              onClick={handleWizardOpen}
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
            >
              <Zap className="w-4 h-4 mr-2" />
              위자드로 설정
            </Button>
            <Button
              onClick={handleAIAutoMapping}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/20"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI 자동 매핑
            </Button>
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "Objects", value: objectTypes.length, icon: Database, color: "text-purple-400" },
            { label: "Links", value: linkTypes.length, icon: LinkIcon, color: "text-green-400" },
            { label: "Properties", value: propertyTypes.length, icon: Tag, color: "text-orange-400" },
            { label: "Neo4J 동기화", value: syncStatus.totalSyncs, icon: RefreshCw, color: "text-blue-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="bg-zinc-800/50 border-zinc-700/50 p-3 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-zinc-500">{label}</div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="objects" className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-zinc-800/50 p-1 mb-4">
            <TabsTrigger value="objects">객체 ({objectTypes.length})</TabsTrigger>
            <TabsTrigger value="properties">속성 ({propertyTypes.length})</TabsTrigger>
            <TabsTrigger value="links">관계 ({linkTypes.length})</TabsTrigger>
            <TabsTrigger value="neo4j" className="text-green-400">Neo4J 연동</TabsTrigger>
            <TabsTrigger value="sync" className="text-blue-400">동기화 로그</TabsTrigger>
          </TabsList>

          {/* Objects 탭 */}
          <TabsContent value="objects" className="space-y-4">
            <div className="flex flex-wrap gap-2 pb-2 border-b border-zinc-800">
              {Object.entries(categoryCount).map(([cat, count]) => {
                const style = getCategoryStyle(cat)
                return (
                  <Badge key={cat} className={`${style.bg} ${style.text} ${style.border} text-[10px]`}>
                    {style.label} ({count})
                  </Badge>
                )
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <p className="text-sm text-zinc-400">{objectTypes.length}개의 객체 정의됨</p>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-zinc-700 hover:bg-zinc-800">
                    <Plus className="w-4 h-4 mr-1" />
                    객체 추가
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-900 border-zinc-800">
                  <DialogHeader>
                    <DialogTitle>새 객체 정의</DialogTitle>
                    <DialogDescription>수동으로 생성하거나 AI 매핑 결과를 수정합니다</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>객체 식별명</Label>
                      <Input placeholder="예: Quality_Issue" className="bg-zinc-800 border-zinc-700" />
                    </div>
                    <Button className="w-full bg-blue-600">저장하기</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[400px] pr-4">
              {objectTypes.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-zinc-800 rounded-xl">
                  <Database className="w-8 h-8 text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-sm">AI 자동 매핑을 실행하세요.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {objectTypes.map((obj) => {
                    const catStyle = getCategoryStyle(obj.category)
                    return (
                      <Card key={obj.id} className="bg-zinc-800/30 border-zinc-700/50 p-4 hover:border-purple-500/50 transition-colors group">
                        <div className="flex items-start justify-between mb-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-sm group-hover:text-purple-300 transition-colors">{obj.name}</h3>
                              <Badge className={`${catStyle.bg} ${catStyle.text} ${catStyle.border} text-[9px]`}>
                                {catStyle.label}
                              </Badge>
                              {obj.metadata?.neo4j_label && (
                                <Badge className="bg-zinc-900 text-zinc-500 border-zinc-800 text-[9px] font-mono">
                                  :{obj.metadata.neo4j_label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{obj.description}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {obj.properties?.slice(0, 4).map(p => (
                            <Badge key={p.id} variant="secondary" className="bg-zinc-900/80 text-zinc-400 border-zinc-800 text-[9px] font-mono">
                              {p.name}
                            </Badge>
                          ))}
                          {(obj.properties?.length || 0) > 4 && (
                            <Badge variant="secondary" className="bg-zinc-900/80 text-zinc-600 border-zinc-800 text-[9px]">
                              +{(obj.properties?.length || 0) - 4}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Properties 탭 */}
          <TabsContent value="properties">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {propertyTypes.map((prop) => (
                  <Card key={prop.id} className="bg-zinc-800/30 border-zinc-700 p-3 flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg flex-shrink-0">
                      <Tag className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{prop.name}</h4>
                        <Badge className="bg-zinc-900 border-zinc-700 text-zinc-400 font-mono uppercase text-[9px]">
                          {prop.dataType}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 truncate">{prop.description}</p>
                      {prop.usedBy?.length > 0 && (
                        <p className="text-[10px] text-zinc-600 mt-1">
                          사용처: {prop.usedBy.slice(0, 2).join(", ")}{prop.usedBy.length > 2 ? ` +${prop.usedBy.length - 2}` : ""}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Links 탭 */}
          <TabsContent value="links">
            <ScrollArea className="h-[400px]">
              <div className="grid grid-cols-1 gap-2">
                {linkTypes.map((link) => (
                  <Card key={link.id} className="bg-zinc-800/30 border-zinc-700 p-3 flex items-center gap-4">
                    <div className="p-2 bg-green-500/10 rounded-lg flex-shrink-0">
                      <LinkIcon className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 flex items-center gap-3 text-sm overflow-hidden">
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-[10px] whitespace-nowrap flex-shrink-0">{link.fromType}</Badge>
                      <div className="flex-1 flex flex-col items-center min-w-0">
                        <span className="text-[10px] text-zinc-500 font-mono mb-1">{link.name}</span>
                        <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-zinc-600 to-transparent relative">
                          <div className="absolute top-1/2 right-0 -translate-y-1/2 border-y-4 border-l-4 border-y-transparent border-l-zinc-600" />
                        </div>
                      </div>
                      <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 text-[10px] whitespace-nowrap flex-shrink-0">{link.toType}</Badge>
                    </div>
                    {link.bidirectional && (
                      <Badge className="bg-zinc-800 text-zinc-500 text-[9px] flex-shrink-0">양방향</Badge>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Neo4J 연동 탭 */}
          <TabsContent value="neo4j" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card className="bg-zinc-900 border-zinc-800 p-5 space-y-4">
                <h3 className="font-bold flex items-center gap-2 text-sm">
                  <Share2 className="w-4 h-4 text-blue-400" />
                  Neo4J 연결 설정
                </h3>

                <div className="bg-zinc-950/50 rounded-lg p-2.5 text-[10px] text-zinc-500 border border-zinc-800">
                  neo4j-driver (WebSocket bolt) 방식으로 직접 연결합니다.<br />
                  Firebase 변경 감지 시 Neo4J에 자동 동기화됩니다.
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-500">Connection URI</Label>
                    <Input
                      value={neo4jConn.uri}
                      onChange={(e) => setNeo4jConn(prev => ({ ...prev, uri: e.target.value }))}
                      className="bg-black border-zinc-800 text-xs font-mono"
                      placeholder="bolt://localhost:7687"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Username</Label>
                      <Input
                        value={neo4jConn.user}
                        onChange={(e) => setNeo4jConn(prev => ({ ...prev, user: e.target.value }))}
                        className="bg-black border-zinc-800 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-zinc-500">Password</Label>
                      <Input
                        type="password"
                        value={neo4jConn.pass}
                        onChange={(e) => setNeo4jConn(prev => ({ ...prev, pass: e.target.value }))}
                        className="bg-black border-zinc-800 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  className={`w-full text-sm ${isConnected ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"}`}
                  onClick={handleNeo4jConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                    isConnected ? <Wifi className="w-4 h-4 mr-2" /> : <WifiOff className="w-4 h-4 mr-2" />}
                  {isConnecting ? "연결 중..." : isConnected ? "연결됨" : "Neo4J 연결"}
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-sm border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  onClick={handleFullSync}
                  disabled={!isConnected || isSyncing}
                >
                  {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                  Firebase → Neo4J 전체 동기화
                </Button>

                {syncStatus.lastSyncAt && (
                  <div className="bg-zinc-950 rounded-lg p-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-zinc-400">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> 마지막 동기화</span>
                      <span className="text-zinc-500">{syncStatus.lastSyncAt.toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">상태</span>
                      <Badge className={`text-[9px] ${
                        syncStatus.lastSyncResult === "success" ? "bg-green-500/20 text-green-400" :
                        syncStatus.lastSyncResult === "failed"  ? "bg-red-500/20 text-red-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {syncStatus.lastSyncResult === "success" ? "성공" :
                          syncStatus.lastSyncResult === "failed" ? "실패" : "대기"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-zinc-500">
                      <span>총 동기화 횟수</span>
                      <span>{syncStatus.totalSyncs}회</span>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="lg:col-span-2 bg-black border-zinc-800 p-5 space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Terminal className="w-5 h-5 text-green-400" />
                    <div>
                      <h3 className="font-mono text-green-400 font-bold text-sm">Cypher Workflow</h3>
                      <p className="text-[10px] text-zinc-500">Firebase 온톨로지 → Neo4J Cypher 자동 생성</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white text-xs"
                    onClick={handleRunCypher}
                    disabled={isExecuting || !isConnected}
                  >
                    {isExecuting ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Zap className="w-3 h-3 mr-1.5" />}
                    Cypher 실행
                  </Button>
                </div>
                <div className="bg-zinc-950/80 rounded-lg border border-zinc-800 p-4">
                  <ScrollArea className="h-[300px]">
                    <pre className="text-emerald-500/90 font-mono text-[10px] leading-5 whitespace-pre-wrap">
                      {cypherCode || "// AI 자동 매핑 후 Cypher 코드가 생성됩니다."}
                    </pre>
                  </ScrollArea>
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-600 italic">
                  <span className="flex items-center gap-1">
                    {isConnected
                      ? <><Wifi className="w-3 h-3 text-green-500" /> READY TO SYNC</>
                      : <><WifiOff className="w-3 h-3 text-red-500" /> DISCONNECTED</>
                    }
                  </span>
                  <span>Neo4J Desktop 또는 Aura 인스턴스가 실행 중이어야 합니다</span>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* 동기화 로그 탭 */}
          <TabsContent value="sync" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold flex items-center gap-2 text-sm">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Firebase ↔ Neo4J 실시간 동기화 Agent
                </h3>
                <Badge className={`text-[10px] ${syncStatus.isRunning ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                  {syncStatus.isRunning ? "실행 중" : "대기"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <BarChart3 className="w-3.5 h-3.5" />
                Objects: {syncStatus.objectCount} | Links: {syncStatus.linkCount} | Props: {syncStatus.propertyCount}
              </div>
            </div>

            <ScrollArea className="h-[380px]">
              <div className="space-y-1.5">
                {syncStatus.logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-zinc-800 rounded-xl">
                    <Activity className="w-8 h-8 text-zinc-700 mb-2" />
                    <p className="text-zinc-500 text-sm">Neo4J에 연결하면 동기화 로그가 표시됩니다</p>
                  </div>
                ) : (
                  syncStatus.logs.map((log, idx) => (
                    <div key={idx} className={`flex items-start gap-2 p-2 rounded-lg text-xs ${
                      log.level === "success" ? "bg-green-500/5 border border-green-500/10" :
                      log.level === "error"   ? "bg-red-500/5 border border-red-500/10" :
                      log.level === "warning" ? "bg-yellow-500/5 border border-yellow-500/10" :
                      "bg-zinc-900/50 border border-zinc-800/50"
                    }`}>
                      <LogIcon level={log.level} />
                      <div className="flex-1 min-w-0">
                        <span className={`${
                          log.level === "success" ? "text-green-300" :
                          log.level === "error"   ? "text-red-300" :
                          log.level === "warning" ? "text-yellow-300" : "text-zinc-400"
                        }`}>{log.message}</span>
                        {log.details && (
                          <pre className="text-zinc-600 text-[9px] mt-0.5 overflow-hidden truncate">
                            {JSON.stringify(log.details).slice(0, 80)}
                          </pre>
                        )}
                      </div>
                      <span className="text-zinc-700 text-[9px] flex-shrink-0">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </Card>

      <AIOntologyMappingDialog
        open={showAIMappingDialog}
        onOpenChange={setShowAIMappingDialog}
        onComplete={handleMappingComplete}
      />

      <OntologyWizardDialog
        open={showWizardDialog}
        onOpenChange={setShowWizardDialog}
        onComplete={() => {
          setShowWizardDialog(false)
          toast({
            title: "위자드 설정 완료",
            description: "온톨로지 객체·관계·속성이 Firebase에 저장되었습니다."
          })
          setCypherCode(OntologyService.generateCypher(objectTypes, linkTypes))
        }}
      />
    </div>
  )
}
