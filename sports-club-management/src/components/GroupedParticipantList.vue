<template>
  <div class="grouped-participant-list">
    <!-- Bulk Action Toolbar -->
    <div v-if="selectedParticipants.size > 0" class="bulk-toolbar">
      <div class="bulk-info">
        <span class="selected-count">เลือก {{ selectedParticipants.size }} รายการ</span>
        <button class="btn-text" @click="clearSelection">ยกเลิกการเลือก</button>
      </div>
      <div class="bulk-actions">
        <button class="btn-secondary btn-sm" @click="showCategoryModal = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h7"/>
          </svg>
          เปลี่ยนรุ่น
        </button>
        <button class="btn-danger btn-sm" @click="confirmBulkRemove">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
          </svg>
          ลบ
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="participants.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
      <p>ยังไม่มีผู้เข้าแข่งขัน</p>
    </div>

    <!-- Grouped List -->
    <div v-else class="category-groups">
      <div 
        v-for="(group, index) in sortedGroups" 
        :key="group.category" 
        class="category-group"
      >
        <!-- Category Header -->
        <div 
          class="category-header" 
          @click="toggleCategory(group.category)"
        >
          <div class="category-info">
            <button class="expand-btn">
              <svg 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2"
                :class="{ expanded: expandedCategories.has(group.category) }"
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <span class="category-name">{{ group.displayName }}</span>
            <span class="category-count">{{ group.participants.length }}</span>
          </div>
          <div class="category-actions" @click.stop>
            <label class="checkbox-wrapper" v-if="canManage">
              <input 
                type="checkbox" 
                :checked="isCategoryFullySelected(group.category)"
                :indeterminate="isCategoryPartiallySelected(group.category)"
                @change="toggleCategorySelection(group.category)"
              />
              <span class="checkbox-label">เลือกทั้งหมด</span>
            </label>
          </div>
        </div>

        <!-- Participants in Category -->
        <div 
          v-show="expandedCategories.has(group.category)" 
          class="participants-container"
        >
          <div 
            v-for="participant in group.participants" 
            :key="participant.id" 
            class="participant-item"
          >
            <!-- Checkbox -->
            <label v-if="canManage" class="checkbox-cell">
              <input 
                type="checkbox" 
                :checked="selectedParticipants.has(participant.id)"
                @change="toggleParticipant(participant.id)"
              />
            </label>

            <!-- Avatar -->
            <div class="avatar">
              {{ getInitial(participant) }}
            </div>

            <!-- Info -->
            <div class="participant-info">
              <div class="name">{{ getAthleteName(participant) }}</div>
              <div class="meta">
                <span class="club">{{ getClubName(participant) }}</span>
                <span v-if="participant.weight_class" class="weight">{{ participant.weight_class }}</span>
              </div>
            </div>

            <!-- Status -->
            <div class="participant-status">
              <span :class="['status-badge', `status-${participant.registration_status || 'pending'}`]">
                {{ statusLabels[participant.registration_status || 'pending'] }}
              </span>
            </div>

            <!-- Actions -->
            <div v-if="canManageParticipant(participant)" class="participant-actions">
              <button class="btn-icon btn-sm" @click="$emit('remove', participant)" title="ลบ">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Change Category Modal -->
    <Modal v-if="showCategoryModal" @close="showCategoryModal = false">
      <template #header>
        <h2>เปลี่ยนรุ่น/ประเภท</h2>
      </template>
      <template #body>
        <div class="modal-content">
          <p class="modal-info">เปลี่ยนรุ่นให้ผู้เข้าแข่งขัน {{ selectedParticipants.size }} คน</p>
          <div class="form-group">
            <label>รุ่น/ประเภทใหม่</label>
            <input 
              type="text" 
              v-model="newCategory" 
              placeholder="เช่น รุ่นเยาวชน, 50-55 กก."
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button class="btn-secondary" @click="showCategoryModal = false">ยกเลิก</button>
          <button class="btn-primary" @click="handleBulkCategoryChange" :disabled="loading">
            {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useDataStore } from '@/stores/data'
import Modal from '@/components/Modal.vue'
import { groupParticipantsByCategory, sortParticipants } from '@/lib/tournamentUtils'

