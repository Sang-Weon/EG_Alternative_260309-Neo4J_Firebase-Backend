"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Network, Eye, ZoomIn, ZoomOut, Loader2, Database, 
  ChevronRight, Tag, LinkIcon, Maximize2, LayoutGrid
} from "lucide-react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { AIReasoningDialog } from "./ai-reasoning-dialog"
import { OntologyService, ObjectType, LinkType, PropertyType } from "@/lib/ontology-service"

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════
interface GraphNode {
  id: string
  type: "object" | "property"
  name: string
  displayName: string
  x: number
  y: number
  category?: string
  description?: string
  parentObjectId?: string // 속성의 경우 상위 객체 ID
  dataType?: string // 속성의 경우 데이터 타입
  properties?: { id: string; name: string; type: string }[]
}

interface GraphLink {
  id: string
  from: string
  to: string
  label: string
  type: "object-object" | "object-property"
  description?: string
}

// ═══════════════════════════════════════════════════════════════════════════════
// 카테고리별 색상 및 스타일
// ═══════════════════════════════════════════════════════════════════════════════
const categoryStyles: Record<string, { fill: string; stroke: string; text: string; label: string }> = {
  company:      { fill: "#3b82f6", stroke: "#60a5fa", text: "text-blue-400", label: "회사" },
  project:      { fill: "#10b981", stroke: "#34d399", text: "text-emerald-400", label: "프로젝트" },
  tranche:      { fill: "#f59e0b", stroke: "#fbbf24", text: "text-amber-400", label: "트랜치" },
  fund:         { fill: "#8b5cf6", stroke: "#a78bfa", text: "text-purple-400", label: "펀드" },
  covenant:     { fill: "#ef4444", stroke: "#f87171", text: "text-rose-400", label: "약정" },
  collateral:   { fill: "#06b6d4", stroke: "#22d3ee", text: "text-cyan-400", label: "담보" },
  credit_event: { fill: "#ec4899", stroke: "#f472b6", text: "text-pink-400", label: "신용이벤트" },
  investor:     { fill: "#6366f1", stroke: "#818cf8", text: "text-indigo-400", label: "투자자" },
  property:     { fill: "#71717a", stroke: "#a1a1aa", text: "text-zinc-400", label: "속성" },
}

function getCategoryStyle(category?: string) {
  return categoryStyles[category || ""] || categoryStyles.property
}

