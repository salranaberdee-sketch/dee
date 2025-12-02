/**
 * Coach Access Control Property-Based Tests
 * ทดสอบ Property-Based Testing สำหรับระบบ Coach Access Control
 * 
 * **Feature: training-logs-enhancement, Property 6: Coach read-only access**
 * **Validates: Requirements 5.2, 5.3**
 * 
 * For any coach accessing an athlete's training data, the coach should be able
 * to read training logs, goals, and achievements, but database operations for
 * INSERT, UPDATE, DELETE on athlete's data should be rejected.
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'

// ============================================================================
// Test Helpers and Arbitraries
// ============================================================================

/**
 * User roles in the system
 */
const ROLES = {
  ADMIN: 'admin',
  COACH: 'coach',
  ATHLETE: 'athlete'
}

/**
 * Database operations
 */
const OPERATIONS = {
  SELECT: 'SELECT',
  INSERT: 'INSERT',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
}

/**
 * Training data types that coaches can access
 */
const TRAINING_DATA_TYPES = ['training_logs', 'training_goals', 'user_achievements']

/**
 * Arbitrary for generating a user profile
 */
const userProfileArbitrary = fc.record({
  id: fc.uuid(),
  role: fc.constantFrom(ROLES.ADMIN, ROLES.COACH, ROLES.ATHLETE),
  club_id: fc.option(fc.uuid(), { nil: null })
})

/**
 * Arbitrary for generating a coach profile (always has coach role)
 */
const coachProfileArbitrary = fc.record({
  id: fc.uuid(),
  role: fc.constant(ROLES.COACH),
  club_id: fc.uuid() // Coach must have a club
})

/**
 * Arbitrary for generating an athlete profile (always has athlete role)
 */
const athleteProfileArbitrary = fc.record({
  id: fc.uuid(),
  role: fc.constant(ROLES.ATHLETE),
  club_id: fc.uuid() // Athlete must have a club
})

/**
 * Arbitrary for generating training log data
 */
const trainingLogArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  date: fc.date({ min: new Date('2024-01-01'), max: new Date('2024-12-31') })
    .map(d => d.toISOString().split('T')[0]),
  duration: fc.integer({ min: 15, max: 180 }),
  rating: fc.integer({ min: 1, max: 5 }),
  category_id: fc.option(fc.uuid(), { nil: null })
})

/**
 * Arbitrary for generating training goal data
 */
const trainingGoalArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  goal_type: fc.constant('weekly_sessions'),
  target_value: fc.integer({ min: 1, max: 7 }),
  is_active: fc.boolean()
})

/**
 * Arbitrary for generating achievement data
 */
const achievementArbitrary = fc.record({
  id: fc.uuid(),
  user_id: fc.uuid(),
  achievement_type: fc.constantFrom(
    'streak_7_days',
    'streak_14_days',
    'streak_30_days',
    'streak_60_days',
    'streak_90_days'
  ),
  earned_at: fc.integer({ min: 1704067200000, max: 1735689600000 }) // 2024-01-01 to 2024-12-31 in ms
    .map(ts => new Date(ts).toISOString())
})

// ============================================================================
// Access Control Logic (simulating RLS policies)
// ============================================================================

/**
 * Check if a user can perform an operation on training data
 * This simulates the RLS policies defined in the database
 * 
 * @param {Object} actor - The user performing the operation
 * @param {Object} dataOwner - The owner of the data
 * @param {string} operation - The operation (SELECT, INSERT, UPDATE, DELETE)
 * @param {string} dataType - The type of data (training_logs, training_goals, user_achievements)
 * @returns {boolean} - Whether the operation is allowed
 */
function canPerformOperation(actor, dataOwner, operation, dataType) {
  // Admin can do everything
  if (actor.role === ROLES.ADMIN) {
    return true
  }

  // User can always manage their own data
  if (actor.id === dataOwner.id) {
    return true
  }

  // Coach access rules
  if (actor.role === ROLES.COACH) {
    // Coach must have a club
    if (!actor.club_id) {
      return false
    }

    // Coach can only access athletes in the same club
    if (actor.club_id !== dataOwner.club_id) {
      return false
    }

    // Coach can only SELECT (read) athlete data, not modify
    if (operation === OPERATIONS.SELECT) {
      return true
    }

    // Coach cannot INSERT, UPDATE, or DELETE athlete data
    return false
  }

  // Athletes cannot access other users' data
  if (actor.role === ROLES.ATHLETE) {
    return false
  }

  return false
}

