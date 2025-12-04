/**
 * Scoring Configuration Store
 * 
 * จัดการการตั้งค่าเกณฑ์การให้คะแนนที่ยืดหยุ่นสำหรับแต่ละชมรม
 * Implements Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 2.4
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from './auth'

export const useScoringConfigStore = defineStore('scoringConfig', () => {
  // ============ STATE ============
  
  /** @type {import('vue').Ref<Array>} รายการประเภทกีฬาทั้งหมด */
  const sportTypes = ref([])
  
  /** @type {import('vue').Ref<Array>} รายการ Template สำเร็จรูป */
  const templates = ref([])
  
  /** @type {import('vue').Ref<Object|null>} การตั้งค่าเกณฑ์ปัจจุบันของชมรม */
  const clubConfig = ref(null)
  
  /** @type {import('vue').Ref<Array>} หมวดหมู่ของการตั้งค่าปัจจุบัน */
  const categories = ref([])
  
  /** @type {import('vue').Ref<Array>} ตัวชี้วัดของการตั้งค่าปัจจุบัน */
  const metrics = ref([])
  
  /** @type {import('vue').Ref<boolean>} สถานะกำลังโหลด */
  const loading = ref(false)
  
  /** @type {import('vue').Ref<string|null>} ข้อความ error */
  const error = ref(null)

  // ============ GETTERS ============
  
  /**
   * ดึงการตั้งค่าที่ active ของชมรม
   * Requirement 1.2: โหลด template เมื่อเลือกประเภทกีฬา
   */
  const activeConfig = computed(() => {
    return clubConfig.value?.is_active ? clubConfig.value : null
  })

  /**
   * ดึง templates ที่พร้อมใช้งานสำหรับประเภทกีฬาที่เลือก
   * Requirement 2.2: แสดง template ทั้งหมด
   */
  const availableTemplates = computed(() => {
    if (!clubConfig.value?.sport_type_id) return templates.value
    return templates.value.filter(t => t.sport_type_id === clubConfig.value.sport_type_id)
  })

  /**
   * ดึงหมวดหมู่ที่ active
   */
  const activeCategories = computed(() => {
    return categories.value.filter(c => c.is_active !== false)
  })

  /**
   * คำนวณน้ำหนักรวมของทุกหมวดหมู่
   * Requirement 2.3: ตรวจสอบน้ำหนักรวม = 100%
   */
  const totalWeight = computed(() => {
    return activeCategories.value.reduce((sum, cat) => sum + (cat.weight || 0), 0)
  })

  /**
   * ตรวจสอบว่าน้ำหนักรวมถูกต้องหรือไม่
   */
  const isValidWeight = computed(() => {
    return totalWeight.value === 100
  })

  /**
   * จัดกลุ่มหมวดหมู่ตามประเภท
   * Requirement 3.4: แสดงหมวดหมู่แยกตามประเภท
   */
  const categoriesByType = computed(() => {
    const grouped = {
      attendance: [],
      training: [],
      skill: [],
      competition: [],
      custom: []
    }
    
    activeCategories.value.forEach(cat => {
      const type = cat.category_type || 'custom'
      if (grouped[type]) {
        grouped[type].push(cat)
      } else {
        grouped.custom.push(cat)
      }
    })
    
    return grouped
  })

  // ============ ACTIONS ============

  /**
   * ดึงรายการประเภทกีฬาทั้งหมด
   * Requirement 1.1: แสดงประเภทกีฬาที่เลือกได้
   * 
   * @returns {Promise<Array>} รายการประเภทกีฬา
   */
  async function fetchSportTypes() {
    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('sport_types')
        .select(`
          *,
          competition_formats (
            id,
            name,
            display_name,
            team_size,
            description
          )
        `)
        .order('name', { ascending: true })

      if (err) throw err

      sportTypes.value = data || []
      return sportTypes.value
    } catch (err) {
      error.value = err.message
      console.error('Error fetching sport types:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึง Template สำเร็จรูปทั้งหมด
   * Requirement 2.1, 2.2: โหลดและแสดง template
   * 
   * @param {string} [sportTypeId] - กรองตามประเภทกีฬา (optional)
   * @returns {Promise<Array>} รายการ templates
   */
  async function fetchTemplates(sportTypeId = null) {
    loading.value = true
    error.value = null

    try {
      let query = supabase
        .from('scoring_templates')
        .select(`
          *,
          sport_types (
            id,
            name,
            display_name
          ),
          template_categories (
            id,
            name,
            display_name,
            category_type,
            weight,
            sort_order,
            template_metrics (
              id,
              name,
              display_name,
              description,
              measurement_type,
              target_value,
              rating_scale_min,
              rating_scale_max,
              formula,
              is_required
            )
          )
        `)
        .order('name', { ascending: true })

      if (sportTypeId) {
        query = query.eq('sport_type_id', sportTypeId)
      }

      const { data, error: err } = await query

      if (err) throw err

      templates.value = data || []
      return templates.value
    } catch (err) {
      error.value = err.message
      console.error('Error fetching templates:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงการตั้งค่าเกณฑ์ของชมรม
   * Requirement 1.2: โหลดการตั้งค่าเมื่อเลือกประเภทกีฬา
   * 
   * @param {string} clubId - รหัสชมรม
   * @returns {Promise<Object|null>} การตั้งค่าของชมรม
   */
  async function fetchClubConfig(clubId) {
    if (!clubId) {
      clubConfig.value = null
      categories.value = []
      metrics.value = []
      return null
    }

    loading.value = true
    error.value = null

    try {
      // ดึงการตั้งค่าหลักของชมรม
      const { data: configData, error: configErr } = await supabase
        .from('club_scoring_configs')
        .select(`
          *,
          sport_types (
            id,
            name,
            display_name
          ),
          scoring_templates (
            id,
            name,
            description
          )
        `)
        .eq('club_id', clubId)
        .eq('is_active', true)
        .single()

      if (configErr && configErr.code !== 'PGRST116') {
        throw configErr
      }

      if (!configData) {
        // ไม่มีการตั้งค่า - ใช้ค่าเริ่มต้น
        clubConfig.value = null
        categories.value = []
        metrics.value = []
        return null
      }

      clubConfig.value = configData

      // ดึงหมวดหมู่ของการตั้งค่านี้
      const { data: catData, error: catErr } = await supabase
        .from('club_scoring_categories')
        .select('*')
        .eq('config_id', configData.id)
        .order('sort_order', { ascending: true })

      if (catErr) throw catErr

      categories.value = catData || []

      // ดึง metrics ของทุกหมวดหมู่
      if (categories.value.length > 0) {
        const categoryIds = categories.value.map(c => c.id)
        const { data: metricData, error: metricErr } = await supabase
          .from('club_scoring_metrics')
          .select('*')
          .in('category_id', categoryIds)
          .order('created_at', { ascending: true })

        if (metricErr) throw metricErr

        metrics.value = metricData || []
      } else {
        metrics.value = []
      }

      return clubConfig.value
    } catch (err) {
      error.value = err.message
      console.error('Error fetching club config:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * Common metrics ที่ต้องมีในทุก template
   * Requirement 5.4: ทุกประเภทกีฬาต้องมี common metrics
   */
  const COMMON_METRICS = [
    {
      name: 'attendance_rate',
      display_name: 'อัตราการเข้าร่วม',
      description: 'เปอร์เซ็นต์การเข้าร่วมกิจกรรม',
      measurement_type: 'percentage',
      target_value: 100,
      rating_scale_min: 0,
      rating_scale_max: 100,
      formula: null,
      is_required: true,
      category_type: 'attendance'
    },
    {
      name: 'training_hours',
      display_name: 'ชั่วโมงฝึกซ้อม',
      description: 'จำนวนชั่วโมงฝึกซ้อมต่อเดือน',
      measurement_type: 'count',
      target_value: 20,
      rating_scale_min: 1,
      rating_scale_max: 5,
      formula: '(actual / target) * 100',
      is_required: true,
      category_type: 'training'
    },
    {
      name: 'coach_rating',
      display_name: 'คะแนนจากโค้ช',
      description: 'คะแนนประเมินจากโค้ช',
      measurement_type: 'rating',
      target_value: 5,
      rating_scale_min: 1,
      rating_scale_max: 5,
      formula: null,
      is_required: true,
      category_type: 'training'
    }
  ]

  /**
   * ตรวจสอบและเพิ่ม common metrics ที่ขาดหายไป
   * Requirement 5.4: ทุกประเภทกีฬาต้องมี common metrics
   * 
   * @param {Object} template - Template ที่จะตรวจสอบ
   * @returns {Object} Template ที่มี common metrics ครบ
   */
  function ensureCommonMetrics(template) {
    if (!template || !template.template_categories) {
      return template
    }

    // สร้าง copy ของ template เพื่อไม่แก้ไข original
    const enhancedTemplate = JSON.parse(JSON.stringify(template))
    
    // รวบรวม metrics ที่มีอยู่แล้ว
    const existingMetricNames = new Set()
    enhancedTemplate.template_categories.forEach(cat => {
      if (cat.template_metrics) {
        cat.template_metrics.forEach(m => existingMetricNames.add(m.name))
      }
    })

    // ตรวจสอบและเพิ่ม common metrics ที่ขาด
    COMMON_METRICS.forEach(commonMetric => {
      if (!existingMetricNames.has(commonMetric.name)) {
        // หา category ที่เหมาะสม
        let targetCategory = enhancedTemplate.template_categories.find(
          cat => cat.category_type === commonMetric.category_type
        )

        // ถ้าไม่มี category ที่เหมาะสม ให้สร้างใหม่
        if (!targetCategory) {
          targetCategory = {
            id: `temp_${commonMetric.category_type}_${Date.now()}`,
            name: commonMetric.category_type,
            display_name: getCategoryDisplayName(commonMetric.category_type),
            category_type: commonMetric.category_type,
            weight: 0, // จะต้องปรับน้ำหนักภายหลัง
            sort_order: enhancedTemplate.template_categories.length,
            template_metrics: []
          }
          enhancedTemplate.template_categories.push(targetCategory)
        }

        // เพิ่ม metric ที่ขาด
        if (!targetCategory.template_metrics) {
          targetCategory.template_metrics = []
        }
        targetCategory.template_metrics.push({
          id: `temp_${commonMetric.name}_${Date.now()}`,
          ...commonMetric
        })
      }
    })

    return enhancedTemplate
  }

  /**
   * ดึงชื่อแสดงผลของ category type
   * 
   * @param {string} categoryType - ประเภทหมวดหมู่
   * @returns {string} ชื่อแสดงผล
   */
  function getCategoryDisplayName(categoryType) {
    const displayNames = {
      attendance: 'การเข้าร่วม',
      training: 'การฝึกซ้อม',
      skill: 'ทักษะ',
      competition: 'การแข่งขัน',
      custom: 'กำหนดเอง'
    }
    return displayNames[categoryType] || categoryType
  }

  /**
   * โหลด Template สำหรับประเภทกีฬาที่เลือก
   * Requirement 1.2: โหลด default template เมื่อเลือกประเภทกีฬา
   * Requirement 5.4: ต้องมี common metrics (attendance_rate, training_hours, coach_rating) เสมอ
   * 
   * @param {string} sportTypeId - รหัสประเภทกีฬา
   * @returns {Promise<Object|null>} Template ที่เป็น default พร้อม common metrics
   */
  async function loadTemplateForSportType(sportTypeId) {
    if (!sportTypeId) return null

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('scoring_templates')
        .select(`
          *,
          template_categories (
            id,
            name,
            display_name,
            category_type,
            weight,
            sort_order,
            template_metrics (
              id,
              name,
              display_name,
              description,
              measurement_type,
              target_value,
              rating_scale_min,
              rating_scale_max,
              formula,
              is_required
            )
          )
        `)
        .eq('sport_type_id', sportTypeId)
        .eq('is_default', true)
        .single()

      if (err && err.code !== 'PGRST116') throw err

      // ตรวจสอบและเพิ่ม common metrics ที่ขาดหายไป
      const templateWithCommonMetrics = data ? ensureCommonMetrics(data) : null

      return templateWithCommonMetrics
    } catch (err) {
      error.value = err.message
      console.error('Error loading template:', err)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * ตรวจสอบว่า template มี common metrics ครบหรือไม่
   * Requirement 5.4: ทุกประเภทกีฬาต้องมี common metrics
   * 
   * @param {Object} template - Template ที่จะตรวจสอบ
   * @returns {Object} ผลการตรวจสอบ { hasAll, missing }
   */
  function validateCommonMetrics(template) {
    if (!template || !template.template_categories) {
      return { hasAll: false, missing: COMMON_METRICS.map(m => m.name) }
    }

    const existingMetricNames = new Set()
    template.template_categories.forEach(cat => {
      if (cat.template_metrics) {
        cat.template_metrics.forEach(m => existingMetricNames.add(m.name))
      }
    })

    const missing = COMMON_METRICS
      .filter(m => !existingMetricNames.has(m.name))
      .map(m => m.name)

    return {
      hasAll: missing.length === 0,
      missing
    }
  }

  /**
   * Clone template เพื่อสร้างการตั้งค่าเฉพาะชมรม
   * Requirement 2.4: บันทึกเป็นการตั้งค่าเฉพาะชมรม โดยไม่กระทบ template ต้นฉบับ
   * 
   * การทำงาน:
   * 1. ดึงข้อมูล template ต้นฉบับ (READ ONLY)
   * 2. สร้าง deep copy ของข้อมูล
   * 3. สร้างการตั้งค่าใหม่ในตาราง club_scoring_configs
   * 4. Clone หมวดหมู่และ metrics ไปยังตารางของชมรม
   * 5. Template ต้นฉบับไม่ถูกแก้ไข
   * 
   * @param {string} clubId - รหัสชมรม
   * @param {string} templateId - รหัส template ที่จะ clone
   * @param {string} configName - ชื่อการตั้งค่าใหม่
   * @returns {Promise<{success: boolean, data?: Object, error?: string, originalTemplateId?: string}>}
   */
  async function cloneTemplateForClub(clubId, templateId, configName) {
    if (!clubId || !templateId) {
      return { success: false, error: 'กรุณาระบุชมรมและ template' }
    }

    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.id

      // ดึงข้อมูล template ที่จะ clone (READ ONLY - ไม่แก้ไข)
      const { data: originalTemplate, error: templateErr } = await supabase
        .from('scoring_templates')
        .select(`
          *,
          template_categories (
            *,
            template_metrics (*)
          )
        `)
        .eq('id', templateId)
        .single()

      if (templateErr) throw templateErr

      // สร้าง deep copy ของ template เพื่อใช้ในการ clone
      // ไม่แก้ไข originalTemplate โดยตรง
      const templateCopy = JSON.parse(JSON.stringify(originalTemplate))

      // ตรวจสอบและเพิ่ม common metrics ที่ขาดหายไปใน copy
      const templateWithCommonMetrics = ensureCommonMetrics(templateCopy)

      // สร้างการตั้งค่าใหม่สำหรับชมรม (ไม่กระทบ template ต้นฉบับ)
      const { data: newConfig, error: configErr } = await supabase
        .from('club_scoring_configs')
        .insert({
          club_id: clubId,
          sport_type_id: templateWithCommonMetrics.sport_type_id,
          template_id: templateId, // เก็บ reference ไปยัง template ต้นฉบับ
          name: configName || `${templateWithCommonMetrics.name} - Custom`,
          is_active: false,
          version: 1,
          created_by: userId
        })
        .select()
        .single()

      if (configErr) throw configErr

      // Clone หมวดหมู่และ metrics ไปยังตารางของชมรม
      // ข้อมูลถูกเก็บแยกจาก template ต้นฉบับ
      for (const category of templateWithCommonMetrics.template_categories || []) {
        const { data: newCategory, error: catErr } = await supabase
          .from('club_scoring_categories')
          .insert({
            config_id: newConfig.id,
            name: category.name,
            display_name: category.display_name,
            category_type: category.category_type,
            weight: category.weight,
            is_active: true,
            sort_order: category.sort_order
          })
          .select()
          .single()

        if (catErr) throw catErr

        // Clone metrics ของหมวดหมู่นี้
        for (const metric of category.template_metrics || []) {
          const { error: metricErr } = await supabase
            .from('club_scoring_metrics')
            .insert({
              category_id: newCategory.id,
              name: metric.name,
              display_name: metric.display_name,
              description: metric.description,
              measurement_type: metric.measurement_type,
              target_value: metric.target_value,
              min_value: 0,
              max_value: 100,
              default_value: 0,
              scoring_formula: metric.formula || '(actual / target) * 100',
              is_required: metric.is_required,
              is_active: true
            })

          if (metricErr) throw metricErr
        }
      }

      // โหลดการตั้งค่าใหม่
      await fetchClubConfig(clubId)

      return { 
        success: true, 
        data: newConfig,
        originalTemplateId: templateId // ส่งกลับ ID ของ template ต้นฉบับเพื่อยืนยันว่าไม่ถูกแก้ไข
      }
    } catch (err) {
      error.value = err.message
      console.error('Error cloning template:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ตรวจสอบว่า template ต้นฉบับไม่ถูกแก้ไขหลังจาก clone
   * Requirement 2.4: Template ต้นฉบับต้องไม่เปลี่ยนแปลง
   * 
   * @param {string} templateId - รหัส template ที่จะตรวจสอบ
   * @param {Object} originalSnapshot - Snapshot ของ template ก่อน clone
   * @returns {Promise<{unchanged: boolean, differences?: Array}>}
   */
  async function verifyTemplateUnchanged(templateId, originalSnapshot) {
    if (!templateId || !originalSnapshot) {
      return { unchanged: false, differences: ['ไม่มีข้อมูลสำหรับเปรียบเทียบ'] }
    }

    try {
      const { data: currentTemplate, error: err } = await supabase
        .from('scoring_templates')
        .select(`
          *,
          template_categories (
            *,
            template_metrics (*)
          )
        `)
        .eq('id', templateId)
        .single()

      if (err) throw err

      // เปรียบเทียบ snapshot กับข้อมูลปัจจุบัน
      const originalStr = JSON.stringify(originalSnapshot)
      const currentStr = JSON.stringify(currentTemplate)

      if (originalStr === currentStr) {
        return { unchanged: true }
      }

      // หาความแตกต่าง
      const differences = []
      if (originalSnapshot.name !== currentTemplate.name) {
        differences.push(`ชื่อเปลี่ยนจาก "${originalSnapshot.name}" เป็น "${currentTemplate.name}"`)
      }
      if (originalSnapshot.template_categories?.length !== currentTemplate.template_categories?.length) {
        differences.push('จำนวนหมวดหมู่เปลี่ยนแปลง')
      }

      return { unchanged: false, differences }
    } catch (err) {
      console.error('Error verifying template:', err)
      return { unchanged: false, differences: [err.message] }
    }
  }

  /**
   * ดึง metrics ของหมวดหมู่
   * 
   * @param {string} categoryId - รหัสหมวดหมู่
   * @returns {Array} รายการ metrics
   */
  function getMetricsByCategory(categoryId) {
    return metrics.value.filter(m => m.category_id === categoryId)
  }

  /**
   * ดึงประเภทกีฬาตาม ID
   * 
   * @param {string} id - รหัสประเภทกีฬา
   * @returns {Object|undefined} ประเภทกีฬา
   */
  function getSportTypeById(id) {
    return sportTypes.value.find(s => s.id === id)
  }

  /**
   * ดึง template ตาม ID
   * 
   * @param {string} id - รหัส template
   * @returns {Object|undefined} Template
   */
  function getTemplateById(id) {
    return templates.value.find(t => t.id === id)
  }

  /**
   * ล้างข้อมูลใน store
   */
  function clearState() {
    clubConfig.value = null
    categories.value = []
    metrics.value = []
    error.value = null
  }

  // ============ CONFIGURATION HISTORY STATE ============
  
  /** @type {import('vue').Ref<Array>} ประวัติการเปลี่ยนแปลงเกณฑ์ */
  const configHistory = ref([])

  // ============ CONFIGURATION VERSIONING ACTIONS ============
  // Implements Requirements: 8.1, 8.2

  /**
   * สร้าง snapshot ของการตั้งค่าปัจจุบัน
   * Requirement 8.1: สร้าง versioned snapshot เมื่อมีการเปลี่ยนแปลง
   * 
   * @param {string} configId - รหัสการตั้งค่า
   * @returns {Promise<Object>} - snapshot ของการตั้งค่า
   */
  async function createConfigSnapshot(configId) {
    if (!configId) {
      return null
    }

    try {
      // ดึงข้อมูลการตั้งค่าหลัก
      const { data: configData, error: configErr } = await supabase
        .from('club_scoring_configs')
        .select('*')
        .eq('id', configId)
        .single()

      if (configErr) throw configErr

      // ดึงหมวดหมู่
      const { data: catData, error: catErr } = await supabase
        .from('club_scoring_categories')
        .select('*')
        .eq('config_id', configId)
        .order('sort_order', { ascending: true })

      if (catErr) throw catErr

      // ดึง metrics ของทุกหมวดหมู่
      let metricsData = []
      if (catData && catData.length > 0) {
        const categoryIds = catData.map(c => c.id)
        const { data: mData, error: mErr } = await supabase
          .from('club_scoring_metrics')
          .select('*')
          .in('category_id', categoryIds)

        if (mErr) throw mErr
        metricsData = mData || []
      }

      // สร้าง snapshot
      return {
        config: configData,
        categories: catData || [],
        metrics: metricsData,
        created_at: new Date().toISOString()
      }
    } catch (err) {
      console.error('Error creating config snapshot:', err)
      return null
    }
  }

  /**
   * บันทึก version ใหม่ของการตั้งค่า
   * Requirement 8.1: สร้าง versioned snapshot เมื่อมีการเปลี่ยนแปลง
   * Requirement 8.2: แสดงวันที่, ผู้เปลี่ยน, และสรุปการเปลี่ยนแปลง
   * 
   * @param {string} configId - รหัสการตั้งค่า
   * @param {string} changeSummary - สรุปการเปลี่ยนแปลง
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function saveConfigVersion(configId, changeSummary = '') {
    if (!configId) {
      return { success: false, error: 'กรุณาระบุรหัสการตั้งค่า' }
    }

    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.id

      // สร้าง snapshot ของการตั้งค่าปัจจุบัน
      const snapshot = await createConfigSnapshot(configId)
      if (!snapshot) {
        throw new Error('ไม่สามารถสร้าง snapshot ได้')
      }

      // ดึง version ล่าสุด
      const { data: latestHistory, error: histErr } = await supabase
        .from('scoring_config_history')
        .select('version')
        .eq('config_id', configId)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      // คำนวณ version ใหม่ (auto-increment)
      let newVersion = 1
      if (!histErr && latestHistory) {
        newVersion = latestHistory.version + 1
      }

      // บันทึกประวัติ
      const { data: historyData, error: insertErr } = await supabase
        .from('scoring_config_history')
        .insert({
          config_id: configId,
          version: newVersion,
          snapshot: snapshot,
          change_summary: changeSummary || `บันทึก version ${newVersion}`,
          changed_by: userId
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      // อัพเดท version ในตาราง config หลัก
      const { error: updateErr } = await supabase
        .from('club_scoring_configs')
        .update({ 
          version: newVersion,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)

      if (updateErr) throw updateErr

      // อัพเดท state
      if (clubConfig.value && clubConfig.value.id === configId) {
        clubConfig.value.version = newVersion
      }

      return { success: true, data: historyData }
    } catch (err) {
      error.value = err.message
      console.error('Error saving config version:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึงประวัติการเปลี่ยนแปลงของการตั้งค่า
   * Requirement 8.2: แสดงวันที่, ผู้เปลี่ยน, และสรุปการเปลี่ยนแปลง
   * 
   * @param {string} configId - รหัสการตั้งค่า
   * @returns {Promise<Array>} - รายการประวัติ
   */
  async function fetchConfigHistory(configId) {
    if (!configId) {
      configHistory.value = []
      return []
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: err } = await supabase
        .from('scoring_config_history')
        .select(`
          *,
          user_profiles:changed_by (
            id,
            full_name,
            email
          )
        `)
        .eq('config_id', configId)
        .order('version', { ascending: false })

      if (err) throw err

      configHistory.value = data || []
      return configHistory.value
    } catch (err) {
      error.value = err.message
      console.error('Error fetching config history:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // ============ CONFIGURATION RESTORATION ACTIONS ============
  // Implements Requirements: 8.3, 8.4

  /**
   * กู้คืนการตั้งค่าจาก version ก่อนหน้า
   * Requirement 8.3: อนุญาตให้กู้คืนพร้อม confirmation
   * Requirement 8.4: สร้าง version ใหม่เมื่อกู้คืน (ไม่ overwrite history)
   * 
   * @param {string} configId - รหัสการตั้งค่า
   * @param {number} targetVersion - version ที่ต้องการกู้คืน
   * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
   */
  async function restoreConfigVersion(configId, targetVersion) {
    if (!configId || targetVersion === undefined) {
      return { success: false, error: 'กรุณาระบุรหัสการตั้งค่าและ version' }
    }

    loading.value = true
    error.value = null

    try {
      const authStore = useAuthStore()
      const userId = authStore.user?.id

      // ดึง snapshot ของ version ที่ต้องการกู้คืน
      const { data: historyData, error: histErr } = await supabase
        .from('scoring_config_history')
        .select('*')
        .eq('config_id', configId)
        .eq('version', targetVersion)
        .single()

      if (histErr) throw new Error('ไม่พบ version ที่ระบุ')

      const snapshot = historyData.snapshot

      // ลบหมวดหมู่และ metrics เดิม (cascade delete)
      const { error: deleteErr } = await supabase
        .from('club_scoring_categories')
        .delete()
        .eq('config_id', configId)

      if (deleteErr) throw deleteErr

      // กู้คืนหมวดหมู่จาก snapshot
      for (const category of snapshot.categories || []) {
        const { data: newCategory, error: catErr } = await supabase
          .from('club_scoring_categories')
          .insert({
            config_id: configId,
            name: category.name,
            display_name: category.display_name,
            category_type: category.category_type,
            weight: category.weight,
            is_active: category.is_active,
            sort_order: category.sort_order
          })
          .select()
          .single()

        if (catErr) throw catErr

        // กู้คืน metrics ของหมวดหมู่นี้
        const categoryMetrics = (snapshot.metrics || []).filter(
          m => m.category_id === category.id
        )

        for (const metric of categoryMetrics) {
          const { error: metricErr } = await supabase
            .from('club_scoring_metrics')
            .insert({
              category_id: newCategory.id,
              name: metric.name,
              display_name: metric.display_name,
              description: metric.description,
              measurement_type: metric.measurement_type,
              target_value: metric.target_value,
              min_value: metric.min_value,
              max_value: metric.max_value,
              default_value: metric.default_value,
              scoring_formula: metric.scoring_formula,
              is_required: metric.is_required,
              is_active: metric.is_active
            })

          if (metricErr) throw metricErr
        }
      }

      // อัพเดทการตั้งค่าหลักจาก snapshot
      const { error: updateErr } = await supabase
        .from('club_scoring_configs')
        .update({
          tier_excellent_min: snapshot.config.tier_excellent_min,
          tier_good_min: snapshot.config.tier_good_min,
          tier_average_min: snapshot.config.tier_average_min,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)

      if (updateErr) throw updateErr

      // สร้าง version ใหม่สำหรับการกู้คืน (Requirement 8.4)
      const saveResult = await saveConfigVersion(
        configId, 
        `กู้คืนจาก version ${targetVersion}`
      )

      if (!saveResult.success) {
        throw new Error(saveResult.error)
      }

      // โหลดการตั้งค่าใหม่
      const clubId = snapshot.config.club_id
      await fetchClubConfig(clubId)

      return { success: true, data: saveResult.data }
    } catch (err) {
      error.value = err.message
      console.error('Error restoring config version:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }

  /**
   * ดึง snapshot ของ version ที่ระบุ (สำหรับ preview)
   * 
   * @param {string} configId - รหัสการตั้งค่า
   * @param {number} version - version ที่ต้องการดู
   * @returns {Promise<Object|null>} - snapshot ของ version นั้น
   */
  async function getVersionSnapshot(configId, version) {
    if (!configId || version === undefined) {
      return null
    }

    try {
      const { data, error: err } = await supabase
        .from('scoring_config_history')
        .select('snapshot')
        .eq('config_id', configId)
        .eq('version', version)
        .single()

      if (err) throw err

      return data?.snapshot || null
    } catch (err) {
      console.error('Error getting version snapshot:', err)
      return null
    }
  }

  // ============ CONFIGURATION VALIDATION ACTIONS ============
  // Implements Requirements: 7.1, 7.2, 7.3, 7.4

  /**
   * ตรวจสอบการตั้งค่าเกณฑ์อย่างครบถ้วน
   * Requirement 7.1: ตรวจสอบน้ำหนักรวม = 100%
   * Requirement 7.2: ตรวจสอบว่าทุกหมวดหมู่มี metric
   * Requirement 7.3: ตรวจสอบ threshold ของ metric (min < max)
   * Requirement 7.4: แสดง error message ที่ชัดเจน
   * 
   * @param {Object} config - การตั้งค่าที่จะตรวจสอบ
   * @param {Array} configCategories - หมวดหมู่ของการตั้งค่า
   * @param {Array} configMetrics - metrics ของการตั้งค่า
   * @returns {Object} - { isValid, errors, warnings }
   */
  function validateScoringConfig(config, configCategories, configMetrics) {
    const errors = []
    const warnings = []

    // ตรวจสอบว่ามีการตั้งค่าหรือไม่
    if (!config) {
      errors.push({
        code: 'CONFIG_NOT_FOUND',
        message: 'ไม่พบการตั้งค่าเกณฑ์'
      })
      return { isValid: false, errors, warnings }
    }

    // กรองเฉพาะหมวดหมู่ที่ active
    const activeCategories = (configCategories || []).filter(c => c.is_active !== false)

    // ตรวจสอบว่ามีหมวดหมู่หรือไม่
    if (activeCategories.length === 0) {
      errors.push({
        code: 'NO_CATEGORIES',
        message: 'ต้องมีอย่างน้อย 1 หมวดหมู่ที่ใช้งาน'
      })
      return { isValid: false, errors, warnings }
    }

    // Requirement 7.1: ตรวจสอบน้ำหนักรวม = 100%
    const totalWeight = activeCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0)
    if (totalWeight !== 100) {
      errors.push({
        code: 'WEIGHT_SUM_INVALID',
        message: `น้ำหนักรวมต้องเท่ากับ 100% (ปัจจุบัน: ${totalWeight}%)`
      })
    }

    // ตรวจสอบแต่ละหมวดหมู่
    for (const category of activeCategories) {
      // ตรวจสอบน้ำหนักของหมวดหมู่
      if (category.weight < 0) {
        errors.push({
          code: 'NEGATIVE_WEIGHT',
          message: `น้ำหนักของหมวดหมู่ "${category.display_name}" ต้องไม่ติดลบ`,
          categoryId: category.id
        })
      }

      if (category.weight > 100) {
        errors.push({
          code: 'WEIGHT_EXCEEDS_100',
          message: `น้ำหนักของหมวดหมู่ "${category.display_name}" ต้องไม่เกิน 100`,
          categoryId: category.id
        })
      }

      // Requirement 7.2: ตรวจสอบว่าหมวดหมู่มี metric
      const categoryMetrics = (configMetrics || []).filter(
        m => m.category_id === category.id && m.is_active !== false
      )

      if (categoryMetrics.length === 0) {
        errors.push({
          code: 'CATEGORY_NO_METRICS',
          message: `หมวดหมู่ "${category.display_name}" ต้องมีอย่างน้อย 1 ตัวชี้วัด`,
          categoryId: category.id
        })
      }

      // Requirement 7.3: ตรวจสอบ threshold ของ metric
      for (const metric of categoryMetrics) {
        // ตรวจสอบ min < max
        if (metric.min_value !== null && metric.max_value !== null) {
          if (metric.min_value >= metric.max_value) {
            errors.push({
              code: 'METRIC_INVALID_THRESHOLD',
              message: `ค่าต่ำสุดของ "${metric.display_name}" ต้องน้อยกว่าค่าสูงสุด`,
              metricId: metric.id,
              categoryId: category.id
            })
          }
        }

        // ตรวจสอบ target_value
        if (metric.measurement_type === 'count' || metric.measurement_type === 'time' || metric.measurement_type === 'distance') {
          if (metric.target_value !== null && metric.target_value <= 0) {
            warnings.push({
              code: 'METRIC_INVALID_TARGET',
              message: `ค่าเป้าหมายของ "${metric.display_name}" ควรมากกว่า 0`,
              metricId: metric.id,
              categoryId: category.id
            })
          }
        }

        // ตรวจสอบ rating scale
        if (metric.measurement_type === 'rating') {
          const scaleMin = metric.rating_scale_min ?? 1
          const scaleMax = metric.rating_scale_max ?? 5
          if (scaleMin >= scaleMax) {
            errors.push({
              code: 'METRIC_INVALID_RATING_SCALE',
              message: `Rating scale ของ "${metric.display_name}" ไม่ถูกต้อง (min >= max)`,
              metricId: metric.id,
              categoryId: category.id
            })
          }
        }

        // ตรวจสอบ default_value อยู่ในช่วง
        if (metric.default_value !== null && metric.min_value !== null && metric.max_value !== null) {
          if (metric.default_value < metric.min_value || metric.default_value > metric.max_value) {
            warnings.push({
              code: 'METRIC_DEFAULT_OUT_OF_RANGE',
              message: `ค่าเริ่มต้นของ "${metric.display_name}" อยู่นอกช่วงที่กำหนด`,
              metricId: metric.id,
              categoryId: category.id
            })
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * ตรวจสอบและ activate การตั้งค่า
   * Requirement 7.4: แสดง confirmation เมื่อ valid
   * 
   * @param {string} configId - รหัสการตั้งค่า
   * @returns {Promise<{success: boolean, errors?: Array, warnings?: Array}>}
   */
  async function validateAndActivateConfig(configId) {
    if (!configId) {
      return { success: false, errors: [{ code: 'NO_CONFIG_ID', message: 'กรุณาระบุรหัสการตั้งค่า' }] }
    }

    loading.value = true
    error.value = null

    try {
      // ดึงข้อมูลการตั้งค่า
      const { data: configData, error: configErr } = await supabase
        .from('club_scoring_configs')
        .select('*')
        .eq('id', configId)
        .single()

      if (configErr) throw configErr

      // ดึงหมวดหมู่
      const { data: catData, error: catErr } = await supabase
        .from('club_scoring_categories')
        .select('*')
        .eq('config_id', configId)

      if (catErr) throw catErr

      // ดึง metrics
      let metricsData = []
      if (catData && catData.length > 0) {
        const categoryIds = catData.map(c => c.id)
        const { data: mData, error: mErr } = await supabase
          .from('club_scoring_metrics')
          .select('*')
          .in('category_id', categoryIds)

        if (mErr) throw mErr
        metricsData = mData || []
      }

      // ตรวจสอบการตั้งค่า
      const validation = validateScoringConfig(configData, catData, metricsData)

      if (!validation.isValid) {
        return { 
          success: false, 
          errors: validation.errors,
          warnings: validation.warnings
        }
      }

      // บันทึก version ก่อน activate
      await saveConfigVersion(configId, 'Activate configuration')

      // Deactivate การตั้งค่าอื่นของชมรมเดียวกัน
      const { error: deactivateErr } = await supabase
        .from('club_scoring_configs')
        .update({ is_active: false })
        .eq('club_id', configData.club_id)
        .neq('id', configId)

      if (deactivateErr) throw deactivateErr

      // Activate การตั้งค่านี้
      const { error: activateErr } = await supabase
        .from('club_scoring_configs')
        .update({ 
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)

      if (activateErr) throw activateErr

      // อัพเดท state
      if (clubConfig.value && clubConfig.value.id === configId) {
        clubConfig.value.is_active = true
      }

      return { 
        success: true, 
        warnings: validation.warnings,
        message: 'เปิดใช้งานการตั้งค่าเรียบร้อยแล้ว'
      }
    } catch (err) {
      error.value = err.message
      console.error('Error activating config:', err)
      return { 
        success: false, 
        errors: [{ code: 'ACTIVATION_ERROR', message: err.message }]
      }
    } finally {
      loading.value = false
    }
  }

  return {
    // State
    sportTypes,
    templates,
    clubConfig,
    categories,
    metrics,
    loading,
    error,
    configHistory,
    
    // Getters
    activeConfig,
    availableTemplates,
    activeCategories,
    totalWeight,
    isValidWeight,
    categoriesByType,
    
    // Actions
    fetchSportTypes,
    fetchTemplates,
    fetchClubConfig,
    loadTemplateForSportType,
    cloneTemplateForClub,
    getMetricsByCategory,
    getSportTypeById,
    getTemplateById,
    clearState,
    
    // Template utilities
    ensureCommonMetrics,
    validateCommonMetrics,
    verifyTemplateUnchanged,
    
    // Configuration versioning (Requirements 8.1, 8.2)
    saveConfigVersion,
    fetchConfigHistory,
    createConfigSnapshot,
    
    // Configuration restoration (Requirements 8.3, 8.4)
    restoreConfigVersion,
    getVersionSnapshot,
    
    // Configuration validation (Requirements 7.1, 7.2, 7.3, 7.4)
    validateScoringConfig,
    validateAndActivateConfig,
    
    // Constants
    COMMON_METRICS
  }
})
