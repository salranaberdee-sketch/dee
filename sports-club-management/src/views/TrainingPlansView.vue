<template>
  <div class="training-plans-page">
    <!-- Header -->
    <div class="page-header">
      <div>
        <h1>แผนพัฒนานักกีฬา</h1>
        <p class="subtitle">สร้างและจัดการแผนพัฒนาพร้อมติดตามความคืบหน้า</p>
      </div>
      <button v-if="canCreate" class="btn-primary" @click="openModal('add')">
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
        <select v-model="filterActive">
          <option value="">ทั้งหมด</option>
          <option value="active">ใช้งานอยู่</option>
          <option value="inactive">ปิดใช้งาน</option>
        </select>
      </div>
      <div class="filter-group">
        <label>ค้นหา</label>
        <input type="text" v-model="searchQuery" placeholder="ชื่อแผน...">
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading">กำลังโหลด...</div>

    <!-- Plans Grid -->
    <div v-else class="plans-grid">
      <div 
        v-for="plan in filteredPlans" 
        :key="plan.id" 
        class="plan-card"
        :class="{ inactive: !plan.is_active }"
      >
        <div class="card-header">
          <div class="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
          </div>
          <span :class="['status-badge', plan.is_active ? 'status-active' : 'status-inactive']">
            {{ plan.is_active ? 'ใช้งานอยู่' : 'ปิดใช้งาน' }}
          </span>
        </div>

        <h3>{{ plan.name }}</h3>
        <p class="description">{{ plan.description || 'ไม่มีคำอธิบาย' }}</p>

        <div class="card-stats">
          <div class="stat">
            <span class="stat-value">{{ plan.total_levels }}</span>
            <span class="stat-label">ระดับ</span>
          </div>
          <div class="stat">
            <span class="stat-value">{{ plan.athlete_count || 0 }}</span>
            <span class="stat-label">นักกีฬา</span>
          </div>
        </div>

        <div class="card-actions">
          <router-link :to="`/training-plans/${plan.id}`" class="btn-primary-sm">
            จัดการนักกีฬา
          </router-link>
          <button v-if="canEdit(plan)" class="btn-icon" @click="openModal('edit', plan)" title="แก้ไข">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button v-if="canDelete(plan)" class="btn-icon btn-danger" @click="confirmDelete(plan)" title="ปิดใช้งาน">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div v-if="filteredPlans.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <p>ยังไม่มีแผนพัฒนา</p>
        <button v-if="canCreate" class="btn-primary" @click="openModal('add')">สร้างแผนแรก</button>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Modal v-if="showModal" @close="closeModal">
      <template #header>
        <h2>{{ modalMode === 'add' ? 'สร้างแผนพัฒนาใหม่' : 'แก้ไขแผนพัฒนา' }}</h2>
      </template>
      <template #body>
        <form @submit.prevent="savePlan" class="form">
          <div class="form-group">
            <label>ชื่อแผน *</label>
            <input type="text" v-model="form.name" required placeholder="เช่น พัฒนาทักษะพื้นฐาน">
          </div>
          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="form.description" rows="3" placeholder="อธิบายเป้าหมายของแผน..."></textarea>
          </div>
          <div class="form-group" v-if="modalMode === 'add'">
            <label>จำนวนระดับ *</label>
            <input type="number" v-model.number="form.total_levels" min="1" max="20" required>
            <span class="hint">กำหนดได้ 1-20 ระดับ</span>
          </div>
          <div class="form-group" v-if="modalMode === 'edit'">
            <label>สถานะ</label>
            <select v-model="form.is_active">
              <option :value="true">ใช้งานอยู่</option>
              <option :value="false">ปิดใช้งาน</option>
            </select>
          </div>

          <!-- ตั้งชื่อระดับ (เฉพาะตอนสร้างใหม่) -->
          <div v-if="modalMode === 'add' && form.total_levels > 0" class="levels-config">
            <label>ตั้งชื่อระดับ</label>
            <div class="levels-list">
              <div v-for="i in form.total_levels" :key="i" class="level-item">
                <span class="level-number">{{ i }}</span>
                <input 
                  type="text" 
                  v-model="form.levels[i-1].name" 
                  :placeholder="`ระดับ ${i}`"
                >
              </div>
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <button type="button" class="btn-secondary" @click="closeModal">ยกเลิก</button>
        <button type="button" class="btn-primary" @click="savePlan" :disabled="saving">
          {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTrainingPlansStore } from '@/stores/trainingPlans'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'

