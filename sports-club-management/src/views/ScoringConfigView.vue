<template>
  <div class="scoring-config-view">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/evaluation" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </router-link>
        <div>
          <h1>ตั้งค่าเกณฑ์การให้คะแนน</h1>
          <p class="subtitle">กำหนดเกณฑ์การประเมินนักกีฬาตามประเภทกีฬา</p>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>กำลังโหลดข้อมูล...</p>
    </div>

    <!-- Main Content -->
    <div v-else class="content-wrapper">
      <!-- Sport Type Selection -->
      <section class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          </div>
          <div>
            <h2>ประเภทกีฬา</h2>
            <p>เลือกประเภทกีฬาเพื่อโหลด Template เกณฑ์การให้คะแนน</p>
          </div>
        </div>

        <div class="sport-type-grid">
          <button
            v-for="sport in sportTypes"
            :key="sport.id"
            class="sport-type-card"
            :class="{ selected: selectedSportType?.id === sport.id }"
            @click="selectSportType(sport)"
          >
            <div class="sport-icon-box">
              <!-- ปันจักสีลัต - ท่าต่อสู้ -->
              <svg v-if="sport.name === 'pencak_silat'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="4" r="2"/>
                <path d="M12 6v4"/>
                <path d="M8 14l4-4 4 4"/>
                <path d="M6 20l6-6 6 6"/>
                <path d="M9 10l-3 2"/>
                <path d="M15 10l3 2"/>
              </svg>
              <!-- ฟุตซอล - ลูกบอลในร่ม -->
              <svg v-else-if="sport.name === 'futsal'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2v4"/>
                <path d="M12 18v4"/>
                <path d="M2 12h4"/>
                <path d="M18 12h4"/>
                <path d="M12 8l4 4-4 4-4-4z"/>
              </svg>
              <!-- ฟุตบอล - สนามกลางแจ้ง -->
              <svg v-else-if="sport.name === 'football'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <polygon points="12,2 15,9 22,9 17,14 19,22 12,17 5,22 7,14 2,9 9,9"/>
              </svg>
              <!-- ตะกร้อ - ลูกตะกร้อ -->
              <svg v-else-if="sport.name === 'sepak_takraw'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 2c0 5.5-4.5 10-10 10"/>
                <path d="M12 2c0 5.5 4.5 10 10 10"/>
                <path d="M2 12c5.5 0 10 4.5 10 10"/>
                <path d="M22 12c-5.5 0-10 4.5-10 10"/>
              </svg>
              <!-- กำหนดเอง - เกียร์ -->
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
              </svg>
            </div>
            <span class="sport-name">{{ sport.display_name }}</span>
            <span v-if="selectedSportType?.id === sport.id" class="check-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </span>
          </button>
        </div>
      </section>

      <!-- Mode Selection -->
      <section v-if="selectedSportType" class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <h2>โหมดการตั้งค่า</h2>
            <p>เลือกใช้ Template สำเร็จรูปหรือกำหนดเอง</p>
          </div>
        </div>

        <div class="mode-selection">
          <button
            class="mode-card"
            :class="{ selected: configMode === 'template' }"
            @click="configMode = 'template'"
          >
            <div class="mode-icon template">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <div class="mode-info">
              <span class="mode-name">ใช้ Template</span>
              <span class="mode-desc">ใช้เกณฑ์สำเร็จรูปสำหรับ {{ selectedSportType.display_name }}</span>
            </div>
          </button>

          <button
            class="mode-card"
            :class="{ selected: configMode === 'custom' }"
            @click="configMode = 'custom'"
          >
            <div class="mode-icon custom">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <div class="mode-info">
              <span class="mode-name">กำหนดเอง</span>
              <span class="mode-desc">สร้างเกณฑ์การให้คะแนนตามความต้องการ</span>
            </div>
          </button>
        </div>
      </section>

      <!-- Template Preview -->
      <section v-if="selectedSportType && configMode === 'template' && selectedTemplate" class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
          </div>
          <div>
            <h2>ตัวอย่าง Template</h2>
            <p>{{ selectedTemplate.name }} - {{ selectedTemplate.description }}</p>
          </div>
        </div>

        <div class="template-preview">
          <div 
            v-for="category in selectedTemplate.template_categories" 
            :key="category.id"
            class="preview-category"
          >
            <div class="category-header">
              <span class="category-name">{{ category.display_name }}</span>
              <span class="category-weight">{{ category.weight }}%</span>
            </div>
            <div class="category-metrics">
              <span 
                v-for="metric in category.template_metrics" 
                :key="metric.id"
                class="metric-tag"
              >
                {{ metric.display_name }}
              </span>
            </div>
          </div>
        </div>

        <div class="template-actions">
          <button @click="useTemplate" class="btn-primary" :disabled="saving">
            <span v-if="saving" class="spinner-small"></span>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ saving ? 'กำลังบันทึก...' : 'ใช้ Template นี้' }}
          </button>
        </div>
      </section>

      <!-- Category Editor (ทั้ง Template และ Custom Mode) -->
      <section v-if="selectedSportType && editableCategories.length > 0" class="settings-section">
        <CategoryEditor
          :categories="editableCategories"
          :sport-type="selectedSportType"
          @update:categories="editableCategories = $event"
          @add-category="showAddCategory = true"
        />
      </section>

      <!-- Empty State สำหรับ Custom Mode ที่ยังไม่มีหมวดหมู่ -->
      <section v-if="selectedSportType && configMode === 'custom' && editableCategories.length === 0" class="settings-section">
        <div class="empty-categories">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h3>ยังไม่มีหมวดหมู่</h3>
          <p>เริ่มต้นสร้างเกณฑ์การให้คะแนนโดยเพิ่มหมวดหมู่แรก</p>
          <button @click="showAddCategory = true" class="btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            เพิ่มหมวดหมู่แรก
          </button>
        </div>
      </section>

      <!-- Tier Thresholds - Quick Setup -->
      <section v-if="selectedSportType && (configMode === 'template' || configMode === 'custom')" class="settings-section">
        <div class="section-header">
          <div class="section-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-4"/>
            </svg>
          </div>
          <div>
            <h2>เกณฑ์ระดับผลงาน</h2>
            <p>กำหนดคะแนนขั้นต่ำสำหรับแต่ละระดับ</p>
          </div>
        </div>

        <div class="tier-thresholds">
          <div class="tier-item excellent">
            <div class="tier-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <span class="tier-name">ยอดเยี่ยม</span>
            </div>
            <div class="tier-input">
              <span class="tier-prefix">≥</span>
              <input 
                type="number" 
                v-model.number="tierThresholds.excellent" 
                min="0" 
                max="100"
              />
              <span class="tier-suffix">%</span>
            </div>
          </div>

          <div class="tier-item good">
            <div class="tier-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3"/>
              </svg>
              <span class="tier-name">ดี</span>
            </div>
            <div class="tier-input">
              <span class="tier-prefix">≥</span>
              <input 
                type="number" 
                v-model.number="tierThresholds.good" 
                min="0" 
                max="100"
              />
              <span class="tier-suffix">%</span>
            </div>
          </div>

          <div class="tier-item average">
            <div class="tier-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span class="tier-name">ปานกลาง</span>
            </div>
            <div class="tier-input">
              <span class="tier-prefix">≥</span>
              <input 
                type="number" 
                v-model.number="tierThresholds.average" 
                min="0" 
                max="100"
              />
              <span class="tier-suffix">%</span>
            </div>
          </div>

          <div class="tier-item needs_improvement">
            <div class="tier-info">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 19V5M5 12l7-7 7 7"/>
              </svg>
              <span class="tier-name">ต้องปรับปรุง</span>
            </div>
            <div class="tier-range">
              <span>< {{ tierThresholds.average }}%</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Current Config Info -->
      <section v-if="currentConfig" class="settings-section info-section">
        <div class="config-info">
          <div class="info-item">
            <span class="info-label">การตั้งค่าปัจจุบัน</span>
            <span class="info-value">{{ currentConfig.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Version</span>
            <span class="info-value">{{ currentConfig.version }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">สถานะ</span>
            <span class="status-badge" :class="{ active: currentConfig.is_active }">
              {{ currentConfig.is_active ? 'ใช้งานอยู่' : 'ไม่ได้ใช้งาน' }}
            </span>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions">
          <router-link to="/scoring-config/history" class="btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            ดูประวัติ
          </router-link>
          <button @click="activateConfig" class="btn-primary" :disabled="saving || currentConfig.is_active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {{ currentConfig.is_active ? 'ใช้งานอยู่' : 'เปิดใช้งาน' }}
          </button>
        </div>
      </section>
    </div>

    <!-- Add Category Modal -->
    <Modal 
      v-if="showAddCategory" 
      title="เพิ่มหมวดหมู่ใหม่"
      @close="showAddCategory = false"
    >
      <form @submit.prevent="addNewCategory" class="add-category-form">
        <div class="form-group">
          <label for="cat-name">ชื่อหมวดหมู่ <span class="required">*</span></label>
          <input
            id="cat-name"
            v-model="newCategory.name"
            type="text"
            placeholder="เช่น ทักษะพิเศษ"
            required
          />
        </div>

        <div class="form-group">
          <label for="cat-display-name">ชื่อแสดงผล <span class="required">*</span></label>
          <input
            id="cat-display-name"
            v-model="newCategory.display_name"
            type="text"
            placeholder="เช่น ทักษะพิเศษ"
            required
          />
        </div>

        <div class="form-group">
          <label for="cat-type">ประเภท</label>
          <select id="cat-type" v-model="newCategory.category_type">
            <option value="attendance">การเข้าร่วม</option>
            <option value="training">การฝึกซ้อม</option>
            <option value="skill">ทักษะ</option>
            <option value="competition">การแข่งขัน</option>
            <option value="custom">กำหนดเอง</option>
          </select>
        </div>

        <div class="form-group">
          <label for="cat-weight">น้ำหนัก (%)</label>
          <input
            id="cat-weight"
            v-model.number="newCategory.weight"
            type="number"
            min="0"
            max="100"
            placeholder="10"
          />
          <p class="field-hint">น้ำหนักจะถูกปรับอัตโนมัติให้รวมเป็น 100%</p>
        </div>
      </form>

      <template #footer>
        <div class="modal-actions">
          <button @click="showAddCategory = false" class="btn-secondary">
            ยกเลิก
          </button>
          <button @click="addNewCategory" class="btn-primary" :disabled="!newCategory.name || !newCategory.display_name">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            เพิ่มหมวดหมู่
          </button>
        </div>
      </template>
    </Modal>

    <!-- Toast Notification -->
    <Transition name="toast">
      <div v-if="toast.show" class="toast" :class="toast.type">
        <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useScoringConfigStore } from '@/stores/scoringConfig'
import { useAuthStore } from '@/stores/auth'
import CategoryEditor from '@/components/CategoryEditor.vue'
import Modal from '@/components/Modal.vue'

const scoringConfigStore = useScoringConfigStore()
const authStore = useAuthStore()

// State
const loading = ref(true)
const saving = ref(false)
const selectedSportType = ref(null)
const selectedTemplate = ref(null)
const configMode = ref('template') // 'template' หรือ 'custom'
const editableCategories = ref([])
const showAddCategory = ref(false)

// ข้อมูลหมวดหมู่ใหม่
const newCategory = ref({
  name: '',
  display_name: '',
  category_type: 'custom',
  weight: 10
})

// Tier Thresholds - ค่าเริ่มต้นสำหรับเกณฑ์ระดับผลงาน
const tierThresholds = ref({
  excellent: 85,
  good: 70,
  average: 50
})

// Toast notification
const toast = ref({
  show: false,
  type: 'success',
  message: ''
})

// Computed
const clubId = computed(() => authStore.profile?.club_id)
const sportTypes = computed(() => scoringConfigStore.sportTypes)
const currentConfig = computed(() => scoringConfigStore.clubConfig)

// Methods - ไม่ใช้ Emoji ตาม design-theme ใช้ SVG แทน
function getSportIcon(sportName) {
  // คืนค่า sport name เพื่อใช้กับ SVG component
  return sportName
}

async function selectSportType(sport) {
  selectedSportType.value = sport
  
  // โหลด template สำหรับประเภทกีฬาที่เลือก
  if (sport.name !== 'custom') {
    const template = await scoringConfigStore.loadTemplateForSportType(sport.id)
    selectedTemplate.value = template
    
    // เตรียมข้อมูลสำหรับ custom mode
    if (template?.template_categories) {
      editableCategories.value = template.template_categories.map(cat => ({
        ...cat,
        metrics: cat.template_metrics || []
      }))
    }
  } else {
    selectedTemplate.value = null
    editableCategories.value = []
    configMode.value = 'custom'
  }
}

async function useTemplate() {
  if (!selectedTemplate.value || !clubId.value) return

  saving.value = true
  try {
    const result = await scoringConfigStore.cloneTemplateForClub(
      clubId.value,
      selectedTemplate.value.id,
      `${selectedTemplate.value.name} - ${authStore.profile?.full_name || 'Custom'}`
    )

    if (result.success) {
      showToast('success', 'บันทึก Template สำเร็จ')
      await scoringConfigStore.fetchClubConfig(clubId.value)
    } else {
      showToast('error', result.error || 'เกิดข้อผิดพลาดในการบันทึก')
    }
  } catch (error) {
    showToast('error', 'เกิดข้อผิดพลาดในการบันทึก')
  } finally {
    saving.value = false
  }
}

async function loadData() {
  loading.value = true
  try {
    await Promise.all([
      scoringConfigStore.fetchSportTypes(),
      scoringConfigStore.fetchTemplates(),
      clubId.value ? scoringConfigStore.fetchClubConfig(clubId.value) : Promise.resolve()
    ])

    // ถ้ามี config อยู่แล้ว ให้เลือก sport type ตาม config
    if (currentConfig.value?.sport_type_id) {
      const sport = sportTypes.value.find(s => s.id === currentConfig.value.sport_type_id)
      if (sport) {
        await selectSportType(sport)
      }
      
      // โหลด tier thresholds จาก config
      tierThresholds.value = {
        excellent: currentConfig.value.tier_excellent_min || 85,
        good: currentConfig.value.tier_good_min || 70,
        average: currentConfig.value.tier_average_min || 50
      }
    }
  } catch (error) {
    showToast('error', 'เกิดข้อผิดพลาดในการโหลดข้อมูล')
  } finally {
    loading.value = false
  }
}

function showToast(type, message) {
  toast.value = { show: true, type, message }
  setTimeout(() => {
    toast.value.show = false
  }, 3000)
}

// เพิ่มหมวดหมู่ใหม่
function addNewCategory() {
  if (!newCategory.value.name || !newCategory.value.display_name) {
    showToast('error', 'กรุณากรอกชื่อหมวดหมู่')
    return
  }

  // สร้าง ID ชั่วคราว
  const tempId = `cat_${Date.now()}`
  
  // เพิ่มหมวดหมู่ใหม่
  const newCat = {
    id: tempId,
    name: newCategory.value.name.toLowerCase().replace(/\s+/g, '_'),
    display_name: newCategory.value.display_name,
    category_type: newCategory.value.category_type,
    weight: newCategory.value.weight || 10,
    is_active: true,
    sort_order: editableCategories.value.length,
    metrics: [],
    template_metrics: []
  }

  // เพิ่มเข้า array
  editableCategories.value = [...editableCategories.value, newCat]

  // รีเซ็ตฟอร์ม
  newCategory.value = {
    name: '',
    display_name: '',
    category_type: 'custom',
    weight: 10
  }

  showAddCategory.value = false
  showToast('success', 'เพิ่มหมวดหมู่สำเร็จ')
}

// เปิดใช้งานการตั้งค่า
async function activateConfig() {
  if (!currentConfig.value?.id) return

  saving.value = true
  try {
    const result = await scoringConfigStore.validateAndActivateConfig(currentConfig.value.id)
    
    if (result.success) {
      showToast('success', 'เปิดใช้งานการตั้งค่าเรียบร้อยแล้ว')
      await scoringConfigStore.fetchClubConfig(clubId.value)
    } else {
      const errorMsg = result.errors?.[0]?.message || 'เกิดข้อผิดพลาด'
      showToast('error', errorMsg)
    }
  } catch (error) {
    showToast('error', 'เกิดข้อผิดพลาดในการเปิดใช้งาน')
  } finally {
    saving.value = false
  }
}

// Watch for club changes
watch(clubId, (newClubId) => {
  if (newClubId) {
    loadData()
  }
})

onMounted(() => {
  loadData()
})
</script>


<style scoped>
.scoring-config-view {
  padding: 1.5rem;
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 2rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.back-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #F5F5F5;
  color: #525252;
  flex-shrink: 0;
}

.back-link:hover {
  background: #E5E5E5;
}

.back-link svg {
  width: 20px;
  height: 20px;
}

.page-header h1 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 0.25rem 0 0;
  font-size: 0.875rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  color: #737373;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.content-wrapper {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.settings-section {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 1.25rem;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.section-header h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.section-header p {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

/* Sport Type Grid */
.sport-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.sport-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: #FAFAFA;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  position: relative;
}

.sport-type-card:hover {
  background: #F5F5F5;
  border-color: #D4D4D4;
}

.sport-type-card.selected {
  background: #171717;
  border-color: #171717;
  color: #fff;
}

/* Sport Icon Box - ใช้ SVG แทน Emoji ตาม design-theme */
.sport-icon-box {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #E5E5E5;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.sport-type-card.selected .sport-icon-box {
  background: #fff;
}

.sport-icon-box svg {
  width: 24px;
  height: 24px;
  color: #171717;
}

.sport-name {
  font-size: 0.875rem;
  font-weight: 500;
  text-align: center;
}

.check-icon {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 20px;
  height: 20px;
  background: #22C55E;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.check-icon svg {
  width: 12px;
  height: 12px;
  color: #fff;
}

/* Mode Selection */
.mode-selection {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.mode-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem;
  background: #FAFAFA;
  border: 2px solid #E5E5E5;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s;
  text-align: left;
}

.mode-card:hover {
  background: #F5F5F5;
  border-color: #D4D4D4;
}

.mode-card.selected {
  border-color: #171717;
  background: #fff;
}

.mode-icon {
  width: 48px;
  height: 48px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mode-icon.template {
  background: #D1FAE5;
  color: #065F46;
}

.mode-icon.custom {
  background: #DBEAFE;
  color: #1E40AF;
}

.mode-icon svg {
  width: 24px;
  height: 24px;
}

.mode-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.mode-name {
  font-weight: 600;
  color: #171717;
}

.mode-desc {
  font-size: 0.75rem;
  color: #737373;
}

/* Template Preview */
.template-preview {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-category {
  padding: 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.category-name {
  font-weight: 600;
  color: #171717;
}

.category-weight {
  font-weight: 700;
  color: #171717;
  background: #E5E5E5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
}

.category-metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.metric-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 4px;
  color: #525252;
}

.template-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: opacity 0.15s;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 20px;
  height: 20px;
}

/* Config Info */
.info-section {
  background: #FAFAFA;
}

.config-info {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-weight: 600;
  color: #171717;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #FEE2E2;
  color: #991B1B;
}

.status-badge.active {
  background: #D1FAE5;
  color: #065F46;
}

/* Toast */
.toast {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  font-size: 0.875rem;
  z-index: 1001;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.toast.success {
  background: #D1FAE5;
  color: #065F46;
}

.toast.error {
  background: #FEE2E2;
  color: #991B1B;
}

.toast svg {
  width: 18px;
  height: 18px;
}

/* Tier Thresholds */
.tier-thresholds {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tier-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1rem;
  border-radius: 8px;
  border: 1px solid #E5E5E5;
}

.tier-item.excellent {
  background: #D1FAE5;
  border-color: #A7F3D0;
}

.tier-item.good {
  background: #DBEAFE;
  border-color: #BFDBFE;
}

.tier-item.average {
  background: #FEF3C7;
  border-color: #FDE68A;
}

.tier-item.needs_improvement {
  background: #FEE2E2;
  border-color: #FECACA;
}

.tier-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.tier-info svg {
  width: 20px;
  height: 20px;
}

.tier-item.excellent .tier-info svg { color: #065F46; }
.tier-item.good .tier-info svg { color: #1E40AF; }
.tier-item.average .tier-info svg { color: #92400E; }
.tier-item.needs_improvement .tier-info svg { color: #991B1B; }

.tier-name {
  font-weight: 600;
  font-size: 0.875rem;
}

.tier-item.excellent .tier-name { color: #065F46; }
.tier-item.good .tier-name { color: #1E40AF; }
.tier-item.average .tier-name { color: #92400E; }
.tier-item.needs_improvement .tier-name { color: #991B1B; }

.tier-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: #fff;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
}

.tier-prefix, .tier-suffix {
  font-size: 0.875rem;
  color: #737373;
}

.tier-input input {
  width: 50px;
  border: none;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  background: transparent;
}

.tier-input input:focus {
  outline: none;
}

.tier-range {
  font-size: 0.875rem;
  font-weight: 500;
  color: #991B1B;
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #E5E5E5;
}

.quick-actions .btn-secondary,
.quick-actions .btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.15s;
}

.quick-actions .btn-secondary {
  background: #fff;
  border: 1px solid #E5E5E5;
  color: #171717;
}

.quick-actions .btn-secondary:hover {
  background: #F5F5F5;
}

.quick-actions .btn-primary {
  background: #171717;
  border: none;
  color: #fff;
}

.quick-actions .btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.quick-actions .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-actions svg {
  width: 16px;
  height: 16px;
}

.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from, .toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* Empty Categories State */
.empty-categories {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #F5F5F5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.empty-icon svg {
  width: 32px;
  height: 32px;
  color: #A3A3A3;
}

.empty-categories h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0 0 0.5rem;
}

.empty-categories p {
  font-size: 0.875rem;
  color: #737373;
  margin: 0 0 1.5rem;
}

/* Add Category Form */
.add-category-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-category-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.add-category-form label {
  font-weight: 500;
  color: #171717;
  font-size: 0.875rem;
}

.add-category-form .required {
  color: #EF4444;
}

.add-category-form input,
.add-category-form select {
  padding: 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
}

.add-category-form input:focus,
.add-category-form select:focus {
  outline: none;
  border-color: #171717;
}

.add-category-form .field-hint {
  font-size: 0.75rem;
  color: #737373;
  margin: 0;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.modal-actions .btn-secondary {
  padding: 0.75rem 1.25rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #171717;
  font-weight: 500;
}

.modal-actions .btn-primary {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.modal-actions .btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-actions .btn-primary svg {
  width: 16px;
  height: 16px;
}

@media (max-width: 640px) {
  .scoring-config-view {
    padding: 1rem;
  }

  .mode-selection {
    grid-template-columns: 1fr;
  }

  .sport-type-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .quick-actions {
    flex-direction: column;
  }

  .quick-actions .btn-secondary,
  .quick-actions .btn-primary {
    justify-content: center;
  }

  .tier-item {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .tier-input, .tier-range {
    align-self: flex-end;
  }

  .modal-actions {
    flex-direction: column;
  }
}
</style>
