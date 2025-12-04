/**
 * Score Calculator Utility
 * 
 * Calculates athlete performance scores based on configurable criteria and conditions.
 * Implements Requirements: 4.1, 4.2, 4.3, 4.4, 7.4, 7.5, 7.7, 8.1-8.6
 */

/**
 * Default scoring criteria weights
 * Used when no custom criteria exists for a club
 * Validates: Requirements 7.7
 */
export const DEFAULT_CRITERIA = {
  attendance_weight: 40,
  training_weight: 30,
  rating_weight: 30,
  target_training_sessions: 12
}

/**
 * Performance tier thresholds
 * Validates: Requirements 4.5, 4.6, 4.7, 4.8
 */
export const TIER_THRESHOLDS = {
  excellent: 85,
  good: 70,
  average: 50
}

/**
 * Compare two values using the specified operator
 * 
 * @param {number} actual - The actual value to compare
 * @param {string} operator - Comparison operator (>=, >, <=, <, =)
 * @param {number} threshold - The threshold value to compare against
 * @returns {boolean} - Result of the comparison
 */
export function compare(actual, operator, threshold) {
  if (actual === null || actual === undefined || isNaN(actual)) {
    return false
  }
  if (threshold === null || threshold === undefined || isNaN(threshold)) {
    return false
  }

  switch (operator) {
    case '>=':
      return actual >= threshold
    case '>':
      return actual > threshold
    case '<=':
      return actual <= threshold
    case '<':
      return actual < threshold
    case '=':
      return actual === threshold
    default:
      return false
  }
}

/**
 * Evaluate a single scoring condition against athlete stats
 * 
 * @param {Object} condition - The scoring condition to evaluate
 * @param {string} condition.category - Category: 'attendance', 'training', 'rating', 'custom'
 * @param {string} condition.threshold_type - Type: 'percentage', 'count', 'value'
 * @param {string} condition.comparison_operator - Operator: '>=', '>', '<=', '<', '='
 * @param {number} condition.threshold_value - The threshold to compare against
 * @param {number} condition.points - Points to apply if condition is met
 * @param {string} condition.condition_type - Type: 'bonus' or 'penalty'
 * @param {Object} athleteStats - The athlete's statistics
 * @returns {Object} - Evaluation result with condition_met, points_applied, actual_value
 * 
 * Validates: Requirements 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.6
 */
export function evaluateCondition(condition, athleteStats) {
  if (!condition || !athleteStats) {
    return {
      condition_met: false,
      points_applied: 0,
      actual_value: null
    }
  }

  let actualValue = null

  // Determine actual value based on category and threshold type
  switch (condition.category) {
    case 'attendance':
      if (condition.threshold_type === 'percentage') {
        actualValue = athleteStats.attendance_rate ?? 0
      } else if (condition.threshold_type === 'count') {
        // For count-based attendance conditions, typically checking absences
        actualValue = athleteStats.absent_count ?? 0
      }
      break

    case 'training':
      if (condition.threshold_type === 'count') {
        actualValue = athleteStats.training_sessions ?? 0
      } else if (condition.threshold_type === 'value') {
        actualValue = athleteStats.training_hours ?? 0
      }
      break

    case 'rating':
      actualValue = athleteStats.average_rating ?? 0
      break

    case 'custom':
      // Custom conditions may reference specific stats
      if (condition.threshold_type === 'count') {
        actualValue = athleteStats[condition.stat_field] ?? 0
      } else if (condition.threshold_type === 'value') {
        actualValue = athleteStats[condition.stat_field] ?? 0
      } else if (condition.threshold_type === 'percentage') {
        actualValue = athleteStats[condition.stat_field] ?? 0
      }
      break

    default:
      actualValue = 0
  }

  // Evaluate the condition
  const conditionMet = compare(
    actualValue,
    condition.comparison_operator,
    condition.threshold_value
  )

  // Apply points based on condition type
  const pointsApplied = conditionMet ? condition.points : 0

  return {
    condition_met: conditionMet,
    points_applied: pointsApplied,
    actual_value: actualValue
  }
}

/**
 * Determine performance tier based on overall score
 * 
 * @param {number} score - The overall score (0-100)
 * @returns {string} - Performance tier: 'excellent', 'good', 'average', 'needs_improvement'
 * 
 * Validates: Requirements 4.5, 4.6, 4.7, 4.8
 */
export function determineTier(score) {
  if (score >= TIER_THRESHOLDS.excellent) return 'excellent'
  if (score >= TIER_THRESHOLDS.good) return 'good'
  if (score >= TIER_THRESHOLDS.average) return 'average'
  return 'needs_improvement'
}

/**
 * Calculate the complete score breakdown for an athlete
 * 
 * @param {Object} athleteStats - The athlete's statistics
 * @param {number} athleteStats.attendance_rate - Attendance rate (0-100)
 * @param {number} athleteStats.training_sessions - Number of training sessions
 * @param {number} athleteStats.average_rating - Average rating (1-5)
 * @param {Object} [criteria] - Custom scoring criteria (optional, uses defaults if null)
 * @param {number} criteria.attendance_weight - Weight for attendance (0-100)
 * @param {number} criteria.training_weight - Weight for training (0-100)
 * @param {number} criteria.rating_weight - Weight for rating (0-100)
 * @param {number} criteria.target_training_sessions - Target sessions per month
 * @param {Array} [conditions] - Array of scoring conditions to apply
 * @returns {Object} - Complete score breakdown
 * 
 * Validates: Requirements 4.1, 4.2, 4.3, 4.4, 7.7
 */
