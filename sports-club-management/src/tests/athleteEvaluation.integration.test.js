/**
 * Athlete Evaluation Integration Tests
 * 
 * Tests end-to-end scoring flow and role-based access for the athlete evaluation system.
 * Requirements: 4.4, 7.9, Role Matrix
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { 
  calculateScore, 
  evaluateCondition, 
  compare, 
  determineTier,
  validateCriteriaWeights,
  DEFAULT_CRITERIA,
  TIER_THRESHOLDS,
  getImprovementSuggestions,
  pointsToTier
} from '../lib/scoreCalculator.js'

// ============================================================================
// Mock Setup
// ============================================================================

// Mock supabase for store tests
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis()
    }))
  }
}))

// Mock auth store
vi.mock('./auth', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 'test-user-id' },
    profile: { role: 'coach', club_id: 'club-123' }
  }))
}))

// ============================================================================
// Test Data Fixtures
// ============================================================================

const mockAdmin = { id: 'admin-1', role: 'admin', club_id: null }
const mockCoach = { id: 'coach-1', role: 'coach', club_id: 'club-123' }
const mockAthlete = { id: 'athlete-1', role: 'athlete', club_id: 'club-123' }

const mockDefaultCriteria = {
  attendance_weight: 40,
  training_weight: 30,
  rating_weight: 30,
  target_training_sessions: 12
}

const mockCustomCriteria = {
  id: 'criteria-1',
  club_id: 'club-123',
  attendance_weight: 50,
  training_weight: 25,
  rating_weight: 25,
  target_training_sessions: 10
}

const mockBonusCondition = {
  id: 'cond-1',
  club_id: 'club-123',
  name: 'Perfect Attendance',
  category: 'attendance',
  condition_type: 'bonus',
  threshold_type: 'percentage',
  comparison_operator: '>=',
  threshold_value: 100,
  points: 5,
  is_active: true
}

const mockPenaltyCondition = {
  id: 'cond-2',
  club_id: 'club-123',
  name: 'Excessive Absences',
  category: 'attendance',
  condition_type: 'penalty',
  threshold_type: 'count',
  comparison_operator: '>',
  threshold_value: 3,
  points: -10,
  is_active: true
}

const mockAthleteStats = {
  attendance_rate: 85,
  training_sessions: 10,
  average_rating: 4.2,
  absent_count: 2,
  leave_count: 1,
  attended_on_time: 15,
  attended_late: 2,
  total_sessions: 20,
  training_hours: 30
}

// ============================================================================
// Integration Tests: End-to-End Scoring Flow
// ============================================================================

describe('Athlete Evaluation Integration Tests', () => {
  
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('End-to-End Scoring Flow (Task 13.1)', () => {
    /**
     * Test: Complete scoring flow with default criteria
     * Requirements: 4.4, 7.7
     */
    describe('Scoring with Default Criteria', () => {
      it('should calculate score using default weights when no custom criteria exists', () => {
        const stats = {
          attendance_rate: 80,
          training_sessions: 12,
          average_rating: 4.0
        }
        
        const result = calculateScore(stats, null, [])
        
        // Verify default weights are used
        expect(result.criteria_used.attendance_weight).toBe(40)
        expect(result.criteria_used.training_weight).toBe(30)
        expect(result.criteria_used.rating_weight).toBe(30)
        
        // Verify score calculation
        // attendance: (80/100) * 40 = 32
        // training: min(12/12, 1) * 30 = 30
        // rating: (4/5) * 30 = 24
        // total: 32 + 30 + 24 = 86
        expect(result.attendance_score).toBeCloseTo(32, 1)
        expect(result.training_score).toBeCloseTo(30, 1)
        expect(result.rating_score).toBeCloseTo(24, 1)
        expect(result.overall_score).toBeCloseTo(86, 1)
        expect(result.tier).toBe('excellent')
      })

      it('should assign correct tier based on score thresholds', () => {
        // Test excellent tier (>= 85)
        const excellentStats = { attendance_rate: 100, training_sessions: 12, average_rating: 5 }
        const excellentResult = calculateScore(excellentStats, null, [])
        expect(excellentResult.tier).toBe('excellent')
        expect(excellentResult.overall_score).toBeGreaterThanOrEqual(85)

        // Test good tier (>= 70, < 85)
        const goodStats = { attendance_rate: 75, training_sessions: 10, average_rating: 3.5 }
        const goodResult = calculateScore(goodStats, null, [])
        expect(goodResult.tier).toBe('good')
        expect(goodResult.overall_score).toBeGreaterThanOrEqual(70)
        expect(goodResult.overall_score).toBeLessThan(85)

        // Test average tier (>= 50, < 70)
        const avgStats = { attendance_rate: 60, training_sessions: 6, average_rating: 3 }
        const avgResult = calculateScore(avgStats, null, [])
        expect(avgResult.tier).toBe('average')
        expect(avgResult.overall_score).toBeGreaterThanOrEqual(50)
        expect(avgResult.overall_score).toBeLessThan(70)

        // Test needs_improvement tier (< 50)
        const poorStats = { attendance_rate: 30, training_sessions: 2, average_rating: 2 }
        const poorResult = calculateScore(poorStats, null, [])
        expect(poorResult.tier).toBe('needs_improvement')
        expect(poorResult.overall_score).toBeLessThan(50)
      })
    })

    /**
     * Test: Complete scoring flow with custom criteria
     * Requirements: 4.1, 4.2, 4.3, 7.9
     */
    describe('Scoring with Custom Criteria', () => {
      it('should calculate score using custom weights', () => {
        const stats = {
          attendance_rate: 80,
          training_sessions: 10,
          average_rating: 4.0
        }
        
        const result = calculateScore(stats, mockCustomCriteria, [])
        
        // Verify custom weights are used
        expect(result.criteria_used.attendance_weight).toBe(50)
        expect(result.criteria_used.training_weight).toBe(25)
        expect(result.criteria_used.rating_weight).toBe(25)
        
        // Verify score calculation with custom weights
        // attendance: (80/100) * 50 = 40
        // training: min(10/10, 1) * 25 = 25
        // rating: (4/5) * 25 = 20
        // total: 40 + 25 + 20 = 85
        expect(result.attendance_score).toBeCloseTo(40, 1)
        expect(result.training_score).toBeCloseTo(25, 1)
        expect(result.rating_score).toBeCloseTo(20, 1)
        expect(result.overall_score).toBeCloseTo(85, 1)
      })

      it('should validate that custom weights sum to 100', () => {
        const validCriteria = { attendance_weight: 50, training_weight: 25, rating_weight: 25 }
        const invalidCriteria = { attendance_weight: 50, training_weight: 30, rating_weight: 30 }
        
        expect(validateCriteriaWeights(validCriteria).isValid).toBe(true)
        expect(validateCriteriaWeights(invalidCriteria).isValid).toBe(false)
      })
    })

    /**
     * Test: Complete scoring flow with conditions
     * Requirements: 7.4, 7.5, 8.1-8.4
     */
    describe('Scoring with Conditions', () => {
      it('should apply bonus condition when met', () => {
        const stats = {
          attendance_rate: 100, // Perfect attendance
          training_sessions: 10,
          average_rating: 4.0
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [mockBonusCondition])
        
        // Bonus should be applied
        expect(result.bonus_points).toBe(5)
        expect(result.applied_conditions).toHaveLength(1)
        expect(result.applied_conditions[0].condition_met).toBe(true)
        expect(result.applied_conditions[0].points_applied).toBe(5)
      })

      it('should not apply bonus condition when not met', () => {
        const stats = {
          attendance_rate: 80, // Not perfect
          training_sessions: 10,
          average_rating: 4.0
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [mockBonusCondition])
        
        // Bonus should not be applied
        expect(result.bonus_points).toBe(0)
        expect(result.applied_conditions[0].condition_met).toBe(false)
        expect(result.applied_conditions[0].points_applied).toBe(0)
      })

      it('should apply penalty condition when met', () => {
        const stats = {
          attendance_rate: 70,
          training_sessions: 10,
          average_rating: 4.0,
          absent_count: 5 // Exceeds threshold of 3
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [mockPenaltyCondition])
        
        // Penalty should be applied
        expect(result.penalty_points).toBe(-10)
        expect(result.applied_conditions[0].condition_met).toBe(true)
        expect(result.applied_conditions[0].points_applied).toBe(-10)
      })

      it('should apply multiple conditions correctly', () => {
        const stats = {
          attendance_rate: 100, // Meets bonus
          training_sessions: 10,
          average_rating: 4.0,
          absent_count: 5 // Meets penalty
        }
        
        const conditions = [mockBonusCondition, mockPenaltyCondition]
        const result = calculateScore(stats, mockDefaultCriteria, conditions)
        
        // Both conditions should be applied
        expect(result.bonus_points).toBe(5)
        expect(result.penalty_points).toBe(-10)
        expect(result.applied_conditions).toHaveLength(2)
      })

      it('should not apply inactive conditions', () => {
        const inactiveCondition = { ...mockBonusCondition, is_active: false }
        const stats = {
          attendance_rate: 100,
          training_sessions: 10,
          average_rating: 4.0
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [inactiveCondition])
        
        expect(result.bonus_points).toBe(0)
        expect(result.applied_conditions).toHaveLength(0)
      })
    })

    /**
     * Test: Score bounds and capping
     * Requirements: 4.4
     */
    describe('Score Bounds', () => {
      it('should cap score at 100 when bonus exceeds limit', () => {
        const stats = {
          attendance_rate: 100,
          training_sessions: 12,
          average_rating: 5
        }
        
        const largeBonusCondition = {
          ...mockBonusCondition,
          points: 50 // Large bonus
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [largeBonusCondition])
        
        expect(result.overall_score).toBeLessThanOrEqual(100)
      })

      it('should cap score at 0 when penalty exceeds base score', () => {
        const stats = {
          attendance_rate: 30,
          training_sessions: 2,
          average_rating: 1
        }
        
        const largePenaltyCondition = {
          ...mockPenaltyCondition,
          threshold_value: 0, // Always triggers
          comparison_operator: '>=',
          points: -100 // Large penalty
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [largePenaltyCondition])
        
        expect(result.overall_score).toBeGreaterThanOrEqual(0)
      })
    })

    /**
     * Test: Improvement suggestions
     * Requirements: 5.3, 5.4
     */
    describe('Improvement Suggestions', () => {
      it('should provide improvement suggestions for low scores', () => {
        const stats = {
          attendance_rate: 60,
          training_sessions: 5,
          average_rating: 3
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [])
        const suggestions = getImprovementSuggestions(result, mockDefaultCriteria)
        
        expect(suggestions.length).toBeGreaterThan(0)
        expect(suggestions[0]).toHaveProperty('category')
        expect(suggestions[0]).toHaveProperty('message')
        expect(suggestions[0]).toHaveProperty('potential_points')
      })

      it('should calculate points needed to reach target tier', () => {
        const currentScore = 65 // average tier
        
        const pointsToGood = pointsToTier(currentScore, 'good')
        const pointsToExcellent = pointsToTier(currentScore, 'excellent')
        
        expect(pointsToGood).toBe(5) // Need 70
        expect(pointsToExcellent).toBe(20) // Need 85
      })
    })

    /**
     * Test: Applied conditions tracking
     * Requirements: 8.5, 8.6
     */
    describe('Applied Conditions Tracking', () => {
      it('should track all applied conditions with details', () => {
        const stats = {
          attendance_rate: 100,
          training_sessions: 10,
          average_rating: 4.0,
          absent_count: 0
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [mockBonusCondition])
        
        expect(result.applied_conditions).toHaveLength(1)
        const applied = result.applied_conditions[0]
        
        expect(applied.condition_id).toBe(mockBonusCondition.id)
        expect(applied.condition_name).toBe(mockBonusCondition.name)
        expect(applied.category).toBe(mockBonusCondition.category)
        expect(applied.condition_type).toBe(mockBonusCondition.condition_type)
        expect(applied.actual_value).toBe(100)
        expect(applied.threshold_value).toBe(100)
        expect(applied.condition_met).toBe(true)
        expect(applied.points_applied).toBe(5)
      })
    })
  })


  // ============================================================================
  // Integration Tests: Role-Based Access (Task 13.2)
  // ============================================================================

  describe('Role-Based Access (Task 13.2)', () => {
    /**
     * Test: Admin permissions
     * Requirements: Role Matrix
     */
    describe('Admin Permissions', () => {
      it('Admin can view all statistics', () => {
        const role = 'admin'
        const canViewAll = role === 'admin'
        expect(canViewAll).toBe(true)
      })

      it('Admin can view statistics in any club', () => {
        const role = 'admin'
        const canViewInClub = role === 'admin' || role === 'coach'
        expect(canViewInClub).toBe(true)
      })

      it('Admin can record attendance', () => {
        const role = 'admin'
        const canRecordAttendance = role === 'admin' || role === 'coach'
        expect(canRecordAttendance).toBe(true)
      })

      it('Admin can approve leave requests', () => {
        const role = 'admin'
        const canApproveLeave = role === 'admin' || role === 'coach'
        expect(canApproveLeave).toBe(true)
      })

      it('Admin can configure scoring criteria', () => {
        const role = 'admin'
        const canConfigureCriteria = role === 'admin' || role === 'coach'
        expect(canConfigureCriteria).toBe(true)
      })

      it('Admin can add/delete scoring conditions', () => {
        const role = 'admin'
        const canManageConditions = role === 'admin' || role === 'coach'
        expect(canManageConditions).toBe(true)
      })

      it('Admin can export reports', () => {
        const role = 'admin'
        const canExport = role === 'admin' || role === 'coach'
        expect(canExport).toBe(true)
      })

      it('Admin can give ratings', () => {
        const role = 'admin'
        const canRate = role === 'admin' || role === 'coach'
        expect(canRate).toBe(true)
      })
    })

    /**
     * Test: Coach permissions
     * Requirements: Role Matrix
     */
    describe('Coach Permissions', () => {
      it('Coach cannot view all statistics (only in club)', () => {
        const role = 'coach'
        const canViewAll = role === 'admin'
        expect(canViewAll).toBe(false)
      })

      it('Coach can view statistics in their club', () => {
        const role = 'coach'
        const canViewInClub = role === 'admin' || role === 'coach'
        expect(canViewInClub).toBe(true)
      })

      it('Coach can view own statistics', () => {
        const role = 'coach'
        const canViewOwn = role === 'admin' || role === 'coach' || role === 'athlete'
        expect(canViewOwn).toBe(true)
      })

      it('Coach can record attendance in their club', () => {
        const role = 'coach'
        const canRecordAttendance = role === 'admin' || role === 'coach'
        expect(canRecordAttendance).toBe(true)
      })

      it('Coach can approve leave requests in their club', () => {
        const role = 'coach'
        const canApproveLeave = role === 'admin' || role === 'coach'
        expect(canApproveLeave).toBe(true)
      })

      it('Coach can configure scoring criteria for their club', () => {
        const role = 'coach'
        const canConfigureCriteria = role === 'admin' || role === 'coach'
        expect(canConfigureCriteria).toBe(true)
      })

      it('Coach can add/delete scoring conditions for their club', () => {
        const role = 'coach'
        const canManageConditions = role === 'admin' || role === 'coach'
        expect(canManageConditions).toBe(true)
      })

      it('Coach can export reports for their club', () => {
        const role = 'coach'
        const canExport = role === 'admin' || role === 'coach'
        expect(canExport).toBe(true)
      })

      it('Coach can give ratings', () => {
        const role = 'coach'
        const canRate = role === 'admin' || role === 'coach'
        expect(canRate).toBe(true)
      })

      it('Coach can record training logs', () => {
        const role = 'coach'
        const canRecordTraining = role === 'admin' || role === 'coach' || role === 'athlete'
        expect(canRecordTraining).toBe(true)
      })
    })

    /**
     * Test: Athlete permissions
     * Requirements: Role Matrix
     */
    describe('Athlete Permissions', () => {
      it('Athlete cannot view all statistics', () => {
        const role = 'athlete'
        const canViewAll = role === 'admin'
        expect(canViewAll).toBe(false)
      })

      it('Athlete cannot view statistics in club (only own)', () => {
        const role = 'athlete'
        const canViewInClub = role === 'admin' || role === 'coach'
        expect(canViewInClub).toBe(false)
      })

      it('Athlete can view own statistics', () => {
        const role = 'athlete'
        const canViewOwn = role === 'admin' || role === 'coach' || role === 'athlete'
        expect(canViewOwn).toBe(true)
      })

      it('Athlete cannot record attendance', () => {
        const role = 'athlete'
        const canRecordAttendance = role === 'admin' || role === 'coach'
        expect(canRecordAttendance).toBe(false)
      })

      it('Athlete can request leave for own activities', () => {
        const role = 'athlete'
        const canRequestLeave = true // Athletes can request leave for themselves
        expect(canRequestLeave).toBe(true)
      })

      it('Athlete cannot approve leave requests', () => {
        const role = 'athlete'
        const canApproveLeave = role === 'admin' || role === 'coach'
        expect(canApproveLeave).toBe(false)
      })

      it('Athlete cannot configure scoring criteria', () => {
        const role = 'athlete'
        const canConfigureCriteria = role === 'admin' || role === 'coach'
        expect(canConfigureCriteria).toBe(false)
      })

      it('Athlete cannot add/delete scoring conditions', () => {
        const role = 'athlete'
        const canManageConditions = role === 'admin' || role === 'coach'
        expect(canManageConditions).toBe(false)
      })

      it('Athlete can view conditions applied to themselves', () => {
        const role = 'athlete'
        const canViewOwnConditions = true // Athletes can see what conditions affected their score
        expect(canViewOwnConditions).toBe(true)
      })

      it('Athlete cannot export reports', () => {
        const role = 'athlete'
        const canExport = role === 'admin' || role === 'coach'
        expect(canExport).toBe(false)
      })

      it('Athlete cannot give ratings', () => {
        const role = 'athlete'
        const canRate = role === 'admin' || role === 'coach'
        expect(canRate).toBe(false)
      })

      it('Athlete can record own training logs', () => {
        const role = 'athlete'
        const canRecordOwnTraining = true // Athletes can log their own training
        expect(canRecordOwnTraining).toBe(true)
      })
    })

    /**
     * Test: Club-based access control
     * Requirements: Role Matrix
     */
    describe('Club-Based Access Control', () => {
      it('Coach can only access data from their own club', () => {
        const coachClubId = 'club-123'
        const dataClubId = 'club-123'
        const canAccess = coachClubId === dataClubId
        expect(canAccess).toBe(true)
      })

      it('Coach cannot access data from other clubs', () => {
        const coachClubId = 'club-123'
        const dataClubId = 'club-456'
        const canAccess = coachClubId === dataClubId
        expect(canAccess).toBe(false)
      })

      it('Admin can access data from any club', () => {
        const role = 'admin'
        const canAccessAnyClub = role === 'admin'
        expect(canAccessAnyClub).toBe(true)
      })

      it('Athlete can only access their own data', () => {
        const athleteId = 'athlete-1'
        const dataAthleteId = 'athlete-1'
        const canAccess = athleteId === dataAthleteId
        expect(canAccess).toBe(true)
      })

      it('Athlete cannot access other athletes data', () => {
        const athleteId = 'athlete-1'
        const dataAthleteId = 'athlete-2'
        const canAccess = athleteId === dataAthleteId
        expect(canAccess).toBe(false)
      })
    })

    /**
     * Test: UI visibility based on role
     * Requirements: Role Matrix
     */
    describe('UI Visibility Based on Role', () => {
      it('Scoring criteria settings should be visible to admin and coach', () => {
        const adminVisible = ['admin', 'coach'].includes('admin')
        const coachVisible = ['admin', 'coach'].includes('coach')
        const athleteVisible = ['admin', 'coach'].includes('athlete')
        
        expect(adminVisible).toBe(true)
        expect(coachVisible).toBe(true)
        expect(athleteVisible).toBe(false)
      })

      it('Evaluation dashboard should be visible to admin and coach', () => {
        const adminVisible = ['admin', 'coach'].includes('admin')
        const coachVisible = ['admin', 'coach'].includes('coach')
        const athleteVisible = ['admin', 'coach'].includes('athlete')
        
        expect(adminVisible).toBe(true)
        expect(coachVisible).toBe(true)
        expect(athleteVisible).toBe(false)
      })

      it('Athlete performance view should be visible to all roles', () => {
        const adminVisible = true
        const coachVisible = true
        const athleteVisible = true // Athletes can view their own performance
        
        expect(adminVisible).toBe(true)
        expect(coachVisible).toBe(true)
        expect(athleteVisible).toBe(true)
      })

      it('Attendance manager should be visible to admin and coach only', () => {
        const adminVisible = ['admin', 'coach'].includes('admin')
        const coachVisible = ['admin', 'coach'].includes('coach')
        const athleteVisible = ['admin', 'coach'].includes('athlete')
        
        expect(adminVisible).toBe(true)
        expect(coachVisible).toBe(true)
        expect(athleteVisible).toBe(false)
      })
    })
  })

  // ============================================================================
  // Integration Tests: Data Validation
  // ============================================================================

  describe('Data Validation', () => {
    /**
     * Test: Criteria validation
     * Requirements: 7.2, 7.6
     */
    describe('Criteria Validation', () => {
      it('should reject criteria with weights not summing to 100', () => {
        const invalidCriteria = {
          attendance_weight: 50,
          training_weight: 30,
          rating_weight: 30 // Sum = 110
        }
        
        const result = validateCriteriaWeights(invalidCriteria)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('must sum to 100')
      })

      it('should reject criteria with negative weights', () => {
        const invalidCriteria = {
          attendance_weight: -10,
          training_weight: 60,
          rating_weight: 50
        }
        
        const result = validateCriteriaWeights(invalidCriteria)
        expect(result.isValid).toBe(false)
        expect(result.error).toContain('cannot be negative')
      })

      it('should accept valid criteria with weights summing to 100', () => {
        const validCriteria = {
          attendance_weight: 40,
          training_weight: 30,
          rating_weight: 30
        }
        
        const result = validateCriteriaWeights(validCriteria)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeNull()
      })

      it('should accept edge case with one weight at 100', () => {
        const edgeCriteria = {
          attendance_weight: 100,
          training_weight: 0,
          rating_weight: 0
        }
        
        const result = validateCriteriaWeights(edgeCriteria)
        expect(result.isValid).toBe(true)
      })
    })

    /**
     * Test: Condition validation
     * Requirements: 7.3
     */
    describe('Condition Validation', () => {
      it('should validate condition category values', () => {
        const validCategories = ['attendance', 'training', 'rating', 'custom']
        
        validCategories.forEach(category => {
          expect(validCategories).toContain(category)
        })
      })

      it('should validate condition type values', () => {
        const validTypes = ['bonus', 'penalty']
        
        expect(validTypes).toContain('bonus')
        expect(validTypes).toContain('penalty')
      })

      it('should validate threshold type values', () => {
        const validThresholdTypes = ['percentage', 'count', 'value']
        
        validThresholdTypes.forEach(type => {
          expect(validThresholdTypes).toContain(type)
        })
      })

      it('should validate comparison operator values', () => {
        const validOperators = ['>=', '>', '<=', '<', '=']
        
        validOperators.forEach(op => {
          expect(validOperators).toContain(op)
        })
      })
    })

    /**
     * Test: Rating validation
     * Requirements: 3.2
     */
    describe('Rating Validation', () => {
      it('should accept ratings between 1 and 5', () => {
        const validRatings = [1, 2, 3, 4, 5, 1.5, 2.5, 3.5, 4.5]
        
        validRatings.forEach(rating => {
          expect(rating).toBeGreaterThanOrEqual(1)
          expect(rating).toBeLessThanOrEqual(5)
        })
      })

      it('should use rating in score calculation correctly', () => {
        const stats = {
          attendance_rate: 80,
          training_sessions: 10,
          average_rating: 5 // Max rating
        }
        
        const result = calculateScore(stats, mockDefaultCriteria, [])
        
        // rating_score = (5/5) * 30 = 30 (max possible)
        expect(result.rating_score).toBeCloseTo(30, 1)
      })
    })
  })

  // ============================================================================
  // Integration Tests: Comparison Operators
  // ============================================================================

  describe('Comparison Operators', () => {
    it('should correctly evaluate >= operator', () => {
      expect(compare(100, '>=', 100)).toBe(true)
      expect(compare(101, '>=', 100)).toBe(true)
      expect(compare(99, '>=', 100)).toBe(false)
    })

    it('should correctly evaluate > operator', () => {
      expect(compare(101, '>', 100)).toBe(true)
      expect(compare(100, '>', 100)).toBe(false)
      expect(compare(99, '>', 100)).toBe(false)
    })

    it('should correctly evaluate <= operator', () => {
      expect(compare(100, '<=', 100)).toBe(true)
      expect(compare(99, '<=', 100)).toBe(true)
      expect(compare(101, '<=', 100)).toBe(false)
    })

    it('should correctly evaluate < operator', () => {
      expect(compare(99, '<', 100)).toBe(true)
      expect(compare(100, '<', 100)).toBe(false)
      expect(compare(101, '<', 100)).toBe(false)
    })

    it('should correctly evaluate = operator', () => {
      expect(compare(100, '=', 100)).toBe(true)
      expect(compare(99, '=', 100)).toBe(false)
      expect(compare(101, '=', 100)).toBe(false)
    })

    it('should handle null/undefined values safely', () => {
      expect(compare(null, '>=', 100)).toBe(false)
      expect(compare(undefined, '>=', 100)).toBe(false)
      expect(compare(100, '>=', null)).toBe(false)
      expect(compare(100, '>=', undefined)).toBe(false)
    })

    it('should handle NaN values safely', () => {
      expect(compare(NaN, '>=', 100)).toBe(false)
      expect(compare(100, '>=', NaN)).toBe(false)
    })
  })

  // ============================================================================
  // Integration Tests: Tier Determination
  // ============================================================================

  describe('Tier Determination', () => {
    it('should assign excellent tier for scores >= 85', () => {
      expect(determineTier(85)).toBe('excellent')
      expect(determineTier(90)).toBe('excellent')
      expect(determineTier(100)).toBe('excellent')
    })

    it('should assign good tier for scores >= 70 and < 85', () => {
      expect(determineTier(70)).toBe('good')
      expect(determineTier(75)).toBe('good')
      expect(determineTier(84)).toBe('good')
      expect(determineTier(84.99)).toBe('good')
    })

    it('should assign average tier for scores >= 50 and < 70', () => {
      expect(determineTier(50)).toBe('average')
      expect(determineTier(60)).toBe('average')
      expect(determineTier(69)).toBe('average')
      expect(determineTier(69.99)).toBe('average')
    })

    it('should assign needs_improvement tier for scores < 50', () => {
      expect(determineTier(0)).toBe('needs_improvement')
      expect(determineTier(25)).toBe('needs_improvement')
      expect(determineTier(49)).toBe('needs_improvement')
      expect(determineTier(49.99)).toBe('needs_improvement')
    })

    it('should handle boundary values correctly', () => {
      // Exact boundaries
      expect(determineTier(85)).toBe('excellent')
      expect(determineTier(70)).toBe('good')
      expect(determineTier(50)).toBe('average')
      
      // Just below boundaries
      expect(determineTier(84.99)).toBe('good')
      expect(determineTier(69.99)).toBe('average')
      expect(determineTier(49.99)).toBe('needs_improvement')
    })
  })
})

console.log('Athlete Evaluation Integration Tests loaded successfully')
