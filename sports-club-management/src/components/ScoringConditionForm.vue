<template>
  <div class="scoring-condition-form">
    <!-- Header -->
    <div class="form-header">
      <div class="header-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 20V10"/>
          <path d="M18 20V4"/>
          <path d="M6 20v-4"/>
        </svg>
      </div>
      <div>
        <h3>{{ isEdit ? 'แก้ไขเงื่อนไข' : 'เพิ่มเงื่อนไขใหม่' }}</h3>
        <p>กำหนดเงื่อนไขโบนัส/หักคะแนน</p>
      </div>
    </div>

    <form @submit.prevent="handleSubmit" class="condition-form">
      <!-- ชื่อเงื่อนไข -->
      <div class="form-group">
        <label for="name">ชื่อเงื่อนไข <span class="required">*</span></label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          placeholder="เช่น โบนัสเข้าร่วมครบ 100%"
          :class="{ error: errors.name }"
        />
        <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
      </div>

      <!-- คำอธิบาย -->
      <div class="form-group">
        <label for="description">คำอธิบาย</label>
        <textarea
          id="description"
          v-model="form.description"
          placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
          rows="2"
        ></textarea>
      </div>

      <!-- ประเภทเงื่อนไข -->
      <div class="form-row">
        <div class="form-group">
          <label>ประเภท <span class="required">*</span></label>
          <div class="type-selector">
            <button
              type="button"
              class="type-btn bonus"
              :class="{ selected: form.condition_type === 'bonus' }"
              @click="form.condition_type = 'bonus'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              โบนัส
            </button>
            <button
              type="button"
              class="type-btn penalty"
              :class="{ selected: form.condition_type === 'penalty' }"
              @click="form.condition_type = 'penalty'"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              หักคะแนน
            </button>
          </div>
        </div>

        <div class="form-group">
          <label for="category">หมวดหมู่ <span class="required">*</span></label>
          <select id="category" v-model="form.category" :class="{ error: errors.category }">
            <option value="">เลือกหมวดหมู่</option>
            <option value="attendance">การเข้าร่วม</option>
            <option value="training">การฝึกซ้อม</option>
            <option value="rating">คะแนนประเมิน</option>
            <option value="custom">กำหนดเอง</option>
          </select>
          <span v-if="errors.category" class="error-text">{{ errors.category }}</span>
        </div>
      </div>

      <!-- เงื่อนไข -->
      <div class="form-group">
        <label>เงื่อนไข <span class="required">*</span></label>
        <div class="condition-builder">
          <select v-model="form.threshold_type" class="threshold-type">
            <option value="percentage">เปอร์เซ็นต์</option>
            <option value="count">จำนวนครั้ง</option>
            <option value="value">ค่า</option>
          </select>
          <select v-model="form.comparison_operator" class="comparison-op">
            <option value=">=">≥ มากกว่าหรือเท่ากับ</option>
            <option value=">">&#62; มากกว่า</option>
            <option value="<=">≤ น้อยกว่าหรือเท่ากับ</option>
            <option value="<">&#60; น้อยกว่า</option>
            <option value="=">=  เท่ากับ</option>
          </select>
          <div class="threshold-input">
            <input
              type="number"
              v-model.number="form.threshold_value"
              step="any"
              min="0"
              placeholder="0"
            />
            <span class="suffix">{{ form.threshold_type === 'percentage' ? '%' : '' }}</span>
          </div>
        </div>
      </div>

      <!-- คะแนน -->
      <div class="form-group">
        <label for="points">คะแนน {{ form.condition_type === 'bonus' ? 'โบนัส' : 'หัก' }} <span class="required">*</span></label>
        <div class="points-input">
          <span class="prefix">{{ form.condition_type === 'bonus' ? '+' : '-' }}</span>
          <input
            id="points"
            type="number"
            v-model.number="form.points"
            min="1"
            max="100"
            placeholder="5"
          />
          <span class="suffix">คะแนน</span>
        </div>
      </div>

      <!-- Preview -->
      <div class="condition-preview">
        <h4>ตัวอย่างเงื่อนไข</h4>
        <p class="preview-text">
          <span :class="form.condition_type">
            {{ form.condition_type === 'bonus' ? '+' : '-' }}{{ form.points || 0 }} คะแนน
          </span>
          เมื่อ {{ getCategoryLabel(form.category) }}
          {{ getOperatorLabel(form.comparison_operator) }}
          {{ form.threshold_value || 0 }}{{ form.threshold_type === 'percentage' ? '%' : '' }}
        </p>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-secondary">
          ยกเลิก
        </button>
        <button type="submit" class="btn-primary" :disabled="!isValid || saving">
          <span v-if="saving" class="spinner-small"></span>
          {{ saving ? 'กำลังบันทึก...' : (isEdit ? 'บันทึก' : 'เพิ่มเงื่อนไข') }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  condition: {
    type: Object,
    default: null
  },
  criteriaId: {
    type: String,
    required: true
  },
  clubId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['save', 'cancel'])