export function calculateScore(athleteStats, criteria = null, conditions = []) {
  // Use default criteria if none provided (Requirement 7.7)
  const effectiveCriteria = criteria || DEFAULT_CRITERIA
  
  const {
    attendance_weight,
    training_weight,
    rating_weight,
    target_training_sessions
  } = effectiveCriteria

  // Extract stats with defaults
  const attendanceRate = athleteStats?.attendance_rate ?? 0
  const trainingSessions = athleteStats?.training_sessions ?? 0
  const averageRating = athleteStats?.average_rating ?? 0
  const targetSessions = target_training_sessions || DEFAULT_CRITERIA.target_training_sessions

  // Calculate base scores using configured weights (Requirements 4.1, 4.2, 4.3)
  // Attendance score: (attendance_rate / 100) * attendance_weight
  const attendanceScore = (attendanceRate / 100) * attendance_weight

  // Training score: min(sessions / target, 1) * training_weight
  const trainingRatio = targetSessions > 0 ? Math.min(trainingSessions / targetSessions, 1) : 0
  const trainingScore = trainingRatio * training_weight

  // Rating score: (average_rating / 5) * rating_weight
  const ratingScore = (averageRating / 5) * rating_weight

  // Calculate base score (sum of weighted components)
  const baseScore = attendanceScore + trainingScore + ratingScore

  // Evaluate conditions and calculate bonus/penalty points
  let bonusPoints = 0
  let penaltyPoints = 0
  const appliedConditions = []

  if (conditions && Array.isArray(conditions)) {
    // Only evaluate active conditions
    const activeConditions = conditions.filter(c => c.is_active !== false)

    for (const condition of activeConditions) {
      const result = evaluateCondition(condition, athleteStats)
      
      if (result.condition_met) {
        if (condition.condition_type === 'bonus') {
          bonusPoints += result.points_applied
        } else if (condition.condition_type === 'penalty') {
          // Penalty points are stored as negative values
          penaltyPoints += result.points_applied
        }
      }

      appliedConditions.push({
        condition_id: condition.id,
        condition_name: condition.name,
        category: condition.category,
        condition_type: condition.condition_type,
        actual_value: result.actual_value,
        threshold_value: condition.threshold_value,
        comparison_operator: condition.comparison_operator,
        condition_met: result.condition_met,
        points_applied: result.points_applied
      })
    }
  }

  // Calculate overall score (Requirement 4.4)
  // Cap between 0 and 100
  const rawScore = baseScore + bonusPoints + penaltyPoints
  const overallScore = Math.max(0, Math.min(100, rawScore))

  // Determine tier (Requirements 4.5, 4.6, 4.7, 4.8)
  const tier = determineTier(overallScore)

  return {
    // Individual component scores
    attendance_score: Math.round(attendanceScore * 100) / 100,
    training_score: Math.round(trainingScore * 100) / 100,
    rating_score: Math.round(ratingScore * 100) / 100,
    
    // Base score (before conditions)
    base_score: Math.round(baseScore * 100) / 100,
    
    // Condition adjustments
    bonus_points: Math.round(bonusPoints * 100) / 100,
    penalty_points: Math.round(penaltyPoints * 100) / 100,
    
    // Final score and tier
    overall_score: Math.round(overallScore * 100) / 100,
    tier,
    
    // Applied conditions for transparency (Requirement 8.5, 8.6)
    applied_conditions: appliedConditions,
    
    // Criteria used (for reference)
    criteria_used: {
      attendance_weight,
      training_weight,
      rating_weight,
      target_training_sessions: targetSessions
    }
  }
}

/**
 * Validate that scoring criteria weights sum to 100
 * 
 * @param {Object} criteria - The criteria to validate
 * @returns {Object} - Validation result with isValid and error message
 * 
 * Validates: Requirements 7.2, 7.6
 */
export function validateCriteriaWeights(criteria) {
  if (!criteria) {
    return { isValid: false, error: 'Criteria is required' }
  }

  const { attendance_weight, training_weight, rating_weight } = criteria
  
  if (attendance_weight < 0 || training_weight < 0 || rating_weight < 0) {
    return { isValid: false, error: 'Weights cannot be negative' }
  }

  if (attendance_weight > 100 || training_weight > 100 || rating_weight > 100) {
    return { isValid: false, error: 'Individual weights cannot exceed 100' }
  }

  const sum = attendance_weight + training_weight + rating_weight
  
  if (sum !== 100) {
    return { 
      isValid: false, 
      error: `Weights must sum to 100 (current sum: ${sum})` 
    }
  }

  return { isValid: true, error: null }
}

/**
 * Get improvement suggestions for an athlete
 * 
 * @param {Object} scoreBreakdown - The score breakdown from calculateScore
 * @param {Object} criteria - The scoring criteria used
 * @returns {Array} - Array of improvement suggestions with potential point gains
 */
export function getImprovementSuggestions(scoreBreakdown, criteria = null) {
  const effectiveCriteria = criteria || DEFAULT_CRITERIA
  const suggestions = []

  // Check attendance improvement potential
  if (scoreBreakdown.attendance_score < effectiveCriteria.attendance_weight) {
    const potential = effectiveCriteria.attendance_weight - scoreBreakdown.attendance_score
    suggestions.push({
      category: 'attendance',
      message: 'เพิ่มอัตราการเข้าร่วมกิจกรรม',
      potential_points: Math.round(potential * 100) / 100
    })
  }

  // Check training improvement potential
  if (scoreBreakdown.training_score < effectiveCriteria.training_weight) {
    const potential = effectiveCriteria.training_weight - scoreBreakdown.training_score
    suggestions.push({
      category: 'training',
      message: `เพิ่มจำนวนครั้งการฝึกซ้อม (เป้าหมาย: ${effectiveCriteria.target_training_sessions} ครั้ง/เดือน)`,
      potential_points: Math.round(potential * 100) / 100
    })
  }

  // Check rating improvement potential
  if (scoreBreakdown.rating_score < effectiveCriteria.rating_weight) {
    const potential = effectiveCriteria.rating_weight - scoreBreakdown.rating_score
    suggestions.push({
      category: 'rating',
      message: 'พัฒนาคุณภาพการฝึกซ้อมเพื่อเพิ่ม rating',
      potential_points: Math.round(potential * 100) / 100
    })
  }

  // Sort by potential points (highest first)
  return suggestions.sort((a, b) => b.potential_points - a.potential_points)
}

/**
 * Calculate points needed to reach a target tier
 * 
 * @param {number} currentScore - Current overall score
 * @param {string} targetTier - Target tier to reach
 * @returns {number} - Points needed (0 if already at or above target)
 */
export function pointsToTier(currentScore, targetTier) {
  const threshold = TIER_THRESHOLDS[targetTier]
  if (!threshold) return 0
  
  const needed = threshold - currentScore
  return needed > 0 ? Math.ceil(needed * 100) / 100 : 0
}


// ============ FLEXIBLE SCORING SYSTEM FUNCTIONS ============
// Implements Requirements: 2.3, 3.2, 3.3, 7.1

/**
 * ตรวจสอบน้ำหนักของหมวดหมู่ทั้งหมด
 * Validates: Requirements 2.3, 7.1 - น้ำหนักรวมต้องเท่ากับ 100%
 * 
 * @param {Array} categories - รายการหมวดหมู่ที่มี weight
 * @returns {Object} - ผลการตรวจสอบ { isValid, sum, error }
 */
