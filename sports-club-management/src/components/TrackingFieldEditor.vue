<template>
  <div class="tracking-field-editor">
    <!-- Header -->
    <div class="editor-header">
      <div class="header-info">
        <div class="section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h16"/>
          </svg>
        </div>
        <div>
          <h3>ฟิลด์ที่ติดตาม</h3>
          <p>กำหนดค่าที่ต้องการติดตาม ลากเพื่อเรียงลำดับ</p>
        </div>
      </div>
      <button @click="openAddField" class="btn-add">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        เพิ่มฟิลด์
      </button>
    </div>

    <!-- Fields List with Drag-to-Reorder -->
    <div 
      v-if="localFields.length > 0" 
      class="fields-list"
      @dragover.prevent
      @drop="handleDrop"
    >
      <div 
        v-for="(field, index) in localFields" 
        :key="field.id || `field-${index}`"
        class="field-item"
        :class="{ dragging: dragIndex === index }"
        draggable="true"
        @dragstart="handleDragStart($event, index)"
        @dragend="handleDragEnd"
        @dragover.prevent="handleDragOver($event, index)"
      >
        <!-- Drag Handle -->
        <div class="drag-handle">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="9" cy="6" r="1"/><circle cx="15" cy="6" r="1"/>
            <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
            <circle cx="9" cy="18" r="1"/><circle cx="15" cy="18" r="1"/>
          </svg>
        </div>

        <!-- Field Info -->
        <div class="field-info">
          <div class="field-header">
            <span class="field-name">{{ field.name }}</span>
            <span v-if="field.is_required" class="required-badge">จำเป็น</span>
          </div>
          <div class="field-meta">
            <span class="field-type-badge">{{ getFieldTypeName(field.field_type) }}</span>
            <span v-if="field.unit" class="field-unit">{{ field.unit }}</span>
          </div>
        </div>

        <!-- Field Actions -->
        <div class="field-actions">
          <button @click="openEditField(field, index)" class="btn-icon" title="แก้ไข">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button @click="confirmRemoveField(index)" class="btn-icon danger" title="ลบ">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
      <p>ยังไม่มีฟิลด์ที่ติดตาม</p>
      <button @click="openAddField" class="btn-secondary">
        เพิ่มฟิลด์แรก
      </button>
    </div>

    <!-- Add/Edit Field Modal -->
    <Modal v-if="showFieldModal" @close="closeFieldModal" size="medium">
      <template #header>
        <h2>{{ editingIndex !== null ? 'แก้ไขฟิลด์' : 'เพิ่มฟิลด์ใหม่' }}</h2>
      </template>
      <template #body>
        <form @submit.prevent="saveField" class="field-form">
          <!-- Field Name -->
          <div class="form-group">
            <label>ชื่อฟิลด์ <span class="required">*</span></label>
            <input 
              type="text" 
              v-model="fieldForm.name" 
              placeholder="เช่น น้ำหนัก, เวลาวิ่ง"
              :class="{ error: errors.name }"
              @blur="validateField('name')"
            />
            <span v-if="errors.name" class="error-text">{{ errors.name }}</span>
          </div>

          <!-- Field Type -->
          <div class="form-group">
            <label>ประเภทฟิลด์ <span class="required">*</span></label>
            <select 
              v-model="fieldForm.field_type"
              :class="{ error: errors.field_type }"
              @change="onFieldTypeChange"
            >
              <option value="">เลือกประเภท</option>
              <option value="number">ตัวเลข (Number)</option>
              <option value="time">เวลา (Time)</option>
              <option value="reps">จำนวนครั้ง (Reps)</option>
              <option value="distance">ระยะทาง (Distance)</option>
              <option value="text">ข้อความ (Text)</option>
              <option value="select">ตัวเลือก (Select)</option>
            </select>
            <span v-if="errors.field_type" class="error-text">{{ errors.field_type }}</span>
            <p class="field-hint">{{ getFieldTypeHint(fieldForm.field_type) }}</p>
          </div>

          <!-- Unit -->
          <div class="form-group">
            <label>หน่วย</label>
            <input 
              type="text" 
              v-model="fieldForm.unit" 
              :placeholder="getUnitPlaceholder(fieldForm.field_type)"
            />
            <p class="field-hint">หน่วยที่ใช้แสดงผล เช่น kg, cm, min:sec</p>
          </div>

          <!-- Options (สำหรับ select type) -->
          <div v-if="fieldForm.field_type === 'select'" class="form-group">
            <label>ตัวเลือก <span class="required">*</span></label>
            <div class="options-editor">
              <div 
                v-for="(option, idx) in fieldForm.options" 
                :key="idx" 
                class="option-item"
              >
                <input 
                  type="text" 
                  v-model="fieldForm.options[idx]" 
                  placeholder="ตัวเลือก"
                />
                <button type="button" @click="removeOption(idx)" class="btn-remove-option">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <button type="button" @click="addOption" class="btn-add-option">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                เพิ่มตัวเลือก
              </button>
            </div>
            <span v-if="errors.options" class="error-text">{{ errors.options }}</span>
          </div>

          <!-- Required Toggle -->
          <div class="form-group toggle-group">
            <label class="toggle-label">
              <span>ฟิลด์นี้จำเป็นต้องกรอก</span>
              <label class="toggle-switch">
                <input type="checkbox" v-model="fieldForm.is_required" />
                <span class="toggle-slider"></span>
              </label>
            </label>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="closeFieldModal">ยกเลิก</button>
          <button type="button" class="btn-primary" @click="saveField" :disabled="!isFormValid">
            {{ editingIndex !== null ? 'บันทึกการแก้ไข' : 'เพิ่มฟิลด์' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Delete Confirmation Modal -->
    <Modal v-if="showDeleteConfirm" @close="showDeleteConfirm = false" size="small">
      <template #header>
        <h2>ยืนยันการลบ</h2>
      </template>
      <template #body>
        <div class="delete-confirm">
          <p>คุณต้องการลบฟิลด์ "{{ fieldToDelete?.name }}" หรือไม่?</p>
        </div>
      </template>
      <template #footer>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" @click="showDeleteConfirm = false">ยกเลิก</button>
          <button type="button" class="btn-danger" @click="removeField">ลบฟิลด์</button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Modal from '@/components/Modal.vue'
import { VALID_FIELD_TYPES } from '@/stores/tracking'

const props = defineProps({
  fields: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:fields'])

// Local state สำหรับจัดการ fields
const localFields = ref([...props.fields])

// Drag state
const dragIndex = ref(null)
const dragOverIndex = ref(null)

// Modal state
const showFieldModal = ref(false)
const editingIndex = ref(null)
const showDeleteConfirm = ref(false)
const deleteIndex = ref(null)

// Form state
const fieldForm = ref({
  name: '',
  field_type: '',
  unit: '',
  is_required: false,
  options: []
})

// Validation errors
const errors = ref({
  name: '',
  field_type: '',
  options: ''
})

// Computed
const fieldToDelete = computed(() => {
  if (deleteIndex.value !== null && localFields.value[deleteIndex.value]) {
    return localFields.value[deleteIndex.value]
  }
  return null
})

const isFormValid = computed(() => {
  if (!fieldForm.value.name?.trim()) return false
  if (!fieldForm.value.field_type) return false
  if (fieldForm.value.field_type === 'select') {
    const validOptions = fieldForm.value.options.filter(o => o?.trim())
    if (validOptions.length < 2) return false
  }
  return true
})

// Watch props changes
watch(() => props.fields, (newFields) => {
  localFields.value = [...newFields]
}, { deep: true })

// Emit changes
function emitUpdate() {
  emit('update:fields', [...localFields.value])
}

// Helper functions
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

function getFieldTypeHint(type) {
  const hints = {
    number: 'ค่าตัวเลขทั่วไป เช่น น้ำหนัก, เปอร์เซ็นต์ไขมัน',
    time: 'เวลาในรูปแบบ mm:ss หรือ hh:mm:ss',
    reps: 'จำนวนครั้งในการทำซ้ำ เช่น จำนวนครั้งวิดพื้น',
    distance: 'ระยะทาง เช่น ระยะวิ่ง, ระยะว่ายน้ำ',
    text: 'ข้อความอิสระ เช่น หมายเหตุ',
    select: 'เลือกจากตัวเลือกที่กำหนด'
  }
  return hints[type] || 'เลือกประเภทฟิลด์'
}

function getUnitPlaceholder(type) {
  const placeholders = {
    number: 'เช่น kg, %, cm',
    time: 'เช่น min:sec, นาที',
    reps: 'เช่น ครั้ง, รอบ',
    distance: 'เช่น m, km',
    text: '',
    select: ''
  }
  return placeholders[type] || 'หน่วย'
}

// Drag and Drop handlers
function handleDragStart(event, index) {
  dragIndex.value = index
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', index.toString())
}

function handleDragEnd() {
  dragIndex.value = null
  dragOverIndex.value = null
}

function handleDragOver(event, index) {
  event.preventDefault()
  if (dragIndex.value !== null && dragIndex.value !== index) {
    dragOverIndex.value = index
  }
}

function handleDrop(event) {
  event.preventDefault()
  const fromIndex = dragIndex.value
  const toIndex = dragOverIndex.value

  if (fromIndex !== null && toIndex !== null && fromIndex !== toIndex) {
    // ย้ายตำแหน่ง field
    const fields = [...localFields.value]
    const [movedField] = fields.splice(fromIndex, 1)
    fields.splice(toIndex, 0, movedField)
    
    // อัพเดท sort_order
    fields.forEach((field, idx) => {
      field.sort_order = idx
    })
    
    localFields.value = fields
    emitUpdate()
  }

  dragIndex.value = null
  dragOverIndex.value = null
}

// Modal functions
function openAddField() {
  editingIndex.value = null
  fieldForm.value = {
    name: '',
    field_type: '',
    unit: '',
    is_required: false,
    options: []
  }
  errors.value = { name: '', field_type: '', options: '' }
  showFieldModal.value = true
}

function openEditField(field, index) {
  editingIndex.value = index
  fieldForm.value = {
    name: field.name || '',
    field_type: field.field_type || '',
    unit: field.unit || '',
    is_required: field.is_required || false,
    options: field.options ? [...field.options] : []
  }
  errors.value = { name: '', field_type: '', options: '' }
  showFieldModal.value = true
}

function closeFieldModal() {
  showFieldModal.value = false
  editingIndex.value = null
}

function onFieldTypeChange() {
  // รีเซ็ต options เมื่อเปลี่ยนประเภท
  if (fieldForm.value.field_type === 'select' && fieldForm.value.options.length === 0) {
    fieldForm.value.options = ['', '']
  }
  
  // ตั้งค่า unit เริ่มต้นตามประเภท
  if (!fieldForm.value.unit) {
    const defaultUnits = {
      number: '',
      time: 'min:sec',
      reps: 'ครั้ง',
      distance: 'm',
      text: '',
      select: ''
    }
    fieldForm.value.unit = defaultUnits[fieldForm.value.field_type] || ''
  }
}

// Options management (สำหรับ select type)
function addOption() {
  fieldForm.value.options.push('')
}

function removeOption(index) {
  if (fieldForm.value.options.length > 2) {
    fieldForm.value.options.splice(index, 1)
  }
}

// Validation
function validateField(fieldName) {
  errors.value[fieldName] = ''
  
  switch (fieldName) {
    case 'name':
      if (!fieldForm.value.name?.trim()) {
        errors.value.name = 'กรุณาระบุชื่อฟิลด์'
      }
      break
    case 'field_type':
      if (!fieldForm.value.field_type) {
        errors.value.field_type = 'กรุณาเลือกประเภทฟิลด์'
      } else if (!VALID_FIELD_TYPES.includes(fieldForm.value.field_type)) {
        errors.value.field_type = 'ประเภทฟิลด์ไม่ถูกต้อง'
      }
      break
    case 'options':
      if (fieldForm.value.field_type === 'select') {
        const validOptions = fieldForm.value.options.filter(o => o?.trim())
        if (validOptions.length < 2) {
          errors.value.options = 'กรุณาระบุตัวเลือกอย่างน้อย 2 ตัวเลือก'
        }
      }
      break
  }
}

function validateAllFields() {
  validateField('name')
  validateField('field_type')
  if (fieldForm.value.field_type === 'select') {
    validateField('options')
  }
  return !Object.values(errors.value).some(e => e)
}

// Save field
function saveField() {
  if (!validateAllFields()) return

  const fieldData = {
    name: fieldForm.value.name.trim(),
    field_type: fieldForm.value.field_type,
    unit: fieldForm.value.unit?.trim() || '',
    is_required: fieldForm.value.is_required,
    options: fieldForm.value.field_type === 'select' 
      ? fieldForm.value.options.filter(o => o?.trim())
      : null,
    sort_order: editingIndex.value !== null 
      ? localFields.value[editingIndex.value].sort_order 
      : localFields.value.length
  }

  if (editingIndex.value !== null) {
    // แก้ไข field ที่มีอยู่
    const existingField = localFields.value[editingIndex.value]
    localFields.value[editingIndex.value] = {
      ...existingField,
      ...fieldData
    }
  } else {
    // เพิ่ม field ใหม่
    localFields.value.push({
      ...fieldData,
      id: `temp_${Date.now()}`
    })
  }

  emitUpdate()
  closeFieldModal()
}

// Delete field
function confirmRemoveField(index) {
  deleteIndex.value = index
  showDeleteConfirm.value = true
}

function removeField() {
  if (deleteIndex.value !== null) {
    localFields.value.splice(deleteIndex.value, 1)
    
    // อัพเดท sort_order
    localFields.value.forEach((field, idx) => {
      field.sort_order = idx
    })
    
    emitUpdate()
  }
  showDeleteConfirm.value = false
  deleteIndex.value = null
}
</script>


<style scoped>
.tracking-field-editor {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Header */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.section-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 20px;
  height: 20px;
  color: #fff;
}

.header-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.header-info p {
  font-size: 0.75rem;
  color: #737373;
  margin: 0.25rem 0 0;
}

.btn-add {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  white-space: nowrap;
}

.btn-add:hover {
  background: #262626;
}

.btn-add svg {
  width: 16px;
  height: 16px;
}

/* Fields List */
.fields-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s;
}

.field-item:hover {
  border-color: #D4D4D4;
  background: #F5F5F5;
}

.field-item.dragging {
  opacity: 0.5;
  border-style: dashed;
}

/* Drag Handle */
.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #A3A3A3;
  cursor: grab;
  flex-shrink: 0;
}

.drag-handle:active {
  cursor: grabbing;
}

.drag-handle svg {
  width: 16px;
  height: 16px;
}

/* Field Info */
.field-info {
  flex: 1;
  min-width: 0;
}

.field-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.field-name {
  font-weight: 500;
  color: #171717;
  font-size: 0.875rem;
}

.required-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: #FEE2E2;
  color: #991B1B;
  border-radius: 4px;
  text-transform: uppercase;
  font-weight: 500;
}

.field-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.field-type-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: #E5E5E5;
  border-radius: 4px;
  color: #525252;
}

