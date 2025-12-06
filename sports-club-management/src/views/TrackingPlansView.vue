<template>
  <div class="tracking-plans-page">
    <!-- Header แบบใหม่ - ชัดเจนขึ้น -->
    <div class="page-header">
      <div class="header-content">
        <div class="header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <div>
          <h1>ติดตามนักกีฬา</h1>
          <p class="subtitle">ติดตามน้ำหนัก เวลา และค่าต่างๆ ของนักกีฬา</p>
        </div>
      </div>
      <button v-if="canCreate" class="btn-primary" @click="openCreateModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        สร้างแผนใหม่
      </button>
    </div>

    <!-- Quick Stats - ภาพรวมเร็ว -->
    <div class="quick-stats">
      <div class="quick-stat">
        <span class="quick-stat-value">{{ activePlansCount }}</span>
        <span class="quick-stat-label">แผนที่ใช้งาน</span>
      </div>
      <div class="quick-stat">
        <span class="quick-stat-value">{{ totalAthletesInPlans }}</span>
        <span class="quick-stat-label">นักกีฬาในแผน</span>
      </div>
      <div class="quick-stat urgent" v-if="urgentPlansCount > 0">
        <span class="quick-stat-value">{{ urgentPlansCount }}</span>
        <span class="quick-stat-label">ใกล้สิ้นสุด</span>
      </div>
    </div>

    <!-- Filters แบบ compact -->
    <div class="filters">
      <div class="filter-tabs">
        <button 
          :class="['filter-tab', { active: filterStatus === '' }]" 
          @click="filterStatus = ''"
        >
          ทั้งหมด
        </button>
        <button 
          :class="['filter-tab', { active: filterStatus === 'active' }]" 
          @click="filterStatus = 'active'"
        >
          ใช้งานอยู่
        </button>
        <button 
          :class="['filter-tab', { active: filterStatus === 'inactive' }]" 
          @click="filterStatus = 'inactive'"
        >
          ปิดใช้งาน
        </button>
      </div>
      <div class="filter-right">
        <select v-model="filterType" class="filter-select">
          <option value="">ทุกประเภท</option>
          <option value="weight_control">ควบคุมน้ำหนัก</option>
          <option value="timing">จับเวลา</option>
          <option value="strength">ความแข็งแรง</option>
          <option value="general">ค่าร่างกายทั่วไป</option>
        </select>
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" v-model="searchQuery" placeholder="ค้นหาแผน...">
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Plans Grid - Card แบบใหม่ที่ชัดเจนขึ้น -->
    <div v-else class="plans-grid">
      <div 
        v-for="plan in filteredPlans" 
        :key="plan.id" 
        class="plan-card"
        :class="{ 
          inactive: !plan.is_active,
          urgent: isUrgent(plan)
        }"
        @click="viewPlanDetail(plan)"
      >
        <!-- ส่วนบน: ชื่อและสถานะ -->
        <div class="card-top">
          <div class="card-type-icon" :class="plan.plan_type">
            <svg v-if="plan.plan_type === 'weight_control'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 3v18M3 12h18M5.5 5.5l13 13M18.5 5.5l-13 13"/>
            </svg>
            <svg v-else-if="plan.plan_type === 'timing'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <svg v-else-if="plan.plan_type === 'strength'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6.5 6.5h11M6.5 17.5h11M4 10h2v4H4zM18 10h2v4h-2zM6 12h12"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <div class="card-badges">
            <span v-if="isUrgent(plan)" class="badge-urgent">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {{ getDaysLeft(plan) }} วัน
            </span>
            <span :class="['status-badge', plan.is_active ? 'status-active' : 'status-inactive']">
              {{ plan.is_active ? 'ใช้งาน' : 'ปิด' }}
            </span>
          </div>
        </div>

        <!-- ส่วนกลาง: ชื่อแผน -->
        <div class="card-main">
          <h3>{{ plan.name }}</h3>
          <span class="plan-type-label">{{ getPlanTypeName(plan.plan_type) }}</span>
        </div>

        <!-- ส่วนล่าง: สถิติที่สำคัญ -->
        <div class="card-bottom">
          <div class="card-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            </svg>
            <span>{{ getAthleteCount(plan) }} คน</span>
          </div>
          <div class="card-stat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ formatDateShort(plan.end_date) }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="card-actions" @click.stop>
          <router-link :to="`/tracking/${plan.id}`" class="btn-view">
            ดูแผน
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </router-link>
          <div class="action-buttons">
            <button v-if="canEdit(plan)" class="btn-icon-sm" @click="openEditModal(plan)" title="แก้ไข">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button v-if="canDelete(plan)" class="btn-icon-sm danger" @click="confirmDeactivate(plan)" title="ปิดใช้งาน">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPlans.length === 0" class="empty-state">
        <div class="empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        </div>
        <h3>{{ searchQuery || filterStatus || filterType ? 'ไม่พบแผน' : 'ยังไม่มีแผนติดตาม' }}</h3>
        <p>{{ searchQuery || filterStatus || filterType ? 'ลองเปลี่ยนเงื่อนไขการค้นหา' : 'สร้างแผนแรกเพื่อเริ่มติดตามนักกีฬา' }}</p>
        <button v-if="canCreate && !searchQuery && !filterStatus && !filterType" class="btn-primary" @click="openCreateModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          สร้างแผนแรก
        </button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Modal v-if="showModal" @close="closeModal" size="large">
      <template #header>
        <h2>{{ modalMode === 'create' ? 'สร้างแผนติดตามใหม่' : 'แก้ไขแผนติดตาม' }}</h2>
      </template>
      <template #body>
        <form @submit.prevent="savePlan" class="form">
          <!-- Template Selection (เฉพาะตอนสร้างใหม่) -->
          <div v-if="modalMode === 'create'" class="form-group">
            <label>เลือกแม่แบบ</label>
            <div class="template-grid">
              <button 
                v-for="(template, key) in templates" 
                :key="key"
                type="button"
                :class="['template-btn', { active: selectedTemplate === key }]"
                @click="selectTemplate(key)"
              >
                <span class="template-name">{{ template.name }}</span>
                <span class="template-fields">{{ template.fields.length }} ฟิลด์</span>
              </button>
              <button 
                type="button"
                :class="['template-btn', { active: selectedTemplate === 'custom' }]"
                @click="selectTemplate('custom')"
              >
                <span class="template-name">กำหนดเอง</span>
                <span class="template-fields">สร้างฟิลด์ใหม่</span>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label>ชื่อแผน *</label>
            <input type="text" v-model="form.name" required placeholder="เช่น ควบคุมน้ำหนักก่อนแข่ง">
          </div>

          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="form.description" rows="2" placeholder="อธิบายเป้าหมายของแผน..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>ประเภทแผน *</label>
              <select v-model="form.plan_type" required>
                <option value="">เลือกประเภท</option>
                <option value="weight_control">ควบคุมน้ำหนัก</option>
                <option value="timing">จับเวลา</option>
                <option value="strength">ความแข็งแรง</option>
                <option value="general">ค่าร่างกายทั่วไป</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>วันเริ่มต้น *</label>
              <input type="date" v-model="form.start_date" required>
            </div>
            <div class="form-group">
              <label>วันสิ้นสุด *</label>
              <input type="date" v-model="form.end_date" required>
            </div>
          </div>

          <!-- Fields Selection (เฉพาะตอนสร้างใหม่) -->
          <div v-if="modalMode === 'create'" class="form-group">
            <label>ฟิลด์ที่จะติดตาม (เลือกหรือเพิ่มเอง)</label>
            
            <!-- ฟิลด์จาก Template ให้เลือก -->
            <div v-if="selectedTemplate !== 'custom' && templateFields.length > 0" class="template-fields-select">
              <div class="select-header">
                <span>ฟิลด์จากแม่แบบ</span>
                <div class="select-actions">
                  <button type="button" class="btn-link" @click="selectAllTemplateFields">เลือกทั้งหมด</button>
                  <button type="button" class="btn-link" @click="deselectAllTemplateFields">ยกเลิกทั้งหมด</button>
                </div>
              </div>
              <div class="template-fields-list">
                <label 
                  v-for="(field, index) in templateFields" 
                  :key="'tpl-' + index" 
                  class="field-checkbox"
                  :class="{ selected: isFieldSelected(field) }"
                >
                  <input 
                    type="checkbox" 
                    :checked="isFieldSelected(field)"
                    @change="toggleTemplateField(field)"
                  />
                  <span class="field-name">{{ field.name }}</span>
                  <span class="field-type">{{ getFieldTypeName(field.field_type) }}</span>
                  <span v-if="field.unit" class="field-unit">({{ field.unit }})</span>
                </label>
              </div>
            </div>

            <!-- ฟิลด์ที่เลือกแล้ว + ฟิลด์ที่เพิ่มเอง -->
            <div v-if="form.fields.length > 0" class="selected-fields">
              <div class="select-header">
                <span>ฟิลด์ที่เลือก ({{ form.fields.length }})</span>
              </div>
              <div class="fields-preview">
                <div v-for="(field, index) in form.fields" :key="index" class="field-item">
                  <div class="field-info">
                    <span class="field-name">{{ field.name }}</span>
                    <span class="field-type">{{ getFieldTypeName(field.field_type) }}</span>
                    <span v-if="field.unit" class="field-unit">({{ field.unit }})</span>
                    <span v-if="field.isCustom" class="field-custom-badge">เพิ่มเอง</span>
                  </div>
                  <button type="button" class="btn-remove" @click="removeField(index)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Add Custom Field (ใช้ได้ทุก template) -->
          <div v-if="modalMode === 'create'" class="add-field-section">
            <div class="add-field-form">
              <input type="text" v-model="newField.name" placeholder="ชื่อฟิลด์">
              <select v-model="newField.field_type">
                <option value="number">ตัวเลข</option>
                <option value="time">เวลา</option>
                <option value="reps">จำนวนครั้ง</option>
                <option value="distance">ระยะทาง</option>
                <option value="text">ข้อความ</option>
              </select>
              <input type="text" v-model="newField.unit" placeholder="หน่วย (เช่น kg, cm)">
              <button type="button" class="btn-add-field" @click="addField" :disabled="!newField.name">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
            </div>
          </div>

          <!-- Status (เฉพาะตอนแก้ไข) -->
          <div v-if="modalMode === 'edit'" class="form-group">
            <label>สถานะ</label>
            <select v-model="form.is_active">
              <option :value="true">ใช้งานอยู่</option>
              <option :value="false">ปิดใช้งาน</option>
            </select>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="closeModal">ยกเลิก</button>
          <button type="button" class="btn-primary" @click="savePlan" :disabled="saving || !isFormValid">
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>