const props = defineProps({
  participants: {
    type: Array,
    required: true,
    default: () => []
  },
  coachClubId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['remove', 'bulkRemove', 'bulkCategoryChange', 'refresh'])

const authStore = useAuthStore()
const dataStore = useDataStore()

// State
const expandedCategories = ref(new Set())
const selectedParticipants = ref(new Set())
const showCategoryModal = ref(false)
const newCategory = ref('')
const loading = ref(false)

// Labels
const statusLabels = {
  pending: 'รอยืนยัน',
  approved: 'อนุมัติ',
  rejected: 'ปฏิเสธ',
  withdrawn: 'ถอนตัว'
}

// Computed
const isAdmin = computed(() => authStore.isAdmin)
const isCoach = computed(() => authStore.isCoach)
const canManage = computed(() => isAdmin.value || isCoach.value)

/**
 * จัดกลุ่มและเรียงลำดับผู้เข้าแข่งขัน
 * Property 8: Category grouping correctness
 * Property 9: Participant sorting correctness
 * Property 10: Category count consistency
 */
const sortedGroups = computed(() => {
  const grouped = groupParticipantsByCategory(props.participants)
  const groups = []

  // แปลง Map เป็น Array และเรียงลำดับ
  for (const [category, participants] of grouped) {
    groups.push({
      category,
      displayName: category === 'uncategorized' ? 'ไม่ระบุรุ่น' : category,
      participants: sortParticipants(participants)
    })
  }

  // เรียงลำดับ: รุ่นที่มีชื่อก่อน, uncategorized ไว้ท้าย
  groups.sort((a, b) => {
    if (a.category === 'uncategorized') return 1
    if (b.category === 'uncategorized') return -1
    return a.category.localeCompare(b.category, 'th')
  })

  return groups
})

// Methods
function getInitial(participant) {
  const name = participant.athletes?.name || ''
  return name.charAt(0) || '?'
}

function getAthleteName(participant) {
  return participant.athletes?.name || 'ไม่ระบุชื่อ'
}

function getClubName(participant) {
  return participant.clubs?.name || participant.athletes?.clubs?.name || 'ไม่มีชมรม'
}

function canManageParticipant(participant) {
  if (isAdmin.value) return true
  if (isCoach.value && props.coachClubId) {
    return participant.club_id === props.coachClubId
  }
  return false
}

function toggleCategory(category) {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category)
  } else {
    expandedCategories.value.add(category)
  }
}

function toggleParticipant(participantId) {
  if (selectedParticipants.value.has(participantId)) {
    selectedParticipants.value.delete(participantId)
  } else {
    selectedParticipants.value.add(participantId)
  }
}

function isCategoryFullySelected(category) {
  const group = sortedGroups.value.find(g => g.category === category)
  if (!group || group.participants.length === 0) return false
  
  const manageableParticipants = group.participants.filter(p => canManageParticipant(p))
  if (manageableParticipants.length === 0) return false
  
  return manageableParticipants.every(p => selectedParticipants.value.has(p.id))
}

function isCategoryPartiallySelected(category) {
  const group = sortedGroups.value.find(g => g.category === category)
  if (!group || group.participants.length === 0) return false
  
  const manageableParticipants = group.participants.filter(p => canManageParticipant(p))
  if (manageableParticipants.length === 0) return false
  
  const selectedCount = manageableParticipants.filter(p => selectedParticipants.value.has(p.id)).length
  return selectedCount > 0 && selectedCount < manageableParticipants.length
}

function toggleCategorySelection(category) {
  const group = sortedGroups.value.find(g => g.category === category)
  if (!group) return

  const manageableParticipants = group.participants.filter(p => canManageParticipant(p))
  const isFullySelected = isCategoryFullySelected(category)

  if (isFullySelected) {
    // ยกเลิกการเลือกทั้งหมดในรุ่นนี้
    manageableParticipants.forEach(p => selectedParticipants.value.delete(p.id))
  } else {
    // เลือกทั้งหมดในรุ่นนี้
    manageableParticipants.forEach(p => selectedParticipants.value.add(p.id))
  }
}

function clearSelection() {
  selectedParticipants.value.clear()
}

/**
 * ลบผู้เข้าแข่งขันหลายคนพร้อมกัน
 * Requirements: 4.3
 * - แสดง loading spinner ระหว่างดำเนินการ
 * - จัดการ network errors อย่างเหมาะสม
 */
async function confirmBulkRemove() {
  if (selectedParticipants.value.size === 0) return
  
  const count = selectedParticipants.value.size
  if (!confirm(`ต้องการลบผู้เข้าแข่งขัน ${count} คน ออกจากรายการหรือไม่?`)) {
    return
  }

  loading.value = true
  const ids = Array.from(selectedParticipants.value)
  
  try {
    const result = await dataStore.bulkRemoveParticipants(ids)
    
    if (result.success) {
      selectedParticipants.value.clear()
      emit('refresh')
    } else {
      alert(result.message || 'เกิดข้อผิดพลาดในการลบ')
    }
  } catch (error) {
    // จัดการ network errors
    let errorMessage = 'เกิดข้อผิดพลาดในการลบ'
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
    }
    alert(errorMessage)
    console.error('Bulk remove error:', error)
  } finally {
    loading.value = false
  }
}