/**
 * Check if coach has read-only access to athlete data
 * @param {Object} coach - Coach profile
 * @param {Object} athlete - Athlete profile
 * @returns {Object} - { canRead, canWrite }
 */
function checkCoachAccess(coach, athlete) {
  const canRead = canPerformOperation(coach, athlete, OPERATIONS.SELECT, 'training_logs')
  const canInsert = canPerformOperation(coach, athlete, OPERATIONS.INSERT, 'training_logs')
  const canUpdate = canPerformOperation(coach, athlete, OPERATIONS.UPDATE, 'training_logs')
  const canDelete = canPerformOperation(coach, athlete, OPERATIONS.DELETE, 'training_logs')

  return {
    canRead,
    canWrite: canInsert || canUpdate || canDelete
  }
}

/**
 * Validate that coach access is read-only for athletes in same club
 * @param {Object} coach - Coach profile
 * @param {Object} athlete - Athlete profile
 * @returns {boolean}
 */
function validateCoachReadOnlyAccess(coach, athlete) {
  const access = checkCoachAccess(coach, athlete)
  
  // If in same club, coach should have read access but not write access
  if (coach.club_id === athlete.club_id && coach.club_id !== null) {
    return access.canRead === true && access.canWrite === false
  }
  
  // If in different clubs, coach should have no access
  return access.canRead === false && access.canWrite === false
}

// ============================================================================
// Property Tests
// ============================================================================