<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTrackingStore, PLAN_TEMPLATES } from '@/stores/tracking'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'

const router = useRouter()
const trackingStore = useTrackingStore()
const authStore = useAuthStore()

// UI State
const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const modalMode = ref('create') // 'create' หรือ 'edit'
const selectedTemplate = ref('weight_control')
const editingPlan = ref(null)

// Filter State
const filterStatus = ref('')
const filterType = ref('')
const searchQuery = ref('')

// Templates
const templates = PLAN_TEMPLATES

// Form State
const form = ref({
  name: '',
  description: '',
  plan_type: 'weight_control',
  start_date: '',
  end_date: '',
  is_active: true,
  fields: []
})

// New Field (สำหรับ custom template)
const newField = ref({
  name: '',
  field_type: 'number',
  unit: '',
  is_required: false
})

// ตรวจสอบสิทธิ์
const canCreate = computed(() => authStore.isAdmin || authStore.isCoach)

function canEdit(plan) {
  if (authStore.isAdmin) return true
  if (authStore.isCoach && plan.created_by === authStore.user?.id) return true
  return false
}

function canDelete(plan) {
  return canEdit(plan) && plan.is_active
}

// Quick Stats - สถิติภาพรวม
const activePlansCount = computed(() => {
  return trackingStore.plans.filter(p => p.is_active).length
})

