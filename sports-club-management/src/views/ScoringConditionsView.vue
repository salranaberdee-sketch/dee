<template>
  <div class="scoring-conditions-view">
    <!-- Header with back button -->
    <div class="page-header">
      <div class="header-content">
        <router-link to="/scoring-hub" class="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </router-link>
        <div>
          <h1>โบนัส/หักคะแนน</h1>
          <p class="subtitle">กำหนดเงื่อนไขเพิ่ม/ลดคะแนนอัตโนมัติ</p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <!-- Content -->
    <div v-else class="conditions-content">
      <!-- Add Button -->
      <button class="btn-add" @click="showAddForm = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        เพิ่มเงื่อนไข
      </button>

      <!-- Conditions List -->
      <div v-if="conditions.length > 0" class="conditions-list">
        <div 
          v-for="condition in conditions" 
          :key="condition.id"
          class="condition-card"
          :class="condition.condition_type"
        >
          <div class="condition-header">
            <span class="condition-type" :class="condition.condition_type">
              {{ condition.condition_type === 'bonus' ? '+' : '-' }}{{ condition.points }}
            </span>
            <span class="condition-name">{{ condition.name }}</span>
          </div>
          <p class="condition-desc">{{ condition.description }}</p>
          <div class="condition-rule">
            {{ getCategoryLabel(condition.category) }} 
            {{ condition.comparison_operator }} 
            {{ condition.threshold_value }}{{ condition.threshold_type === 'percentage' ? '%' : '' }}
          </div>
          <div class="condition-actions">
            <button class="btn-edit" @click="editCondition(condition)">แก้ไข</button>
            <button class="btn-delete" @click="deleteCondition(condition.id)">ลบ</button>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="11"/>
          <line x1="9" y1="8" x2="15" y2="8"/>
          <line x1="9" y1="16" x2="15" y2="16"/>
          <rect x="3" y="3" width="18" height="18" rx="2"/>
        </svg>
        <h3>ยังไม่มีเงื่อนไข</h3>
        <p>เพิ่มเงื่อนไขโบนัส/หักคะแนนเพื่อปรับคะแนนอัตโนมัติ</p>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showAddForm" class="modal-overlay" @click.self="closeForm">
      <div class="modal-content">
        <h2>{{ editingCondition ? 'แก้ไขเงื่อนไข' : 'เพิ่มเงื่อนไข' }}</h2>
        
        <form @submit.prevent="saveCondition">
          <div class="form-group">
            <label>ชื่อเงื่อนไข</label>
            <input v-model="form.name" type="text" required placeholder="เช่น โบนัสเข้าร่วมครบ" />
          </div>
          
          <div class="form-group">
            <label>ประเภท</label>
            <select v-model="form.condition_type" required>
              <option value="bonus">โบนัส (+)</option>
              <option value="penalty">หักคะแนน (-)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>หมวดหมู่</label>
            <select v-model="form.category" required>
              <option value="attendance">การเข้าร่วม</option>
              <option value="training">การฝึกซ้อม</option>
              <option value="rating">คะแนนประเมิน</option>
              <option value="custom">กำหนดเอง</option>
            </select>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>เงื่อนไข</label>
              <select v-model="form.comparison_operator" required>
                <option value=">=">มากกว่าหรือเท่ากับ (>=)</option>
                <option value=">">มากกว่า (>)</option>
                <option value="<=">น้อยกว่าหรือเท่ากับ (<=)</option>
                <option value="<">น้อยกว่า (<)</option>
                <option value="=">เท่ากับ (=)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>ค่า</label>
              <input v-model.number="form.threshold_value" type="number" required min="0" />
            </div>
          </div>
          
          <div class="form-group">
            <label>คะแนน</label>
            <input v-model.number="form.points" type="number" required min="1" placeholder="จำนวนคะแนน" />
          </div>
          
          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="form.description" rows="2" placeholder="อธิบายเงื่อนไข (ไม่บังคับ)"></textarea>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-cancel" @click="closeForm">ยกเลิก</button>
            <button type="submit" class="btn-save" :disabled="saving">
              {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useScoringCriteriaStore } from '@/stores/scoringCriteria'
import { useAuthStore } from '@/stores/auth'

const scoringCriteriaStore = useScoringCriteriaStore()
const authStore = useAuthStore()

// State
const loading = ref(false)
const saving = ref(false)
const showAddForm = ref(false)
const editingCondition = ref(null)
const conditions = ref([])