export function validateWeights(categories) {
  if (!categories || !Array.isArray(categories)) {
    return { 
      isValid: false, 
      sum: 0, 
      error: 'กรุณาระบุรายการหมวดหมู่' 
    }
  }

  // กรองเฉพาะหมวดหมู่ที่ active
  const activeCategories = categories.filter(c => c.is_active !== false)

  if (activeCategories.length === 0) {
    return { 
      isValid: false, 
      sum: 0, 
      error: 'ต้องมีอย่างน้อย 1 หมวดหมู่ที่ใช้งาน' 
    }
  }

  // ตรวจสอบว่าทุกหมวดหมู่มี weight ที่ถูกต้อง
  for (const category of activeCategories) {
    const weight = category.weight

    if (weight === null || weight === undefined) {
      return { 
        isValid: false, 
        sum: 0, 
        error: `หมวดหมู่ "${category.display_name || category.name}" ไม่มีน้ำหนัก` 
      }
    }

    if (typeof weight !== 'number' || isNaN(weight)) {
      return { 
        isValid: false, 
        sum: 0, 
        error: `น้ำหนักของหมวดหมู่ "${category.display_name || category.name}" ไม่ถูกต้อง` 
      }
    }

    if (weight < 0) {
      return { 
        isValid: false, 
        sum: 0, 
        error: `น้ำหนักของหมวดหมู่ "${category.display_name || category.name}" ต้องไม่ติดลบ` 
      }
    }

    if (weight > 100) {
      return { 
        isValid: false, 
        sum: 0, 
        error: `น้ำหนักของหมวดหมู่ "${category.display_name || category.name}" ต้องไม่เกิน 100` 
      }
    }
  }

  // คำนวณผลรวมน้ำหนัก
  const sum = activeCategories.reduce((total, cat) => total + (cat.weight || 0), 0)

  if (sum !== 100) {
    return { 
      isValid: false, 
      sum, 
      error: `น้ำหนักรวมต้องเท่ากับ 100% (ปัจจุบัน: ${sum}%)` 
    }
  }

  return { isValid: true, sum: 100, error: null }
}

/**
 * กระจายน้ำหนักใหม่เมื่อเพิ่มหมวดหมู่
 * Validates: Requirements 3.2 - ปรับน้ำหนักอัตโนมัติเมื่อเพิ่มหมวดหมู่
 * 
 * @param {Array} existingCategories - หมวดหมู่ที่มีอยู่
 * @param {number} newCategoryWeight - น้ำหนักของหมวดหมู่ใหม่ (default: คำนวณอัตโนมัติ)
 * @returns {Object} - { categories: Array, newWeight: number }
 */
export function redistributeWeightsOnAdd(existingCategories, newCategoryWeight = null) {
  if (!existingCategories || !Array.isArray(existingCategories)) {
    // ถ้าไม่มีหมวดหมู่เดิม หมวดหมู่ใหม่จะได้ 100%
    return { 
      categories: [], 
      newWeight: 100 
    }
  }

  // กรองเฉพาะหมวดหมู่ที่ active
  const activeCategories = existingCategories.filter(c => c.is_active !== false)

  if (activeCategories.length === 0) {
    // ถ้าไม่มีหมวดหมู่ active หมวดหมู่ใหม่จะได้ 100%
    return { 
      categories: existingCategories, 
      newWeight: 100 
    }
  }

  // คำนวณน้ำหนักปัจจุบัน
  const currentTotal = activeCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0)

  // ถ้าระบุน้ำหนักใหม่มา ใช้ค่านั้น ไม่งั้นคำนวณเฉลี่ย
  let weightForNew
  if (newCategoryWeight !== null && newCategoryWeight >= 0 && newCategoryWeight <= 100) {
    weightForNew = newCategoryWeight
  } else {
    // คำนวณน้ำหนักเฉลี่ยสำหรับหมวดหมู่ใหม่
    weightForNew = Math.floor(100 / (activeCategories.length + 1))
  }

  // คำนวณน้ำหนักที่ต้องลดจากหมวดหมู่เดิม
  const weightToRedistribute = weightForNew
  const reductionRatio = (currentTotal - weightToRedistribute) / currentTotal

  // ปรับน้ำหนักหมวดหมู่เดิมตามสัดส่วน
  const updatedCategories = existingCategories.map(cat => {
    if (cat.is_active === false) {
      return cat
    }

    const newWeight = Math.round(cat.weight * reductionRatio)
    return { ...cat, weight: newWeight }
  })

  // ปรับให้ผลรวมเท่ากับ 100 พอดี (แก้ปัญหา rounding)
  const updatedActiveCategories = updatedCategories.filter(c => c.is_active !== false)
  const newTotal = updatedActiveCategories.reduce((sum, cat) => sum + cat.weight, 0) + weightForNew
  
  if (newTotal !== 100 && updatedActiveCategories.length > 0) {
    // ปรับหมวดหมู่แรกเพื่อให้ผลรวมเท่ากับ 100
    const diff = 100 - newTotal
    const firstActiveIndex = updatedCategories.findIndex(c => c.is_active !== false)
    if (firstActiveIndex !== -1) {
      updatedCategories[firstActiveIndex] = {
        ...updatedCategories[firstActiveIndex],
        weight: updatedCategories[firstActiveIndex].weight + diff
      }
    }
  }

  return { 
    categories: updatedCategories, 
    newWeight: weightForNew 
  }
}

/**
 * กระจายน้ำหนักใหม่เมื่อลบหมวดหมู่
 * Validates: Requirements 3.3 - กระจายน้ำหนักที่ลบไปยังหมวดหมู่ที่เหลือ
 * 
 * @param {Array} categories - รายการหมวดหมู่ทั้งหมด
 * @param {string} categoryIdToRemove - ID ของหมวดหมู่ที่จะลบ
 * @returns {Array} - รายการหมวดหมู่ที่ปรับน้ำหนักแล้ว
 */
