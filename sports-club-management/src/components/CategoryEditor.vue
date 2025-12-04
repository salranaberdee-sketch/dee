<template>
  <div class="category-editor">
    <!-- Header -->
    <div class="editor-header">
      <div class="header-info">
        <div class="section-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <div>
          <h2>หมวดหมู่เกณฑ์การให้คะแนน</h2>
          <p>จัดการหมวดหมู่และน้ำหนักคะแนน (รวมต้องเท่ากับ 100%)</p>
        </div>
      </div>
      <button @click="$emit('add-category')" class="btn-add">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        เพิ่มหมวดหมู่
      </button>
    </div>

    <!-- Expanded Category Detail (แสดงเมื่อคลิกแก้ไขหมวดหมู่) -->
    <div v-if="expandedCategory" class="expanded-category-section">
      <div class="expanded-header">
        <h3>{{ expandedCategory.display_name }}</h3>
        <button @click="expandedCategory = null" class="btn-close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      <!-- Metrics List -->
      <div class="metrics-section">
        <div class="metrics-header">
          <h4>ตัวชี้วัด (Metrics)</h4>
          <button @click="openAddMetric" class="btn-add-metric">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            เพิ่มตัวชี้วัด
          </button>
        </div>

        <div v-if="getCategoryMetrics(expandedCategory).length === 0" class="empty-metrics">
          <p>ยังไม่มีตัวชี้วัดในหมวดหมู่นี้</p>
        </div>

        <div v-else class="metrics-list">
          <div 
            v-for="metric in getCategoryMetrics(expandedCategory)" 
            :key="metric.id"
            class="metric-card"
          >
            <div class="metric-info">
              <span class="metric-name">{{ metric.display_name }}</span>
              <span class="metric-type">{{ getMeasurementTypeLabel(metric.measurement_type) }}</span>
              <span v-if="metric.target_value" class="metric-target">
                เป้าหมาย: {{ metric.target_value }} {{ getTargetUnit(metric.measurement_type) }}
              </span>
            </div>
            <div class="metric-actions">
              <button @click="openEditMetric(metric)" class="btn-icon" title="แก้ไข">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button @click="confirmRemoveMetric(metric)" class="btn-icon danger" title="ลบ">
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

    <!-- Weight Summary -->
    <div class="weight-summary" :class="{ invalid: !isValidWeight }">
      <div class="weight-bar">
        <div 
          v-for="(cat, index) in activeCategories" 
          :key="cat.id"
          class="weight-segment"
          :style="{ width: cat.weight + '%', backgroundColor: getCategoryColor(index) }"
          :title="`${cat.display_name}: ${cat.weight}%`"
        ></div>
      </div>
      <div class="weight-info">
        <span class="weight-total">รวม: {{ totalWeight }}%</span>
        <span v-if="!isValidWeight" class="weight-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          น้ำหนักรวมต้องเท่ากับ 100%
        </span>
        <span v-else class="weight-valid">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          ถูกต้อง
        </span>
      </div>
    </div>

    <!-- Categories by Type -->
    <div class="categories-container">
      <div 
        v-for="(cats, type) in categoriesByType" 
        :key="type"
        class="category-group"
        v-show="cats.length > 0"
      >
        <h3 class="group-title">{{ getCategoryTypeLabel(type) }}</h3>
        
        <div class="category-list">
          <div 
            v-for="category in cats" 
            :key="category.id"
            class="category-card"
            :class="{ inactive: !category.is_active }"
          >
            <div class="category-info">
              <div class="category-header">
                <span class="category-name">{{ category.display_name }}</span>
                <span class="category-type-badge">{{ getCategoryTypeLabel(category.category_type) }}</span>
              </div>
              <div class="metrics-count">
                {{ (category.metrics || category.template_metrics || []).length }} ตัวชี้วัด
              </div>
            </div>

            <div class="category-weight-control">
              <div class="weight-display">
                <span class="weight-value">{{ category.weight }}%</span>
              </div>
              <input
                type="range"
                :value="category.weight"
                min="0"
                max="100"
                step="5"
                class="weight-slider"
                @input="updateCategoryWeight(category.id, $event.target.value)"
              />
              <input
                type="number"
                :value="category.weight"
                min="0"
                max="100"
                class="weight-input"
                @change="updateCategoryWeight(category.id, $event.target.value)"
              />
            </div>

            <div class="category-actions">
              <button @click="editCategory(category)" class="btn-icon" title="แก้ไข">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button @click="confirmRemoveCategory(category)" class="btn-icon danger" title="ลบ">
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

    <!-- Empty State -->
    <div v-if="categories.length === 0" class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
      </svg>
      <p>ยังไม่มีหมวดหมู่</p>
      <button @click="$emit('add-category')" class="btn-secondary">
        เพิ่มหมวดหมู่แรก
      </button>
    </div>

    <!-- Delete Category Confirmation Modal -->
    <Modal 
      v-if="showDeleteConfirm" 
      title="ยืนยันการลบ"
      @close="showDeleteConfirm = false"
    >
      <div class="delete-confirm">
        <p>คุณต้องการลบหมวดหมู่ "{{ categoryToDelete?.display_name }}" หรือไม่?</p>
        <p class="warning-text">น้ำหนัก {{ categoryToDelete?.weight }}% จะถูกกระจายไปยังหมวดหมู่อื่น</p>
      </div>
      <template #footer>
        <div class="modal-actions">
          <button @click="showDeleteConfirm = false" class="btn-secondary">
            ยกเลิก
          </button>
          <button @click="removeCategory" class="btn-danger">
            ลบหมวดหมู่
          </button>
        </div>
      </template>
    </Modal>

    <!-- Delete Metric Confirmation Modal -->
    <Modal 
      v-if="showDeleteMetricConfirm" 
      title="ยืนยันการลบตัวชี้วัด"
      @close="showDeleteMetricConfirm = false"
    >
      <div class="delete-confirm">
        <p>คุณต้องการลบตัวชี้วัด "{{ metricToDelete?.display_name }}" หรือไม่?</p>
      </div>
      <template #footer>
        <div class="modal-actions">
          <button @click="showDeleteMetricConfirm = false" class="btn-secondary">
            ยกเลิก
          </button>
          <button @click="removeMetric" class="btn-danger">
            ลบตัวชี้วัด
          </button>
        </div>
      </template>
    </Modal>

    <!-- Metric Editor Modal -->
    <Modal 
      v-if="showMetricEditor" 
      :title="editingMetric ? 'แก้ไขตัวชี้วัด' : 'เพิ่มตัวชี้วัดใหม่'"
      @close="closeMetricEditor"
      size="large"
    >
      <MetricEditor
        :metric="editingMetric"
        :category-id="expandedCategory?.id"
        @save="saveMetric"
        @cancel="closeMetricEditor"
      />
    </Modal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { redistributeWeightsOnRemove, adjustCategoryWeight } from '@/lib/scoreCalculator'