const plansStore = useTrainingPlansStore()
const authStore = useAuthStore()

const loading = ref(false)
const saving = ref(false)
const showModal = ref(false)
const modalMode = ref('add')
const filterActive = ref('')
const searchQuery = ref('')

// ตรวจสอบสิทธิ์
const canCreate = computed(() => authStore.isAdmin || authStore.isCoach)

function canEdit(plan) {
  if (authStore.isAdmin) return true
  if (authStore.isCoach && plan.created_by === authStore.user?.id) return true
  return false
}

function canDelete(plan) {
  return canEdit(plan)
}

// Form
const form = ref({
  name: '',
  description: '',
  total_levels: 5,
  is_active: true,
  levels: []
})

// สร้าง levels array เมื่อ total_levels เปลี่ยน
watch(() => form.value.total_levels, (newVal) => {
  const currentLevels = form.value.levels || []
  form.value.levels = Array.from({ length: newVal }, (_, i) => ({
    name: currentLevels[i]?.name || `ระดับ ${i + 1}`,
    description: currentLevels[i]?.description || ''
  }))
}, { immediate: true })

// กรองแผน
const filteredPlans = computed(() => {
  let result = plansStore.plans

  if (filterActive.value === 'active') {
    result = result.filter(p => p.is_active)
  } else if (filterActive.value === 'inactive') {
    result = result.filter(p => !p.is_active)
  }

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    )
  }

  return result
})

function openModal(mode, plan = null) {
  modalMode.value = mode
  if (mode === 'edit' && plan) {
    form.value = {
      id: plan.id,
      name: plan.name,
      description: plan.description || '',
      total_levels: plan.total_levels,
      is_active: plan.is_active,
      levels: []
    }
  } else {
    form.value = {
      name: '',
      description: '',
      total_levels: 5,
      is_active: true,
      levels: Array.from({ length: 5 }, (_, i) => ({
        name: `ระดับ ${i + 1}`,
        description: ''
      }))
    }
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

async function savePlan() {
  saving.value = true

  let result
  if (modalMode.value === 'add') {
    result = await plansStore.createPlan(form.value)
  } else {
    result = await plansStore.updatePlan(form.value.id, form.value)
  }

  saving.value = false
  if (result.success) {
    closeModal()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

async function confirmDelete(plan) {
  if (confirm(`ต้องการปิดใช้งานแผน "${plan.name}" หรือไม่?`)) {
    const result = await plansStore.deletePlan(plan.id)
    if (!result.success) {
      alert(result.message || 'ไม่สามารถลบได้')
    }
  }
}

onMounted(async () => {
  loading.value = true
  await plansStore.fetchPlans()
  loading.value = false
})
</script>

<style scoped>
.training-plans-page {
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
}

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
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-secondary svg {
  width: 16px;
  height: 16px;
}

.btn-icon {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
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
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
  min-width: 160px;
}

.loading {
  text-align: center;
  padding: 48px;
  color: #737373;
}

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
  margin: 0 0 16px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

.hint {
  font-size: 12px;
  color: #737373;
}

.levels-config {
  margin-top: 8px;
}

.levels-config > label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  display: block;
  margin-bottom: 8px;
}

.levels-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.level-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-number {
  width: 28px;
  height: 28px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  flex-shrink: 0;
}

.level-item input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>