export function redistributeWeightsOnRemove(categories, categoryIdToRemove) {
  if (!categories || !Array.isArray(categories) || categories.length === 0) {
    return []
  }

  // หาหมวดหมู่ที่จะลบ
  const categoryToRemove = categories.find(c => c.id === categoryIdToRemove)
  if (!categoryToRemove) {
    return categories
  }

  // กรองหมวดหมู่ที่เหลือ (ไม่รวมที่จะลบ)
  const remainingCategories = categories.filter(c => c.id !== categoryIdToRemove)
  
  // กรองเฉพาะหมวดหมู่ที่ active
  const activeRemaining = remainingCategories.filter(c => c.is_active !== false)

  if (activeRemaining.length === 0) {
    // ถ้าไม่มีหมวดหมู่ active เหลือ ไม่ต้องกระจายน้ำหนัก
    return remainingCategories
  }

  // น้ำหนักที่ต้องกระจาย
  const weightToDistribute = categoryToRemove.weight || 0

  if (weightToDistribute === 0) {
    return remainingCategories
  }

  // คำนวณน้ำหนักปัจจุบันของหมวดหมู่ที่เหลือ
  const currentTotal = activeRemaining.reduce((sum, cat) => sum + (cat.weight || 0), 0)

  // กระจายน้ำหนักตามสัดส่วน
  const updatedCategories = remainingCategories.map(cat => {
    if (cat.is_active === false) {
      return cat
    }

    // คำนวณสัดส่วนของหมวดหมู่นี้
    const proportion = currentTotal > 0 ? (cat.weight || 0) / currentTotal : 1 / activeRemaining.length
    const additionalWeight = Math.round(weightToDistribute * proportion)
    
    return { ...cat, weight: (cat.weight || 0) + additionalWeight }
  })

  // ปรับให้ผลรวมเท่ากับ 100 พอดี (แก้ปัญหา rounding)
  const updatedActiveCategories = updatedCategories.filter(c => c.is_active !== false)
  const newTotal = updatedActiveCategories.reduce((sum, cat) => sum + cat.weight, 0)
  
  if (newTotal !== 100 && updatedActiveCategories.length > 0) {
    // ปรับหมวดหมู่แรกเพื่อให้ผลรวมเท่ากับ 100
    const diff = 100 - newTotal
    const firstActiveIndex = updatedCategories.findIndex(c => c.is_active !== false)
    if (firstActiveIndex !== -1) {
      updatedCategories[firstActiveIndex] = {
        ...updatedCategories[firstActiveIndex],
        weight: updatedCategories[firstActiveIndex].weight + diff
      }
    }
  }

  return updatedCategories
}

/**
 * ปรับน้ำหนักหมวดหมู่เดียวและกระจายส่วนต่างไปยังหมวดหมู่อื่น
 * Validates: Requirements 2.3 - รักษาผลรวม 100% เมื่อปรับน้ำหนัก
 * 
 * @param {Array} categories - รายการหมวดหมู่ทั้งหมด
 * @param {string} categoryId - ID ของหมวดหมู่ที่จะปรับ
 * @param {number} newWeight - น้ำหนักใหม่
 * @returns {Object} - { categories: Array, isValid: boolean, error?: string }
 */
export function adjustCategoryWeight(categories, categoryId, newWeight) {
  if (!categories || !Array.isArray(categories)) {
    return { categories: [], isValid: false, error: 'กรุณาระบุรายการหมวดหมู่' }
  }

  if (newWeight < 0 || newWeight > 100) {
    return { categories, isValid: false, error: 'น้ำหนักต้องอยู่ระหว่าง 0-100' }
  }

  // หาหมวดหมู่ที่จะปรับ
  const categoryIndex = categories.findIndex(c => c.id === categoryId)
  if (categoryIndex === -1) {
    return { categories, isValid: false, error: 'ไม่พบหมวดหมู่ที่ระบุ' }
  }

  const category = categories[categoryIndex]
  const oldWeight = category.weight || 0
  const weightDiff = newWeight - oldWeight

  if (weightDiff === 0) {
    return { categories, isValid: true }
  }

  // กรองหมวดหมู่อื่นที่ active
  const otherActiveCategories = categories.filter(
    c => c.id !== categoryId && c.is_active !== false
  )

  if (otherActiveCategories.length === 0 && newWeight !== 100) {
    return { 
      categories, 
      isValid: false, 
      error: 'ไม่มีหมวดหมู่อื่นให้กระจายน้ำหนัก' 
    }
  }

  // คำนวณน้ำหนักรวมของหมวดหมู่อื่น
  const otherTotal = otherActiveCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0)

  // ตรวจสอบว่าสามารถกระจายได้หรือไม่
  if (weightDiff > 0 && otherTotal < weightDiff) {
    return { 
      categories, 
      isValid: false, 
      error: 'น้ำหนักที่ต้องการมากเกินไป ไม่สามารถกระจายจากหมวดหมู่อื่นได้' 
    }
  }

  // ปรับน้ำหนักหมวดหมู่อื่นตามสัดส่วน
  const updatedCategories = categories.map(cat => {
    if (cat.id === categoryId) {
      return { ...cat, weight: newWeight }
    }

    if (cat.is_active === false) {
      return cat
    }

    // คำนวณสัดส่วนของหมวดหมู่นี้
    const proportion = otherTotal > 0 ? (cat.weight || 0) / otherTotal : 1 / otherActiveCategories.length
    const adjustment = Math.round(weightDiff * proportion)
    const adjustedWeight = Math.max(0, (cat.weight || 0) - adjustment)
    
    return { ...cat, weight: adjustedWeight }
  })

  // ปรับให้ผลรวมเท่ากับ 100 พอดี (แก้ปัญหา rounding)
  const activeCategories = updatedCategories.filter(c => c.is_active !== false)
  const newTotal = activeCategories.reduce((sum, cat) => sum + cat.weight, 0)
  
  if (newTotal !== 100 && activeCategories.length > 1) {
    // หาหมวดหมู่อื่นที่ไม่ใช่หมวดหมู่ที่ปรับ
    const diff = 100 - newTotal
    const otherIndex = updatedCategories.findIndex(
      c => c.id !== categoryId && c.is_active !== false
    )
    if (otherIndex !== -1) {
      updatedCategories[otherIndex] = {
        ...updatedCategories[otherIndex],
        weight: Math.max(0, updatedCategories[otherIndex].weight + diff)
      }
    }
  }

  return { categories: updatedCategories, isValid: true }
}

/**
 * สร้างน้ำหนักเริ่มต้นสำหรับหมวดหมู่ใหม่
 * 
 * @param {number} categoryCount - จำนวนหมวดหมู่ทั้งหมด
 * @returns {Array<number>} - รายการน้ำหนักที่กระจายเท่าๆ กัน
 */
export function createEqualWeights(categoryCount) {
  if (categoryCount <= 0) return []
  
  const baseWeight = Math.floor(100 / categoryCount)
  const remainder = 100 - (baseWeight * categoryCount)
  
  const weights = Array(categoryCount).fill(baseWeight)
  
  // กระจาย remainder ไปยังหมวดหมู่แรกๆ
  for (let i = 0; i < remainder; i++) {
    weights[i]++
  }
  
  return weights
}


