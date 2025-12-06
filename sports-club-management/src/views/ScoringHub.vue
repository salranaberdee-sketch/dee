<template>
  <div class="scoring-hub">
    <!-- Loading Skeleton (แสดงขณะโหลด) -->
    <template v-if="initialLoading">
      <div class="skeleton-banner"></div>
      <div class="skeleton-cards">
        <div class="skeleton-card" v-for="i in 4" :key="i"></div>
      </div>
    </template>

    <!-- Main Content (แสดงหลังโหลดเสร็จ) -->
    <template v-else>
      <!-- Status Banner -->
      <StatusBanner 
        :status="configStatus" 
        @action="handleStatusAction"
      />

      <!-- First Time Setup (ถ้ายังไม่มี config) -->
      <FirstTimeSetup 
        v-if="configStatus === 'none'"
        @complete="onSetupComplete"
      />

      <!-- Main Hub Content -->
      <template v-else>
        <!-- 4 Action Cards -->
        <div class="action-cards">
          <ActionCard
            v-for="card in actionCards"
            :key="card.id"
            :icon="card.icon"
            :title="card.title"
            :status="getCardStatus(card.id)"
            :show-badge="getCardBadge(card.id)"
            :to="card.route"
          />
        </div>

        <!-- Score Source Bar (ซ่อนบน mobile, แสดงเมื่อกด expand) -->
        <div class="score-source-section" v-if="!isMobile || showSourceBar">
          <div class="section-header" @click="toggleSourceBar">
            <h3>แหล่งที่มาคะแนน</h3>
            <svg v-if="isMobile" class="expand-icon" :class="{ expanded: showSourceBar }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </div>
          <ScoreSourceBar 
            :sources="scoreSources"
            @segment-click="onSegmentClick"
          />
        </div>

        <!-- Mobile: แสดงปุ่ม expand -->
        <button v-if="isMobile && !showSourceBar" class="expand-source-btn" @click="showSourceBar = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
          ดูแหล่งที่มาคะแนน
        </button>

        <!-- Quick Stats (ซ่อนถ้าไม่มีข้อมูล หรือกำลังโหลด) -->
        <div v-if="statsLoading" class="skeleton-stats"></div>
        <QuickStats 
          v-else-if="hasStats"
          :stats="quickStats"
          @stat-click="onStatClick"
        />
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useScoringConfigStore } from '@/stores/scoringConfig'
import { useEvaluationStore } from '@/stores/evaluation'
import { useAuthStore } from '@/stores/auth'
import StatusBanner from '@/components/StatusBanner.vue'
import ActionCard from '@/components/ActionCard.vue'
import ScoreSourceBar from '@/components/ScoreSourceBar.vue'
import QuickStats from '@/components/QuickStats.vue'
import FirstTimeSetup from '@/components/FirstTimeSetup.vue'

const router = useRouter()
const scoringConfigStore = useScoringConfigStore()
const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()

// State
const showSourceBar = ref(false)
const windowWidth = ref(window.innerWidth)
const initialLoading = ref(true)
const statsLoading = ref(false)

// Cache key สำหรับเก็บเวลาโหลดล่าสุด
const CACHE_DURATION = 60000 // 1 นาที
let lastLoadTime = 0

// 4 การ์ดคงที่
const actionCards = [
  { id: 'config', icon: 'settings', title: 'ตั้งค่าเกณฑ์', route: '/scoring-config' },
  { id: 'evaluation', icon: 'chart', title: 'ดูผลประเมิน', route: '/evaluation' },
  { id: 'calculator', icon: 'calculator', title: 'คำนวณคะแนน', route: '/score-calculator' },
  { id: 'conditions', icon: 'plus-minus', title: 'โบนัส/หักคะแนน', route: '/scoring-conditions' }
]

// สีของแต่ละ category
const SOURCE_COLORS = {
  attendance: '#3B82F6',
  training: '#10B981',
  skill: '#F59E0B',
  competition: '#EF4444',
  custom: '#8B5CF6'
}

// Computed
const clubId = computed(() => authStore.profile?.club_id)
const isMobile = computed(() => windowWidth.value < 640)

// สถานะ config: 'active' | 'inactive' | 'none'
const configStatus = computed(() => {
  if (!scoringConfigStore.clubConfig) return 'none'
  return scoringConfigStore.clubConfig.is_active ? 'active' : 'inactive'
})

// แหล่งที่มาคะแนน (จาก categories)
const scoreSources = computed(() => {
  const categories = scoringConfigStore.activeCategories || []
  return categories.slice(0, 5).map(cat => ({
    category: cat.category_type || cat.name,
    displayName: cat.display_name || getCategoryDisplayName(cat.category_type),
    weight: cat.weight || 0,
    color: SOURCE_COLORS[cat.category_type] || SOURCE_COLORS.custom
  }))
})