const totalAthletesInPlans = computed(() => {
  return trackingStore.plans.reduce((sum, p) => sum + (p.athlete_count || 0), 0)
})

const urgentPlansCount = computed(() => {
  return trackingStore.plans.filter(p => p.is_active && isUrgent(p)).length
})

// ตรวจสอบว่าแผนใกล้สิ้นสุดหรือไม่ (ภายใน 7 วัน)
function isUrgent(plan) {
  if (!plan.is_active || !plan.end_date) return false
  const daysLeft = getDaysLeft(plan)
  return daysLeft >= 0 && daysLeft <= 7
}

// คำนวณจำนวนวันที่เหลือ
function getDaysLeft(plan) {
  if (!plan.end_date) return null
  const end = new Date(plan.end_date)
  const now = new Date()
  end.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

// Format วันที่แบบสั้น
function formatDateShort(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short'
  })
}

// กรองแผน
const filteredPlans = computed(() => {
  let result = [...trackingStore.plans]

  // กรองตามสถานะ
  if (filterStatus.value === 'active') {
    result = result.filter(p => p.is_active)
  } else if (filterStatus.value === 'inactive') {
    result = result.filter(p => !p.is_active)
  }

  // กรองตามประเภท
  if (filterType.value) {
    result = result.filter(p => p.plan_type === filterType.value)
  }

  // ค้นหาตามชื่อ
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    )
  }

  return result
})