// ============ FLEXIBLE SCORING CALCULATION ENGINE ============
// Implements Requirements: 6.1, 6.2, 6.3, 6.4

/**
 * Default tier thresholds สำหรับ Flexible Scoring System
 * Validates: Requirements 6.4
 */
export const DEFAULT_TIER_THRESHOLDS = {
  excellent: { min: 85, display_name: 'ยอดเยี่ยม', color: '#22C55E' },
  good: { min: 70, display_name: 'ดี', color: '#3B82F6' },
  average: { min: 50, display_name: 'ปานกลาง', color: '#F59E0B' },
  needs_improvement: { min: 0, display_name: 'ต้องปรับปรุง', color: '#EF4444' }
}

/**
 * คำนวณคะแนนของ metric เดียว
 * 
 * @param {Object} metric - ข้อมูล metric
 * @param {number} actualValue - ค่าจริงที่วัดได้
 * @param {boolean} [allowBonus=false] - อนุญาตให้คะแนนเกิน 100 หรือไม่
 * @returns {Object} - { score, rawScore, formula, details }
 */
export function calculateMetricScore(metric, actualValue, allowBonus = false) {
  if (!metric) {
    return { score: 0, rawScore: 0, formula: null, details: 'ไม่พบข้อมูล metric' }
  }

  // ใช้ default value ถ้าไม่มีค่าจริง (Requirement 6.3)
  const value = actualValue ?? metric.default_value ?? 0
  
  let rawScore = 0
  let formula = metric.scoring_formula || '(actual / target) * 100'
  let details = ''

  switch (metric.measurement_type) {
    case 'percentage':
      // คะแนนเป็นเปอร์เซ็นต์โดยตรง (0-100)
      rawScore = Math.max(0, Math.min(value, 100))
      details = `${value}%`
      break

    case 'count':
      // คำนวณจากจำนวนเทียบกับเป้าหมาย
      if (metric.target_value && metric.target_value > 0) {
        rawScore = (value / metric.target_value) * 100
        details = `${value} / ${metric.target_value} ครั้ง`
      } else {
        rawScore = value > 0 ? 100 : 0
        details = `${value} ครั้ง`
      }
      break

    case 'rating':
      // คำนวณจาก rating scale
      const scaleMin = metric.rating_scale_min ?? 1
      const scaleMax = metric.rating_scale_max ?? 5
      const range = scaleMax - scaleMin
      if (range > 0) {
        rawScore = ((value - scaleMin) / range) * 100
        details = `${value} / ${scaleMax}`
      } else {
        rawScore = 0
        details = `${value}`
      }
      break

    case 'time':
      // คำนวณจากเวลา (ยิ่งน้อยยิ่งดี หรือ ยิ่งมากยิ่งดี ขึ้นกับ target)
      if (metric.target_value && metric.target_value > 0) {
        // สมมติว่าเวลาน้อยกว่า target = ดี
        rawScore = Math.max(0, (1 - (value / metric.target_value)) * 100 + 100)
        rawScore = Math.min(rawScore, 200) // cap ที่ 200% ก่อน
        details = `${value} / ${metric.target_value} นาที`
      } else {
        rawScore = value > 0 ? 50 : 0
        details = `${value} นาที`
      }
      break

    case 'distance':
      // คำนวณจากระยะทาง
      if (metric.target_value && metric.target_value > 0) {
        rawScore = (value / metric.target_value) * 100
        details = `${value} / ${metric.target_value} เมตร`
      } else {
        rawScore = value > 0 ? 50 : 0
        details = `${value} เมตร`
      }
      break

    default:
      // ใช้สูตรทั่วไป
      if (metric.target_value && metric.target_value > 0) {
        rawScore = (value / metric.target_value) * 100
        details = `${value} / ${metric.target_value}`
      } else {
        rawScore = value
        details = `${value}`
      }
  }

  // Cap คะแนนที่ 100 ถ้าไม่อนุญาต bonus (Requirement 6.2)
  const score = allowBonus ? Math.max(0, rawScore) : Math.max(0, Math.min(rawScore, 100))

  return {
    score: Math.round(score * 100) / 100,
    rawScore: Math.round(rawScore * 100) / 100,
    formula,
    details,
    actualValue: value,
    targetValue: metric.target_value,
    measurementType: metric.measurement_type
  }
}

/**
 * คำนวณคะแนนของหมวดหมู่เดียว
 * Validates: Requirements 6.1, 6.2, 6.3
 * 
 * @param {Object} category - ข้อมูลหมวดหมู่
 * @param {Array} metrics - รายการ metrics ในหมวดหมู่นี้
 * @param {Object} metricValues - ค่าจริงของแต่ละ metric { metric_id: value }
 * @param {boolean} [allowBonus=false] - อนุญาตให้คะแนนเกิน 100 หรือไม่
 * @returns {Object} - { categoryScore, weightedScore, metricScores, weight }
 */
export function calculateCategoryScore(category, metrics, metricValues, allowBonus = false) {
  if (!category) {
    return {
      categoryScore: 0,
      weightedScore: 0,
      metricScores: [],
      weight: 0,
      error: 'ไม่พบข้อมูลหมวดหมู่'
    }
  }

  const weight = category.weight || 0
  const activeMetrics = (metrics || []).filter(m => m.is_active !== false)

  // ถ้าไม่มี metrics ให้คะแนน 0
  if (activeMetrics.length === 0) {
    return {
      categoryScore: 0,
      weightedScore: 0,
      metricScores: [],
      weight,
      categoryId: category.id,
      categoryName: category.display_name || category.name,
      categoryType: category.category_type
    }
  }

  // คำนวณคะแนนของแต่ละ metric
  const metricScores = activeMetrics.map(metric => {
    const actualValue = metricValues?.[metric.id] ?? metricValues?.[metric.name] ?? null
    const result = calculateMetricScore(metric, actualValue, allowBonus)
    
    return {
      metricId: metric.id,
      metricName: metric.display_name || metric.name,
      ...result
    }
  })

  // คำนวณคะแนนเฉลี่ยของหมวดหมู่
  const totalScore = metricScores.reduce((sum, m) => sum + m.score, 0)
  const categoryScore = metricScores.length > 0 ? totalScore / metricScores.length : 0

  // Cap คะแนนหมวดหมู่ที่ 100 ถ้าไม่อนุญาต bonus (Requirement 6.2)
  const cappedCategoryScore = allowBonus ? categoryScore : Math.min(categoryScore, 100)

  // คำนวณคะแนนหลังคูณน้ำหนัก
  const weightedScore = (cappedCategoryScore * weight) / 100

  return {
    categoryScore: Math.round(cappedCategoryScore * 100) / 100,
    weightedScore: Math.round(weightedScore * 100) / 100,
    metricScores,
    weight,
    categoryId: category.id,
    categoryName: category.display_name || category.name,
    categoryType: category.category_type
  }
}

