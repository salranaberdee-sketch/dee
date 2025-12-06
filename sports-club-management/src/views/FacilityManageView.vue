<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFacilityStore } from '@/stores/facility'
import { useAuthStore } from '@/stores/auth'
import Modal from '@/components/Modal.vue'

// Stores
const facilityStore = useFacilityStore()
const authStore = useAuthStore()

// State
const loading = ref(false)
const showModal = ref(false)
const showTimeSlotsModal = ref(false)
const editingFacility = ref(null)
const selectedFacility = ref(null)

// Form data
const formData = ref({
  name: '',
  description: '',
  capacity: 1,
  image_url: ''
})

// Time slots form
const timeSlots = ref([])
const newSlot = ref({
  day_of_week: 0,
  start_time: '09:00',
  end_time: '10:00'
})

// Days of week
const daysOfWeek = [
  { value: 0, label: 'อาทิตย์' },
  { value: 1, label: 'จันทร์' },
  { value: 2, label: 'อังคาร' },
  { value: 3, label: 'พุธ' },
  { value: 4, label: 'พฤหัสบดี' },
  { value: 5, label: 'ศุกร์' },
  { value: 6, label: 'เสาร์' }
]

// Computed
const allFacilities = computed(() => facilityStore.facilities)
const isAdmin = computed(() => authStore.isAdmin)

// Methods
async function loadFacilities() {
  loading.value = true
  // ดึงสถานที่ทั้งหมด (รวมที่ปิดใช้งาน) สำหรับ admin
  await facilityStore.fetchFacilities(true)
  loading.value = false
}

function openCreateModal() {
  editingFacility.value = null
  formData.value = {
    name: '',
    description: '',
    capacity: 1,
    image_url: ''
  }
  showModal.value = true
}

function openEditModal(facility) {
  editingFacility.value = facility
  formData.value = {
    name: facility.name,
    description: facility.description || '',
    capacity: facility.capacity || 1,
    image_url: facility.image_url || ''
  }
  showModal.value = true
}

async function saveFacility() {
  // ตรวจสอบข้อมูลที่จำเป็น
  if (!formData.value.name.trim()) {
    alert('กรุณาระบุชื่อสถานที่')
    return
  }
  if (!formData.value.description.trim()) {
    alert('กรุณาระบุรายละเอียด')
    return
  }
  if (formData.value.capacity < 1) {
    alert('ความจุต้องมากกว่า 0')
    return
  }

  loading.value = true
  
  if (editingFacility.value) {
    // อัปเดตสถานที่
    const result = await facilityStore.updateFacility(editingFacility.value.id, formData.value)
    if (!result.success) {
      alert('เกิดข้อผิดพลาด: ' + result.message)
    }
  } else {
    // สร้างสถานที่ใหม่
    const result = await facilityStore.createFacility(formData.value)
    if (!result.success) {
      alert('เกิดข้อผิดพลาด: ' + result.message)
    }
  }
  
  loading.value = false
  showModal.value = false
  await loadFacilities()
}

async function toggleFacilityStatus(facility) {
  const action = facility.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'
  if (!confirm(`ต้องการ${action}สถานที่ "${facility.name}" หรือไม่?`)) {
    return
  }

  loading.value = true
  
  if (facility.is_active) {
    await facilityStore.deactivateFacility(facility.id)
  } else {
    await facilityStore.updateFacility(facility.id, { is_active: true })
  }
  
  loading.value = false
  await loadFacilities()
}

// Time Slots Management
function openTimeSlotsModal(facility) {
  selectedFacility.value = facility
  timeSlots.value = facility.time_slots ? [...facility.time_slots] : []
  showTimeSlotsModal.value = true
}

function addTimeSlot() {
  // ตรวจสอบเวลา
  if (newSlot.value.start_time >= newSlot.value.end_time) {
    alert('เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด')
    return
  }

  timeSlots.value.push({
    ...newSlot.value,
    is_active: true
  })

  // Reset form
  newSlot.value = {
    day_of_week: 0,
    start_time: '09:00',
    end_time: '10:00'
  }
}

function removeTimeSlot(index) {
  timeSlots.value.splice(index, 1)
}

async function saveTimeSlots() {
  if (timeSlots.value.length === 0) {
    alert('กรุณาเพิ่มช่วงเวลาอย่างน้อย 1 ช่วง')
    return
  }

  loading.value = true
  const result = await facilityStore.saveTimeSlots(selectedFacility.value.id, timeSlots.value)
  
  if (result.success) {
    showTimeSlotsModal.value = false
    await loadFacilities()
  } else {
    alert('เกิดข้อผิดพลาด: ' + result.message)
  }
  
  loading.value = false
}

function getDayLabel(dayOfWeek) {
  return daysOfWeek.find(d => d.value === dayOfWeek)?.label || ''
}

// Lifecycle
onMounted(() => {
  loadFacilities()
})
</script>