.field-unit {
  font-size: 0.75rem;
  color: #737373;
}

/* Field Actions */
.field-actions {
  display: flex;
  gap: 0.375rem;
  flex-shrink: 0;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: #fff;
  color: #525252;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-icon:hover {
  background: #E5E5E5;
}

.btn-icon.danger:hover {
  background: #FEE2E2;
  color: #991B1B;
}

.btn-icon svg {
  width: 16px;
  height: 16px;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  color: #737373;
  text-align: center;
  background: #FAFAFA;
  border: 1px dashed #E5E5E5;
  border-radius: 8px;
}

.empty-state svg {
  width: 40px;
  height: 40px;
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 1rem;
  font-size: 0.875rem;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  background: #fff;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  color: #171717;
}

.btn-secondary:hover {
  background: #F5F5F5;
}

/* Form Styles */
.field-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
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
.form-group select {
  padding: 0.625rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 0.875rem;
  background: #fff;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #171717;
  box-shadow: 0 0 0 3px rgba(23, 23, 23, 0.1);
}

.form-group input.error,
.form-group select.error {
  border-color: #EF4444;
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

/* Options Editor (สำหรับ select type) */
.options-editor {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.option-item {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.option-item input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 0.875rem;
}

.btn-remove-option {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #A3A3A3;
  cursor: pointer;
}

.btn-remove-option:hover {
  background: #FEE2E2;
  color: #991B1B;
}

.btn-remove-option svg {
  width: 14px;
  height: 14px;
}

.btn-add-option {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem;
  border: 1px dashed #E5E5E5;
  border-radius: 6px;
  background: transparent;
  color: #737373;
  cursor: pointer;
  font-size: 0.75rem;
  justify-content: center;
}

.btn-add-option:hover {
  border-color: #171717;
  color: #171717;
}

.btn-add-option svg {
  width: 14px;
  height: 14px;
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
  font-size: 0.875rem;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
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
  border-radius: 22px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
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
  transform: translateX(18px);
}

/* Modal Actions */
.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-primary {
  padding: 0.625rem 1.25rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-primary:hover:not(:disabled) {
  background: #262626;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  padding: 0.625rem 1.25rem;
  background: #EF4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
}

.btn-danger:hover {
  background: #DC2626;
}

/* Delete Confirm */
.delete-confirm {
  text-align: center;
  padding: 1rem 0;
}

.delete-confirm p {
  margin: 0;
  color: #171717;
}

/* Responsive */
@media (max-width: 640px) {
  .editor-header {
    flex-direction: column;
  }

  .btn-add {
    width: 100%;
    justify-content: center;
  }

  .field-item {
    flex-wrap: wrap;
  }

  .field-info {
    flex: 1 1 100%;
    order: 1;
    margin-left: 32px;
  }

  .drag-handle {
    order: 0;
  }

  .field-actions {
    order: 2;
    width: 100%;
    justify-content: flex-end;
    padding-top: 0.5rem;
    margin-top: 0.5rem;
    border-top: 1px solid #E5E5E5;
  }
}
</style>