/**
 * คำนวณคะแนนรวมของนักกีฬา
 * Validates: Requirements 6.1, 6.2, 6.3
 * 
 * @param {Object} input - ข้อมูลสำหรับคำนวณ
 * @param {Array} input.categories - รายการหมวดหมู่
 * @param {Object} input.metricsByCategory - metrics แยกตามหมวดหมู่ { category_id: [metrics] }
 * @param {Object} input.metricValues - ค่าจริงของแต่ละ metric { metric_id: value }
 * @param {Object} [input.tierThresholds] - เกณฑ์การจัด tier (optional)
 * @param {boolean} [input.allowBonus=false] - อนุญาตให้คะแนนเกิน 100 หรือไม่
 * @returns {Object} - ผลการคำนวณคะแนนทั้งหมด
 */
export function calculateOverallScore(input) {
  const {
    categories = [],
    metricsByCategory = {},
    metricValues = {},
    tierThresholds = null,
    allowBonus = false
  } = input || {}

  // กรองเฉพาะหมวดหมู่ที่ active
  const activeCategories = categories.filter(c => c.is_active !== false)

  if (activeCategories.length === 0) {
    return {
      overallScore: 0,
      performanceTier: 'needs_improvement',
      tierInfo: DEFAULT_TIER_THRESHOLDS.needs_improvement,
      categoryScores: [],
      totalWeight: 0,
      isValidConfig: false,
      error: 'ไม่มีหมวดหมู่ที่ใช้งาน'
    }
  }

  // ตรวจสอบน้ำหนักรวม
  const totalWeight = activeCategories.reduce((sum, cat) => sum + (cat.weight || 0), 0)
  const isValidConfig = totalWeight === 100

  // คำนวณคะแนนของแต่ละหมวดหมู่
  const categoryScores = activeCategories.map(category => {
    const metrics = metricsByCategory[category.id] || []
    return calculateCategoryScore(category, metrics, metricValues, allowBonus)
  })

  // คำนวณคะแนนรวม (Requirement 6.1)
  // overall_score = sum(category_score × category_weight / 100)
  const overallScore = categoryScores.reduce((sum, cat) => sum + cat.weightedScore, 0)

  // Cap คะแนนรวมที่ 100 ถ้าไม่อนุญาต bonus (Requirement 6.2)
  const cappedOverallScore = allowBonus ? Math.max(0, overallScore) : Math.max(0, Math.min(overallScore, 100))

  // กำหนด performance tier (Requirement 6.4)
  const { tier, tierInfo } = assignPerformanceTier(cappedOverallScore, tierThresholds)

  return {
    overallScore: Math.round(cappedOverallScore * 100) / 100,
    performanceTier: tier,
    tierInfo,
    categoryScores,
    totalWeight,
    isValidConfig,
    calculatedAt: new Date().toISOString()
  }
}

/**
 * กำหนด Performance Tier ตามคะแนน
 * Validates: Requirements 6.4
 * 
 * @param {number} score - คะแนนรวม (0-100)
 * @param {Object} [customThresholds] - เกณฑ์ที่กำหนดเอง (optional)
 * @returns {Object} - { tier, tierInfo }
 */
export function assignPerformanceTier(score, customThresholds = null) {
  // ใช้ค่าเริ่มต้นถ้าไม่มี custom thresholds
  const thresholds = customThresholds || DEFAULT_TIER_THRESHOLDS

  // ดึงค่า min จาก thresholds (รองรับทั้งรูปแบบ object และ number)
  const excellentMin = typeof thresholds.excellent === 'object' 
    ? thresholds.excellent.min 
    : (thresholds.tier_excellent_min ?? thresholds.excellent ?? 85)
  
  const goodMin = typeof thresholds.good === 'object'
    ? thresholds.good.min
    : (thresholds.tier_good_min ?? thresholds.good ?? 70)
  
  const averageMin = typeof thresholds.average === 'object'
    ? thresholds.average.min
    : (thresholds.tier_average_min ?? thresholds.average ?? 50)

  // กำหนด tier ตามคะแนน
  if (score >= excellentMin) {
    return {
      tier: 'excellent',
      tierInfo: {
        min: excellentMin,
        display_name: thresholds.excellent?.display_name || 'ยอดเยี่ยม',
        color: thresholds.excellent?.color || '#22C55E'
      }
    }
  }

  if (score >= goodMin) {
    return {
      tier: 'good',
      tierInfo: {
        min: goodMin,
        display_name: thresholds.good?.display_name || 'ดี',
        color: thresholds.good?.color || '#3B82F6'
      }
    }
  }

  if (score >= averageMin) {
    return {
      tier: 'average',
      tierInfo: {
        min: averageMin,
        display_name: thresholds.average?.display_name || 'ปานกลาง',
        color: thresholds.average?.color || '#F59E0B'
      }
    }
  }

  return {
    tier: 'needs_improvement',
    tierInfo: {
      min: 0,
      display_name: thresholds.needs_improvement?.display_name || 'ต้องปรับปรุง',
      color: thresholds.needs_improvement?.color || '#EF4444'
    }
  }
}

/**
 * คำนวณคะแนนจาก club config
 * Helper function ที่รวมการดึงข้อมูลและคำนวณ
 * 
 * @param {Object} clubConfig - การตั้งค่าของชมรม
 * @param {Array} categories - หมวดหมู่ทั้งหมด
 * @param {Array} metrics - metrics ทั้งหมด
 * @param {Object} metricValues - ค่าจริงของแต่ละ metric
 * @param {boolean} [allowBonus=false] - อนุญาตให้คะแนนเกิน 100 หรือไม่
 * @returns {Object} - ผลการคำนวณคะแนน
 */
