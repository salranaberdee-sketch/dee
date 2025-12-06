<template>
  <div class="progress-chart">
    <!-- Header -->
    <div class="chart-header">
      <div class="chart-title">
        <span class="title-text">{{ title }}</span>
        <span v-if="unit" class="title-unit">({{ unit }})</span>
      </div>
      <div v-if="showLegend" class="chart-legend">
        <span class="legend-item">
          <span class="legend-dot actual"></span>
          ค่าจริง
        </span>
        <span v-if="showTarget" class="legend-item">
          <span class="legend-line target"></span>
          เป้าหมาย
        </span>
      </div>
    </div>

    <!-- Chart Container -->
    <div class="chart-container" ref="chartContainer">
      <!-- Empty State -->
      <div v-if="!hasData" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3v18h18"/>
          <path d="M18 17l-5-5-4 4-3-3"/>
        </svg>
        <p>{{ emptyMessage }}</p>
      </div>

      <!-- SVG Chart -->
      <svg 
        v-else
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="chart-svg"
        preserveAspectRatio="xMidYMid meet"
      >
        <!-- Grid Lines -->
        <g class="grid-lines">
          <!-- Horizontal grid lines -->
          <line 
            v-for="(line, index) in horizontalGridLines" 
            :key="'h-' + index"
            :x1="padding.left"
            :y1="line.y"
            :x2="chartWidth - padding.right"
            :y2="line.y"
            class="grid-line"
          />
          <!-- Vertical grid lines -->
          <line 
            v-for="(line, index) in verticalGridLines" 
            :key="'v-' + index"
            :x1="line.x"
            :y1="padding.top"
            :x2="line.x"
            :y2="chartHeight - padding.bottom"
            class="grid-line vertical"
          />
        </g>

        <!-- Target Line -->
        <line 
          v-if="showTarget && targetValue !== null"
          :x1="padding.left"
          :y1="getY(targetValue)"
          :x2="chartWidth - padding.right"
          :y2="getY(targetValue)"
          class="target-line"
        />

        <!-- Initial Value Line -->
        <line 
          v-if="showInitial && initialValue !== null"
          :x1="padding.left"
          :y1="getY(initialValue)"
          :x2="chartWidth - padding.right"
          :y2="getY(initialValue)"
          class="initial-line"
        />

        <!-- Area Fill -->
        <path 
          v-if="showArea && areaPath"
          :d="areaPath"
          class="chart-area"
        />

        <!-- Line Path -->
        <path 
          v-if="linePath"
          :d="linePath"
          class="chart-line"
          fill="none"
        />

        <!-- Data Points -->
        <g class="data-points">
          <circle 
            v-for="(point, index) in dataPoints" 
            :key="index"
            :cx="point.x"
            :cy="point.y"
            r="4"
            class="data-point"
            @mouseenter="showTooltip(point, $event)"
            @mouseleave="hideTooltip"
          />
        </g>

        <!-- Y-Axis Labels -->
        <g class="y-axis-labels">
          <text 
            v-for="(line, index) in horizontalGridLines" 
            :key="'y-label-' + index"
            :x="padding.left - 8"
            :y="line.y + 4"
            class="axis-label"
            text-anchor="end"
          >
            {{ formatAxisValue(line.value) }}
          </text>
        </g>

        <!-- X-Axis Labels -->
        <g class="x-axis-labels">
          <text 
            v-for="(point, index) in xAxisLabels" 
            :key="'x-label-' + index"
            :x="point.x"
            :y="chartHeight - padding.bottom + 16"
            class="axis-label"
            text-anchor="middle"
          >
            {{ point.label }}
          </text>
        </g>
      </svg>
    </div>

    <!-- Tooltip -->
    <div 
      v-if="tooltip.visible" 
      class="chart-tooltip"
      :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }"
    >
      <div class="tooltip-date">{{ tooltip.label }}</div>
      <div class="tooltip-value">{{ tooltip.value }} {{ unit }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

/**
 * ProgressChart Component
 * แสดงกราฟเส้นความคืบหน้าของนักกีฬา
 * Requirements: 5.1
 */
const props = defineProps({
  // ชื่อกราฟ
  title: {
    type: String,
    default: 'ความคืบหน้า'
  },
  // หน่วยวัด
  unit: {
    type: String,
    default: ''
  },
  // ข้อมูลกราฟ { labels: string[], datasets: [{ data: number[] }] }
  chartData: {
    type: Object,
    default: () => ({ labels: [], datasets: [] })
  },
  // ค่าเป้าหมาย (แสดงเส้นประ)
  targetValue: {
    type: Number,
    default: null
  },
  // ค่าเริ่มต้น (แสดงเส้นประ)
  initialValue: {
    type: Number,
    default: null
  },
  // แสดงเส้นเป้าหมาย
  showTarget: {
    type: Boolean,
    default: true
  },
  // แสดงเส้นค่าเริ่มต้น
  showInitial: {
    type: Boolean,
    default: false
  },
  // แสดง legend
  showLegend: {
    type: Boolean,
    default: true
  },
  // แสดงพื้นที่ใต้กราฟ
  showArea: {
    type: Boolean,
    default: true
  },
  // ข้อความเมื่อไม่มีข้อมูล
  emptyMessage: {
    type: String,
    default: 'ยังไม่มีข้อมูลการบันทึก'
  },
  // ความสูงของกราฟ (px)
  height: {
    type: Number,
    default: 200
  }
})

// Refs
const chartContainer = ref(null)
const tooltip = ref({
  visible: false,
  x: 0,
  y: 0,
  label: '',
  value: ''
})

// Chart dimensions
const chartWidth = 400
const chartHeight = computed(() => props.height)
const padding = { top: 20, right: 20, bottom: 30, left: 50 }

// Computed
const hasData = computed(() => {
  return props.chartData?.labels?.length > 0 && 
         props.chartData?.datasets?.[0]?.data?.length > 0
})

const dataValues = computed(() => {
  return props.chartData?.datasets?.[0]?.data || []
})

const labels = computed(() => {
  return props.chartData?.labels || []
})

// คำนวณ min/max สำหรับ Y-axis
const yRange = computed(() => {
  if (!hasData.value) return { min: 0, max: 100 }
  
  let allValues = [...dataValues.value]
  if (props.targetValue !== null) allValues.push(props.targetValue)
  if (props.initialValue !== null) allValues.push(props.initialValue)
  
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  
  // เพิ่ม padding 10%
  const range = max - min || 1
  return {
    min: Math.floor(min - range * 0.1),
    max: Math.ceil(max + range * 0.1)
  }
})

// แปลงค่าเป็น Y coordinate
function getY(value) {
  const { min, max } = yRange.value
  const plotHeight = chartHeight.value - padding.top - padding.bottom
  const ratio = (value - min) / (max - min)
  return chartHeight.value - padding.bottom - (ratio * plotHeight)
}

// แปลง index เป็น X coordinate
function getX(index) {
  const plotWidth = chartWidth - padding.left - padding.right
  const count = labels.value.length
  if (count <= 1) return padding.left + plotWidth / 2
  return padding.left + (index / (count - 1)) * plotWidth
}

// Data points สำหรับวาดจุด
const dataPoints = computed(() => {
  return dataValues.value.map((value, index) => ({
    x: getX(index),
    y: getY(value),
    value,
    label: labels.value[index]
  }))
})

// Line path สำหรับวาดเส้น
const linePath = computed(() => {
  if (dataPoints.value.length === 0) return ''
  
  const points = dataPoints.value
  let path = `M ${points[0].x} ${points[0].y}`
  
  // ใช้ smooth curve
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    path += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`
    path += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`
  }
  
  return path
})