describe('Coach Access Control Property Tests', () => {

  /**
   * **Feature: training-logs-enhancement, Property 6: Coach read-only access**
   * **Validates: Requirements 5.2, 5.3**
   */
  describe('Property 6: Coach read-only access', () => {

    it('coach should have read-only access to athletes in same club', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // shared club_id
          fc.uuid(), // coach id
          fc.uuid(), // athlete id
          (clubId, coachId, athleteId) => {
            const coach = { id: coachId, role: ROLES.COACH, club_id: clubId }
            const athlete = { id: athleteId, role: ROLES.ATHLETE, club_id: clubId }
            
            // Coach should be able to read
            expect(canPerformOperation(coach, athlete, OPERATIONS.SELECT, 'training_logs')).toBe(true)
            expect(canPerformOperation(coach, athlete, OPERATIONS.SELECT, 'training_goals')).toBe(true)
            expect(canPerformOperation(coach, athlete, OPERATIONS.SELECT, 'user_achievements')).toBe(true)
            
            // Coach should NOT be able to write
            expect(canPerformOperation(coach, athlete, OPERATIONS.INSERT, 'training_logs')).toBe(false)
            expect(canPerformOperation(coach, athlete, OPERATIONS.UPDATE, 'training_logs')).toBe(false)
            expect(canPerformOperation(coach, athlete, OPERATIONS.DELETE, 'training_logs')).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('coach should NOT have access to athletes in different clubs', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // coach club_id
          fc.uuid(), // athlete club_id (different)
          fc.uuid(), // coach id
          fc.uuid(), // athlete id
          (coachClubId, athleteClubId, coachId, athleteId) => {
            // Ensure clubs are different
            fc.pre(coachClubId !== athleteClubId)
            
            const coach = { id: coachId, role: ROLES.COACH, club_id: coachClubId }
            const athlete = { id: athleteId, role: ROLES.ATHLETE, club_id: athleteClubId }
            
            // Coach should NOT have any access to athletes in different clubs
            for (const dataType of TRAINING_DATA_TYPES) {
              expect(canPerformOperation(coach, athlete, OPERATIONS.SELECT, dataType)).toBe(false)
              expect(canPerformOperation(coach, athlete, OPERATIONS.INSERT, dataType)).toBe(false)
              expect(canPerformOperation(coach, athlete, OPERATIONS.UPDATE, dataType)).toBe(false)
              expect(canPerformOperation(coach, athlete, OPERATIONS.DELETE, dataType)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('coach without club should NOT have access to any athlete data', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // coach id
          fc.uuid(), // athlete id
          fc.uuid(), // athlete club_id
          (coachId, athleteId, athleteClubId) => {
            const coach = { id: coachId, role: ROLES.COACH, club_id: null }
            const athlete = { id: athleteId, role: ROLES.ATHLETE, club_id: athleteClubId }
            
            // Coach without club should NOT have any access
            for (const dataType of TRAINING_DATA_TYPES) {
              expect(canPerformOperation(coach, athlete, OPERATIONS.SELECT, dataType)).toBe(false)
              expect(canPerformOperation(coach, athlete, OPERATIONS.INSERT, dataType)).toBe(false)
              expect(canPerformOperation(coach, athlete, OPERATIONS.UPDATE, dataType)).toBe(false)
              expect(canPerformOperation(coach, athlete, OPERATIONS.DELETE, dataType)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('users should always have full access to their own data', () => {
      fc.assert(
        fc.property(
          userProfileArbitrary,
          (user) => {
            // User should have full access to their own data regardless of role
            for (const dataType of TRAINING_DATA_TYPES) {
              expect(canPerformOperation(user, user, OPERATIONS.SELECT, dataType)).toBe(true)
              expect(canPerformOperation(user, user, OPERATIONS.INSERT, dataType)).toBe(true)
              expect(canPerformOperation(user, user, OPERATIONS.UPDATE, dataType)).toBe(true)
              expect(canPerformOperation(user, user, OPERATIONS.DELETE, dataType)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('admin should have full access to all data', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // admin id
          athleteProfileArbitrary,
          (adminId, athlete) => {
            const admin = { id: adminId, role: ROLES.ADMIN, club_id: null }
            
            // Admin should have full access to all data
            for (const dataType of TRAINING_DATA_TYPES) {
              expect(canPerformOperation(admin, athlete, OPERATIONS.SELECT, dataType)).toBe(true)
              expect(canPerformOperation(admin, athlete, OPERATIONS.INSERT, dataType)).toBe(true)
              expect(canPerformOperation(admin, athlete, OPERATIONS.UPDATE, dataType)).toBe(true)
              expect(canPerformOperation(admin, athlete, OPERATIONS.DELETE, dataType)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('athlete should NOT have access to other athletes data', () => {
      fc.assert(
        fc.property(
          athleteProfileArbitrary,
          athleteProfileArbitrary,
          (athlete1, athlete2) => {
            // Ensure different athletes
            fc.pre(athlete1.id !== athlete2.id)
            
            // Athlete should NOT have access to other athlete's data
            for (const dataType of TRAINING_DATA_TYPES) {
              expect(canPerformOperation(athlete1, athlete2, OPERATIONS.SELECT, dataType)).toBe(false)
              expect(canPerformOperation(athlete1, athlete2, OPERATIONS.INSERT, dataType)).toBe(false)
              expect(canPerformOperation(athlete1, athlete2, OPERATIONS.UPDATE, dataType)).toBe(false)
              expect(canPerformOperation(athlete1, athlete2, OPERATIONS.DELETE, dataType)).toBe(false)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('coach read-only access should be consistent across all training data types', () => {
      fc.assert(
        fc.property(
          coachProfileArbitrary,
          athleteProfileArbitrary,
          (coach, athlete) => {
            // Set same club for coach and athlete
            const sameClubCoach = { ...coach, club_id: athlete.club_id }
            
            // Access should be consistent across all data types
            const selectResults = TRAINING_DATA_TYPES.map(dataType => 
              canPerformOperation(sameClubCoach, athlete, OPERATIONS.SELECT, dataType)
            )
            const insertResults = TRAINING_DATA_TYPES.map(dataType => 
              canPerformOperation(sameClubCoach, athlete, OPERATIONS.INSERT, dataType)
            )
            const updateResults = TRAINING_DATA_TYPES.map(dataType => 
              canPerformOperation(sameClubCoach, athlete, OPERATIONS.UPDATE, dataType)
            )
            const deleteResults = TRAINING_DATA_TYPES.map(dataType => 
              canPerformOperation(sameClubCoach, athlete, OPERATIONS.DELETE, dataType)
            )
            
            // All SELECT should be true
            expect(selectResults.every(r => r === true)).toBe(true)
            
            // All INSERT, UPDATE, DELETE should be false
            expect(insertResults.every(r => r === false)).toBe(true)
            expect(updateResults.every(r => r === false)).toBe(true)
            expect(deleteResults.every(r => r === false)).toBe(true)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('validateCoachReadOnlyAccess should correctly identify read-only access', () => {
      fc.assert(
        fc.property(
          coachProfileArbitrary,
          athleteProfileArbitrary,
          (coach, athlete) => {
            // Test with same club
            const sameClubCoach = { ...coach, club_id: athlete.club_id }
            expect(validateCoachReadOnlyAccess(sameClubCoach, athlete)).toBe(true)
            
            // Test with different club
            const differentClubCoach = { ...coach, club_id: coach.club_id }
            if (coach.club_id !== athlete.club_id) {
              expect(validateCoachReadOnlyAccess(differentClubCoach, athlete)).toBe(true)
            }
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('coach access should be denied for all write operations on athlete goals', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // shared club_id
          fc.uuid(), // coach id
          trainingGoalArbitrary,
          (clubId, coachId, goal) => {
            const coach = { id: coachId, role: ROLES.COACH, club_id: clubId }
            const athlete = { id: goal.user_id, role: ROLES.ATHLETE, club_id: clubId }
            
            // Coach can read goals
            expect(canPerformOperation(coach, athlete, OPERATIONS.SELECT, 'training_goals')).toBe(true)
            
            // Coach cannot modify goals
            expect(canPerformOperation(coach, athlete, OPERATIONS.INSERT, 'training_goals')).toBe(false)
            expect(canPerformOperation(coach, athlete, OPERATIONS.UPDATE, 'training_goals')).toBe(false)
            expect(canPerformOperation(coach, athlete, OPERATIONS.DELETE, 'training_goals')).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('coach access should be denied for all write operations on athlete achievements', () => {
      fc.assert(
        fc.property(
          fc.uuid(), // shared club_id
          fc.uuid(), // coach id
          achievementArbitrary,
          (clubId, coachId, achievement) => {
            const coach = { id: coachId, role: ROLES.COACH, club_id: clubId }
            const athlete = { id: achievement.user_id, role: ROLES.ATHLETE, club_id: clubId }
            
            // Coach can read achievements
            expect(canPerformOperation(coach, athlete, OPERATIONS.SELECT, 'user_achievements')).toBe(true)
            
            // Coach cannot modify achievements
            expect(canPerformOperation(coach, athlete, OPERATIONS.INSERT, 'user_achievements')).toBe(false)
            expect(canPerformOperation(coach, athlete, OPERATIONS.UPDATE, 'user_achievements')).toBe(false)
            expect(canPerformOperation(coach, athlete, OPERATIONS.DELETE, 'user_achievements')).toBe(false)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })

    it('access control should be deterministic', () => {
      fc.assert(
        fc.property(
          coachProfileArbitrary,
          athleteProfileArbitrary,
          fc.constantFrom(...Object.values(OPERATIONS)),
          fc.constantFrom(...TRAINING_DATA_TYPES),
          (coach, athlete, operation, dataType) => {
            // Set same club
            const sameClubCoach = { ...coach, club_id: athlete.club_id }
            
            // Run the same check multiple times
            const result1 = canPerformOperation(sameClubCoach, athlete, operation, dataType)
            const result2 = canPerformOperation(sameClubCoach, athlete, operation, dataType)
            const result3 = canPerformOperation(sameClubCoach, athlete, operation, dataType)
            
            // Results should be consistent
            expect(result1).toBe(result2)
            expect(result2).toBe(result3)
            
            return true
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})
