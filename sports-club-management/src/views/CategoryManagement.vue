<script setup>
/**
 * CategoryManagement View
 * Admin-only view for managing activity categories
 * Requirements: 6.1, 6.2, 6.3
 */
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'

const auth = useAuthStore()
const data = useDataStore()

const loading = ref(true)
const allCategories = ref([])
const showModal = ref(false)
const editingCategory = ref(null)
const form = ref({
  name: '',
  icon: '',
  sort_order: 0
})

// Available icons for categories
const availableIcons = [
  { value: 'run', label: 'วิ่ง' },
  { value: 'swim', label: 'ว่ายน้ำ' },
  { value: 'weight', label: 'ยกน้ำหนัก' },
  { value: 'stretch', label: 'ยืดเหยียด' },
  { value: 'sport', label: 'กีฬา' },
  { value: 'bike', label: 'จักรยาน' },
  { value: 'ball', label: 'บอล' },
  { value: 'other', label: 'อื่นๆ' }
]

// Computed: Active categories count
const activeCount = computed(() => allCategories.value.filter(c => c.is_active).length)
const inactiveCount = computed(() => allCategories.value.filter(c => !c.is_active).length)

onMounted(async () => {
  await loadCategories()
})

async function loadCategories() {
  loading.value = true
  try {
    allCategories.value = await data.fetchAllActivityCategories()
  } catch (err) {
    console.error('Failed to load categories:', err)
  } finally {
    loading.value = false
  }
}

function openAddModal() {
  editingCategory.value = null
  form.value = {
    name: '',
    icon: 'other',
    sort_order: allCategories.value.length + 1
  }
  showModal.value = true
}

function openEditModal(category) {
  editingCategory.value = category
  form.value = {
    name: category.name,
    icon: category.icon || 'other',
    sort_order: category.sort_order || 0
  }
  showModal.value = true
}