/**
 * เปลี่ยนรุ่น/ประเภทของผู้เข้าแข่งขันหลายคนพร้อมกัน
 * Requirements: 4.4
 * - แสดง loading spinner ระหว่างดำเนินการ
 * - จัดการ network errors อย่างเหมาะสม
 */
async function handleBulkCategoryChange() {
  if (selectedParticipants.value.size === 0) return

  loading.value = true
  const ids = Array.from(selectedParticipants.value)
  
  try {
    const result = await dataStore.bulkUpdateCategory(ids, newCategory.value.trim() || null)
    
    if (result.success) {
      selectedParticipants.value.clear()
      showCategoryModal.value = false
      newCategory.value = ''
      emit('refresh')
    } else {
      alert(result.message || 'เกิดข้อผิดพลาดในการเปลี่ยนรุ่น')
    }
  } catch (error) {
    // จัดการ network errors
    let errorMessage = 'เกิดข้อผิดพลาดในการเปลี่ยนรุ่น'
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      errorMessage = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต'
    }
    alert(errorMessage)
    console.error('Bulk category change error:', error)
  } finally {
    loading.value = false
  }
}

// เปิดรุ่นแรกโดยอัตโนมัติ
watch(sortedGroups, (groups) => {
  if (groups.length > 0 && expandedCategories.value.size === 0) {
    expandedCategories.value.add(groups[0].category)
  }
}, { immediate: true })

// ล้างการเลือกเมื่อ participants เปลี่ยน
watch(() => props.participants, () => {
  // ลบ ID ที่ไม่มีอยู่แล้ว
  const currentIds = new Set(props.participants.map(p => p.id))
  for (const id of selectedParticipants.value) {
    if (!currentIds.has(id)) {
      selectedParticipants.value.delete(id)
    }
  }
})
</script>


<style scoped>
.grouped-participant-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Bulk Toolbar */
.bulk-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #171717;
  border-radius: 8px;
  color: #fff;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  font-weight: 500;
}

.btn-text {
  background: none;
  border: none;
  color: #A3A3A3;
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;
}

.btn-text:hover {
  color: #fff;
}

.bulk-actions {
  display: flex;
  gap: 8px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: #737373;
  text-align: center;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

/* Category Groups */
.category-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-group {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  overflow: hidden;
}

/* Category Header */
.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #FAFAFA;
  cursor: pointer;
  user-select: none;
}

.category-header:hover {
  background: #F5F5F5;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-btn svg {
  width: 16px;
  height: 16px;
  color: #737373;
  transition: transform 0.2s ease;
}

.expand-btn svg.expanded {
  transform: rotate(90deg);
}

.category-name {
  font-weight: 600;
  color: #171717;
  font-size: 14px;
}

.category-count {
  background: #171717;
  color: #fff;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
}

.category-actions {
  display: flex;
  align-items: center;
}

/* Checkbox */
.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #737373;
}

.checkbox-wrapper input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #171717;
}

.checkbox-label {
  white-space: nowrap;
}

/* Participants Container */
.participants-container {
  border-top: 1px solid #E5E5E5;
}

/* Participant Item */
.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid #F5F5F5;
}

.participant-item:last-child {
  border-bottom: none;
}

.checkbox-cell {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.checkbox-cell input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #171717;
}

/* Avatar */
.avatar {
  width: 36px;
  height: 36px;
  background: #171717;
  color: #fff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  flex-shrink: 0;
}

/* Participant Info */
.participant-info {
  flex: 1;
  min-width: 0;
}

.participant-info .name {
  font-weight: 500;
  color: #171717;
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-info .meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #737373;
  margin-top: 2px;
}