const form = ref({
  name: '',
  condition_type: 'bonus',
  category: 'attendance',
  comparison_operator: '>=',
  threshold_type: 'percentage',
  threshold_value: 80,
  points: 5,
  description: ''
})

// Methods
function getCategoryLabel(category) {
  const labels = {
    attendance: 'การเข้าร่วม',
    training: 'ชั่วโมงฝึกซ้อม',
    rating: 'คะแนนประเมิน',
    custom: 'ค่าที่กำหนด'
  }
  return labels[category] || category
}

function editCondition(condition) {
  editingCondition.value = condition
  form.value = { ...condition }
  showAddForm.value = true
}

function closeForm() {
  showAddForm.value = false
  editingCondition.value = null
  form.value = {
    name: '',
    condition_type: 'bonus',
    category: 'attendance',
    comparison_operator: '>=',
    threshold_type: 'percentage',
    threshold_value: 80,
    points: 5,
    description: ''
  }
}

async function saveCondition() {
  saving.value = true
  try {
    const clubId = authStore.profile?.club_id
    if (!clubId) throw new Error('ไม่พบข้อมูลชมรม')
    
    if (editingCondition.value) {
      await scoringCriteriaStore.updateCondition(editingCondition.value.id, form.value)
    } else {
      await scoringCriteriaStore.createCondition(clubId, form.value)
    }
    
    await loadConditions()
    closeForm()
  } catch (err) {
    console.error('Error saving condition:', err)
    alert(err.message)
  } finally {
    saving.value = false
  }
}

async function deleteCondition(id) {
  if (!confirm('ต้องการลบเงื่อนไขนี้?')) return
  
  try {
    await scoringCriteriaStore.deleteCondition(id)
    await loadConditions()
  } catch (err) {
    console.error('Error deleting condition:', err)
    alert(err.message)
  }
}

async function loadConditions() {
  loading.value = true
  try {
    const clubId = authStore.profile?.club_id
    if (clubId) {
      await scoringCriteriaStore.fetchConditions(clubId)
      conditions.value = scoringCriteriaStore.conditions || []
    }
  } catch (err) {
    console.error('Error loading conditions:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadConditions()
})
</script>

<style scoped>
.scoring-conditions-view {
  padding: 1.5rem;
  max-width: 600px;
  margin: 0 auto;
}

/* Header */
.page-header {
  margin-bottom: 1.5rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-link {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #F5F5F5;
  border-radius: 8px;
  color: #525252;
}

.back-link:hover {
  background: #E5E5E5;
}

.back-link svg {
  width: 20px;
  height: 20px;
}

h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

/* Loading */
.loading-state {
  display: flex;
  justify-content: center;
  padding: 3rem;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #E5E5E5;
  border-top-color: #171717;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Add Button */
.btn-add {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.75rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 1rem;
}

.btn-add svg {
  width: 18px;
  height: 18px;
}

/* Conditions List */
.conditions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.condition-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 1rem;
}

.condition-card.bonus {
  border-left: 4px solid #22C55E;
}

.condition-card.penalty {
  border-left: 4px solid #EF4444;
}

.condition-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.condition-type {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 600;
}

.condition-type.bonus {
  background: #D1FAE5;
  color: #065F46;
}

.condition-type.penalty {
  background: #FEE2E2;
  color: #991B1B;
}

.condition-name {
  font-weight: 600;
  color: #171717;
}

.condition-desc {
  font-size: 0.875rem;
  color: #737373;
  margin: 0 0 0.5rem;
}

.condition-rule {
  font-size: 0.8rem;
  color: #525252;
  background: #F5F5F5;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.75rem;
}

.condition-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-edit,
.btn-delete {
  padding: 0.35rem 0.75rem;
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-edit {
  background: #F5F5F5;
  border: 1px solid #E5E5E5;
  color: #525252;
}

.btn-delete {
  background: #FEE2E2;
  border: 1px solid #FECACA;
  color: #991B1B;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 3rem;
  text-align: center;
  color: #737373;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 0.5rem;
  color: #525252;
}

.empty-state p {
  margin: 0;
  font-size: 0.875rem;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 100;
}

.modal-content {
  background: #fff;
  border-radius: 12px;
  padding: 1.5rem;
  width: 100%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-content h2 {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0 0 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: #525252;
  margin-bottom: 0.35rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.btn-cancel {
  flex: 1;
  padding: 0.75rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
}

.btn-save {
  flex: 1;
  padding: 0.75rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.btn-save:disabled {
  background: #A3A3A3;
}

/* Responsive */
@media (max-width: 640px) {
  .scoring-conditions-view {
    padding: 1rem;
  }
}
</style>