// ตรวจสอบฟอร์ม
const isFormValid = computed(() => {
  return form.value.name && 
         form.value.plan_type && 
         form.value.start_date && 
         form.value.end_date &&
         (modalMode.value === 'edit' || form.value.fields.length > 0)
})

// ฟิลด์จาก template ที่เลือก
const templateFields = computed(() => {
  if (selectedTemplate.value === 'custom') return []
  return templates[selectedTemplate.value]?.fields || []
})

// ตรวจสอบว่าฟิลด์ถูกเลือกหรือไม่
function isFieldSelected(field) {
  return form.value.fields.some(f => f.name === field.name && !f.isCustom)
}

// เลือก/ยกเลิกฟิลด์จาก template
function toggleTemplateField(field) {
  const index = form.value.fields.findIndex(f => f.name === field.name && !f.isCustom)
  if (index === -1) {
    // เพิ่มฟิลด์
    form.value.fields.push({ ...field, isCustom: false })
  } else {
    // ลบฟิลด์
    form.value.fields.splice(index, 1)
  }
}

// เลือกทั้งหมดจาก template
function selectAllTemplateFields() {
  templateFields.value.forEach(field => {
    if (!isFieldSelected(field)) {
      form.value.fields.push({ ...field, isCustom: false })
    }
  })
}

// ยกเลิกทั้งหมดจาก template
function deselectAllTemplateFields() {
  form.value.fields = form.value.fields.filter(f => f.isCustom)
}

// Helper Functions
function getPlanTypeName(type) {
  const types = {
    weight_control: 'ควบคุมน้ำหนัก',
    timing: 'จับเวลา',
    strength: 'ความแข็งแรง',
    general: 'ค่าร่างกายทั่วไป'
  }
  return types[type] || type
}

function getFieldTypeName(type) {
  const types = {
    number: 'ตัวเลข',
    time: 'เวลา',
    reps: 'จำนวนครั้ง',
    distance: 'ระยะทาง',
    text: 'ข้อความ',
    select: 'ตัวเลือก'
  }
  return types[type] || type
}

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
}

