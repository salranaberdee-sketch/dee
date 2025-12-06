<template>
  <div class="tracking-detail-page">
    <!-- Loading State -->
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <span>กำลังโหลด...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>{{ error }}</p>
      <button class="btn-secondary" @click="loadPlanDetail">ลองใหม่</button>
    </div>

    <!-- Plan Detail Content -->
    <template v-else-if="plan">
      <!-- Header แบบใหม่ - กระชับ สะอาดตา -->
      <div class="plan-header-new">
        <div class="header-left">
          <button class="btn-back" @click="goBack">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <div class="header-title">
            <div class="title-row">
              <h1>{{ plan.name }}</h1>
              <span :class="['status-pill', plan.is_active ? 'active' : 'inactive']">
                {{ plan.is_active ? 'ใช้งาน' : 'ปิด' }}
              </span>
            </div>
            <div class="header-meta">
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {{ formatDateShort(plan.start_date) }} - {{ formatDateShort(plan.end_date) }}
              </span>
              <span class="meta-divider"></span>
              <span class="meta-item">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                {{ plan.athletes?.length || 0 }} คน
              </span>
              <span class="meta-divider"></span>
              <span :class="['meta-item', 'days-left', { urgent: getDaysRemainingNum() <= 7 && getDaysRemainingNum() >= 0 }]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ getDaysRemaining() }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <button v-if="canEdit" class="btn-edit" @click="openEditModal" title="แก้ไขแผน">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            แก้ไข
          </button>
        </div>
      </div>

      <!-- Tabs แบบใหม่ -->
      <div class="tabs-new">
        <button 
          :class="['tab-new', { active: activeTab === 'athletes' }]" 
          @click="activeTab = 'athletes'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          </svg>
          นักกีฬา
          <span class="tab-count">{{ plan.athletes?.length || 0 }}</span>
        </button>
        <button 
          :class="['tab-new', { active: activeTab === 'logs' }]" 
          @click="activeTab = 'logs'"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          บันทึกค่า
          <span class="tab-count">{{ logs.length }}</span>
        </button>
      </div>

      <!-- Athletes Tab - แบบใหม่ สะอาดตา -->
      <div v-if="activeTab === 'athletes'" class="tab-content-new">
        <!-- Action Bar -->
        <div class="action-bar" v-if="canEdit">
          <button class="btn-add" @click="openAddAthleteModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/>
            </svg>
            เพิ่มนักกีฬา
          </button>
        </div>

        <!-- Athletes Grid - แบบใหม่ -->
        <div v-if="plan.athletes?.length > 0" class="athletes-grid-new">
          <div 
            v-for="athlete in plan.athletes" 
            :key="athlete.athlete_id" 
            class="athlete-card-new"
          >
            <!-- ส่วนบน: ข้อมูลนักกีฬา -->
            <div class="athlete-top">
              <div class="athlete-avatar-new">
                <img v-if="athlete.athlete?.avatar_url" :src="athlete.athlete.avatar_url" :alt="athlete.athlete?.name" />
                <span v-else>{{ getInitials(athlete.athlete?.name) }}</span>
              </div>
              <div class="athlete-name-section">
                <h3>{{ athlete.athlete?.name || 'ไม่ระบุชื่อ' }}</h3>
                <span :class="['overall-status', getAthleteOverallStatusClass(athlete)]">
                  {{ getAthleteOverallStatus(athlete) }}
                </span>
              </div>
              <div class="athlete-quick-actions">
                <button class="btn-quick" @click="openLogModal(athlete)" title="บันทึกค่า">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
              </div>
            </div>

            <!-- ส่วนกลาง: Progress Summary -->
            <div class="progress-summary">
              <div 
                v-for="field in plan.fields.slice(0, 3)" 
                :key="field.id" 
                class="progress-mini"
              >
                <div class="progress-mini-header">
                  <span class="mini-label">{{ field.name }}</span>
                  <span class="mini-value">{{ getCurrentValue(athlete, field) }}<span class="mini-unit">{{ field.unit }}</span></span>
                </div>
                <div class="progress-mini-bar">
                  <div 
                    class="progress-mini-fill" 
                    :style="{ width: getProgressPercentage(athlete, field) + '%' }"
                    :class="getProgressStatus(athlete, field)"
                  ></div>
                </div>
              </div>
              <div v-if="plan.fields.length > 3" class="more-fields">
                +{{ plan.fields.length - 3 }} ฟิลด์
              </div>
            </div>

            <!-- ส่วนล่าง: Actions -->
            <div class="athlete-bottom">
              <button v-if="canEdit" class="btn-sm-outline" @click="openEditGoalsModal(athlete)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
                เป้าหมาย
              </button>
              <button v-if="canEdit" class="btn-sm-danger" @click="confirmRemoveAthlete(athlete)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="18" y1="11" x2="23" y2="11"/>
                </svg>
                นำออก
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="empty-state-new">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <h3>ยังไม่มีนักกีฬา</h3>
          <p>เพิ่มนักกีฬาเพื่อเริ่มติดตามความก้าวหน้า</p>
          <button v-if="canEdit" class="btn-primary" @click="openAddAthleteModal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            เพิ่มนักกีฬาคนแรก
          </button>
        </div>
      </div>

      <!-- Logs Tab (Task 11.4) -->
      <div v-if="activeTab === 'logs'" class="tab-content">
        <div class="section-header">
          <h2>บันทึกค่าตัวเลข</h2>
          <button class="btn-primary" @click="openLogModal(null)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            บันทึกค่าใหม่
          </button>
        </div>

        <!-- Log Entry Form -->
        <div class="log-form-card">
          <h3>บันทึกค่าประจำวัน</h3>
          <form @submit.prevent="submitLog" class="log-form">
            <div class="form-row">
              <div class="form-group">
                <label>นักกีฬา *</label>
                <div class="searchable-select" :class="{ open: showAthleteDropdown }">
                  <div class="select-input-wrapper">
                    <input 
                      type="text"
                      v-model="athleteSearchQuery"
                      @focus="onAthleteInputFocus"
                      @blur="onAthleteInputBlur"
                      @input="showAthleteDropdown = true"
                      placeholder="พิมพ์ค้นหาหรือเลือกนักกีฬา"
                      class="select-input"
                    />
                    <button type="button" class="select-toggle" @click="showAthleteDropdown = !showAthleteDropdown">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>
                  <div v-if="showAthleteDropdown" class="select-dropdown">
                    <div 
                      v-for="athlete in filteredPlanAthletes" 
                      :key="athlete.athlete_id"
                      class="select-option"
                      :class="{ selected: logForm.athlete_id === athlete.athlete_id }"
                      @click="selectAthleteForLog(athlete)"
                    >
                      <div class="option-avatar">
                        <img v-if="athlete.athlete?.avatar_url" :src="athlete.athlete.avatar_url" :alt="athlete.athlete?.name" />
                        <span v-else>{{ getInitials(athlete.athlete?.name) }}</span>
                      </div>
                      <span class="option-name">{{ athlete.athlete?.name || 'ไม่ระบุชื่อ' }}</span>
                    </div>
                    <div v-if="filteredPlanAthletes.length === 0" class="select-empty">
                      ไม่พบนักกีฬาที่ค้นหา
                    </div>
                  </div>
                </div>
                <input type="hidden" v-model="logForm.athlete_id" required />
              </div>
              <div class="form-group">
                <label>วันที่ *</label>
                <input type="date" v-model="logForm.log_date" required :max="today" />
              </div>
            </div>

            <!-- Dynamic Fields based on plan fields -->
            <div class="fields-grid">
              <div 
                v-for="field in plan.fields" 
                :key="field.id" 
                class="form-group"
              >
                <label>
                  {{ field.name }}
                  <span v-if="field.unit" class="unit-label">({{ field.unit }})</span>
                  <span v-if="field.is_required" class="required">*</span>
                </label>
                <input 
                  v-if="field.field_type === 'number' || field.field_type === 'reps' || field.field_type === 'distance'"
                  type="number" 
                  step="0.01"
                  v-model="logForm.values[field.id]"
                  :placeholder="getFieldPlaceholder(field)"
                  :required="field.is_required"
                />
                <input 
                  v-else-if="field.field_type === 'time'"
                  type="text" 
                  v-model="logForm.values[field.id]"
                  placeholder="mm:ss"
                  :required="field.is_required"
                />
                <select 
                  v-else-if="field.field_type === 'select'"
                  v-model="logForm.values[field.id]"
                  :required="field.is_required"
                >
                  <option value="">เลือก...</option>
                  <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                <input 
                  v-else
                  type="text" 
                  v-model="logForm.values[field.id]"
                  :placeholder="getFieldPlaceholder(field)"
                  :required="field.is_required"
                />
              </div>
            </div>

            <div class="form-group">
              <label>หมายเหตุ</label>
              <textarea v-model="logForm.notes" rows="2" placeholder="หมายเหตุเพิ่มเติม..."></textarea>
            </div>

            <div class="form-actions">
              <button type="button" class="btn-secondary" @click="resetLogForm">ล้างข้อมูล</button>
              <button type="submit" class="btn-primary" :disabled="savingLog">
                {{ savingLog ? 'กำลังบันทึก...' : 'บันทึก' }}
              </button>
            </div>
          </form>
        </div>

        <!-- Recent Logs -->
        <div class="recent-logs">
          <h3>ประวัติการบันทึก</h3>
          <div v-if="logs.length > 0" class="logs-list">
            <div v-for="log in logs" :key="log.id" class="log-item">
              <div class="log-header">
                <div class="log-info">
                  <span class="log-date">{{ formatDate(log.log_date) }}</span>
                  <span class="log-athlete">{{ getAthleteName(log.athlete_id) }}</span>
                </div>
                <button 
                  v-if="canEditLog(log)" 
                  class="btn-icon-sm" 
                  @click="editLog(log)"
                  title="แก้ไข"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
              </div>
              <div class="log-values">
                <span 
                  v-for="field in plan.fields" 
                  :key="field.id" 
                  class="log-value"
                >
                  <span class="value-label">{{ field.name }}:</span>
                  <span class="value-data">{{ log.values?.[field.id] || '-' }} {{ field.unit }}</span>
                </span>
              </div>
              <p v-if="log.notes" class="log-notes">{{ log.notes }}</p>
            </div>
          </div>
          <div v-else class="empty-logs">
            <p>ยังไม่มีประวัติการบันทึก</p>
          </div>
        </div>
      </div>
    </template>

    <!-- Add Athlete Modal (Task 11.3) -->
    <Modal v-if="showAddAthleteModal" @close="closeAddAthleteModal" size="large">
      <template #header>
        <h2>เพิ่มนักกีฬาในแผน</h2>
      </template>
      <template #body>
        <div class="add-athlete-form">
          <!-- ส่วนเลือกนักกีฬา -->
          <div class="athlete-selection-section">
            <div class="selection-header">
              <label>เลือกนักกีฬา ({{ addAthleteForm.selectedAthletes.length }} คน)</label>
              <div class="selection-actions">
                <button type="button" class="btn-link" @click="selectAllAthletes">เลือกทั้งหมด</button>
                <button type="button" class="btn-link" @click="deselectAllAthletes">ยกเลิกทั้งหมด</button>
              </div>
            </div>
            
            <div v-if="availableAthletes.length === 0" class="empty-athletes">
              <p>ไม่มีนักกีฬาที่สามารถเพิ่มได้</p>
            </div>
            
            <div v-else class="athlete-checkbox-list">
              <label 
                v-for="athlete in availableAthletes" 
                :key="athlete.id" 
                class="athlete-checkbox-item"
                :class="{ selected: isAthleteSelected(athlete.id) }"
              >
                <input 
                  type="checkbox" 
                  :checked="isAthleteSelected(athlete.id)"
                  @change="toggleAthleteSelection(athlete.id)"
                />
                <div class="athlete-checkbox-avatar">
                  <img v-if="athlete.avatar_url" :src="athlete.avatar_url" :alt="athlete.name" />
                  <span v-else>{{ getInitials(athlete.name) }}</span>
                </div>
                <span class="athlete-checkbox-name">{{ athlete.name }}</span>
              </label>
            </div>
          </div>

          <!-- ส่วนตั้งเป้าหมายสำหรับแต่ละคน -->
          <div v-if="addAthleteForm.selectedAthletes.length > 0" class="goals-section">
            <h4>ตั้งเป้าหมาย</h4>
            
            <div 
              v-for="athleteId in addAthleteForm.selectedAthletes" 
              :key="athleteId" 
              class="athlete-goals-card"
            >
              <div class="athlete-goals-header">
                <span class="athlete-goals-name">{{ getAvailableAthleteName(athleteId) }}</span>
              </div>
              
              <div class="goals-grid">
                <div 
                  v-for="field in plan.fields" 
                  :key="field.id" 
                  class="goal-item-compact"
                >
                  <div class="goal-field-label">
                    {{ field.name }} <span class="goal-unit">({{ field.unit }})</span>
                  </div>
                  <div class="goal-inputs-row">
                    <input 
                      type="number" 
                      step="0.01"
                      v-model="addAthleteForm.goals[athleteId][field.id].initial_value"
                      placeholder="เริ่มต้น"
                      class="goal-input"
                    />
                    <span class="goal-arrow">→</span>
                    <input 
                      type="number" 
                      step="0.01"
                      v-model="addAthleteForm.goals[athleteId][field.id].target_value"
                      placeholder="เป้าหมาย"
                      class="goal-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="closeAddAthleteModal">ยกเลิก</button>
          <button 
            type="button" 
            class="btn-primary" 
            @click="addAthletes" 
            :disabled="addAthleteForm.selectedAthletes.length === 0 || savingAthlete"
          >
            {{ savingAthlete ? 'กำลังเพิ่ม...' : `เพิ่มนักกีฬา ${addAthleteForm.selectedAthletes.length} คน` }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Edit Goals Modal -->
    <Modal v-if="showEditGoalsModal" @close="closeEditGoalsModal" size="large">
      <template #header>
        <h2>แก้ไขเป้าหมาย - {{ editingAthlete?.athlete?.name }}</h2>
      </template>
      <template #body>
        <form @submit.prevent="saveGoals" class="edit-goals-form">
          <div 
            v-for="field in plan.fields" 
            :key="field.id" 
            class="goal-item"
          >
            <div class="goal-header">
              <span class="goal-field-name">{{ field.name }}</span>
              <span class="goal-field-unit">{{ field.unit }}</span>
            </div>
            <div class="goal-inputs">
              <div class="form-group">
                <label>ค่าเริ่มต้น</label>
                <input 
                  type="number" 
                  step="0.01"
                  v-model="editGoalsForm[field.id].initial_value"
                  placeholder="0"
                />
              </div>
              <div class="form-group">
                <label>เป้าหมาย</label>
                <input 
                  type="number" 
                  step="0.01"
                  v-model="editGoalsForm[field.id].target_value"
                  placeholder="0"
                />
              </div>
              <div class="form-group">
                <label>วันที่เป้าหมาย</label>
                <input 
                  type="date" 
                  v-model="editGoalsForm[field.id].target_date"
                  :max="plan.end_date"
                />
              </div>
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="closeEditGoalsModal">ยกเลิก</button>
          <button type="button" class="btn-primary" @click="saveGoals" :disabled="savingGoals">
            {{ savingGoals ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Edit Plan Modal -->
    <Modal v-if="showEditPlanModal" @close="closeEditPlanModal" size="large">
      <template #header>
        <h2>แก้ไขแผนติดตาม</h2>
      </template>
      <template #body>
        <form @submit.prevent="savePlanEdit" class="edit-plan-form">
          <div class="form-group">
            <label>ชื่อแผน *</label>
            <input type="text" v-model="editPlanForm.name" required />
          </div>
          <div class="form-group">
            <label>คำอธิบาย</label>
            <textarea v-model="editPlanForm.description" rows="2"></textarea>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>วันเริ่มต้น *</label>
              <input type="date" v-model="editPlanForm.start_date" required />
            </div>
            <div class="form-group">
              <label>วันสิ้นสุด *</label>
              <input type="date" v-model="editPlanForm.end_date" required />
            </div>
          </div>
          <div class="form-group">
            <label>สถานะ</label>
            <select v-model="editPlanForm.is_active">
              <option :value="true">ใช้งานอยู่</option>
              <option :value="false">ปิดใช้งาน</option>
            </select>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="closeEditPlanModal">ยกเลิก</button>
          <button type="button" class="btn-primary" @click="savePlanEdit" :disabled="savingPlan">
            {{ savingPlan ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>


<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTrackingStore, canEditLog as checkCanEditLog, calculateProgressPercentage, calculateProgressStatus } from '@/stores/tracking'
import { useAuthStore } from '@/stores/auth'
import { supabase } from '@/lib/supabase'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const router = useRouter()
const trackingStore = useTrackingStore()
const authStore = useAuthStore()

// State
const loading = ref(false)
const error = ref(null)
const activeTab = ref('athletes')
const savingLog = ref(false)
const savingAthlete = ref(false)
const savingGoals = ref(false)
const savingPlan = ref(false)
const athleteProfiles = ref([]) // รายชื่อ user_profiles ที่เป็น athlete

// Searchable Select State
const showAthleteDropdown = ref(false)
const athleteSearchQuery = ref('')

// Modal States
const showAddAthleteModal = ref(false)
const showEditGoalsModal = ref(false)
const showEditPlanModal = ref(false)
const editingAthlete = ref(null)

// Form States
const logForm = ref({
  athlete_id: '',
  log_date: new Date().toISOString().split('T')[0],
  values: {},
  notes: ''
})

const addAthleteForm = ref({
  selectedAthletes: [], // รองรับหลายคน
  goals: {} // { athleteId: { fieldId: { initial_value, target_value, target_date } } }
})

const editGoalsForm = ref({})

const editPlanForm = ref({
  name: '',
  description: '',
  start_date: '',
  end_date: '',
  is_active: true
})

// Computed
const plan = computed(() => trackingStore.currentPlan)
const logs = computed(() => trackingStore.logs)
const today = computed(() => new Date().toISOString().split('T')[0])

const canEdit = computed(() => {
  if (!plan.value) return false
  if (authStore.isAdmin) return true
  if (authStore.isCoach && plan.value.created_by === authStore.user?.id) return true
  return false
})

// รายชื่อนักกีฬาที่ยังไม่อยู่ในแผน (ใช้ user_profiles แทน athletes table)
const availableAthletes = computed(() => {
  const existingIds = plan.value?.athletes?.map(a => a.athlete_id) || []
  return athleteProfiles.value.filter(a => !existingIds.includes(a.id))
})

// กรองนักกีฬาในแผนตามคำค้นหา
const filteredPlanAthletes = computed(() => {
  if (!plan.value?.athletes) return []
  if (!athleteSearchQuery.value.trim()) return plan.value.athletes
  
  const query = athleteSearchQuery.value.toLowerCase().trim()
  return plan.value.athletes.filter(a => 
    (a.athlete?.name || '').toLowerCase().includes(query)
  )
})

// ชื่อนักกีฬาที่เลือกอยู่
const selectedAthleteName = computed(() => {
  if (!logForm.value.athlete_id || !plan.value?.athletes) return ''
  const athlete = plan.value.athletes.find(a => a.athlete_id === logForm.value.athlete_id)
  return athlete?.athlete?.name || ''
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

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })
}

// Format วันที่แบบสั้น
function formatDateShort(date) {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('th-TH', { 
    day: 'numeric', 
    month: 'short'
  })
}

// คำนวณจำนวนวันที่เหลือเป็นตัวเลข
function getDaysRemainingNum() {
  if (!plan.value?.end_date) return null
  const end = new Date(plan.value.end_date)
  const now = new Date()
  end.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getDaysRemaining() {
  if (!plan.value?.end_date) return '-'
  const end = new Date(plan.value.end_date)
  const now = new Date()
  end.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return 'สิ้นสุดแล้ว'
  if (days === 0) return 'วันสุดท้าย'
  return `${days} วัน`
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
}

function getAthleteName(athleteId) {
  const athlete = plan.value?.athletes?.find(a => a.athlete_id === athleteId)
  return athlete?.athlete?.name || 'ไม่ระบุชื่อ'
}

function getFieldPlaceholder(field) {
  const placeholders = {
    number: '0',
    time: 'mm:ss',
    reps: '0',
    distance: '0',
    text: 'ข้อความ'
  }
  return placeholders[field.field_type] || ''
}

// Progress Calculation Functions
function getCurrentValue(athlete, field) {
  // ดึงค่าล่าสุดจาก logs
  const latestValue = trackingStore.getLatestValue(plan.value.id, athlete.athlete_id, field.id)
  if (latestValue !== null) return latestValue
  
  // ถ้าไม่มี log ให้ใช้ค่าเริ่มต้น
  const goal = athlete.goals?.find(g => g.field_id === field.id)
  return goal?.initial_value ?? '-'
}

function getTargetValue(athlete, field) {
  const goal = athlete.goals?.find(g => g.field_id === field.id)
  return goal?.target_value ?? '-'
}

function getProgressPercentage(athlete, field) {
  const goal = athlete.goals?.find(g => g.field_id === field.id)
  if (!goal) return 0
  
  const currentValue = trackingStore.getLatestValue(plan.value.id, athlete.athlete_id, field.id)
  return calculateProgressPercentage(currentValue, goal.initial_value, goal.target_value)
}

function getProgressStatus(athlete, field) {
  const percentage = getProgressPercentage(athlete, field)
  const goal = athlete.goals?.find(g => g.field_id === field.id)
  
  // คำนวณ expected percentage
  let expectedPercentage = null
  if (goal?.target_date && plan.value?.start_date) {
    const start = new Date(plan.value.start_date)
    const target = new Date(goal.target_date)
    const now = new Date()
    
    const totalDays = Math.ceil((target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    
    if (totalDays > 0) {
      expectedPercentage = Math.min(100, (daysPassed / totalDays) * 100)
    }
  }
  
  return calculateProgressStatus(percentage, expectedPercentage)
}

function getProgressStatusText(athlete, field) {
  const status = getProgressStatus(athlete, field)
  const statusTexts = {
    achieved: 'บรรลุเป้าหมาย',
    ahead: 'เร็วกว่ากำหนด',
    on_track: 'ตามแผน',
    behind: 'ช้ากว่ากำหนด'
  }
  return statusTexts[status] || 'ตามแผน'
}

function getAthleteOverallStatus(athlete) {
  if (!plan.value?.fields?.length) return 'ไม่มีข้อมูล'
  
  let totalPercentage = 0
  let achievedCount = 0
  
  plan.value.fields.forEach(field => {
    const percentage = getProgressPercentage(athlete, field)
    totalPercentage += percentage
    if (percentage >= 100) achievedCount++
  })
  
  const avgPercentage = Math.round(totalPercentage / plan.value.fields.length)
  
  if (achievedCount === plan.value.fields.length) {
    return 'บรรลุเป้าหมายทั้งหมด'
  }
  return `${avgPercentage}%`
}

// คำนวณ class สำหรับ overall status
function getAthleteOverallStatusClass(athlete) {
  if (!plan.value?.fields?.length) return ''
  
  let totalPercentage = 0
  let achievedCount = 0
  
  plan.value.fields.forEach(field => {
    const percentage = getProgressPercentage(athlete, field)
    totalPercentage += percentage
    if (percentage >= 100) achievedCount++
  })
  
  const avgPercentage = Math.round(totalPercentage / plan.value.fields.length)
  
  if (achievedCount === plan.value.fields.length) return 'achieved'
  if (avgPercentage >= 70) return 'good'
  if (avgPercentage >= 40) return 'moderate'
  return 'low'
}

// Navigation
function goBack() {
  router.push('/tracking')
}

// Load Data
async function loadPlanDetail() {
  loading.value = true
  error.value = null
  
  const planId = route.params.id
  
  const result = await trackingStore.fetchPlanDetail(planId)
  
  if (!result.success) {
    error.value = result.message || 'ไม่สามารถโหลดข้อมูลได้'
  } else {
    // โหลด logs ด้วย
    await trackingStore.fetchLogs(planId)
    // เตรียม form values
    initLogFormValues()
  }
  
  loading.value = false
}

function initLogFormValues() {
  if (!plan.value?.fields) return
  logForm.value.values = {}
  plan.value.fields.forEach(field => {
    logForm.value.values[field.id] = ''
  })
}

// Log Functions
function canEditLogItem(log) {
  return checkCanEditLog(log.created_at)
}

async function submitLog() {
  if (!logForm.value.athlete_id || !logForm.value.log_date) {
    alert('กรุณาเลือกนักกีฬาและวันที่')
    return
  }
  
  savingLog.value = true
  
  const result = await trackingStore.createLog({
    plan_id: plan.value.id,
    athlete_id: logForm.value.athlete_id,
    log_date: logForm.value.log_date,
    values: logForm.value.values,
    notes: logForm.value.notes
  }, plan.value.fields)
  
  savingLog.value = false
  
  if (result.success) {
    resetLogForm()
    // รีโหลด logs
    await trackingStore.fetchLogs(plan.value.id)
  } else {
    alert(result.message || 'ไม่สามารถบันทึกได้')
  }
}

// เมื่อ focus ที่ช่องค้นหานักกีฬา
function onAthleteInputFocus() {
  showAthleteDropdown.value = true
  // ล้างค่าเพื่อให้พิมพ์ค้นหาได้
  if (logForm.value.athlete_id) {
    athleteSearchQuery.value = ''
  }
}

// เมื่อ blur จากช่องค้นหานักกีฬา
function onAthleteInputBlur() {
  // รอสักครู่ก่อนปิด dropdown เพื่อให้คลิกเลือกได้
  setTimeout(() => {
    // ถ้ามีนักกีฬาที่เลือกอยู่ ให้แสดงชื่อ
    if (logForm.value.athlete_id && !athleteSearchQuery.value) {
      athleteSearchQuery.value = selectedAthleteName.value
    }
  }, 200)
}

// เลือกนักกีฬาสำหรับบันทึกค่า
function selectAthleteForLog(athlete) {
  logForm.value.athlete_id = athlete.athlete_id
  athleteSearchQuery.value = athlete.athlete?.name || ''
  showAthleteDropdown.value = false
}

function resetLogForm() {
  athleteSearchQuery.value = ''
  showAthleteDropdown.value = false
  logForm.value = {
    athlete_id: '',
    log_date: new Date().toISOString().split('T')[0],
    values: {},
    notes: ''
  }
  initLogFormValues()
}

function editLog(log) {
  logForm.value = {
    athlete_id: log.athlete_id,
    log_date: log.log_date,
    values: { ...log.values },
    notes: log.notes || ''
  }
  activeTab.value = 'logs'
}

function openLogModal(athlete) {
  if (athlete) {
    logForm.value.athlete_id = athlete.athlete_id
  }
  activeTab.value = 'logs'
}

// Add Athlete Functions
// ดึงรายชื่อ user_profiles ที่เป็น athlete ใน club เดียวกัน
async function fetchAthleteProfiles() {
  try {
    let query = supabase
      .from('user_profiles')
      .select('id, name, avatar_url, club_id')
      .eq('role', 'athlete')
      .order('name')
    
    // กรองตาม club_id ของแผน
    if (plan.value?.club_id) {
      query = query.eq('club_id', plan.value.club_id)
    }
    
    const { data, error: fetchError } = await query
    
    if (fetchError) throw fetchError
    athleteProfiles.value = data || []
  } catch (err) {
    console.error('Error fetching athlete profiles:', err)
    athleteProfiles.value = []
  }
}

function openAddAthleteModal() {
  addAthleteForm.value = {
    selectedAthletes: [],
    goals: {}
  }
  showAddAthleteModal.value = true
  
  // โหลดรายชื่อนักกีฬาจาก user_profiles
  fetchAthleteProfiles()
}

function closeAddAthleteModal() {
  showAddAthleteModal.value = false
}

// เลือก/ยกเลิกเลือกนักกีฬา
function toggleAthleteSelection(athleteId) {
  const index = addAthleteForm.value.selectedAthletes.indexOf(athleteId)
  if (index === -1) {
    // เพิ่มนักกีฬา
    addAthleteForm.value.selectedAthletes.push(athleteId)
    // เตรียม goals สำหรับนักกีฬาคนนี้
    addAthleteForm.value.goals[athleteId] = {}
    plan.value.fields?.forEach(field => {
      addAthleteForm.value.goals[athleteId][field.id] = {
        initial_value: null,
        target_value: null,
        target_date: plan.value.end_date
      }
    })
  } else {
    // ลบนักกีฬา
    addAthleteForm.value.selectedAthletes.splice(index, 1)
    delete addAthleteForm.value.goals[athleteId]
  }
}

// เลือกทั้งหมด
function selectAllAthletes() {
  availableAthletes.value.forEach(athlete => {
    if (!addAthleteForm.value.selectedAthletes.includes(athlete.id)) {
      toggleAthleteSelection(athlete.id)
    }
  })
}

// ยกเลิกเลือกทั้งหมด
function deselectAllAthletes() {
  addAthleteForm.value.selectedAthletes = []
  addAthleteForm.value.goals = {}
}

// ตรวจสอบว่านักกีฬาถูกเลือกหรือไม่
function isAthleteSelected(athleteId) {
  return addAthleteForm.value.selectedAthletes.includes(athleteId)
}

// หาชื่อนักกีฬาจาก ID
function getAvailableAthleteName(athleteId) {
  const athlete = availableAthletes.value.find(a => a.id === athleteId)
  return athlete?.name || 'ไม่ระบุชื่อ'
}

async function addAthletes() {
  if (addAthleteForm.value.selectedAthletes.length === 0) return
  
  savingAthlete.value = true
  let successCount = 0
  let failCount = 0
  
  // เพิ่มนักกีฬาทีละคน
  for (const athleteId of addAthleteForm.value.selectedAthletes) {
    const athleteGoals = addAthleteForm.value.goals[athleteId] || {}
    const goals = Object.entries(athleteGoals).map(([fieldId, goal]) => ({
      field_id: fieldId,
      initial_value: goal.initial_value,
      target_value: goal.target_value,
      target_date: goal.target_date
    }))
    
    const result = await trackingStore.addAthleteToPlan(
      plan.value.id,
      athleteId,
      goals
    )
    
    if (result.success) {
      successCount++
    } else {
      failCount++
    }
  }
  
  savingAthlete.value = false
  
  if (successCount > 0) {
    closeAddAthleteModal()
    await loadPlanDetail()
    
    if (failCount > 0) {
      alert(`เพิ่มนักกีฬาสำเร็จ ${successCount} คน, ล้มเหลว ${failCount} คน`)
    }
  } else {
    alert('ไม่สามารถเพิ่มนักกีฬาได้')
  }
}

// Edit Goals Functions
function openEditGoalsModal(athlete) {
  editingAthlete.value = athlete
  editGoalsForm.value = {}
  
  plan.value.fields?.forEach(field => {
    const goal = athlete.goals?.find(g => g.field_id === field.id)
    editGoalsForm.value[field.id] = {
      initial_value: goal?.initial_value ?? null,
      target_value: goal?.target_value ?? null,
      target_date: goal?.target_date ?? plan.value.end_date
    }
  })
  
  showEditGoalsModal.value = true
}

function closeEditGoalsModal() {
  showEditGoalsModal.value = false
  editingAthlete.value = null
}

async function saveGoals() {
  if (!editingAthlete.value) return
  
  savingGoals.value = true
  
  // แปลง goals เป็น array
  const goals = Object.entries(editGoalsForm.value).map(([fieldId, goal]) => ({
    field_id: fieldId,
    initial_value: goal.initial_value,
    target_value: goal.target_value,
    target_date: goal.target_date
  }))
  
  const result = await trackingStore.updateAthleteGoals(
    plan.value.id,
    editingAthlete.value.athlete_id,
    goals
  )
  
  savingGoals.value = false
  
  if (result.success) {
    closeEditGoalsModal()
    await loadPlanDetail()
  } else {
    alert(result.message || 'ไม่สามารถบันทึกได้')
  }
}

// Remove Athlete
async function confirmRemoveAthlete(athlete) {
  if (!confirm(`ต้องการนำ "${athlete.athlete?.name}" ออกจากแผนหรือไม่?\n\nประวัติการบันทึกจะยังคงอยู่`)) {
    return
  }
  
  const result = await trackingStore.removeAthleteFromPlan(plan.value.id, athlete.athlete_id)
  
  if (result.success) {
    await loadPlanDetail()
  } else {
    alert(result.message || 'ไม่สามารถนำออกได้')
  }
}

// Edit Plan Functions
function openEditModal() {
  editPlanForm.value = {
    name: plan.value.name,
    description: plan.value.description || '',
    start_date: plan.value.start_date,
    end_date: plan.value.end_date,
    is_active: plan.value.is_active
  }
  showEditPlanModal.value = true
}

function closeEditPlanModal() {
  showEditPlanModal.value = false
}

async function savePlanEdit() {
  savingPlan.value = true
  
  const result = await trackingStore.updatePlan(plan.value.id, editPlanForm.value)
  
  savingPlan.value = false
  
  if (result.success) {
    closeEditPlanModal()
    await loadPlanDetail()
  } else {
    alert(result.message || 'ไม่สามารถบันทึกได้')
  }
}

// ปิด dropdown เมื่อคลิกข้างนอก
function handleClickOutside(event) {
  const dropdown = document.querySelector('.searchable-select')
  if (dropdown && !dropdown.contains(event.target)) {
    showAthleteDropdown.value = false
  }
}

// Lifecycle
onMounted(() => {
  loadPlanDetail()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Watch route changes
watch(() => route.params.id, (newId) => {
  if (newId) {
    loadPlanDetail()
  }
})
</script>


<style scoped>
.tracking-detail-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Loading & Error States */
.loading, .error-state {
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

.error-state svg {
  width: 48px;
  height: 48px;
  color: #EF4444;
}

/* Plan Header */
.plan-header {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.header-top {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
}

.btn-back {
  background: #F5F5F5;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.btn-back:hover {
  background: #E5E5E5;
}

.btn-back svg {
  width: 20px;
  height: 20px;
  color: #171717;
}

.header-info {
  flex: 1;
}

.plan-type-badge {
  display: inline-block;
  font-size: 12px;
  padding: 4px 10px;
  background: #F5F5F5;
  border-radius: 4px;
  color: #525252;
  margin-bottom: 8px;
}

.header-info h1 {
  font-size: 24px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 4px;
}

/* Header แบบใหม่ - กระชับ */
.plan-header-new {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.header-title {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.title-row h1 {
  font-size: 22px;
  font-weight: 700;
  color: #171717;
  margin: 0;
}

.status-pill {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
}

.status-pill.active {
  background: #D1FAE5;
  color: #065F46;
}

.status-pill.inactive {
  background: #F3F4F6;
  color: #6B7280;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #525252;
}

.meta-item svg {
  width: 14px;
  height: 14px;
  color: #A3A3A3;
}

.meta-item.days-left.urgent {
  color: #B45309;
  font-weight: 600;
}

.meta-item.days-left.urgent svg {
  color: #F59E0B;
}

.meta-divider {
  width: 4px;
  height: 4px;
  background: #D4D4D4;
  border-radius: 50%;
}

.header-right {
  display: flex;
  gap: 8px;
}

.btn-edit {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: #F5F5F5;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  color: #171717;
  cursor: pointer;
  font-weight: 500;
}

.btn-edit:hover {
  background: #E5E5E5;
}

.btn-edit svg {
  width: 14px;
  height: 14px;
}

/* Tabs แบบใหม่ */
.tabs-new {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab-new {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 14px;
  color: #525252;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.15s;
}

.tab-new:hover {
  background: #F5F5F5;
}

.tab-new.active {
  background: #171717;
  color: #fff;
  border-color: #171717;
}

.tab-new svg {
  width: 16px;
  height: 16px;
}

.tab-count {
  padding: 2px 8px;
  background: rgba(0,0,0,0.1);
  border-radius: 10px;
  font-size: 12px;
}

.tab-new.active .tab-count {
  background: rgba(255,255,255,0.2);
}

/* Tab Content แบบใหม่ */
.tab-content-new {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 20px;
}

/* Action Bar */
.action-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  font-weight: 500;
}

.btn-add:hover {
  background: #262626;
}

.btn-add svg {
  width: 16px;
  height: 16px;
}

/* Athletes Grid แบบใหม่ */
.athletes-grid-new {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.athlete-card-new {
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 10px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Athlete Top */
.athlete-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.athlete-avatar-new {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  flex-shrink: 0;
}

.athlete-avatar-new img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.athlete-name-section {
  flex: 1;
  min-width: 0;
}

.athlete-name-section h3 {
  font-size: 15px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.overall-status {
  font-size: 12px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  display: inline-block;
}

.overall-status.achieved {
  background: #D1FAE5;
  color: #065F46;
}

.overall-status.good {
  background: #DBEAFE;
  color: #1E40AF;
}

.overall-status.moderate {
  background: #FEF3C7;
  color: #92400E;
}

.overall-status.low {
  background: #FEE2E2;
  color: #991B1B;
}

.athlete-quick-actions {
  display: flex;
  gap: 6px;
}

.btn-quick {
  width: 36px;
  height: 36px;
  background: #171717;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-quick:hover {
  background: #262626;
}

.btn-quick svg {
  width: 16px;
  height: 16px;
  color: #fff;
}

/* Progress Summary */
.progress-summary {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
}

.progress-mini {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-mini-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.mini-label {
  font-size: 12px;
  color: #737373;
}

.mini-value {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.mini-unit {
  font-size: 11px;
  color: #A3A3A3;
  margin-left: 2px;
}

.progress-mini-bar {
  height: 4px;
  background: #E5E5E5;
  border-radius: 2px;
  overflow: hidden;
}

.progress-mini-fill {
  height: 100%;
  border-radius: 2px;
  background: #171717;
  transition: width 0.3s;
}

.progress-mini-fill.achieved {
  background: #22C55E;
}

.progress-mini-fill.ahead {
  background: #22C55E;
}

.progress-mini-fill.behind {
  background: #F59E0B;
}

.more-fields {
  font-size: 11px;
  color: #A3A3A3;
  text-align: center;
  padding-top: 4px;
}

/* Athlete Bottom */
.athlete-bottom {
  display: flex;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid #E5E5E5;
}

.btn-sm-outline {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 12px;
  color: #525252;
  cursor: pointer;
}

.btn-sm-outline:hover {
  background: #F5F5F5;
}

.btn-sm-outline svg {
  width: 12px;
  height: 12px;
}

.btn-sm-danger {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: #fff;
  border: 1px solid #FEE2E2;
  border-radius: 6px;
  font-size: 12px;
  color: #991B1B;
  cursor: pointer;
}

.btn-sm-danger:hover {
  background: #FEE2E2;
}

.btn-sm-danger svg {
  width: 12px;
  height: 12px;
}

/* Empty State แบบใหม่ */
.empty-state-new {
  text-align: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 64px;
  height: 64px;
  background: #F5F5F5;
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

.empty-state-new h3 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 8px;
}

.empty-state-new p {
  color: #737373;
  margin: 0 0 20px;
  font-size: 14px;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid #E5E5E5;
  padding-bottom: 12px;
}

.tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  color: #525252;
  transition: all 0.2s;
}

.tab:hover {
  background: #F5F5F5;
}

.tab.active {
  background: #171717;
  color: #fff;
  border-color: #171717;
}

.tab svg {
  width: 18px;
  height: 18px;
}

/* Section Header */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #171717;
  margin: 0;
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

.btn-primary:hover:not(:disabled) {
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

.btn-icon-sm {
  background: transparent;
  border: 1px solid #E5E5E5;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon-sm:hover {
  background: #F5F5F5;
}

.btn-icon-sm.danger:hover {
  background: #FEE2E2;
  border-color: #EF4444;
}

.btn-icon-sm.danger:hover svg {
  stroke: #EF4444;
}

.btn-icon-sm svg {
  width: 16px;
  height: 16px;
  color: #525252;
}

/* Athletes List */
.athletes-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.athlete-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 16px;
}

.athlete-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #F5F5F5;
}

.athlete-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.athlete-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.athlete-status {
  font-size: 12px;
  color: #737373;
}

.athlete-actions {
  display: flex;
  gap: 8px;
}

/* Progress Grid */
.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.progress-item {
  background: #FAFAFA;
  border-radius: 8px;
  padding: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.field-name {
  font-size: 13px;
  font-weight: 500;
  color: #171717;
}

.field-unit {
  font-size: 11px;
  color: #737373;
}

.progress-values {
  margin-bottom: 8px;
}

.current-value {
  font-size: 20px;
  font-weight: 600;
  color: #171717;
}

.target-value {
  font-size: 14px;
  color: #737373;
}

.progress-bar-container {
  height: 6px;
  background: #E5E5E5;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
  background: #171717;
}

.progress-bar.achieved {
  background: #22C55E;
}

.progress-bar.ahead {
  background: #22C55E;
}

.progress-bar.behind {
  background: #F59E0B;
}

.progress-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-status {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: #F5F5F5;
  color: #525252;
}

.progress-status.achieved {
  background: #D1FAE5;
  color: #065F46;
}

.progress-status.ahead {
  background: #D1FAE5;
  color: #065F46;
}

.progress-status.behind {
  background: #FEF3C7;
  color: #92400E;
}

.progress-percent {
  font-size: 12px;
  font-weight: 600;
  color: #171717;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 48px;
  color: #737373;
  background: #FAFAFA;
  border-radius: 12px;
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

/* Log Form Card */
.log-form-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
}

.log-form-card h3 {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 16px;
}

.log-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
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

.unit-label {
  font-weight: 400;
  color: #737373;
}

.required {
  color: #EF4444;
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

.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

/* Searchable Select */
.searchable-select {
  position: relative;
}

.select-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  background: #fff;
  overflow: hidden;
}

.searchable-select.open .select-input-wrapper {
  border-color: #171717;
}

.select-input {
  flex: 1;
  padding: 10px 12px;
  border: none;
  font-size: 14px;
  outline: none;
  background: transparent;
}

.select-input::placeholder {
  color: #737373;
}

.select-toggle {
  background: none;
  border: none;
  padding: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.select-toggle svg {
  width: 16px;
  height: 16px;
  color: #525252;
  transition: transform 0.2s;
}

.searchable-select.open .select-toggle svg {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 100;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.select-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.select-option:hover {
  background: #F5F5F5;
}

.select-option.selected {
  background: #F5F5F5;
}

.option-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 10px;
  font-weight: 600;
  overflow: hidden;
  flex-shrink: 0;
}

.option-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.option-name {
  font-size: 14px;
  color: #171717;
}

.select-empty {
  padding: 16px;
  text-align: center;
  color: #737373;
  font-size: 13px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid #F5F5F5;
}

/* Recent Logs */
.recent-logs {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  padding: 20px;
}

.recent-logs h3 {
  font-size: 16px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 16px;
}

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.log-item {
  padding: 12px;
  background: #FAFAFA;
  border-radius: 8px;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.log-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.log-date {
  font-weight: 600;
  color: #171717;
  font-size: 14px;
}

.log-athlete {
  font-size: 13px;
  color: #737373;
}

.log-values {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.log-value {
  font-size: 13px;
}

.value-label {
  color: #737373;
}

.value-data {
  color: #171717;
  font-weight: 500;
}

.log-notes {
  font-size: 13px;
  color: #525252;
  margin: 8px 0 0;
  padding-top: 8px;
  border-top: 1px solid #E5E5E5;
  font-style: italic;
}

.empty-logs {
  text-align: center;
  padding: 24px;
  color: #737373;
}

/* Add Athlete Form */
.add-athlete-form, .edit-goals-form, .edit-plan-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ส่วนเลือกนักกีฬาหลายคน */
.athlete-selection-section {
  background: #FAFAFA;
  border-radius: 8px;
  padding: 16px;
}

.selection-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selection-header label {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.selection-actions {
  display: flex;
  gap: 12px;
}

.btn-link {
  background: none;
  border: none;
  color: #525252;
  font-size: 13px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-link:hover {
  background: #E5E5E5;
  color: #171717;
}

.empty-athletes {
  text-align: center;
  padding: 24px;
  color: #737373;
}

.athlete-checkbox-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
  padding-right: 8px;
}

.athlete-checkbox-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.athlete-checkbox-item:hover {
  border-color: #A3A3A3;
}

.athlete-checkbox-item.selected {
  border-color: #171717;
  background: #F5F5F5;
}

.athlete-checkbox-item input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: #171717;
  cursor: pointer;
}

.athlete-checkbox-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 600;
  font-size: 12px;
  overflow: hidden;
  flex-shrink: 0;
}

.athlete-checkbox-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.athlete-checkbox-name {
  font-size: 14px;
  color: #171717;
  font-weight: 500;
}

/* ส่วนตั้งเป้าหมายสำหรับนักกีฬาแต่ละคน */
.goals-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #E5E5E5;
}

.goals-section h4 {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
  margin: 0 0 12px;
}

.athlete-goals-card {
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.athlete-goals-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #F5F5F5;
}

.athlete-goals-name {
  font-size: 14px;
  font-weight: 600;
  color: #171717;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.goal-item-compact {
  background: #FAFAFA;
  border-radius: 6px;
  padding: 10px;
}

.goal-field-label {
  font-size: 12px;
  font-weight: 500;
  color: #525252;
  margin-bottom: 8px;
}

.goal-unit {
  font-weight: 400;
  color: #737373;
}

.goal-inputs-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.goal-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 13px;
  min-width: 0;
}

.goal-input:focus {
  outline: none;
  border-color: #171717;
}

.goal-arrow {
  color: #A3A3A3;
  font-size: 14px;
  flex-shrink: 0;
}

/* Legacy goal item styles */
.goal-item {
  background: #FAFAFA;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.goal-field-name {
  font-weight: 500;
  color: #171717;
}

.goal-field-unit {
  font-size: 12px;
  color: #737373;
}

.goal-inputs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.goal-inputs .form-group label {
  font-size: 12px;
}

.goal-inputs input {
  padding: 8px 10px;
  font-size: 13px;
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* Responsive */
@media (max-width: 768px) {
  .tracking-detail-page {
    padding: 16px;
  }

  .header-top {
    flex-wrap: wrap;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
    margin-top: 12px;
  }

  .plan-stats {
    grid-template-columns: 1fr 1fr;
  }

  .tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .fields-grid {
    grid-template-columns: 1fr 1fr;
  }

  .progress-grid {
    grid-template-columns: 1fr;
  }

  .goal-inputs {
    grid-template-columns: 1fr;
  }

  /* Multi-athlete selection responsive */
  .selection-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .goals-grid {
    grid-template-columns: 1fr;
  }

  .goal-inputs-row {
    flex-wrap: wrap;
  }

  .goal-input {
    flex: 1 1 80px;
  }
}

@media (max-width: 480px) {
  .plan-stats {
    grid-template-columns: 1fr;
  }

  .fields-grid {
    grid-template-columns: 1fr;
  }

  .athlete-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .athlete-actions {
    width: 100%;
    justify-content: flex-end;
  }

  /* Multi-athlete selection mobile */
  .athlete-checkbox-list {
    max-height: 200px;
  }

  .athlete-checkbox-item {
    padding: 8px 10px;
  }

  .athlete-checkbox-avatar {
    width: 32px;
    height: 32px;
    font-size: 11px;
  }

  .athlete-checkbox-name {
    font-size: 13px;
  }
}
</style>