// Area path สำหรับวาดพื้นที่ใต้กราฟ
const areaPath = computed(() => {
  if (dataPoints.value.length === 0) return ''
  
  const points = dataPoints.value
  const baseY = chartHeight.value - padding.bottom
  
  let path = `M ${points[0].x} ${baseY}`
  path += ` L ${points[0].x} ${points[0].y}`
  
  // ใช้ smooth curve
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]
    const curr = points[i]
    const cpx = (prev.x + curr.x) / 2
    path += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2}`
    path += ` Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`
  }
  
  path += ` L ${points[points.length - 1].x} ${baseY}`
  path += ' Z'
  
  return path
})

// Horizontal grid lines
const horizontalGridLines = computed(() => {
  const { min, max } = yRange.value
  const count = 5
  const step = (max - min) / (count - 1)
  
  return Array.from({ length: count }, (_, i) => {
    const value = min + step * i
    return {
      y: getY(value),
      value
    }
  })
})

// Vertical grid lines
const verticalGridLines = computed(() => {
  const count = Math.min(labels.value.length, 7)
  if (count <= 1) return []
  
  const step = Math.ceil(labels.value.length / count)
  return labels.value
    .filter((_, i) => i % step === 0)
    .map((_, i) => ({
      x: getX(i * step)
    }))
})

// X-axis labels (แสดงบางจุด)
const xAxisLabels = computed(() => {
  const count = labels.value.length
  if (count === 0) return []
  if (count <= 5) {
    return labels.value.map((label, i) => ({
      x: getX(i),
      label
    }))
  }
  
  // แสดงเฉพาะจุดแรก กลาง และสุดท้าย
  const indices = [0, Math.floor(count / 2), count - 1]
  return indices.map(i => ({
    x: getX(i),
    label: labels.value[i]
  }))
})

// Methods
function formatAxisValue(value) {
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  return Number.isInteger(value) ? value : value.toFixed(1)
}

function showTooltip(point, event) {
  const rect = chartContainer.value?.getBoundingClientRect()
  if (!rect) return
  
  tooltip.value = {
    visible: true,
    x: event.clientX - rect.left + 10,
    y: event.clientY - rect.top - 30,
    label: point.label,
    value: formatAxisValue(point.value)
  }
}

function hideTooltip() {
  tooltip.value.visible = false
}
</script>

<style scoped>
.progress-chart {
  background: #fff;
  border: 1px solid #e5e5e5;
  border-radius: 12px;
  padding: 16px;
}

/* Header */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.title-text {
  font-weight: 600;
  color: #171717;
  font-size: 14px;
}

.title-unit {
  font-size: 12px;
  color: #737373;
}

.chart-legend {
  display: flex;
  gap: 16px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #525252;
}

.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.legend-dot.actual {
  background: #171717;
}

.legend-line {
  width: 16px;
  height: 2px;
}

.legend-line.target {
  background: #22c55e;
  border-style: dashed;
}

/* Chart Container */
.chart-container {
  position: relative;
  width: 100%;
  min-height: 200px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: #a3a3a3;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
}

/* SVG Chart */
.chart-svg {
  width: 100%;
  height: auto;
}

/* Grid Lines */
.grid-line {
  stroke: #f5f5f5;
  stroke-width: 1;
}

.grid-line.vertical {
  stroke-dasharray: 4 4;
}

/* Target Line */
.target-line {
  stroke: #22c55e;
  stroke-width: 2;
  stroke-dasharray: 6 4;
}

/* Initial Line */
.initial-line {
  stroke: #a3a3a3;
  stroke-width: 1;
  stroke-dasharray: 4 4;
}

/* Chart Area */
.chart-area {
  fill: rgba(23, 23, 23, 0.05);
}

/* Chart Line */
.chart-line {
  stroke: #171717;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* Data Points */
.data-point {
  fill: #fff;
  stroke: #171717;
  stroke-width: 2;
  cursor: pointer;
  transition: all 0.2s ease;
}

.data-point:hover {
  fill: #171717;
  r: 6;
}

/* Axis Labels */
.axis-label {
  font-size: 10px;
  fill: #737373;
}

/* Tooltip */
.chart-tooltip {
  position: absolute;
  background: #171717;
  color: #fff;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;
}

.tooltip-date {
  font-size: 10px;
  color: #a3a3a3;
  margin-bottom: 2px;
}

.tooltip-value {
  font-weight: 600;
}
</style>
