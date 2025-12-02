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