function getAthleteCount(plan) {
  // นับจำนวนนักกีฬาจาก goals (unique athlete_id)
  // ถ้ามี athlete_count จาก query ให้ใช้ค่านั้น
  if (plan.athlete_count !== undefined) {
    return plan.athlete_count
  }
  return 0
}

// Modal Functions
function openCreateModal() {
  modalMode.value = 'create'
  editingPlan.value = null
  selectedTemplate.value = 'weight_control'
  
  // ตั้งค่าเริ่มต้น
  const today = new Date()
  const endDate = new Date()
  endDate.setMonth(endDate.getMonth() + 3) // 3 เดือนข้างหน้า
  
  form.value = {
    name: '',
    description: '',
    plan_type: 'weight_control',
    start_date: today.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    is_active: true,
    fields: [...templates.weight_control.fields]
  }
  
  showModal.value = true
}

function openEditModal(plan) {
  modalMode.value = 'edit'
  editingPlan.value = plan
  
  form.value = {
    name: plan.name,
    description: plan.description || '',
    plan_type: plan.plan_type,
    start_date: plan.start_date,
    end_date: plan.end_date,
    is_active: plan.is_active,
    fields: []
  }
  
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  editingPlan.value = null
}

function selectTemplate(templateKey) {
  selectedTemplate.value = templateKey
  
  // เก็บฟิลด์ที่เพิ่มเองไว้
  const customFields = form.value.fields.filter(f => f.isCustom)
  
  if (templateKey === 'custom') {
    form.value.fields = customFields
    form.value.plan_type = 'general'
  } else if (templates[templateKey]) {
    // เลือกทุกฟิลด์จาก template + ฟิลด์ที่เพิ่มเอง
    form.value.fields = [
      ...templates[templateKey].fields.map(f => ({ ...f, isCustom: false })),
      ...customFields
    ]
    form.value.plan_type = templateKey
  }
}

function addField() {
  if (!newField.value.name) return
  
  // ตรวจสอบว่าชื่อซ้ำหรือไม่
  if (form.value.fields.some(f => f.name === newField.value.name)) {
    alert('มีฟิลด์ชื่อนี้อยู่แล้ว')
    return
  }
  
  form.value.fields.push({
    name: newField.value.name,
    field_type: newField.value.field_type,
    unit: newField.value.unit,
    is_required: newField.value.is_required,
    isCustom: true // mark ว่าเป็นฟิลด์ที่เพิ่มเอง
  })
  
  // รีเซ็ตฟอร์ม
  newField.value = {
    name: '',
    field_type: 'number',
    unit: '',
    is_required: false
  }
}

function removeField(index) {
  form.value.fields.splice(index, 1)
}

async function savePlan() {
  if (!isFormValid.value) return
  
  saving.value = true
  
  let result
  if (modalMode.value === 'create') {
    result = await trackingStore.createPlan(form.value, selectedTemplate.value !== 'custom' ? selectedTemplate.value : null)
  } else {
    result = await trackingStore.updatePlan(editingPlan.value.id, form.value)
  }
  
  saving.value = false
  
  if (result.success) {
    closeModal()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

async function confirmDeactivate(plan) {
  if (confirm(`ต้องการปิดใช้งานแผน "${plan.name}" หรือไม่?\n\nข้อมูล logs ที่บันทึกไว้จะยังคงอยู่`)) {
    const result = await trackingStore.deletePlan(plan.id)
    if (!result.success) {
      alert(result.message || 'ไม่สามารถปิดใช้งานได้')
    }
  }
}

function viewPlanDetail(plan) {
  router.push(`/tracking/${plan.id}`)
}

// Lifecycle
onMounted(async () => {
  loading.value = true
  await trackingStore.fetchPlans()
  loading.value = false
})
</script>


<style scoped>
.tracking-plans-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header แบบใหม่ */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 56px;
  height: 56px;
  background: #171717;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-icon svg {
  width: 28px;
  height: 28px;
  color: #fff;
}

.page-header h1 {
  font-size: 26px;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 4px 0 0;
  font-size: 14px;
}

/* Quick Stats */
.quick-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.quick-stat {
  display: flex;
  flex-direction: column;
  padding: 16px 24px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  min-width: 120px;
}

.quick-stat.urgent {
  background: #FEF3C7;
  border-color: #F59E0B;
}

.quick-stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #171717;
}

