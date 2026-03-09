"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Database, AlertTriangle, CheckCircle2, Search, RefreshCw, XCircle, TrendingUp } from "lucide-react"
import { DataCleansingDialog } from "@/components/data-cleansing-dialog"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface DataQualityMetric {
  category: string
  score: number
  status: "excellent" | "good" | "warning" | "critical"
  issues: number
}

interface DataIssue {
  id: string
  type: "duplicate" | "inconsistent" | "missing" | "invalid"
  entity: string
  description: string
  affectedRecords: number
  severity: "high" | "medium" | "low"
}

export function MDMDashboard() {
  const [selectedIssue, setSelectedIssue] = useState<DataIssue | null>(null)
  const [searchQuery, setSearchQuery] = useState("")

  const qualityMetrics: DataQualityMetric[] = [
    { category: "펀드 마스터", score: 94, status: "excellent", issues: 12 },
    { category: "회사 마스터", score: 87, status: "good", issues: 28 },
    { category: "프로젝트 마스터", score: 76, status: "warning", issues: 45 },
    { category: "트랜치 마스터", score: 92, status: "excellent", issues: 8 },
    { category: "약정 마스터", score: 68, status: "critical", issues: 67 },
  ]

  const dataIssues: DataIssue[] = [
    {
      id: "DQ001",
      type: "duplicate",
      entity: "프로젝트 마스터",
      description: "중복된 프로젝트 코드 발견 (PRJ-송도-001 / PRJ-송도-001A)",
      affectedRecords: 234,
      severity: "high",
    },
    {
      id: "DQ002",
      type: "inconsistent",
      entity: "회사 마스터",
      description: "회사 신용등급 정보 불일치 (내부평가 vs 외부평가)",
      affectedRecords: 45,
      severity: "medium",
    },
    {
      id: "DQ003",
      type: "missing",
      entity: "트랜치 마스터",
      description: "필수 항목 누락: 담보 정보 미입력",
      affectedRecords: 89,
      severity: "high",
    },
    {
      id: "DQ004",
      type: "invalid",
      entity: "펀드 마스터",
      description: "유효하지 않은 약정 만기일 형식",
      affectedRecords: 23,
      severity: "low",
    },
  ]

  const trendData = [
    { month: "9월", 품질점수: 72, 이슈수: 98 },
    { month: "10월", 품질점수: 76, 이슈수: 85 },
    { month: "11월", 품질점수: 81, 이슈수: 72 },
    { month: "12월", 품질점수: 85, 이슈수: 58 },
    { month: "1월", 품질점수: 84, 이슈수: 62 },
  ]

  const issueDistribution = [
    { name: "중복", value: 234, color: "#ef4444" },
    { name: "불일치", value: 45, color: "#f59e0b" },
    { name: "누락", value: 89, color: "#eab308" },
    { name: "유효하지않음", value: 23, color: "#84cc16" },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent":
        return "bg-green-500/20 border-green-500/50 text-green-400"
      case "good":
        return "bg-blue-500/20 border-blue-500/50 text-blue-400"
      case "warning":
        return "bg-yellow-500/20 border-yellow-500/50 text-yellow-400"
      case "critical":
        return "bg-red-500/20 border-red-500/50 text-red-400"
      default:
        return ""
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "duplicate":
        return <RefreshCw className="w-4 h-4" />
      case "inconsistent":
        return <AlertTriangle className="w-4 h-4" />
      case "missing":
        return <XCircle className="w-4 h-4" />
      case "invalid":
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "duplicate":
        return "중복"
      case "inconsistent":
        return "불일치"
      case "missing":
        return "누락"
      case "invalid":
        return "유효하지않음"
    }
  }

  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  const overallScore = Math.round(qualityMetrics.reduce((acc, m) => acc + m.score, 0) / qualityMetrics.length)

  return (
    <>
      <div className="space-y-6">
        {/* 헤더 & 전체 품질 점수 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold flex items-center gap-2">
              <Database className="w-6 h-6 text-purple-400" />
              투자자산 마스터 데이터 관리
            </h2>
            <p className="text-sm text-zinc-400 mt-1">대체투자 자산 데이터 품질 모니터링 및 정제</p>
          </div>
          <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/50 p-4 lg:w-64">
            <div className="text-center">
              <div className="text-sm text-zinc-300 mb-1">전체 데이터 품질 점수</div>
              <div className="text-4xl font-bold text-purple-300">{overallScore}</div>
              <Progress value={overallScore} className="mt-2 h-2" />
            </div>
          </Card>
        </div>

        {/* 카테고리별 품질 점수 */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <h3 className="text-lg font-semibold mb-4">카테고리별 데이터 품질</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {qualityMetrics.map((metric) => (
              <Card key={metric.category} className="bg-zinc-800/50 border-zinc-700 p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="text-sm font-semibold text-zinc-200">{metric.category}</div>
                    <Badge variant="outline" className={getStatusColor(metric.status)}>
                      {metric.score}
                    </Badge>
                  </div>
                  <Progress value={metric.score} className="h-2" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">이슈</span>
                    <span className="text-red-400 font-semibold">{metric.issues}건</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* 트렌드 & 분포 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 품질 트렌드 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              품질 개선 트렌드
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                <XAxis dataKey="month" stroke="#a1a1aa" />
                <YAxis stroke="#a1a1aa" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "6px",
                  }}
                />
                <Legend />
                <Bar dataKey="품질점수" fill="#8b5cf6" name="품질 점수" />
                <Bar dataKey="이슈수" fill="#ef4444" name="이슈 수" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* 이슈 분포 */}
          <Card className="bg-zinc-900/50 border-zinc-800 p-6">
            <h3 className="text-lg font-semibold mb-4">이슈 유형 분포</h3>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={issueDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {issueDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "6px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* 데이터 이슈 목록 */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">데이터 품질 이슈</h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="이슈 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-zinc-800 border-zinc-700 w-64"
                />
              </div>
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                자동 정제 실행
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {dataIssues.map((issue) => (
              <Card
                key={issue.id}
                className="bg-zinc-800/50 border-zinc-700 p-4 cursor-pointer hover:bg-zinc-800 transition-colors"
                onClick={() => setSelectedIssue(issue)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/50">
                        {getTypeIcon(issue.type)}
                        <span className="ml-1">{getTypeLabel(issue.type)}</span>
                      </Badge>
                      <Badge variant={getSeverityVariant(issue.severity)}>{issue.severity.toUpperCase()}</Badge>
                      <span className="text-xs text-zinc-400">{issue.id}</span>
                    </div>
                    <div className="font-semibold mb-1">{issue.description}</div>
                    <div className="text-sm text-zinc-400">
                      엔티티: {issue.entity} | 영향받은 레코드: {issue.affectedRecords}건
                    </div>
                  </div>
                  <Button size="sm" variant="outline" className="ml-4 bg-transparent">
                    정제
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </Card>

        {/* 거버넌스 룰 */}
        <Card className="bg-zinc-900/50 border-zinc-800 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            데이터 거버넌스 룰
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">중복 탐지</span>
                <Badge className="bg-green-500/20 text-green-400">활성</Badge>
              </div>
              <p className="text-xs text-zinc-400">동일한 프로젝트/펀드 코드 자동 탐지 및 병합 제안</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">데이터 검증</span>
                <Badge className="bg-green-500/20 text-green-400">활성</Badge>
              </div>
              <p className="text-xs text-zinc-400">필수 필드 검증 및 평가 기준 확인</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">표준화 룰</span>
                <Badge className="bg-green-500/20 text-green-400">활성</Badge>
              </div>
              <p className="text-xs text-zinc-400">명명 규칙 및 코드 체계 표준화</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Data Cleansing Dialog */}
      {selectedIssue && (
        <DataCleansingDialog
          open={!!selectedIssue}
          onOpenChange={(open) => !open && setSelectedIssue(null)}
          issue={selectedIssue}
        />
      )}
    </>
  )
}