<template>
  <div class="p-4 max-w-6xl mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">จัดการสถานที่</h1>
        <p class="text-gray-500 mt-1">เพิ่ม แก้ไข หรือปิดใช้งานสถานที่</p>
      </div>
      <button
        @click="openCreateModal"
        class="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        เพิ่มสถานที่
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-12">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>

    <!-- Facilities List -->
    <div v-else-if="allFacilities.length > 0" class="space-y-4">
      <div
        v-for="facility in allFacilities"
        :key="facility.id"
        class="bg-white border border-gray-200 rounded-xl p-4"
        :class="{ 'opacity-60': !facility.is_active }"
      >
        <div class="flex items-start gap-4">
          <!-- Image -->
          <div class="w-24 h-24 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            <img
              v-if="facility.image_url"
              :src="facility.image_url"
              :alt="facility.name"
              class="w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center">
              <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-gray-900">{{ facility.name }}</h3>
              <span
                v-if="!facility.is_active"
                class="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full"
              >
                ปิดใช้งาน
              </span>
            </div>
            <p class="text-sm text-gray-500 mt-1 line-clamp-2">{{ facility.description }}</p>
            <div class="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                ความจุ: {{ facility.capacity }} คน
              </span>
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {{ facility.time_slots?.length || 0 }} ช่วงเวลา
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2">
            <button
              @click="openTimeSlotsModal(facility)"
              class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="จัดการช่วงเวลา"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              @click="openEditModal(facility)"
              class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="แก้ไข"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click="toggleFacilityStatus(facility)"
              class="p-2 rounded-lg"
              :class="facility.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'"
              :title="facility.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'"
            >
              <svg v-if="facility.is_active" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Time Slots Preview -->
        <div v-if="facility.time_slots?.length > 0" class="mt-4 pt-4 border-t border-gray-100">
          <div class="flex flex-wrap gap-2">
            <span
              v-for="slot in facility.time_slots.slice(0, 5)"
              :key="slot.id"
              class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
            >
              {{ getDayLabel(slot.day_of_week) }} {{ slot.start_time }}-{{ slot.end_time }}
            </span>
            <span
              v-if="facility.time_slots.length > 5"
              class="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded"
            >
              +{{ facility.time_slots.length - 5 }} อื่นๆ
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-12">
      <svg class="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
      <p class="mt-4 text-gray-500">ยังไม่มีสถานที่</p>
      <button
        @click="openCreateModal"
        class="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
      >
        เพิ่มสถานที่แรก
      </button>
    </div>
</template>


    <!-- Create/Edit Modal -->
    <Modal :show="showModal" @close="showModal = false">
      <template #title>
        {{ editingFacility ? 'แก้ไขสถานที่' : 'เพิ่มสถานที่ใหม่' }}
      </template>
      
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ชื่อสถานที่ *</label>
          <input
            v-model="formData.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="เช่น สนามฟุตบอล 1"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">รายละเอียด *</label>
          <textarea
            v-model="formData.description"
            rows="3"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="รายละเอียดเกี่ยวกับสถานที่"
          ></textarea>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">ความจุ (คน) *</label>
          <input
            v-model.number="formData.capacity"
            type="number"
            min="1"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">URL รูปภาพ</label>
          <input
            v-model="formData.image_url"
            type="url"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            placeholder="https://..."
          />
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showModal = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            @click="saveFacility"
            :disabled="loading"
            class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>

    <!-- Time Slots Modal -->
    <Modal :show="showTimeSlotsModal" @close="showTimeSlotsModal = false" size="lg">
      <template #title>
        จัดการช่วงเวลา - {{ selectedFacility?.name }}
      </template>
      
      <div class="space-y-4">
        <!-- Add New Slot -->
        <div class="p-4 bg-gray-50 rounded-lg">
          <h4 class="font-medium text-gray-900 mb-3">เพิ่มช่วงเวลาใหม่</h4>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <label class="block text-sm text-gray-600 mb-1">วัน</label>
              <select
                v-model="newSlot.day_of_week"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option v-for="day in daysOfWeek" :key="day.value" :value="day.value">
                  {{ day.label }}
                </option>
              </select>
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">เริ่ม</label>
              <input
                v-model="newSlot.start_time"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label class="block text-sm text-gray-600 mb-1">สิ้นสุด</label>
              <input
                v-model="newSlot.end_time"
                type="time"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <button
            @click="addTimeSlot"
            class="mt-3 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm"
          >
            เพิ่มช่วงเวลา
          </button>
        </div>

        <!-- Current Slots -->
        <div>
          <h4 class="font-medium text-gray-900 mb-3">ช่วงเวลาที่เปิดให้จอง</h4>
          <div v-if="timeSlots.length > 0" class="space-y-2">
            <div
              v-for="(slot, index) in timeSlots"
              :key="index"
              class="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
            >
              <div class="flex items-center gap-4">
                <span class="font-medium text-gray-900 w-20">{{ getDayLabel(slot.day_of_week) }}</span>
                <span class="text-gray-600">{{ slot.start_time }} - {{ slot.end_time }}</span>
              </div>
              <button
                @click="removeTimeSlot(index)"
                class="p-1 text-red-600 hover:bg-red-50 rounded"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          <p v-else class="text-gray-500 text-center py-4">ยังไม่มีช่วงเวลา</p>
        </div>
      </div>

      <template #footer>
        <div class="flex justify-end gap-3">
          <button
            @click="showTimeSlotsModal = false"
            class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            ยกเลิก
          </button>
          <button
            @click="saveTimeSlots"
            :disabled="loading"
            class="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {{ loading ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