.quick-stat.urgent .quick-stat-value {
  color: #B45309;
}

.quick-stat-label {
  font-size: 13px;
  color: #737373;
}

.quick-stat.urgent .quick-stat-label {
  color: #92400E;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-primary:hover {
  background: #262626;
}

.btn-primary:disabled {
  background: #A3A3A3;
  cursor: not-allowed;
}

.btn-primary svg {
  width: 18px;
  height: 18px;
}

.btn-primary-sm {
  background: #171717;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  font-weight: 500;
}

.btn-primary-sm:hover {
  background: #262626;
}

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-icon {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

.btn-icon:hover {
  background: #F5F5F5;
}

.btn-icon.btn-danger:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon.btn-danger:hover svg {
  stroke: #EF4444;
}

/* Filters แบบใหม่ */
.filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-tabs {
  display: flex;
  background: #F5F5F5;
  border-radius: 8px;
  padding: 4px;
}

.filter-tab {
  padding: 8px 16px;
  border: none;
  background: transparent;
  border-radius: 6px;
  font-size: 14px;
  color: #525252;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s;
}

.filter-tab:hover {
  color: #171717;
}

.filter-tab.active {
  background: #fff;
  color: #171717;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.filter-right {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filter-select {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  min-width: 140px;
}

.search-input-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  color: #A3A3A3;
}

.search-input-wrapper input {
  padding: 8px 12px 8px 36px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  width: 200px;
}

/* Loading */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #737373;
  gap: 12px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Plans Grid - Card แบบใหม่ */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.plan-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
}

.plan-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.plan-card.inactive {
  opacity: 0.6;
  background: #FAFAFA;
}

.plan-card.urgent {
  border-color: #F59E0B;
  border-width: 2px;
}

/* Card Top */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-type-icon {
  width: 44px;
  height: 44px;
  background: #171717;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-type-icon svg {
  width: 22px;
  height: 22px;
  color: #fff;
}

.card-badges {
  display: flex;
  gap: 6px;
  align-items: center;
}

.badge-urgent {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: #FEF3C7;
  color: #B45309;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.badge-urgent svg {
  width: 12px;
  height: 12px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}

.status-inactive {
  background: #F3F4F6;
  color: #6B7280;
}

/* Card Main */
.card-main {
  margin-bottom: 12px;
}

.plan-card h3 {
  font-size: 17px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
  line-height: 1.3;
}

.plan-type-label {
  font-size: 12px;
  color: #737373;
}

/* Card Bottom */
.card-bottom {
  display: flex;
  gap: 16px;
  padding: 10px 0;
  border-top: 1px solid #F5F5F5;
  border-bottom: 1px solid #F5F5F5;
  margin-bottom: 12px;
}

.card-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
}

.card-stat svg {
  width: 16px;
  height: 16px;
  color: #A3A3A3;
}

/* Card Actions */
.card-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
}

.btn-view {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background 0.15s;
}

.btn-view:hover {
  background: #262626;
}

.btn-view svg {
  width: 14px;
  height: 14px;
}

.action-buttons {
  display: flex;
  gap: 6px;
}