// ═══════════════════════════════════════════════════════════════════════════════
// 레이아웃 계산 - 계층적 그래프 배치 (객체 중심, 속성 연결)
// ═══════════════════════════════════════════════════════════════════════════════
function calculateHierarchicalLayout(
  objects: ObjectType[], 
  links: LinkType[],
  showProperties: boolean
): { nodes: GraphNode[]; edges: GraphLink[] } {
  const nodes: GraphNode[] = []
  const edges: GraphLink[] = []
  
  // 카테고리별 레벨 정의 (수직 배치)
  const categoryLevels: Record<string, number> = {
    investor: 0,
    fund: 1,
    company: 2,
    project: 3,
    tranche: 4,
    collateral: 5,
    covenant: 5,
    credit_event: 6,
  }
  
  // 카테고리별 객체 그룹화
  const categoryGroups: Record<string, ObjectType[]> = {}
  objects.forEach(obj => {
    const cat = obj.category || "other"
    if (!categoryGroups[cat]) categoryGroups[cat] = []
    categoryGroups[cat].push(obj)
  })
  
  // 객체 노드 생성 (계층적 배치)
  const levelY = 120
  const nodeSpacingX = 200
  const propertyOffsetY = 50
  const propertySpacingX = 100
  
  Object.entries(categoryGroups).forEach(([category, objs]) => {
    const level = categoryLevels[category] ?? 3
    const startX = 100 + (level % 2 === 0 ? 50 : 0) // 지그재그 오프셋
    
    objs.forEach((obj, idx) => {
      const x = startX + idx * nodeSpacingX
      const y = level * levelY + 80
      
      // 객체 노드
      nodes.push({
        id: obj.name,
        type: "object",
        name: obj.name,
        displayName: obj.name.replace(/_/g, " "),
        x,
        y,
        category: obj.category,
        description: obj.description,
        properties: obj.properties
      })
      
      // 속성 노드 (showProperties일 때만)
      if (showProperties && obj.properties && obj.properties.length > 0) {
        const propCount = Math.min(obj.properties.length, 5) // 최대 5개 표시
        const propStartX = x - ((propCount - 1) * propertySpacingX) / 2
        
        obj.properties.slice(0, 5).forEach((prop, propIdx) => {
          const propId = `${obj.name}__${prop.name}`
          const propX = propStartX + propIdx * propertySpacingX
          const propY = y + propertyOffsetY + 40
          
          nodes.push({
            id: propId,
            type: "property",
            name: prop.name,
            displayName: prop.name,
            x: propX,
            y: propY,
            parentObjectId: obj.name,
            dataType: prop.type,
            category: "property"
          })
          
          // 객체-속성 연결
          edges.push({
            id: `link_${obj.name}_${prop.name}`,
            from: obj.name,
            to: propId,
            label: "has",
            type: "object-property",
            description: `${obj.name}의 속성 ${prop.name}`
          })
        })
      }
    })
  })
  
  // 객체 간 관계 (Links) 추가
  links.forEach((link, idx) => {
    const fromNode = nodes.find(n => n.id === link.fromType && n.type === "object")
    const toNode = nodes.find(n => n.id === link.toType && n.type === "object")
    
    if (fromNode && toNode) {
      edges.push({
        id: `rel_${idx}_${link.name}`,
        from: link.fromType,
        to: link.toType,
        label: link.name,
        type: "object-object",
        description: link.description
      })
    }
  })
  
  return { nodes, edges }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════
export function OntologyGraphViewer() {
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([])
  const [linkTypes, setLinkTypes] = useState<LinkType[]>([])
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [showAIReasoning, setShowAIReasoning] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(0.65)
  const [showProperties, setShowProperties] = useState(false)
  const [viewMode, setViewMode] = useState<"graph" | "hierarchy">("graph")
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  
  useEffect(() => {
    setIsLoading(true)
    const unsubObjects = OntologyService.subscribeToObjectTypes((data) => {
      setObjectTypes(data)
      setIsLoading(false)
    })
    const unsubLinks = OntologyService.subscribeToLinkTypes(setLinkTypes)
    const unsubProps = OntologyService.subscribeToPropertyTypes(setPropertyTypes)
    
    return () => {
      unsubObjects()
      unsubLinks()
      unsubProps()
    }
  }, [])
  
  // 그래프 데이터 계산
  const { nodes, edges } = useMemo(() => {
    return calculateHierarchicalLayout(objectTypes, linkTypes, showProperties)
  }, [objectTypes, linkTypes, showProperties])
  
  const selectedNode = nodes.find(n => n.id === selectedNodeId)
  
  // 선택된 노드와 연결된 엣지 하이라이트
  const connectedEdges = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    return new Set(
      edges
        .filter(e => e.from === selectedNodeId || e.to === selectedNodeId)
        .map(e => e.id)
    )
  }, [selectedNodeId, edges])
  
  const connectedNodes = useMemo(() => {
    if (!selectedNodeId) return new Set<string>()
    const connected = new Set<string>([selectedNodeId])
    edges.forEach(e => {
      if (e.from === selectedNodeId) connected.add(e.to)
      if (e.to === selectedNodeId) connected.add(e.from)
    })
    return connected
  }, [selectedNodeId, edges])

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 blur-[120px] -z-1" />
        
        {/* 헤더 */}
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Network className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">이지자산평가 온톨로지 그래프</h2>
                <p className="text-xs text-zinc-500">객체-속성-관계 통합 지식 그래프 (Firebase 실시간 동기화)</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              <Badge variant="outline" className="text-zinc-400 border-zinc-700">
                {objectTypes.length} Objects | {linkTypes.length} Links | {propertyTypes.length} Props
              </Badge>
              <Button size="sm" variant="outline" className="border-zinc-700 bg-zinc-800/50" onClick={() => setShowAIReasoning(true)}>
                <Eye className="w-4 h-4 mr-1" />
                AI 추론
              </Button>
            </div>
          </div>
        </div>
        
        {/* 컨트롤 바 */}
        <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between gap-4 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            {/* 줌 컨트롤 */}
            <div className="flex items-center gap-1 bg-zinc-800/50 rounded-lg p-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoomLevel(prev => Math.max(0.3, prev - 0.1))}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-xs font-mono text-zinc-500 w-12 text-center">{Math.round(zoomLevel * 100)}%</span>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setZoomLevel(prev => Math.min(1.5, prev + 0.1))}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setZoomLevel(0.65); setPanOffset({ x: 0, y: 0 }) }}>
                <Maximize2 className="w-4 h-4" />
              </Button>
            </div>
            
            {/* 속성 표시 토글 */}
            <Button 
              size="sm" 
              variant={showProperties ? "default" : "outline"}
              className={showProperties ? "bg-purple-600 hover:bg-purple-700" : "border-zinc-700"}
              onClick={() => setShowProperties(!showProperties)}
            >
              <Tag className="w-4 h-4 mr-1" />
              속성 표시
            </Button>
          </div>
          
          {/* 카테고리 범례 */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(categoryStyles).filter(([k]) => k !== "property").map(([key, style]) => (
              <div key={key} className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: style.fill }} />
                {style.label}
              </div>
            ))}
          </div>
        </div>
        
        {/* 그래프 영역 */}
        <div className="relative bg-zinc-950/50 h-[550px] overflow-hidden">
          {nodes.length === 0 && !isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-3">
              <Database className="w-12 h-12 text-zinc-800" />
              <p className="text-zinc-500 text-sm">온톨로지 데이터가 없습니다. AI 자동 매핑을 실행해 주세요.</p>
            </div>
          )}
          
          <svg 
            className="w-full h-full cursor-grab active:cursor-grabbing"
            style={{
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: "center",
              transition: "transform 0.2s ease-out"
            }}
          >
            <defs>
              {/* 화살표 마커 - 객체간 관계용 */}
              <marker id="arrow-obj" markerWidth="10" markerHeight="10" refX="30" refY="5" orient="auto">
                <path d="M0,0 L0,10 L10,5 Z" fill="#3f3f46" />
              </marker>
              {/* 화살표 마커 - 속성 연결용 */}
              <marker id="arrow-prop" markerWidth="8" markerHeight="8" refX="15" refY="4" orient="auto">
                <path d="M0,0 L0,8 L8,4 Z" fill="#52525b" />
              </marker>
              {/* 글로우 효과 */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glow-strong">
                <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* 엣지 (관계선) */}
            {edges.map((edge) => {
              const fromNode = nodes.find(n => n.id === edge.from)
              const toNode = nodes.find(n => n.id === edge.to)
              if (!fromNode || !toNode) return null
              
              const isHighlighted = connectedEdges.has(edge.id)
              const isObjectLink = edge.type === "object-object"
              
              // 곡선 경로 계산 (베지어 곡선)
              const dx = toNode.x - fromNode.x
              const dy = toNode.y - fromNode.y
              const cx = (fromNode.x + toNode.x) / 2
              const cy = (fromNode.y + toNode.y) / 2 - (isObjectLink ? Math.abs(dx) * 0.15 : 0)
              
              return (
                <g key={edge.id} className="transition-opacity duration-200" style={{ opacity: selectedNodeId && !isHighlighted ? 0.2 : 1 }}>
                  {isObjectLink ? (
                    <>
                      <path
                        d={`M ${fromNode.x} ${fromNode.y} Q ${cx} ${cy} ${toNode.x} ${toNode.y}`}
                        fill="none"
                        stroke={isHighlighted ? "#60a5fa" : "#3f3f46"}
                        strokeWidth={isHighlighted ? 3 : 2}
                        markerEnd="url(#arrow-obj)"
                        className="transition-all duration-200"
                      />
                      <text
                        x={cx}
                        y={cy - 8}
                        fill={isHighlighted ? "#93c5fd" : "#71717a"}
                        fontSize="9"
                        textAnchor="middle"
                        className="font-mono pointer-events-none"
                      >
                        {edge.label}
                      </text>
                    </>
                  ) : (
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isHighlighted ? "#a78bfa" : "#52525b"}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeDasharray={isObjectLink ? "0" : "4,2"}
                      markerEnd="url(#arrow-prop)"
                      className="transition-all duration-200"
                    />
                  )}
                </g>
              )
            })}
            
            {/* 노드 */}
            {nodes.map((node) => {
              const style = getCategoryStyle(node.category)
              const isSelected = selectedNodeId === node.id
              const isConnected = connectedNodes.has(node.id)
              const isObject = node.type === "object"
              const nodeRadius = isObject ? 28 : 16
              
              return (
                <g 
                  key={node.id} 
                  className="cursor-pointer transition-all duration-200"
                  style={{ opacity: selectedNodeId && !isConnected ? 0.3 : 1 }}
                  onClick={() => setSelectedNodeId(isSelected ? null : node.id)}
                >
                  {/* 노드 원 */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={nodeRadius}
                    fill={style.fill}
                    stroke={isSelected ? "#fff" : style.stroke}
                    strokeWidth={isSelected ? 3 : 1.5}
                    filter={isSelected ? "url(#glow-strong)" : isConnected && selectedNodeId ? "url(#glow)" : ""}
                    className="transition-all duration-200"
                  />
                  
                  {/* 노드 라벨 */}
                  {isObject ? (
                    <text
                      x={node.x}
                      y={node.y + nodeRadius + 16}
                      fill="white"
                      fontSize="11"
                      fontWeight="600"
                      textAnchor="middle"
                      className="pointer-events-none"
                    >
                      {node.displayName.split(" ").slice(0, 2).join(" ")}
                    </text>
                  ) : (
                    <text
                      x={node.x}
                      y={node.y + nodeRadius + 12}
                      fill="#a1a1aa"
                      fontSize="9"
                      textAnchor="middle"
                      className="pointer-events-none font-mono"
                    >
                      {node.displayName}
                    </text>
                  )}
                  
                  {/* 속성 노드에 데이터 타입 표시 */}
                  {!isObject && node.dataType && (
                    <text
                      x={node.x}
                      y={node.y + 4}
                      fill="white"
                      fontSize="8"
                      textAnchor="middle"
                      className="pointer-events-none font-mono uppercase"
                    >
                      {node.dataType.slice(0, 3)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>
        
        {/* 선택된 노드 상세 패널 */}
        {selectedNode && (
          <div className="p-6 border-t border-zinc-800 animate-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-start gap-6">
              {/* 노드 정보 */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: getCategoryStyle(selectedNode.category).fill }}
                  />
                  <h3 className="font-bold text-lg">{selectedNode.displayName}</h3>
                  <Badge variant="outline" className={`${getCategoryStyle(selectedNode.category).text} border-current text-[10px]`}>
                    {getCategoryStyle(selectedNode.category).label}
                  </Badge>
                  {selectedNode.type === "property" && selectedNode.dataType && (
                    <Badge className="bg-zinc-800 text-zinc-400 font-mono text-[10px]">
                      {selectedNode.dataType}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mb-4">{selectedNode.description}</p>
                
                {/* 연결된 관계 */}
                <div className="space-y-2">
                  <h4 className="text-xs text-zinc-500 font-semibold flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    연결된 관계
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {edges
                      .filter(e => e.from === selectedNode.id || e.to === selectedNode.id)
                      .slice(0, 8)
                      .map(edge => {
                        const otherNodeId = edge.from === selectedNode.id ? edge.to : edge.from
                        const otherNode = nodes.find(n => n.id === otherNodeId)
                        const direction = edge.from === selectedNode.id ? "→" : "←"
                        return (
                          <Badge 
                            key={edge.id} 
                            variant="outline" 
                            className="text-[10px] border-zinc-700 cursor-pointer hover:bg-zinc-800"
                            onClick={() => setSelectedNodeId(otherNodeId)}
                          >
                            {direction} {edge.label} {direction} {otherNode?.displayName?.slice(0, 15)}
                          </Badge>
                        )
                      })}
                  </div>
                </div>
              </div>
              
              {/* 속성 목록 (객체 노드인 경우) */}
              {selectedNode.type === "object" && selectedNode.properties && selectedNode.properties.length > 0 && (
                <div className="w-64 bg-zinc-800/30 rounded-lg p-4">
                  <h4 className="text-xs text-zinc-500 font-semibold mb-3 flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    속성 ({selectedNode.properties.length})
                  </h4>
                  <ScrollArea className="h-32">
                    <div className="space-y-1.5">
                      {selectedNode.properties.map(prop => (
                        <div key={prop.id} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 font-mono">{prop.name}</span>
                          <Badge className="bg-zinc-900 text-zinc-500 font-mono text-[9px]">
                            {prop.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
            
            {/* 액션 버튼 */}
            <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-[11px]">
                가치평가 분석
              </Button>
              <Button size="sm" variant="outline" className="border-zinc-700 text-[11px]">
                연관 경로 탐색
              </Button>
              <Button size="sm" variant="outline" className="border-zinc-700 text-[11px]">
                Neo4j Cypher 조회
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      <AIReasoningDialog open={showAIReasoning} onOpenChange={setShowAIReasoning} />
    </>
  )
}
