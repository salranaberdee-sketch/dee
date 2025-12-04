<template>
  <div class="metric-editor">
    <form @submit.prevent="handleSubmit" class="metric-form">
      <!-- Name Field -->
      <div class="form-group">
        <label for="name">ชื่อตัวชี้วัด <span class="required">*</span></label>
        <input
          id="name"
          v-model="form.name"
          type="text"
          placeholder="เช่น attendance_rate"
          :class="{ error: errors.name }"
          @blur="validateField('name')"
        />
        <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
      </div>

      <!-- Display Name Field -->
      <div class="form-group">
        <label for="display_name">ชื่อแสดงผล <span class="required">*</span></label>
        <input
          id="display_name"
          v-model="form.display_name"
          type="text"
          placeholder="เช่น อัตราการเข้าร่วม"
          :class="{ error: errors.display_name }"
          @blur="validateField('display_name')"
        />
        <span v-if="errors.display_name" class="error-text">{{ errors.display_name }}</span>
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

      <!-- Measurement Type Field -->
      <div class="form-group">
        <label for="measurement_type">ประเภทการวัด <span class="required">*</span></label>
        <select
          id="measurement_type"
          v-model="form.measurement_type"
          :class="{ error: errors.measurement_type }"
          @change="onMeasurementTypeChange"
        >
          <option value="">เลือกประเภท</option>
          <option value="count">จำนวนครั้ง (Count)</option>
          <option value="percentage">เปอร์เซ็นต์ (Percentage)</option>
          <option value="rating">คะแนน (Rating)</option>
          <option value="time">เวลา (Time)</option>
          <option value="distance">ระยะทาง (Distance)</option>
        </select>
        <span v-if="errors.measurement_type" class="error-text">{{ errors.measurement_type }}</span>
        <p class="field-hint">{{ getMeasurementTypeHint(form.measurement_type) }}</p>
      </div>

      <!-- Target Value (for count, time, distance) -->
      <div v-if="showTargetValue" class="form-group">
        <label for="target_value">ค่าเป้าหมาย <span class="required">*</span></label>
        <div class="input-with-suffix">
          <input
            id="target_value"
            v-model.number="form.target_value"
            type="number"
            step="any"
            min="0"
            placeholder="0"
            :class="{ error: errors.target_value }"
            @blur="validateField('target_value')"
          />
          <span class="suffix">{{ getTargetSuffix() }}</span>
        </div>
        <span v-if="errors.target_value" class="error-text">{{ errors.target_value }}</span>
      </div>

      <!-- Rating Scale (for rating type) -->
      <div v-if="form.measurement_type === 'rating'" class="form-row">
        <div class="form-group">
          <label for="rating_scale_min">คะแนนต่ำสุด</label>
          <input
            id="rating_scale_min"
            v-model.number="form.rating_scale_min"
            type="number"
            min="0"
            placeholder="1"
          />
        </div>
        <div class="form-group">
          <label for="rating_scale_max">คะแนนสูงสุด</label>
          <input
            id="rating_scale_max"
            v-model.number="form.rating_scale_max"
            type="number"
            min="1"
            placeholder="5"
          />
        </div>
      </div>

      <!-- Min/Max Values -->
      <div class="form-row">
        <div class="form-group">
          <label for="min_value">ค่าต่ำสุด</label>
          <input
            id="min_value"
            v-model.number="form.min_value"
            type="number"
            step="any"
            placeholder="0"
            :class="{ error: errors.min_value }"
          />
          <span v-if="errors.min_value" class="error-text">{{ errors.min_value }}</span>
        </div>
        <div class="form-group">
          <label for="max_value">ค่าสูงสุด</label>
          <input
            id="max_value"
            v-model.number="form.max_value"
            type="number"
            step="any"
            placeholder="100"
            :class="{ error: errors.max_value }"
          />
          <span v-if="errors.max_value" class="error-text">{{ errors.max_value }}</span>
        </div>
      </div>

      <!-- Default Value -->
      <div class="form-group">
        <label for="default_value">ค่าเริ่มต้น (เมื่อไม่มีข้อมูล)</label>
        <input
          id="default_value"
          v-model.number="form.default_value"
          type="number"
          step="any"
          placeholder="0"
        />
        <p class="field-hint">ค่าที่ใช้เมื่อไม่มีข้อมูลจริง</p>
      </div>

      <!-- Required Toggle -->
      <div class="form-group toggle-group">
        <label class="toggle-label">
          <span>ตัวชี้วัดนี้จำเป็นต้องมี</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="form.is_required" />
            <span class="toggle-slider"></span>
          </label>
        </label>
      </div>

      <!-- Example Calculation Preview -->
      <div class="calculation-preview">
        <h4>ตัวอย่างการคำนวณ</h4>
        <div class="preview-content">
          <div class="preview-input">
            <label>ค่าจริง:</label>
            <input
              v-model.number="previewValue"
              type="number"
              step="any"
              placeholder="0"
            />
          </div>
          <div class="preview-result">
            <span class="result-label">คะแนนที่ได้:</span>
            <span class="result-value">{{ calculatedScore }}%</span>
          </div>
          <div class="preview-formula">
            <span class="formula-label">สูตร:</span>
            <code>{{ getFormulaDisplay() }}</code>
          </div>
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions">
        <button type="button" @click="$emit('cancel')" class="btn-secondary">
          ยกเลิก
        </button>
        <button type="submit" class="btn-primary" :disabled="!isFormValid || saving">
          <span v-if="saving" class="spinner-small"></span>
          {{ saving ? 'กำลังบันทึก...' : (isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มตัวชี้วัด') }}
        </button>
      </div>
    </form>
  </div>
</template>


<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { calculateMetricScore } from '@/lib/scoreCalculator'

const props = defineProps({
  metric: {
    type: Object,
    default: null
  },
  categoryId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['save', 'cancel'])

// Form state
const form = ref({
  name: '',
  display_name: '',
  description: '',
  measurement_type: '',
  target_value: null,
  rating_scale_min: 1,
  rating_scale_max: 5,
  min_value: 0,
  max_value: 100,
  default_value: 0,
  is_required: true
})

// Validation errors
const errors = ref({
  name: '',
  display_name: '',
  measurement_type: '',
  target_value: '',
  min_value: '',
  max_value: ''
})

const saving = ref(false)
const previewValue = ref(50)

// Computed
const isEditMode = computed(() => !!props.metric?.id)

const showTargetValue = computed(() => {
  return ['count', 'time', 'distance'].includes(form.value.measurement_type)
})

const isFormValid = computed(() => {
  return (
    form.value.name?.trim() &&
    form.value.display_name?.trim() &&
    form.value.measurement_type &&
    (form.value.min_value === null || form.value.max_value === null || 
     form.value.min_value < form.value.max_value) &&
    !Object.values(errors.value).some(e => e)
  )
})

const calculatedScore = computed(() => {
  if (!form.value.measurement_type) return 0
  
  const result = calculateMetricScore(
    {
      measurement_type: form.value.measurement_type,
      target_value: form.value.target_value,
      rating_scale_min: form.value.rating_scale_min,
      rating_scale_max: form.value.rating_scale_max,
      default_value: form.value.default_value
    },
    previewValue.value,
    false
  )
  
  return result.score
})

// Methods
function getMeasurementTypeHint(type) {
  const hints = {
    count: 'นับจำนวนครั้ง เช่น จำนวนครั้งการฝึกซ้อม',
    percentage: 'ค่าเปอร์เซ็นต์ 0-100%',
    rating: 'คะแนนจากการประเมิน เช่น 1-5 ดาว',
    time: 'เวลาในหน่วยนาที',
    distance: 'ระยะทางในหน่วยเมตร'
  }
  return hints[type] || 'เลือกประเภทการวัดที่เหมาะสม'
}

function getTargetSuffix() {
  const suffixes = {
    count: 'ครั้ง',
    time: 'นาที',
    distance: 'เมตร'
  }
  return suffixes[form.value.measurement_type] || ''
}

function getFormulaDisplay() {
  switch (form.value.measurement_type) {
    case 'count':
    case 'distance':
      return `(ค่าจริง / ${form.value.target_value || 'เป้าหมาย'}) × 100`
    case 'percentage':
      return 'ค่าจริง (0-100%)'
    case 'rating':
      return `((ค่าจริง - ${form.value.rating_scale_min}) / (${form.value.rating_scale_max} - ${form.value.rating_scale_min})) × 100`
    case 'time':
      return `(1 - (ค่าจริง / ${form.value.target_value || 'เป้าหมาย'})) × 100 + 100`
    default:
      return 'เลือกประเภทการวัด'
  }
}

function onMeasurementTypeChange() {
  validateField('measurement_type')
  // ตั้งค่าเริ่มต้นตามประเภท
  switch (form.value.measurement_type) {
    case 'percentage':
      form.value.min_value = 0
      form.value.max_value = 100
      form.value.target_value = null
      previewValue.value = 80
      break
    case 'rating':
      form.value.min_value = form.value.rating_scale_min
      form.value.max_value = form.value.rating_scale_max
      form.value.target_value = null
      previewValue.value = 4
      break
    case 'count':
      form.value.target_value = 10
      previewValue.value = 8
      break
    case 'time':
      form.value.target_value = 60
      previewValue.value = 45
      break
    case 'distance':
      form.value.target_value = 1000
      previewValue.value = 800
      break
  }
}

function validateField(field) {
  errors.value[field] = ''
  
  switch (field) {
    case 'name':
      if (!form.value.name?.trim()) {
        errors.value.name = 'กรุณาระบุชื่อตัวชี้วัด'
      }
      break
    case 'display_name':
      if (!form.value.display_name?.trim()) {
        errors.value.display_name = 'กรุณาระบุชื่อแสดงผล'
      }
      break
    case 'measurement_type':
      if (!form.value.measurement_type) {
        errors.value.measurement_type = 'กรุณาเลือกประเภทการวัด'
      }
      break
    case 'target_value':
      if (showTargetValue.value && (form.value.target_value === null || form.value.target_value <= 0)) {
        errors.value.target_value = 'กรุณาระบุค่าเป้าหมายที่มากกว่า 0'
      }
      break
    case 'min_value':
    case 'max_value':
      if (form.value.min_value !== null && form.value.max_value !== null && 
          form.value.min_value >= form.value.max_value) {
        errors.value.min_value = 'ค่าต่ำสุดต้องน้อยกว่าค่าสูงสุด'
      }
      break
  }
}

function validateAllFields() {
  const fields = ['name', 'display_name', 'measurement_type']
  if (showTargetValue.value) {
    fields.push('target_value')
  }
  fields.forEach(validateField)
  return !Object.values(errors.value).some(e => e)
}

function handleSubmit() {
  if (!validateAllFields()) {
    return
  }

  saving.value = true
  
  const metricData = {
    name: form.value.name.trim(),
    display_name: form.value.display_name.trim(),
    description: form.value.description?.trim() || null,
    measurement_type: form.value.measurement_type,
    target_value: form.value.target_value,
    rating_scale_min: form.value.rating_scale_min,
    rating_scale_max: form.value.rating_scale_max,
    min_value: form.value.min_value,
    max_value: form.value.max_value,
    default_value: form.value.default_value,
    is_required: form.value.is_required,
    category_id: props.categoryId
  }

  emit('save', metricData)
  saving.value = false
}

function initializeForm() {
  if (props.metric) {
    form.value = {
      name: props.metric.name || '',
      display_name: props.metric.display_name || '',
      description: props.metric.description || '',
      measurement_type: props.metric.measurement_type || '',
      target_value: props.metric.target_value ?? null,
      rating_scale_min: props.metric.rating_scale_min ?? 1,
      rating_scale_max: props.metric.rating_scale_max ?? 5,
      min_value: props.metric.min_value ?? 0,
      max_value: props.metric.max_value ?? 100,
      default_value: props.metric.default_value ?? 0,
      is_required: props.metric.is_required !== false
    }
  } else {
    form.value = {
      name: '',
      display_name: '',
      description: '',
      measurement_type: '',
      target_value: null,
      rating_scale_min: 1,
      rating_scale_max: 5,
      min_value: 0,
      max_value: 100,
      default_value: 0,
      is_required: true
    }
  }
  // Clear errors
  errors.value = {
    name: '',
    display_name: '',
    measurement_type: '',
    target_value: '',
    min_value: '',
    max_value: ''
  }
}

watch(() => props.metric, () => {
  initializeForm()
}, { immediate: true })

onMounted(() => {
  initializeForm()
})
</script>


<style scoped>
.metric-editor {
  padding: 0;
}

.metric-form {
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
  min-width: 50px;
  justify-content: center;
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

/* Calculation Preview */
.calculation-preview {
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  padding: 1rem;
}

.calculation-preview h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #171717;
  margin: 0 0 1rem;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.preview-input label {
  font-size: 0.875rem;
  color: #525252;
  min-width: 60px;
}

.preview-input input {
  width: 100px;
  padding: 0.5rem;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 0.875rem;
}

.preview-result {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #D1FAE5;
  border-radius: 6px;
}

.result-label {
  font-size: 0.875rem;
  color: #065F46;
}

.result-value {
  font-weight: 700;
  font-size: 1.25rem;
  color: #065F46;
}

.preview-formula {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.formula-label {
  font-size: 0.75rem;
  color: #737373;
}

.preview-formula code {
  font-size: 0.75rem;
  background: #E5E5E5;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  color: #525252;
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

@media (max-width: 640px) {
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