async function saveCategory() {
  if (!form.value.name.trim()) {
    alert('กรุณาระบุชื่อหมวดหมู่')
    return
  }

  let result
  if (editingCategory.value) {
    // Update existing category
    result = await data.updateActivityCategory(editingCategory.value.id, {
      name: form.value.name,
      icon: form.value.icon,
      sort_order: form.value.sort_order
    })
  } else {
    // Add new category - Requirements 6.2
    result = await data.addActivityCategory({
      name: form.value.name,
      icon: form.value.icon,
      sort_order: form.value.sort_order
    })
  }

  if (result.success) {
    showModal.value = false
    await loadCategories()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

// Toggle category active status - Requirements 6.3
async function toggleCategoryStatus(category) {
  const newStatus = !category.is_active
  const action = newStatus ? 'เปิดใช้งาน' : 'ปิดใช้งาน'
  
  if (!confirm(`ยืนยัน${action}หมวดหมู่ "${category.name}"?`)) {
    return
  }

  const result = await data.updateActivityCategory(category.id, {
    is_active: newStatus
  })

  if (result.success) {
    await loadCategories()
  } else {
    alert(result.message || 'เกิดข้อผิดพลาด')
  }
}

function getIconSvg(iconName) {
  const icons = {
    run: '<path d="M13 4v2h-2V4h2zm-1 4a2 2 0 100-4 2 2 0 000 4zm-3 2l-3 9h2l2-6 2 2v4h2v-5l-2-2 .5-2.5c1 1.1 2.5 2 4 2.5v-2c-1.2-.4-2.2-1.1-2.8-2l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L5 9v3h2V9.5l2 1V15z"/>',
    swim: '<path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2c1.3 0 1.9-.5 2.5-1"/><path d="M2 14c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2s2.5 2 5 2c1.3 0 1.9-.5 2.5-1"/><path d="M9 8l-2 2 1.5 1.5L12 8l-1.5-1.5L9 8z"/><circle cx="16" cy="6" r="2"/>',
    weight: '<path d="M6.5 6.5h11v11h-11z"/><path d="M4 9v6h2V9H4zm14 0v6h2V9h-2z"/><path d="M2 10v4h2v-4H2zm18 0v4h2v-4h-2z"/>',
    stretch: '<circle cx="12" cy="5" r="2"/><path d="M12 7v5l-3 3m3-3l3 3m-3-8v-2"/>',
    sport: '<circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0110 10"/><path d="M12 2a10 10 0 00-10 10"/>',
    bike: '<circle cx="5" cy="17" r="3"/><circle cx="19" cy="17" r="3"/><path d="M12 17V5l4 4-4 4"/>',
    ball: '<circle cx="12" cy="12" r="10"/><path d="M12 2v20M2 12h20"/>',
    other: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>'
  }
  return icons[iconName] || icons.other
}
</script>

<template>
  <div class="category-management">
    <div class="page-header">
      <div>
        <h1 class="page-title">จัดการหมวดหมู่กิจกรรม</h1>
        <p class="subtitle">เพิ่ม แก้ไข หรือปิดใช้งานหมวดหมู่กิจกรรมการฝึกซ้อม</p>
      </div>
      <button class="btn-primary" @click="openAddModal">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        เพิ่มหมวดหมู่
      </button>
    </div>

    <div class="container">
      <!-- Stats Summary -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ allCategories.length }}</span>
          <span class="stat-label">หมวดหมู่ทั้งหมด</span>
        </div>
        <div class="stat-card">
          <span class="stat-value stat-active">{{ activeCount }}</span>
          <span class="stat-label">เปิดใช้งาน</span>
        </div>
        <div class="stat-card">
          <span class="stat-value stat-inactive">{{ inactiveCount }}</span>
          <span class="stat-label">ปิดใช้งาน</span>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>กำลังโหลด...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="allCategories.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
        <p>ยังไม่มีหมวดหมู่</p>
        <button class="btn-primary" @click="openAddModal">เพิ่มหมวดหมู่แรก</button>
      </div>

      <!-- Categories List -->
      <div v-else class="categories-list">
        <div 
          v-for="category in allCategories" 
          :key="category.id" 
          :class="['category-card', { inactive: !category.is_active }]"
        >
          <div class="category-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="getIconSvg(category.icon)"></svg>
          </div>
          <div class="category-info">
            <h3 class="category-name">{{ category.name }}</h3>
            <div class="category-meta">
              <span class="sort-order">ลำดับ: {{ category.sort_order }}</span>
              <span :class="['status-badge', category.is_active ? 'status-active' : 'status-inactive']">
                {{ category.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน' }}
              </span>
            </div>
          </div>
          <div class="category-actions">
            <button class="btn-icon" @click="openEditModal(category)" title="แก้ไข">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button 
              :class="['btn-toggle', { active: category.is_active }]" 
              @click="toggleCategoryStatus(category)"
              :title="category.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
            >
              <svg v-if="category.is_active" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Info Notice -->
      <div class="info-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4m0-4h.01"/>
        </svg>
        <span>การปิดใช้งานหมวดหมู่จะไม่ลบข้อมูลบันทึกที่มีอยู่ แต่จะซ่อนหมวดหมู่จากรายการเลือกสำหรับบันทึกใหม่</span>
      </div>
    </div>


    <!-- Add/Edit Modal -->
    <Modal :show="showModal" :title="editingCategory ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่'" @close="showModal = false">
      <form @submit.prevent="saveCategory" class="form">
        <div class="form-group">
          <label>ชื่อหมวดหมู่ *</label>
          <input v-model="form.name" class="form-control" placeholder="เช่น วิ่ง, ว่ายน้ำ" required />
        </div>
        <div class="form-group">
          <label>ไอคอน</label>
          <select v-model="form.icon" class="form-control">
            <option v-for="icon in availableIcons" :key="icon.value" :value="icon.value">
              {{ icon.label }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label>ลำดับการแสดง</label>
          <input v-model.number="form.sort_order" type="number" class="form-control" min="0" />
          <p class="form-hint">ตัวเลขน้อยจะแสดงก่อน</p>
        </div>
      </form>
      <template #footer>
        <button class="btn-secondary" @click="showModal = false">ยกเลิก</button>
        <button class="btn-primary" @click="saveCategory">บันทึก</button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.category-management {
  padding: 24px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
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

.btn-primary:hover { background: #262626; }
.btn-primary svg { width: 18px; height: 18px; }

.btn-secondary {
  background: #fff;
  color: #171717;
  border: 1px solid #E5E5E5;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-secondary:hover { background: #F5F5F5; }

.container { max-width: 100%; }

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: #171717;
}

.stat-value.stat-active { color: #22C55E; }
.stat-value.stat-inactive { color: #737373; }

.stat-label {
  font-size: 13px;
  color: #737373;
}

/* Loading & Empty States */
.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #737373;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
}

.loading-state svg, .empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Categories List */
.categories-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  transition: box-shadow 0.2s;
}

.category-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.category-card.inactive {
  opacity: 0.6;
  background: #FAFAFA;
}

.category-icon {
  width: 48px;
  height: 48px;
  background: #171717;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.category-info {
  flex: 1;
  min-width: 0;
}

.category-name {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

.category-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sort-order {
  font-size: 12px;
  color: #737373;
}

.status-badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-active {
  background: #D1FAE5;
  color: #065F46;
}

.status-inactive {
  background: #F5F5F5;
  color: #737373;
}

.category-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg { width: 18px; height: 18px; }
.btn-icon:hover { background: #F5F5F5; }

.btn-toggle {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-toggle svg { width: 18px; height: 18px; }
.btn-toggle:hover { background: #F5F5F5; }
.btn-toggle.active { border-color: #22C55E; color: #22C55E; }

/* Info Notice */
.info-notice {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  background: #F5F5F5;
  border-radius: 8px;
  font-size: 13px;
  color: #525252;
}

.info-notice svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  margin-top: 1px;
}

/* Form */
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

.form-control {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

.form-hint {
  font-size: 12px;
  color: #737373;
  margin: 0;
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .stats-row {
    grid-template-columns: 1fr;
  }

  .category-card {
    flex-wrap: wrap;
  }

  .category-actions {
    width: 100%;
    justify-content: flex-end;
    padding-top: 12px;
    border-top: 1px solid #E5E5E5;
    margin-top: 8px;
  }
}
</style>
