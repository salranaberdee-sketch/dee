<template>
  <form @submit.prevent="handleSubmit" class="condition-form">
    <!-- Name Field -->
    <div class="form-group">
      <label for="name">ชื่อเงื่อนไข <span class="required">*</span></label>
      <input
        id="name"
        v-model="form.name"
        type="text"
        placeholder="เช่น เข้าร่วมครบ 100%"
        :class="{ error: errors.name }"
        @blur="validateField('name')"
      />
      <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
    </div>

    <!-- Description Field -->
    <div class="form-group">
      <label for="description">คำอธิบาย</label>
      <textarea
        id="description"
        v-model="form.description"
        placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
        rows="2"
      ></textarea>
    </div>

    <!-- Category Field -->
    <div class="form-group">
      <label for="category">หมวดหมู่ <span class="required">*</span></label>
      <select
        id="category"
        v-model="form.category"
        :class="{ error: errors.category }"
        @change="validateField('category')"
      >
        <option value="">เลือกหมวดหมู่</option>
        <option value="attendance">การเข้าร่วม</option>
        <option value="training">การฝึกซ้อม</option>
        <option value="rating">Rating</option>
        <option value="custom">กำหนดเอง</option>
      </select>
      <span v-if="errors.category" class="error-text">{{ errors.category }}</span>
    </div>

    <!-- Condition Type Field -->
    <div class="form-group">
      <label>ประเภทเงื่อนไข <span class="required">*</span></label>
      <div class="radio-group">
        <label class="radio-option" :class="{ selected: form.condition_type === 'bonus' }">
          <input
            type="radio"
            v-model="form.condition_type"
            value="bonus"
            @change="validateField('condition_type')"
          />
          <span class="radio-icon bonus">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </span>
          <span class="radio-label">โบนัส (เพิ่มคะแนน)</span>
        </label>
        <label class="radio-option" :class="{ selected: form.condition_type === 'penalty' }">
          <input
            type="radio"
            v-model="form.condition_type"
            value="penalty"
            @change="validateField('condition_type')"
          />
          <span class="radio-icon penalty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </span>
          <span class="radio-label">หักคะแนน</span>
        </label>
      </div>
      <span v-if="errors.condition_type" class="error-text">{{ errors.condition_type }}</span>
    </div>

    <!-- Threshold Section -->
    <div class="threshold-section">
      <h4>เงื่อนไขการตรวจสอบ</h4>
      
      <div class="threshold-row">
        <!-- Threshold Type -->
        <div class="form-group threshold-type">
          <label for="threshold_type">ประเภทค่า <span class="required">*</span></label>
          <select
            id="threshold_type"
            v-model="form.threshold_type"
            :class="{ error: errors.threshold_type }"
            @change="validateField('threshold_type')"
          >
            <option value="">เลือก</option>
            <option value="percentage">เปอร์เซ็นต์ (%)</option>
            <option value="count">จำนวนครั้ง</option>
            <option value="value">ค่าตัวเลข</option>
          </select>
          <span v-if="errors.threshold_type" class="error-text">{{ errors.threshold_type }}</span>
        </div>

        <!-- Comparison Operator -->
        <div class="form-group comparison-op">
          <label for="comparison_operator">เงื่อนไข <span class="required">*</span></label>
          <select
            id="comparison_operator"
            v-model="form.comparison_operator"
            :class="{ error: errors.comparison_operator }"
            @change="validateField('comparison_operator')"
          >
            <option value="">เลือก</option>
            <option value=">=">≥ มากกว่าหรือเท่ากับ</option>
            <option value=">">&#62; มากกว่า</option>
            <option value="<=">≤ น้อยกว่าหรือเท่ากับ</option>
            <option value="<">&#60; น้อยกว่า</option>
            <option value="=">=  เท่ากับ</option>
          </select>
          <span v-if="errors.comparison_operator" class="error-text">{{ errors.comparison_operator }}</span>
        </div>

        <!-- Threshold Value -->
        <div class="form-group threshold-value">
          <label for="threshold_value">ค่าเกณฑ์ <span class="required">*</span></label>
          <div class="input-with-suffix">
            <input
              id="threshold_value"
              v-model.number="form.threshold_value"
              type="number"
              step="any"
              placeholder="0"
              :class="{ error: errors.threshold_value }"
              @blur="validateField('threshold_value')"
            />
            <span class="suffix">{{ thresholdSuffix }}</span>
          </div>
          <span v-if="errors.threshold_value" class="error-text">{{ errors.threshold_value }}</span>
        </div>
      </div>
    </div>

    <!-- Points Field -->
    <div class="form-group">
      <label for="points">คะแนน <span class="required">*</span></label>
      <div class="points-input-wrapper">
        <span class="points-prefix" :class="form.condition_type">
          {{ form.condition_type === 'penalty' ? '-' : '+' }}
        </span>
        <input
          id="points"
          v-model.number="pointsAbsolute"
          type="number"
          min="1"
          placeholder="5"
          :class="{ error: errors.points }"
          @blur="validateField('points')"
        />
        <span class="points-suffix">คะแนน</span>
      </div>
      <span v-if="errors.points" class="error-text">{{ errors.points }}</span>
      <p class="field-hint">
        {{ form.condition_type === 'penalty' ? 'คะแนนที่จะถูกหักเมื่อเข้าเงื่อนไข' : 'คะแนนที่จะได้รับเมื่อเข้าเงื่อนไข' }}
      </p>
    </div>

    <!-- Active Status -->
    <div class="form-group toggle-group">
      <label class="toggle-label">
        <span>เปิดใช้งานเงื่อนไขนี้</span>
        <label class="toggle-switch">
          <input type="checkbox" v-model="form.is_active" />
          <span class="toggle-slider"></span>
        </label>
      </label>
    </div>

    <!-- Form Actions -->
    <div class="form-actions">
      <button type="button" @click="$emit('cancel')" class="btn-secondary">
        ยกเลิก
      </button>
      <button type="submit" class="btn-primary" :disabled="!isFormValid || saving">
        <span v-if="saving" class="spinner-small"></span>
        {{ saving ? 'กำลังบันทึก...' : (isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มเงื่อนไข') }}
      </button>
    </div>
  </form>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps({
  condition: {
    type: Object,
    default: null
  },
  clubId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['save', 'cancel'])

// Form state
const form = ref({
  name: '',
  description: '',
  category: '',
  condition_type: 'bonus',
  threshold_type: '',
  comparison_operator: '',
  threshold_value: null,
  points: null,
  is_active: true
})

// Validation errors
const errors = ref({
  name: '',
  category: '',
  condition_type: '',
  threshold_type: '',
  comparison_operator: '',
  threshold_value: '',
  points: ''
})

const saving = ref(false)

// Computed
const isEditMode = computed(() => !!props.condition?.id)

const pointsAbsolute = computed({
  get() {
    return form.value.points !== null ? Math.abs(form.value.points) : null
  },
  set(value) {
    if (value === null || value === '') {
      form.value.points = null
    } else {
      const absValue = Math.abs(Number(value))
      form.value.points = form.value.condition_type === 'penalty' ? -absValue : absValue
    }
  }
})

const thresholdSuffix = computed(() => {
  switch (form.value.threshold_type) {
    case 'percentage': return '%'
    case 'count': return 'ครั้ง'
    default: return ''
  }
})

const isFormValid = computed(() => {
  return (
    form.value.name?.trim() &&
    form.value.category &&
    form.value.condition_type &&
    form.value.threshold_type &&
    form.value.comparison_operator &&
    form.value.threshold_value !== null &&
    form.value.threshold_value !== '' &&
    form.value.points !== null &&
    form.value.points !== 0 &&
    !Object.values(errors.value).some(e => e)
  )
})

// Methods
function validateField(field) {
  errors.value[field] = ''
  
  switch (field) {
    case 'name':
      if (!form.value.name?.trim()) {
        errors.value.name = 'กรุณาระบุชื่อเงื่อนไข'
      }
      break
    case 'category':
      if (!form.value.category) {
        errors.value.category = 'กรุณาเลือกหมวดหมู่'
      }
      break
    case 'condition_type':
      if (!form.value.condition_type) {
        errors.value.condition_type = 'กรุณาเลือกประเภทเงื่อนไข'
      }
      break
    case 'threshold_type':
      if (!form.value.threshold_type) {
        errors.value.threshold_type = 'กรุณาเลือกประเภทค่า'
      }
      break
    case 'comparison_operator':
      if (!form.value.comparison_operator) {
        errors.value.comparison_operator = 'กรุณาเลือกเงื่อนไข'
      }
      break
    case 'threshold_value':
      if (form.value.threshold_value === null || form.value.threshold_value === '') {
        errors.value.threshold_value = 'กรุณาระบุค่าเกณฑ์'
      } else if (form.value.threshold_type === 'percentage' && 
                 (form.value.threshold_value < 0 || form.value.threshold_value > 100)) {
        errors.value.threshold_value = 'เปอร์เซ็นต์ต้องอยู่ระหว่าง 0-100'
      }
      break
    case 'points':
      if (form.value.points === null || form.value.points === 0) {
        errors.value.points = 'กรุณาระบุคะแนน'
      }
      break
  }
}

function validateAllFields() {
  const fields = ['name', 'category', 'condition_type', 'threshold_type', 'comparison_operator', 'threshold_value', 'points']
  fields.forEach(validateField)
  return !Object.values(errors.value).some(e => e)
}

function handleSubmit() {
  if (!validateAllFields()) {
    return
  }

  saving.value = true
  
  const conditionData = {
    name: form.value.name.trim(),
    description: form.value.description?.trim() || null,
    category: form.value.category,
    condition_type: form.value.condition_type,
    threshold_type: form.value.threshold_type,
    comparison_operator: form.value.comparison_operator,
    threshold_value: Number(form.value.threshold_value),
    points: form.value.points,
    is_active: form.value.is_active
  }

  emit('save', conditionData)
  saving.value = false
}

function initializeForm() {
  if (props.condition) {
    // Edit mode - populate form with existing data
    form.value = {
      name: props.condition.name || '',
      description: props.condition.description || '',
      category: props.condition.category || '',
      condition_type: props.condition.condition_type || 'bonus',
      threshold_type: props.condition.threshold_type || '',
      comparison_operator: props.condition.comparison_operator || '',
      threshold_value: props.condition.threshold_value ?? null,
      points: props.condition.points ?? null,
      is_active: props.condition.is_active !== false
    }
  } else {
    // Create mode - reset form
    form.value = {
      name: '',
      description: '',
      category: '',
      condition_type: 'bonus',
      threshold_type: '',
      comparison_operator: '',
      threshold_value: null,
      points: null,
      is_active: true
    }
  }
  // Clear errors
  errors.value = {
    name: '',
    category: '',
    condition_type: '',
    threshold_type: '',
    comparison_operator: '',
    threshold_value: '',
    points: ''
  }
}

// Watch for condition_type changes to update points sign
watch(() => form.value.condition_type, (newType) => {
  if (form.value.points !== null) {
    const absPoints = Math.abs(form.value.points)
    form.value.points = newType === 'penalty' ? -absPoints : absPoints
  }
})

// Watch for condition prop changes (when editing different conditions)
watch(() => props.condition, () => {
  initializeForm()
}, { immediate: true })

onMounted(() => {
  initializeForm()
})
</script>


<style scoped>
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

.form-group label {
  font-weight: 500;
  color: #171717;
  font-size: 0.875rem;
}

.required {
  color: #EF4444;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 0.875rem;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #171717;
  box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.1);
}

.form-group input.error,
.form-group select.error {
  border-color: #EF4444;
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.error-text {
  color: #EF4444;
  font-size: 0.75rem;
}

.field-hint {
  color: #737373;
  font-size: 0.75rem;
  margin: 0;
}

/* Radio Group */
.radio-group {
  display: flex;
  gap: 0.75rem;
}

.radio-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.radio-option:hover {
  background: #FAFAFA;
}

.radio-option.selected {
  border-color: #171717;
  background: #FAFAFA;
}

.radio-option input {
  display: none;
}

.radio-icon {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.radio-icon.bonus {
  background: #D1FAE5;
  color: #065F46;
}

.radio-icon.penalty {
  background: #FEE2E2;
  color: #991B1B;
}

.radio-icon svg {
  width: 16px;
  height: 16px;
}

.radio-label {
  font-size: 0.875rem;
  color: #171717;
}

/* Threshold Section */
.threshold-section {
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 1rem;
}

.threshold-section h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #171717;
  margin: 0 0 1rem;
}

.threshold-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
}

@media (max-width: 640px) {
  .threshold-row {
    grid-template-columns: 1fr;
  }
}

.threshold-section .form-group select,
.threshold-section .form-group input {
  background: #fff;
}

/* Input with suffix */
.input-with-suffix {
  display: flex;
  align-items: center;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.input-with-suffix:focus-within {
  border-color: #171717;
  box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.1);
}

.input-with-suffix input {
  flex: 1;
  border: none !important;
  box-shadow: none !important;
  padding: 0.75rem;
}

.input-with-suffix input:focus {
  outline: none;
}

.input-with-suffix .suffix {
  padding: 0 0.75rem;
  color: #737373;
  font-size: 0.875rem;
  background: #F5F5F5;
  height: 100%;
  display: flex;
  align-items: center;
  min-width: 40px;
  justify-content: center;
}

/* Points Input */
.points-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  overflow: hidden;
  background: #fff;
}

.points-input-wrapper:focus-within {
  border-color: #171717;
  box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.1);
}

.points-prefix {
  padding: 0.75rem;
  font-weight: 600;
  font-size: 1rem;
  min-width: 32px;
  text-align: center;
}

.points-prefix.bonus {
  color: #065F46;
  background: #D1FAE5;
}

.points-prefix.penalty {
  color: #991B1B;
  background: #FEE2E2;
}

.points-input-wrapper input {
  flex: 1;
  border: none !important;
  box-shadow: none !important;
  padding: 0.75rem;
  text-align: center;
}

.points-input-wrapper input:focus {
  outline: none;
}

.points-suffix {
  padding: 0 0.75rem;
  color: #737373;
  font-size: 0.875rem;
}

/* Toggle Group */
.toggle-group {
  padding-top: 0.5rem;
  border-top: 1px solid #E5E5E5;
}

.toggle-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}

.toggle-label span {
  font-weight: 500;
  color: #171717;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #D4D4D4;
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: #171717;
}

.toggle-switch input:checked + .toggle-slider:before {
  transform: translateX(20px);
}

/* Form Actions */
.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid #E5E5E5;
  margin-top: 0.5rem;
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
  transition: background 0.15s;
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
  transition: opacity 0.15s;
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
  display: inline-block;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