.btn-icon-sm {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-sm svg {
  width: 14px;
  height: 14px;
  color: #525252;
}

.btn-icon-sm:hover {
  background: #F5F5F5;
}

.btn-icon-sm.danger:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon-sm.danger:hover svg {
  color: #EF4444;
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 60px 24px;
  background: #FAFAFA;
  border-radius: 12px;
  border: 2px dashed #E5E5E5;
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: #E5E5E5;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}

.empty-icon svg {
  width: 32px;
  height: 32px;
  color: #A3A3A3;
}

.empty-state h3 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 8px;
}

.empty-state p {
  color: #737373;
  margin: 0 0 20px;
  font-size: 14px;
}

/* Modal Form */
.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

.form-group textarea {
  resize: vertical;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Template Grid */
.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.template-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 12px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  transition: all 0.2s;
}

.template-btn:hover {
  border-color: #A3A3A3;
}

.template-btn.active {
  border-color: #171717;
  background: #F5F5F5;
}

.template-name {
  font-weight: 500;
  color: #171717;
  font-size: 14px;
}

.template-fields {
  font-size: 12px;
  color: #737373;
}

/* Template Fields Selection */
.template-fields-select,
.selected-fields {
  margin-bottom: 12px;
}

.select-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: #525252;
}

.select-actions {
  display: flex;
  gap: 12px;
}

.btn-link {
  background: none;
  border: none;
  color: #525252;
  font-size: 12px;
  cursor: pointer;
  padding: 2px 4px;
}

.btn-link:hover {
  color: #171717;
  text-decoration: underline;
}

.template-fields-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 150px;
  overflow-y: auto;
  padding: 8px;
  background: #FAFAFA;
  border-radius: 8px;
}

.field-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.field-checkbox:hover {
  border-color: #A3A3A3;
}

.field-checkbox.selected {
  border-color: #171717;
  background: #F5F5F5;
}

.field-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: #171717;
}

.field-custom-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #171717;
  color: #fff;
  border-radius: 4px;
  margin-left: auto;
}

/* Fields Preview */
.fields-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.field-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #F5F5F5;
  border-radius: 6px;
}

.field-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field-name {
  font-weight: 500;
  color: #171717;
}

.field-type {
  font-size: 12px;
  color: #737373;
  padding: 2px 6px;
  background: #E5E5E5;
  border-radius: 4px;
}

.field-unit {
  font-size: 12px;
  color: #525252;
}

.btn-remove {
  background: transparent;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: #A3A3A3;
}

.btn-remove:hover {
  color: #EF4444;
}

.btn-remove svg {
  width: 16px;
  height: 16px;
}

/* Add Field Section */
.add-field-section {
  padding-top: 12px;
  border-top: 1px dashed #E5E5E5;
}

.add-field-form {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-field-form input,
.add-field-form select {
  padding: 8px 10px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 13px;
}

.add-field-form input:first-child {
  flex: 1;
}

.add-field-form select {
  width: 100px;
}

.add-field-form input:last-of-type {
  width: 80px;
}

.btn-add-field {
  background: #171717;
  color: #fff;
  border: none;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-add-field:disabled {
  background: #A3A3A3;
  cursor: not-allowed;
}

.btn-add-field svg {
  width: 18px;
  height: 18px;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .tracking-plans-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .quick-stats {
    flex-wrap: wrap;
  }

  .quick-stat {
    flex: 1;
    min-width: 100px;
    padding: 12px 16px;
  }

  .quick-stat-value {
    font-size: 24px;
  }

  .filters {
    flex-direction: column;
    gap: 12px;
  }

  .filter-tabs {
    width: 100%;
    justify-content: center;
  }

  .filter-right {
    width: 100%;
    flex-direction: column;
  }

  .filter-select,
  .search-input-wrapper input {
    width: 100%;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: column;
    gap: 8px;
  }

  .btn-view {
    width: 100%;
    justify-content: center;
  }

  .action-buttons {
    width: 100%;
    justify-content: flex-end;
  }

  .filters {
    flex-direction: column;
  }

  .filter-group {
    width: 100%;
  }

  .filter-group select,
  .filter-group input {
    width: 100%;
    min-width: auto;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .template-grid {
    grid-template-columns: 1fr;
  }

  .add-field-form {
    flex-wrap: wrap;
  }

  .add-field-form input:first-child {
    width: 100%;
    flex: none;
  }
}
</style>