// Quick Stats
const quickStats = computed(() => {
  const stats = evaluationStore.athleteStats || []
  if (stats.length === 0) return null
  
  const totalAthletes = stats.length
  const avgScore = Math.round(stats.reduce((sum, a) => sum + (a.overall_score || 0), 0) / totalAthletes)
  const excellentCount = stats.filter(a => a.performance_tier === 'excellent').length
  const needsImprovementCount = stats.filter(a => a.performance_tier === 'needs_improvement').length
  
  return { totalAthletes, avgScore, excellentCount, needsImprovementCount }
})

const hasStats = computed(() => quickStats.value !== null && quickStats.value.totalAthletes > 0)

// Methods
function getCategoryDisplayName(type) {
  const names = {
    attendance: 'การเข้าร่วม',
    training: 'การฝึกซ้อม',
    skill: 'ทักษะ',
    competition: 'การแข่งขัน',
    custom: 'กำหนดเอง'
  }
  return names[type] || type
}

function getCardStatus(cardId) {
  if (configStatus.value === 'none') return 'setup'
  if (cardId === 'config') return configStatus.value
  return 'active'
}

function getCardBadge(cardId) {
  if (configStatus.value === 'none' && cardId === 'config') return true
  if (configStatus.value === 'inactive' && cardId === 'config') return true
  return false
}

function handleStatusAction() {
  if (configStatus.value === 'none') {
    return
  }
  if (configStatus.value === 'inactive') {
    router.push('/scoring-config')
  }
}

function toggleSourceBar() {
  if (isMobile.value) {
    showSourceBar.value = !showSourceBar.value
  }
}

function onSegmentClick(category) {
  router.push(`/scoring-config?category=${category}`)
}

function onStatClick(statType) {
  const filterMap = {
    total: '',
    excellent: 'excellent',
    needsImprovement: 'needs_improvement'
  }
  router.push(`/evaluation?filter=${filterMap[statType] || ''}`)
}

async function onSetupComplete() {
  lastLoadTime = 0 // รีเซ็ต cache
  await loadData(true)
}

/**
 * โหลดข้อมูลแบบ Parallel และ Cached
 * ปรับปรุงประสิทธิภาพให้โหลดภายใน 1 วินาที
 */
async function loadData(forceRefresh = false) {
  if (!clubId.value) {
    initialLoading.value = false
    return
  }

  const now = Date.now()
  
  // ใช้ cache ถ้ายังไม่หมดอายุ
  if (!forceRefresh && lastLoadTime && (now - lastLoadTime) < CACHE_DURATION) {
    initialLoading.value = false
    return
  }

  try {
    // โหลด config ก่อน (สำคัญสำหรับ UI)
    await scoringConfigStore.fetchClubConfig(clubId.value)
    
    // แสดง UI ทันทีหลังโหลด config เสร็จ
    initialLoading.value = false
    
    // โหลด stats แบบ background (ไม่ block UI)
    if (scoringConfigStore.clubConfig) {
      statsLoading.value = true
      const month = new Date().toISOString().slice(0, 7)
      
      // ใช้ setTimeout เพื่อให้ UI render ก่อน
      setTimeout(async () => {
        try {
          await evaluationStore.calculateAthleteStats(clubId.value, month)
        } finally {
          statsLoading.value = false
        }
      }, 0)
    }
    
    lastLoadTime = now
  } catch (err) {
    console.error('Error loading data:', err)
    initialLoading.value = false
    statsLoading.value = false
  }
}

// Resize handler (debounced)
let resizeTimeout
function handleResize() {
  clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    windowWidth.value = window.innerWidth
  }, 100)
}

// Watch clubId เพื่อโหลดใหม่เมื่อเปลี่ยน
watch(clubId, (newId) => {
  if (newId) {
    lastLoadTime = 0
    loadData(true)
  }
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await loadData()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  clearTimeout(resizeTimeout)
})
</script>

<style scoped>
.scoring-hub {
  padding: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

/* Action Cards - 2x2 Grid */
.action-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
}

/* Score Source Section */
.score-source-section {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  cursor: pointer;
}

.section-header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #525252;
  margin: 0;
}

.expand-icon {
  width: 20px;
  height: 20px;
  color: #737373;
  transition: transform 0.2s;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

/* Mobile expand button */
.expand-source-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: #F5F5F5;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #525252;
  cursor: pointer;
  margin-bottom: 1rem;
}

.expand-source-btn svg {
  width: 18px;
  height: 18px;
}

.expand-source-btn:hover {
  background: #E5E5E5;
}

/* Skeleton Loading */
.skeleton-banner {
  height: 48px;
  background: linear-gradient(90deg, #F5F5F5 25%, #E5E5E5 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
  margin: 1.5rem 0;
}

.skeleton-card {
  height: 120px;
  background: linear-gradient(90deg, #F5F5F5 25%, #E5E5E5 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
}

.skeleton-stats {
  height: 80px;
  background: linear-gradient(90deg, #F5F5F5 25%, #E5E5E5 50%, #F5F5F5 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 12px;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Responsive */
@media (max-width: 640px) {
  .scoring-hub {
    padding: 0.75rem;
  }
  
  .action-cards {
    gap: 0.75rem;
  }
  
  .skeleton-cards {
    gap: 0.75rem;
  }
}
</style>