export function calculateScoreFromConfig(clubConfig, categories, metrics, metricValues, allowBonus = false) {
  // จัดกลุ่ม metrics ตาม category
  const metricsByCategory = {}
  for (const metric of metrics || []) {
    if (!metricsByCategory[metric.category_id]) {
      metricsByCategory[metric.category_id] = []
    }
    metricsByCategory[metric.category_id].push(metric)
  }

  // สร้าง tier thresholds จาก config
  const tierThresholds = clubConfig ? {
    excellent: { 
      min: clubConfig.tier_excellent_min ?? 85,
      display_name: 'ยอดเยี่ยม',
      color: '#22C55E'
    },
    good: { 
      min: clubConfig.tier_good_min ?? 70,
      display_name: 'ดี',
      color: '#3B82F6'
    },
    average: { 
      min: clubConfig.tier_average_min ?? 50,
      display_name: 'ปานกลาง',
      color: '#F59E0B'
    },
    needs_improvement: { 
      min: 0,
      display_name: 'ต้องปรับปรุง',
      color: '#EF4444'
    }
  } : null

  return calculateOverallScore({
    categories,
    metricsByCategory,
    metricValues,
    tierThresholds,
    allowBonus
  })
}

/**
 * ตรวจสอบว่า metric values ครบถ้วนหรือไม่
 * 
 * @param {Array} metrics - รายการ metrics ที่ต้องการ
 * @param {Object} metricValues - ค่าที่มี
 * @returns {Object} - { isComplete, missingMetrics, providedCount, totalRequired }
 */
export function validateMetricValues(metrics, metricValues) {
  const requiredMetrics = (metrics || []).filter(m => m.is_required !== false && m.is_active !== false)
  const missingMetrics = []

  for (const metric of requiredMetrics) {
    const value = metricValues?.[metric.id] ?? metricValues?.[metric.name]
    if (value === null || value === undefined) {
      missingMetrics.push({
        id: metric.id,
        name: metric.display_name || metric.name
      })
    }
  }

  return {
    isComplete: missingMetrics.length === 0,
    missingMetrics,
    providedCount: requiredMetrics.length - missingMetrics.length,
    totalRequired: requiredMetrics.length
  }
}

/**
 * สร้าง tier thresholds จาก club config
 * Validates: Requirements 6.4 - รองรับ configurable thresholds per club
 * 
 * @param {Object} clubConfig - การตั้งค่าของชมรม
 * @returns {Object} - tier thresholds object
 */
export function createTierThresholdsFromConfig(clubConfig) {
  if (!clubConfig) {
    return DEFAULT_TIER_THRESHOLDS
  }

  return {
    excellent: {
      min: clubConfig.tier_excellent_min ?? 85,
      display_name: 'ยอดเยี่ยม',
      color: '#22C55E'
    },
    good: {
      min: clubConfig.tier_good_min ?? 70,
      display_name: 'ดี',
      color: '#3B82F6'
    },
    average: {
      min: clubConfig.tier_average_min ?? 50,
      display_name: 'ปานกลาง',
      color: '#F59E0B'
    },
    needs_improvement: {
      min: 0,
      display_name: 'ต้องปรับปรุง',
      color: '#EF4444'
    }
  }
}

/**
 * คำนวณคะแนนที่ต้องการเพื่อไปถึง tier ที่ต้องการ
 * 
 * @param {number} currentScore - คะแนนปัจจุบัน
 * @param {string} targetTier - tier ที่ต้องการ
 * @param {Object} [thresholds] - เกณฑ์ที่ใช้
 * @returns {number} - คะแนนที่ต้องเพิ่ม (0 ถ้าถึงแล้ว)
 */
export function pointsNeededForTier(currentScore, targetTier, thresholds = null) {
  const tierThresholds = thresholds || DEFAULT_TIER_THRESHOLDS
  
  const tierConfig = tierThresholds[targetTier]
  if (!tierConfig) return 0
  
  const minScore = typeof tierConfig === 'object' ? tierConfig.min : tierConfig
  const needed = minScore - currentScore
  
  return needed > 0 ? Math.ceil(needed * 100) / 100 : 0
}

/**
 * ดึงรายการ tier ทั้งหมดพร้อมข้อมูล
 * 
 * @param {Object} [thresholds] - เกณฑ์ที่ใช้
 * @returns {Array} - รายการ tier เรียงจากสูงไปต่ำ
 */
export function getAllTiers(thresholds = null) {
  const tierThresholds = thresholds || DEFAULT_TIER_THRESHOLDS
  
  return [
    {
      tier: 'excellent',
      ...tierThresholds.excellent
    },
    {
      tier: 'good',
      ...tierThresholds.good
    },
    {
      tier: 'average',
      ...tierThresholds.average
    },
    {
      tier: 'needs_improvement',
      ...tierThresholds.needs_improvement
    }
  ]
}


// ============ COMPREHENSIVE CONFIG VALIDATION ============
// Implements Requirements: 7.1, 7.2, 7.3, 7.4

/**
 * Error codes สำหรับการตรวจสอบการตั้งค่า
 */
export const VALIDATION_ERROR_CODES = {
  WEIGHT_SUM_INVALID: 'WEIGHT_SUM_INVALID',
  CATEGORY_NO_METRICS: 'CATEGORY_NO_METRICS',
  METRIC_INVALID_THRESHOLD: 'METRIC_INVALID_THRESHOLD',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  TEMPLATE_NOT_FOUND: 'TEMPLATE_NOT_FOUND',
  NEGATIVE_WEIGHT: 'NEGATIVE_WEIGHT',
  WEIGHT_EXCEEDS_100: 'WEIGHT_EXCEEDS_100',
  METRIC_INVALID_RATING_SCALE: 'METRIC_INVALID_RATING_SCALE',
  METRIC_INVALID_TARGET: 'METRIC_INVALID_TARGET',
  METRIC_DEFAULT_OUT_OF_RANGE: 'METRIC_DEFAULT_OUT_OF_RANGE',
  NO_CATEGORIES: 'NO_CATEGORIES'
}

/**
 * ตรวจสอบการตั้งค่าเกณฑ์อย่างครบถ้วน
 * Validates: Requirements 7.1, 7.2, 7.3, 7.4
 * 
 * @param {Object} params - พารามิเตอร์สำหรับการตรวจสอบ
 * @param {Array} params.categories - รายการหมวดหมู่
 * @param {Array} params.metrics - รายการ metrics
 * @param {Object} [params.metricsByCategory] - metrics แยกตามหมวดหมู่ (optional)
 * @returns {Object} - { isValid, errors, warnings }
 */
