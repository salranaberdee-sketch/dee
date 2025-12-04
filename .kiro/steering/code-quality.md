# มาตรฐานการเขียนโค้ด (Code Quality Standards)

## ⚠️ กฎบังคับ

**โค้ดทุกบรรทัดต้องเป็นไปตามมาตรฐานนี้:**

---

## 🎯 หลักการเขียนโค้ด

### 1. ประสิทธิภาพสูง (High Performance)
```
✅ ใช้ Algorithm ที่เหมาะสม (O(n) ดีกว่า O(n²))
✅ หลีกเลี่ยง Re-render ที่ไม่จำเป็น (ใช้ computed, memo)
✅ Lazy loading สำหรับ components ขนาดใหญ่
✅ ใช้ pagination แทนการโหลดข้อมูลทั้งหมด
✅ Cache ข้อมูลที่ใช้บ่อย
✅ Debounce/Throttle สำหรับ events ที่เกิดบ่อย
```

### 2. โค้ดสะอาด (Clean Code)
```
✅ ชื่อตัวแปร/ฟังก์ชันสื่อความหมายชัดเจน
✅ ฟังก์ชันทำหน้าที่เดียว (Single Responsibility)
✅ ไม่มี Magic Numbers - ใช้ Constants แทน
✅ ไม่มี Dead Code หรือ Commented Code
✅ DRY (Don't Repeat Yourself) - ไม่ซ้ำซ้อน
✅ KISS (Keep It Simple, Stupid) - เรียบง่าย
```

### 3. โค้ดเรียบร้อย (Well-Organized)
```
✅ จัดกลุ่ม imports ตามประเภท
✅ เรียงลำดับ methods ตามหน้าที่
✅ Indentation สม่ำเสมอ (2 spaces)
✅ ใช้ blank lines แยกส่วนอย่างเหมาะสม
✅ ไฟล์ไม่ยาวเกิน 300 บรรทัด
✅ ฟังก์ชันไม่ยาวเกิน 50 บรรทัด
```

---

## 📝 กฎการเขียน Comments

### ⚠️ บังคับ: Comments ต้องเป็นภาษาไทยเท่านั้น

```javascript
// ❌ ห้าม
// Get user data from database
const userData = await fetchUser(id)

// ✅ ถูกต้อง
// ดึงข้อมูลผู้ใช้จากฐานข้อมูล
const userData = await fetchUser(id)
```

### รูปแบบ Comments

```javascript
// ความคิดเห็นบรรทัดเดียว - อธิบายสั้นๆ

/**
 * ความคิดเห็นหลายบรรทัด
 * ใช้สำหรับอธิบายฟังก์ชันที่ซับซ้อน
 * @param {string} userId - รหัสผู้ใช้
 * @returns {Promise<User>} - ข้อมูลผู้ใช้
 */

// TODO: สิ่งที่ต้องทำในอนาคต
// FIXME: ปัญหาที่ต้องแก้ไข
// NOTE: หมายเหตุสำคัญ
```

---

## 🏗️ โครงสร้างไฟล์ Vue Component

```vue
<script setup>
// 1. Imports (จัดกลุ่มตามประเภท)
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 2. Props & Emits
const props = defineProps({...})
const emit = defineEmits([...])

// 3. Stores & Composables
const authStore = useAuthStore()
const router = useRouter()

// 4. Reactive State
const loading = ref(false)
const data = ref(null)

// 5. Computed Properties
const isAdmin = computed(() => authStore.isAdmin)

// 6. Methods (เรียงตามหน้าที่)
// - Fetch/Load methods
// - Action methods (create, update, delete)
// - Helper methods
// - Event handlers

// 7. Lifecycle Hooks
onMounted(async () => {...})
</script>

<template>
  <!-- โครงสร้างชัดเจน อ่านง่าย -->
</template>

<style scoped>
/* CSS เรียงตามลำดับ: layout > box > typography > visual */
</style>
```

---

## ⚡ Performance Best Practices

### Vue.js
```javascript
// ✅ ใช้ computed แทน method สำหรับค่าที่คำนวณ
const fullName = computed(() => `${firstName.value} ${lastName.value}`)

// ✅ ใช้ v-once สำหรับ static content
<span v-once>{{ staticText }}</span>

// ✅ ใช้ v-memo สำหรับ list ที่ไม่เปลี่ยนบ่อย
<div v-for="item in list" :key="item.id" v-memo="[item.id]">

// ✅ Lazy load components
const HeavyComponent = defineAsyncComponent(() => 
  import('./HeavyComponent.vue')
)
```

### Supabase Queries
```javascript
// ✅ เลือกเฉพาะ columns ที่ต้องการ
const { data } = await supabase
  .from('users')
  .select('id, name, email')  // ไม่ใช้ select('*')

// ✅ ใช้ pagination
const { data } = await supabase
  .from('items')
  .select('*')
  .range(0, 9)  // โหลดทีละ 10 รายการ

// ✅ ใช้ index-friendly queries
const { data } = await supabase
  .from('logs')
  .select('*')
  .eq('user_id', userId)  // ใช้ indexed column
  .order('created_at', { ascending: false })
  .limit(50)
```

---

## 🚫 Anti-Patterns (ห้ามทำ)

```javascript
// ❌ Nested callbacks (Callback Hell)
getData(id, (data) => {
  process(data, (result) => {
    save(result, (response) => {...})
  })
})

// ✅ ใช้ async/await
const data = await getData(id)
const result = await process(data)
const response = await save(result)

// ❌ Magic numbers
if (status === 1) {...}

// ✅ ใช้ constants
const STATUS_ACTIVE = 1
if (status === STATUS_ACTIVE) {...}

// ❌ God functions (ฟังก์ชันยาวมาก)
function doEverything() { /* 200 บรรทัด */ }

// ✅ แยกเป็นฟังก์ชันย่อย
function validateInput() {...}
function processData() {...}
function saveResult() {...}
```

---

## ✅ Checklist ก่อน Commit

```markdown
- [ ] โค้ดทำงานถูกต้อง ไม่มี errors
- [ ] Comments เป็นภาษาไทย
- [ ] ไม่มี console.log ที่ไม่จำเป็น
- [ ] ไม่มี dead code หรือ commented code
- [ ] ชื่อตัวแปร/ฟังก์ชันสื่อความหมาย
- [ ] ไม่มี magic numbers
- [ ] ฟังก์ชันไม่ยาวเกินไป (< 50 บรรทัด)
- [ ] ใช้ error handling ที่เหมาะสม
- [ ] Performance: ไม่มี unnecessary re-renders
- [ ] Security: ไม่มี sensitive data ใน code
```