import Modal from '@/components/Modal.vue'
import MetricEditor from '@/components/MetricEditor.vue'

const props = defineProps({
  categories: {
    type: Array,
    default: () => []
  },
  sportType: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:categories', 'add-category', 'edit-category'])

// State
const showDeleteConfirm = ref(false)
const categoryToDelete = ref(null)
const expandedCategory = ref(null)
const showMetricEditor = ref(false)
const editingMetric = ref(null)
const showDeleteMetricConfirm = ref(false)
const metricToDelete = ref(null)

// Computed
const activeCategories = computed(() => {
  return props.categories.filter(c => c.is_active !== false)
})

const totalWeight = computed(() => {
  return activeCategories.value.reduce((sum, cat) => sum + (cat.weight || 0), 0)
})

const isValidWeight = computed(() => {
  return totalWeight.value === 100
})

const categoriesByType = computed(() => {
  const grouped = {
    attendance: [],
    training: [],
    skill: [],
    competition: [],
    custom: []
  }
  
  props.categories.forEach(cat => {
    const type = cat.category_type || 'custom'
    if (grouped[type]) {
      grouped[type].push(cat)
    } else {
      grouped.custom.push(cat)
    }
  })
  
  return grouped
})

// Methods
function getCategoryTypeLabel(type) {
  const labels = {
    attendance: 'การเข้าร่วม',
    training: 'การฝึกซ้อม',
    skill: 'ทักษะ',
    competition: 'การแข่งขัน',
    custom: 'กำหนดเอง'
  }
  return labels[type] || type
}

function getCategoryColor(index) {
  const colors = ['#171717', '#525252', '#737373', '#A3A3A3', '#D4D4D4']
  return colors[index % colors.length]
}

function updateCategoryWeight(categoryId, newWeight) {
  const weight = parseInt(newWeight, 10)
  if (isNaN(weight) || weight < 0 || weight > 100) return

  const result = adjustCategoryWeight(props.categories, categoryId, weight)
  if (result.isValid) {
    emit('update:categories', result.categories)
  }
}

function editCategory(category) {
  expandedCategory.value = category
}

function confirmRemoveCategory(category) {
  categoryToDelete.value = category
  showDeleteConfirm.value = true
}

function removeCategory() {
  if (!categoryToDelete.value) return

  const updatedCategories = redistributeWeightsOnRemove(
    props.categories,
    categoryToDelete.value.id
  )
  
  emit('update:categories', updatedCategories)
  showDeleteConfirm.value = false
  categoryToDelete.value = null
}

// Metric Management Methods
function getCategoryMetrics(category) {
  return category?.metrics || category?.template_metrics || []
}

function getMeasurementTypeLabel(type) {
  const labels = {
    count: 'จำนวนครั้ง',
    percentage: 'เปอร์เซ็นต์',
    rating: 'คะแนน',
    time: 'เวลา',
    distance: 'ระยะทาง'
  }
  return labels[type] || type
}

function getTargetUnit(type) {
  const units = {
    count: 'ครั้ง',
    percentage: '%',
    rating: 'คะแนน',
    time: 'นาที',
    distance: 'เมตร'
  }
  return units[type] || ''
}

function openAddMetric() {
  editingMetric.value = null
  showMetricEditor.value = true
}

function openEditMetric(metric) {
  editingMetric.value = metric
  showMetricEditor.value = true
}

function closeMetricEditor() {
  showMetricEditor.value = false
  editingMetric.value = null
}

function saveMetric(metricData) {
  if (!expandedCategory.value) return

  const updatedCategories = props.categories.map(cat => {
    if (cat.id !== expandedCategory.value.id) return cat

    const currentMetrics = getCategoryMetrics(cat)
    let newMetrics

    if (editingMetric.value) {
      // แก้ไข metric ที่มีอยู่
      newMetrics = currentMetrics.map(m => 
        m.id === editingMetric.value.id ? { ...m, ...metricData } : m
      )
    } else {
      // เพิ่ม metric ใหม่
      const newMetric = {
        ...metricData,
        id: `metric_${Date.now()}`,
        is_active: true
      }
      newMetrics = [...currentMetrics, newMetric]
    }

    return {
      ...cat,
      metrics: newMetrics,
      template_metrics: newMetrics
    }
  })

  emit('update:categories', updatedCategories)
  
  // อัพเดท expandedCategory ด้วย
  const updatedCat = updatedCategories.find(c => c.id === expandedCategory.value.id)
  if (updatedCat) {
    expandedCategory.value = updatedCat
  }

  closeMetricEditor()
}

function confirmRemoveMetric(metric) {
  metricToDelete.value = metric
  showDeleteMetricConfirm.value = true
}

function removeMetric() {
  if (!metricToDelete.value || !expandedCategory.value) return

  const updatedCategories = props.categories.map(cat => {
    if (cat.id !== expandedCategory.value.id) return cat

    const currentMetrics = getCategoryMetrics(cat)
    const newMetrics = currentMetrics.filter(m => m.id !== metricToDelete.value.id)

    return {
      ...cat,
      metrics: newMetrics,
      template_metrics: newMetrics
    }
  })

  emit('update:categories', updatedCategories)
  
  // อัพเดท expandedCategory ด้วย
  const updatedCat = updatedCategories.find(c => c.id === expandedCategory.value.id)
  if (updatedCat) {
    expandedCategory.value = updatedCat
  }

  showDeleteMetricConfirm.value = false
  metricToDelete.value = null
}
</script>


<style scoped>
.category-editor {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

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
  gap: 1rem;
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #171717;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon svg {
  width: 24px;
  height: 24px;
  color: #fff;
}

.header-info h2 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.header-info p {
  font-size: 0.875rem;
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

.btn-add svg {
  width: 16px;
  height: 16px;
}

/* Weight Summary */
.weight-summary {
  padding: 1rem;
  background: #D1FAE5;
  border-radius: 8px;
}

.weight-summary.invalid {
  background: #FEE2E2;
}

.weight-bar {
  display: flex;
  height: 8px;
  border-radius: 4px;
  overflow: hidden;
  background: rgba(255,255,255,0.5);
  margin-bottom: 0.75rem;
}

.weight-segment {
  transition: width 0.3s ease;
}

.weight-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.weight-total {
  font-weight: 700;
  font-size: 1.125rem;
  color: #065F46;
}

.weight-summary.invalid .weight-total {
  color: #991B1B;
}

.weight-error, .weight-valid {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.weight-error {
  color: #991B1B;
}

.weight-valid {
  color: #065F46;
}

.weight-error svg, .weight-valid svg {
  width: 16px;
  height: 16px;
}

/* Categories Container */
.categories-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.category-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.group-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #525252;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.category-card.inactive {
  opacity: 0.5;
}

.category-info {
  flex: 1;
  min-width: 0;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-name {
  font-weight: 600;
  color: #171717;
}

.category-type-badge {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: #E5E5E5;
  border-radius: 4px;
  color: #525252;
  text-transform: uppercase;
}

.metrics-count {
  font-size: 0.75rem;
  color: #737373;
  margin-top: 0.25rem;
}

/* Weight Control */
.category-weight-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.weight-display {
  min-width: 50px;
  text-align: right;
}

.weight-value {
  font-weight: 700;
  font-size: 1.125rem;
  color: #171717;
}

.weight-slider {
  width: 100px;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: #E5E5E5;
  border-radius: 3px;
  outline: none;
}

.weight-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  background: #171717;
  border-radius: 50%;
  cursor: pointer;
}

.weight-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  background: #171717;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}

.weight-input {
  width: 60px;
  padding: 0.375rem;
  border: 1px solid #E5E5E5;
  border-radius: 6px;
  font-size: 0.875rem;
  text-align: center;
}

/* Category Actions */
.category-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #fff;
  color: #525252;
  cursor: pointer;
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
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 1rem;
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

/* Delete Confirm */
.delete-confirm {
  text-align: center;
  padding: 1rem 0;
}

.delete-confirm p {
  margin: 0 0 0.5rem;
  color: #171717;
}

.warning-text {
  color: #991B1B;
  font-size: 0.875rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn-danger {
  padding: 0.5rem 1rem;
  background: #EF4444;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.875rem;
}

/* Expanded Category Section */
.expanded-category-section {
  background: #fff;
  border: 2px solid #171717;
  border-radius: 12px;
  padding: 1.25rem;
  margin-bottom: 1rem;
}

.expanded-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #E5E5E5;
}

.expanded-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #171717;
  margin: 0;
}

.btn-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #F5F5F5;
  color: #525252;
  cursor: pointer;
}

.btn-close:hover {
  background: #E5E5E5;
}

.btn-close svg {
  width: 18px;
  height: 18px;
}

/* Metrics Section */
.metrics-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.metrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metrics-header h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: #525252;
  margin: 0;
}

.btn-add-metric {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: #171717;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
}

.btn-add-metric svg {
  width: 14px;
  height: 14px;
}

.empty-metrics {
  padding: 1.5rem;
  text-align: center;
  background: #FAFAFA;
  border-radius: 8px;
  color: #737373;
}

.empty-metrics p {
  margin: 0;
  font-size: 0.875rem;
}

.metrics-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.metric-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #FAFAFA;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
}

.metric-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.metric-name {
  font-weight: 500;
  color: #171717;
}

.metric-type {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: #E5E5E5;
  border-radius: 4px;
  color: #525252;
}

.metric-target {
  font-size: 0.75rem;
  color: #737373;
}

.metric-actions {
  display: flex;
  gap: 0.375rem;
}

@media (max-width: 640px) {
  .editor-header {
    flex-direction: column;
  }

  .btn-add {
    width: 100%;
    justify-content: center;
  }

  .category-card {
    flex-direction: column;
    align-items: stretch;
  }

  .category-weight-control {
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 1px solid #E5E5E5;
  }

  .category-actions {
    justify-content: flex-end;
    padding-top: 0.75rem;
    border-top: 1px solid #E5E5E5;
  }

  .metric-card {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .metric-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