.participant-info .club {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.participant-info .weight {
  padding: 1px 6px;
  background: #F5F5F5;
  border-radius: 4px;
  white-space: nowrap;
}

/* Status */
.participant-status {
  flex-shrink: 0;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-pending {
  background: #FEF3C7;
  color: #92400E;
}

.status-approved {
  background: #D1FAE5;
  color: #065F46;
}

.status-rejected {
  background: #FEE2E2;
  color: #991B1B;
}

.status-withdrawn {
  background: #F3F4F6;
  color: #374151;
}

/* Participant Actions */
.participant-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

/* Buttons */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #171717;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
}

.btn-secondary.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-secondary svg {
  width: 14px;
  height: 14px;
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #EF4444;
  color: #fff;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
}

.btn-danger.btn-sm {
  padding: 6px 12px;
  font-size: 12px;
}

.btn-danger svg {
  width: 14px;
  height: 14px;
}

.btn-icon {
  background: transparent;
  border: 1px solid #E5E5E5;
  padding: 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 14px;
  height: 14px;
  color: #737373;
}

.btn-icon.btn-sm {
  padding: 4px;
}

.btn-icon:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon:hover svg {
  color: #EF4444;
}

/* Modal Content */
.modal-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-info {
  color: #525252;
  font-size: 14px;
  margin: 0;
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

.form-group input {
  padding: 10px 12px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 14px;
}

.form-group input:focus {
  outline: none;
  border-color: #171717;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* Mobile Responsive - Accordion Style */
@media (max-width: 640px) {
  .grouped-participant-list {
    gap: 8px;
  }
  
  /* Bulk Toolbar - full width */
  .bulk-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    padding: 14px;
    border-radius: 12px;
  }

  .bulk-info {
    justify-content: space-between;
  }
  
  .selected-count {
    font-size: 15px;
  }
  
  .btn-text {
    min-height: 44px;
    padding: 10px;
    font-size: 14px;
  }

  .bulk-actions {
    display: flex;
    gap: 8px;
  }
  
  /* Bulk action buttons - touch-friendly */
  .btn-secondary.btn-sm,
  .btn-danger.btn-sm {
    flex: 1;
    justify-content: center;
    min-height: 44px;
    padding: 10px 14px;
    font-size: 14px;
  }
  
  .btn-secondary.btn-sm svg,
  .btn-danger.btn-sm svg {
    width: 18px;
    height: 18px;
  }

  /* Category Groups - Accordion */
  .category-groups {
    gap: 8px;
  }
  
  .category-group {
    border-radius: 12px;
  }

  /* Category Header - Accordion style */
  .category-header {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 14px;
    min-height: 60px;
  }
  
  .category-info {
    gap: 10px;
  }
  
  .expand-btn {
    min-width: 44px;
    min-height: 44px;
    margin: -10px;
    padding: 10px;
  }
  
  .expand-btn svg {
    width: 20px;
    height: 20px;
  }
  
  .category-name {
    font-size: 15px;
  }
  
  .category-count {
    font-size: 12px;
    padding: 4px 10px;
  }

  .category-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  /* Checkbox wrapper - touch-friendly */
  .checkbox-wrapper {
    min-height: 44px;
    padding: 10px 0;
    font-size: 14px;
  }
  
  .checkbox-wrapper input[type="checkbox"] {
    width: 22px;
    height: 22px;
  }
  
  .checkbox-label {
    font-size: 14px;
  }

  /* Participant Item - Card style on mobile */
  .participant-item {
    flex-wrap: wrap;
    gap: 10px;
    padding: 14px;
    min-height: 70px;
  }
  
  .checkbox-cell {
    order: 1;
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: -10px;
    padding: 10px;
  }
  
  .checkbox-cell input[type="checkbox"] {
    width: 22px;
    height: 22px;
  }

  .avatar {
    order: 2;
    width: 44px;
    height: 44px;
    font-size: 16px;
  }

  .participant-info {
    flex: 1 1 calc(100% - 120px);
    order: 3;
    min-width: 0;
  }
  
  .participant-info .name {
    font-size: 15px;
  }
  
  .participant-info .meta {
    font-size: 13px;
    flex-wrap: wrap;
  }

  .participant-status {
    order: 4;
    margin-left: auto;
  }
  
  .status-badge {
    font-size: 12px;
    padding: 4px 10px;
  }

  .participant-actions {
    order: 5;
  }

  /* Touch-friendly action buttons */
  .btn-icon {
    min-width: 44px;
    min-height: 44px;
    padding: 10px;
  }
  
  .btn-icon svg {
    width: 18px;
    height: 18px;
  }
  
  /* Empty state */
  .empty-state {
    padding: 40px 20px;
  }
  
  .empty-state svg {
    width: 56px;
    height: 56px;
  }
  
  .empty-state p {
    font-size: 15px;
  }
  
  /* Modal content */
  .modal-content {
    gap: 20px;
  }
  
  .modal-info {
    font-size: 15px;
  }
  
  .form-group label {
    font-size: 14px;
  }
  
  .form-group input {
    padding: 12px 14px;
    font-size: 16px; /* ป้องกัน zoom บน iOS */
    min-height: 48px;
  }
  
  .modal-actions {
    flex-direction: column-reverse;
    gap: 10px;
  }
  
  .modal-actions .btn-primary,
  .modal-actions .btn-secondary {
    width: 100%;
    min-height: 48px;
    justify-content: center;
    font-size: 15px;
  }
}

/* Tablet */
@media (min-width: 641px) and (max-width: 1024px) {
  .category-header {
    padding: 14px 16px;
  }
  
  .participant-item {
    padding: 14px 16px;
  }
  
  .btn-icon {
    min-width: 40px;
    min-height: 40px;
  }
}
</style>
