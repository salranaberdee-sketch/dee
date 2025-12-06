<template>
  <div class="tracking-plans-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>แผนติดตามนักกีฬา</h1>
        <p class="subtitle">สร้างและจัดการแผนติดตามค่าตัวเลขของนักกีฬา</p>
      </div>
      <button v-if="canCreate" class="btn-primary" @click="openCreateModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        สร้างแผนใหม่
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <div class="filter-group">
        <label>สถานะ</label>
        <select v-model="filterStatus">
          <option value="">ทั้งหมด</option>
          <option value="active">ใช้งานอยู่</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
      </div>
      <div class="filter-group">
        <label>ประเภท</label>
        <select v-model="filterType">
          <option value="">ทั้งหมด</option>
          <option value="weight_control">ควบคุมน้ำหนัก</option>
          <option value="timing">จับเวลา</option>
          <option value="strength">ความแข็งแรง</option>
          <option value="general">ค่าร่างกายทั่วไป</option>
        </select>
      </div>
      <div class="filter-group search-group">
        <label>ค้นหา</label>
        <div class="search-input-wrapper">
          <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" v-model="searchQuery" placeholder="ชื่อแผน...">
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Plans Grid -->
    <div v-else class="plans-grid">
      <div 
        v-for="plan in filteredPlans" 
        :key="plan.id" 
        class="plan-card"
        :class="{ inactive: !plan.is_active }"
        @click="viewPlanDetail(plan)"
      >
        <div class="card-header">
          <div class="card-icon">
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
          <span :class="['status-badge', plan.is_active ? 'status-active' : 'status-inactive']">
            {{ plan.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน' }}
          </span>
        </div>

        <h3>{{ plan.name }}</h3>
        <p class="description">{{ plan.description || 'ไม่มีคำอธิบาย' }}</p>
        <p class="plan-type">{{ getPlanTypeName(plan.plan_type) }}</p>

        <div class="date-range">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span>{{ formatDate(plan.start_date) }} - {{ formatDate(plan.end_date) }}</span>
        </div>

        <div class="card-stats">
          <div class="stat">
            <span class="stat-value">{{ plan.field_count || 0 }}</span>
            <span class="stat-label">ฟิลด์</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ getAthleteCount(plan) }}</span>
            <span class="stat-label">นักกีฬา</span>
          </div>
        </div>

        <div class="card-actions" @click.stop>
          <router-link :to="`/tracking/${plan.id}`" class="btn-primary-sm">
            ดูรายละเอียด
          </router-link>
          <button v-if="canEdit(plan)" class="btn-icon" @click="openEditModal(plan)" title="แก้ไข">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button v-if="canDelete(plan)" class="btn-icon btn-danger" @click="confirmDeactivate(plan)" title="ปิดใช้งาน">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="filteredPlans.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <p>{{ searchQuery || filterStatus || filterType ? 'ไม่พบแผนตามเงื่อนไข' : 'ยังไม่มีแผนติดตาม' }}</p>
        <button v-if="canCreate && !searchQuery && !filterStatus && !filterType" class="btn-primary" @click="openCreateModal">
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

          <!-- Fields Preview (เฉพาะตอนสร้างใหม่) -->
          <div v-if="modalMode === 'create' && form.fields.length > 0" class="form-group">
            <label>ฟิลด์ที่จะติดตาม</label>
            <div class="fields-preview">
              <div v-for="(field, index) in form.fields" :key="index" class="field-item">
                <div class="field-info">
                  <span class="field-name">{{ field.name }}</span>
                  <span class="field-type">{{ getFieldTypeName(field.field_type) }}</span>
                  <span v-if="field.unit" class="field-unit">({{ field.unit }})</span>
                </div>
                <button v-if="selectedTemplate === 'custom'" type="button" class="btn-remove" @click="removeField(index)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Add Custom Field (เฉพาะ custom template) -->
          <div v-if="modalMode === 'create' && selectedTemplate === 'custom'" class="add-field-section">
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
  
  if (templateKey === 'custom') {
    form.value.fields = []
    form.value.plan_type = 'general'
  } else if (templates[templateKey]) {
    form.value.fields = [...templates[templateKey].fields]
    form.value.plan_type = templateKey
  }
}

function addField() {
  if (!newField.value.name) return
  
  form.value.fields.push({
    name: newField.value.name,
    field_type: newField.value.field_type,
    unit: newField.value.unit,
    is_required: newField.value.is_required
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

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.subtitle {
  color: #737373;
  margin: 4px 0 0;
  font-size: 14px;
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

/* Filters */
.filters {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-group label {
  font-size: 12px;
  color: #737373;
  font-weight: 500;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  min-width: 160px;
  background: #fff;
}

.search-group {
  flex: 1;
  min-width: 200px;
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
  padding-left: 36px;
  width: 100%;
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

/* Plans Grid */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.plan-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}

.plan-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.plan-card.inactive {
  opacity: 0.7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}

.status-inactive {
  background: #F3F4F6;
  color: #6B7280;
}

.plan-card h3 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.description {
  color: #737373;
  font-size: 14px;
  margin: 0 0 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plan-type {
  font-size: 12px;
  color: #525252;
  margin: 0 0 12px;
  padding: 4px 8px;
  background: #F5F5F5;
  border-radius: 4px;
  display: inline-block;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #525252;
  margin-bottom: 16px;
}

.date-range svg {
  width: 16px;
  height: 16px;
  color: #A3A3A3;
}

.card-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
  padding: 12px;
  background: #FAFAFA;
  border-radius: 8px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
}

.stat-label {
  font-size: 12px;
  color: #737373;
}

.card-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #F5F5F5;
}

/* Empty State */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 48px;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 16px;
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
@media (max-width: 640px) {
  .tracking-plans-page {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
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