export function validateComprehensiveConfig({ categories, metrics, metricsByCategory }) {
  const errors = []
  const warnings = []

  // กรองเฉพาะหมวดหมู่ที่ active
  const activeCategories = (categories || []).filter(c => c.is_active !== false)

  // ตรวจสอบว่ามีหมวดหมู่หรือไม่
  if (activeCategories.length === 0) {
    errors.push({
      code: VALIDATION_ERROR_CODES.NO_CATEGORIES,
      message: 'ต้องมีอย่างน้อย 1 หมวดหมู่ที่ใช้งาน'
    })
    return { isValid: false, errors, warnings }
  }

  // Requirement 7.1: ตรวจสอบน้ำหนักรวม = 100%
  const weightValidation = validateWeights(activeCategories)
  if (!weightValidation.isValid) {
    errors.push({
      code: VALIDATION_ERROR_CODES.WEIGHT_SUM_INVALID,
      message: weightValidation.error
    })
  }

  // สร้าง metricsByCategory ถ้าไม่ได้ส่งมา
  const metricsMap = metricsByCategory || {}
  if (!metricsByCategory && metrics) {
    for (const metric of metrics) {
      if (!metricsMap[metric.category_id]) {
        metricsMap[metric.category_id] = []
      }
      metricsMap[metric.category_id].push(metric)
    }
  }

  // ตรวจสอบแต่ละหมวดหมู่
  for (const category of activeCategories) {
    // Requirement 7.2: ตรวจสอบว่าหมวดหมู่มี metric
    const categoryMetrics = (metricsMap[category.id] || []).filter(
      m => m.is_active !== false
    )

    if (categoryMetrics.length === 0) {
      errors.push({
        code: VALIDATION_ERROR_CODES.CATEGORY_NO_METRICS,
        message: `หมวดหมู่ "${category.display_name || category.name}" ต้องมีอย่างน้อย 1 ตัวชี้วัด`,
        categoryId: category.id,
        categoryName: category.display_name || category.name
      })
    }

    // Requirement 7.3: ตรวจสอบ threshold ของ metric
    for (const metric of categoryMetrics) {
      const metricValidation = validateMetricThresholds(metric)
      
      if (!metricValidation.isValid) {
        for (const err of metricValidation.errors) {
          errors.push({
            ...err,
            categoryId: category.id,
            categoryName: category.display_name || category.name
          })
        }
      }

      if (metricValidation.warnings) {
        for (const warn of metricValidation.warnings) {
          warnings.push({
            ...warn,
            categoryId: category.id,
            categoryName: category.display_name || category.name
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
 * ตรวจสอบ threshold ของ metric
 * Validates: Requirements 7.3 - min < max
 * 
 * @param {Object} metric - metric ที่จะตรวจสอบ
 * @returns {Object} - { isValid, errors, warnings }
 */
export function validateMetricThresholds(metric) {
  const errors = []
  const warnings = []

  if (!metric) {
    return { isValid: false, errors: [{ code: 'METRIC_NOT_FOUND', message: 'ไม่พบข้อมูล metric' }], warnings }
  }

  const metricName = metric.display_name || metric.name

  // ตรวจสอบ min < max
  if (metric.min_value !== null && metric.min_value !== undefined &&
      metric.max_value !== null && metric.max_value !== undefined) {
    if (metric.min_value >= metric.max_value) {
      errors.push({
        code: VALIDATION_ERROR_CODES.METRIC_INVALID_THRESHOLD,
        message: `ค่าต่ำสุดของ "${metricName}" ต้องน้อยกว่าค่าสูงสุด`,
        metricId: metric.id,
        metricName
      })
    }
  }

  // ตรวจสอบ target_value สำหรับ count, time, distance
  if (metric.measurement_type === 'count' || 
      metric.measurement_type === 'time' || 
      metric.measurement_type === 'distance') {
    if (metric.target_value !== null && metric.target_value !== undefined && metric.target_value <= 0) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.METRIC_INVALID_TARGET,
        message: `ค่าเป้าหมายของ "${metricName}" ควรมากกว่า 0`,
        metricId: metric.id,
        metricName
      })
    }
  }

  // ตรวจสอบ rating scale
  if (metric.measurement_type === 'rating') {
    const scaleMin = metric.rating_scale_min ?? 1
    const scaleMax = metric.rating_scale_max ?? 5
    if (scaleMin >= scaleMax) {
      errors.push({
        code: VALIDATION_ERROR_CODES.METRIC_INVALID_RATING_SCALE,
        message: `Rating scale ของ "${metricName}" ไม่ถูกต้อง (min >= max)`,
        metricId: metric.id,
        metricName
      })
    }
  }

  // ตรวจสอบ default_value อยู่ในช่วง
  if (metric.default_value !== null && metric.default_value !== undefined &&
      metric.min_value !== null && metric.min_value !== undefined &&
      metric.max_value !== null && metric.max_value !== undefined) {
    if (metric.default_value < metric.min_value || metric.default_value > metric.max_value) {
      warnings.push({
        code: VALIDATION_ERROR_CODES.METRIC_DEFAULT_OUT_OF_RANGE,
        message: `ค่าเริ่มต้นของ "${metricName}" อยู่นอกช่วงที่กำหนด`,
        metricId: metric.id,
        metricName
      })
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * ตรวจสอบว่าหมวดหมู่มี metric ที่ active หรือไม่
 * Validates: Requirements 7.2
 * 
 * @param {Object} category - หมวดหมู่ที่จะตรวจสอบ
 * @param {Array} metrics - รายการ metrics ทั้งหมด
 * @returns {Object} - { hasMetrics, activeMetricsCount }
 */
export function validateCategoryHasMetrics(category, metrics) {
  if (!category) {
    return { hasMetrics: false, activeMetricsCount: 0 }
  }

  const categoryMetrics = (metrics || []).filter(
    m => m.category_id === category.id && m.is_active !== false
  )

  return {
    hasMetrics: categoryMetrics.length > 0,
    activeMetricsCount: categoryMetrics.length
  }
}

/**
 * สร้าง error message ที่อ่านง่ายจาก validation result
 * Validates: Requirements 7.4 - แสดง error message ที่ชัดเจน
 * 
 * @param {Object} validationResult - ผลการตรวจสอบจาก validateComprehensiveConfig
 * @returns {string} - ข้อความ error ที่รวมกัน
 */
export function formatValidationErrors(validationResult) {
  if (!validationResult || validationResult.isValid) {
    return ''
  }

  const messages = validationResult.errors.map(err => `• ${err.message}`)
  return messages.join('\n')
}

/**
 * สร้าง warning message ที่อ่านง่าย
 * 
 * @param {Object} validationResult - ผลการตรวจสอบจาก validateComprehensiveConfig
 * @returns {string} - ข้อความ warning ที่รวมกัน
 */
export function formatValidationWarnings(validationResult) {
  if (!validationResult || !validationResult.warnings || validationResult.warnings.length === 0) {
    return ''
  }

  const messages = validationResult.warnings.map(warn => `• ${warn.message}`)
  return messages.join('\n')
}