// State
const saving = ref(false)
const form = ref({
  name: '',
  description: '',
  category: 'attendance',
  condition_type: 'bonus',
  threshold_type: 'percentage',
  comparison_operator: '>=',
  threshold_value: 100,
  points: 5
})

const errors = ref({
  name: '',
  category: ''
})

// Computed
const isEdit = computed(() => !!props.condition?.id)

const isValid = computed(() => {
  return form.value.name?.trim() &&
    form.value.category &&
    form.value.threshold_value !== null &&
    form.value.points > 0
})

// Methods
function getCategoryLabel(category) {
  const labels = {
    attendance: 'อัตราการเข้าร่วม',
    training: 'ชั่วโมงฝึกซ้อม',
    rating: 'คะแนนประเมิน',
    custom: 'ค่าที่กำหนด'
  }
  return labels[category] || category
}

function getOperatorLabel(op) {
  const labels = {
    '>=': 'มากกว่าหรือเท่ากับ',
    '>': 'มากกว่า',
    '<=': 'น้อยกว่าหรือเท่ากับ',
    '<': 'น้อยกว่า',
    '=': 'เท่ากับ'
  }
  return labels[op] || op
}

function handleSubmit() {
  // Validate
  errors.value = { name: '', category: '' }
  
  if (!form.value.name?.trim()) {
    errors.value.name = 'กรุณาระบุชื่อเงื่อนไข'
    return
  }
  
  if (!form.value.category) {
    errors.value.category = 'กรุณาเลือกหมวดหมู่'
    return
  }

  saving.value = true
  
  emit('save', {
    ...form.value,
    criteria_id: props.criteriaId,
    club_id: props.clubId,
    is_active: true
  })
  
  saving.value = false
}

// Initialize form
watch(() => props.condition, (newVal) => {
  if (newVal) {
    form.value = {
      name: newVal.name || '',
      description: newVal.description || '',
      category: newVal.category || 'attendance',
      condition_type: newVal.condition_type || 'bonus',
      threshold_type: newVal.threshold_type || 'percentage',
      comparison_operator: newVal.comparison_operator || '>=',
      threshold_value: newVal.threshold_value ?? 100,
      points: newVal.points ?? 5
    }
  }
}, { immediate: true })
</script>

<style scoped>
.scoring-condition-form {
  padding: 0;
}

.form-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #E5E5E5;
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.form-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.form-header p {
  font-size: 0.875rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

.condition-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  font-weight: 500;
  color: #171717;
  font-size: 0.875rem;
}

.required {
  color: #EF4444;
}

.form-group input,
.form-group textarea,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #171717;
}

.form-group input.error,
.form-group select.error {
  border-color: #EF4444;
}

.error-text {
  color: #EF4444;
  font-size: 0.75rem;
}

/* Type Selector */
.type-selector {
  display: flex;
  gap: 0.5rem;
}

.type-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 2px solid #E5E5E5;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.15s;
}

.type-btn svg {
  width: 16px;
  height: 16px;
}

.type-btn.bonus.selected {
  border-color: #22C55E;
  background: #D1FAE5;
  color: #065F46;
}

.type-btn.penalty.selected {
  border-color: #EF4444;
  background: #FEE2E2;
  color: #991B1B;
}

/* Condition Builder */
.condition-builder {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.threshold-type {
  flex: 1;
  min-width: 120px;
}

.comparison-op {
  flex: 2;
  min-width: 180px;
}

.threshold-input {
  display: flex;
  align-items: center;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.threshold-input input {
  width: 80px;
  border: none !important;
  text-align: center;
}

.threshold-input .suffix {
  padding: 0 0.75rem;
  background: #F5F5F5;
  color: #737373;
  font-size: 0.875rem;
}

/* Points Input */
.points-input {
  display: flex;
  align-items: center;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.points-input .prefix {
  padding: 0.75rem;
  background: #F5F5F5;
  font-weight: 600;
  color: #171717;
}

.points-input input {
  flex: 1;
  border: none !important;
  text-align: center;
}

.points-input .suffix {
  padding: 0.75rem;
  color: #737373;
  font-size: 0.875rem;
}

/* Preview */
.condition-preview {
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 1rem;
}

.condition-preview h4 {
  font-size: 0.75rem;
  font-weight: 600;
  color: #737373;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem;
}

.preview-text {
  font-size: 0.875rem;
  color: #171717;
  margin: 0;
}

.preview-text .bonus {
  color: #065F46;
  font-weight: 600;
}

.preview-text .penalty {
  color: #991B1B;
  font-weight: 600;
}

/* Actions */
.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #E5E5E5;
}

.btn-secondary {
  padding: 0.75rem 1.25rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #171717;
  font-weight: 500;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

.btn-primary {
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

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinner-small {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }

  .condition-builder {
    flex-direction: column;
  }

  .threshold-type,
  .comparison-op {
    width: 100%;
  }
}
</style>
