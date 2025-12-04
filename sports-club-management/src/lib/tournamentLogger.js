/**
 * Tournament Activity Logger
 * บันทึกกิจกรรมทั้งหมดในระบบทัวนาเมนต์
 */

import { supabase } from './supabase'

// Log levels
export const LOG_LEVELS = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success'
}

// Action types
export const ACTIONS = {
  // Tournament
  TOURNAMENT_CREATE: 'tournament_create',
  TOURNAMENT_UPDATE: 'tournament_update',
  TOURNAMENT_DELETE: 'tournament_delete',
  
  // Participants
  PARTICIPANT_ADD: 'participant_add',
  PARTICIPANT_BULK_ADD: 'participant_bulk_add',
  PARTICIPANT_REMOVE: 'participant_remove',
  PARTICIPANT_BULK_REMOVE: 'participant_bulk_remove',
  PARTICIPANT_STATUS_CHANGE: 'participant_status_change',
  PARTICIPANT_BULK_CATEGORY_UPDATE: 'participant_bulk_category_update',
  
  // Matches
  MATCH_CREATE: 'match_create',
  MATCH_UPDATE: 'match_update',
  MATCH_DELETE: 'match_delete',
  MATCH_RESULT_RECORD: 'match_result_record',
  
  // Awards
  AWARD_CREATE: 'award_create',
  AWARD_DELETE: 'award_delete'
}

/**
 * Log tournament activity
 * @param {Object} params - Log parameters
 * @param {string} params.action - Action type from ACTIONS
 * @param {string} params.userId - User who performed the action
 * @param {string} params.userRole - Role of the user (admin/coach/athlete)
 * @param {string} params.tournamentId - Tournament ID
 * @param {Object} params.details - Additional details
 * @param {string} params.level - Log level from LOG_LEVELS
 */
export async function logTournamentActivity({
  action,
  userId,
  userRole,
  tournamentId,
  details = {},
  level = LOG_LEVELS.INFO
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    action,
    user_id: userId,
    user_role: userRole,
    tournament_id: tournamentId,
    details: JSON.stringify(details),
    level
  }
  
  // Log to console in development
  if (import.meta.env.DEV) {
    console.log(`[Tournament ${level.toUpperCase()}]`, action, logEntry)
  }
  
  // Store in localStorage for now (can be extended to Supabase table)
  try {
    const logs = JSON.parse(localStorage.getItem('tournament_logs') || '[]')
    logs.unshift(logEntry)
    // Keep only last 100 logs
    if (logs.length > 100) logs.pop()
    localStorage.setItem('tournament_logs', JSON.stringify(logs))
  } catch (e) {
    console.error('Failed to save log:', e)
  }
  
  return logEntry
}

/**
 * Get tournament activity logs
 * @param {Object} filters - Filter options
 * @param {string} filters.tournamentId - Filter by tournament
 * @param {string} filters.userId - Filter by user
 * @param {string} filters.action - Filter by action type
 * @param {number} filters.limit - Max number of logs to return
 */
export function getTournamentLogs(filters = {}) {
  try {
    let logs = JSON.parse(localStorage.getItem('tournament_logs') || '[]')
    
    if (filters.tournamentId) {
      logs = logs.filter(l => l.tournament_id === filters.tournamentId)
    }
    if (filters.userId) {
      logs = logs.filter(l => l.user_id === filters.userId)
    }
    if (filters.action) {
      logs = logs.filter(l => l.action === filters.action)
    }
    if (filters.limit) {
      logs = logs.slice(0, filters.limit)
    }
    
    return logs
  } catch (e) {
    console.error('Failed to get logs:', e)
    return []
  }
}

/**
 * Clear all tournament logs
 */
export function clearTournamentLogs() {
  localStorage.removeItem('tournament_logs')
}

/**
 * Validate role permissions for tournament actions
 * @param {string} role - User role
 * @param {string} action - Action to perform
 * @param {Object} context - Additional context (e.g., clubId, createdBy)
 */
export function validatePermission(role, action, context = {}) {
  const permissions = {
    admin: {
      canCreate: true,
      canEdit: true,
      canDelete: true,
      canAddParticipant: true,
      canRecordMatch: true,
      canAddAward: true,
      scope: 'all' // Can manage all
    },
    coach: {
      canCreate: true,
      canEdit: 'own', // Only own tournaments
      canDelete: 'own',
      canAddParticipant: 'club', // Only own club athletes
      canRecordMatch: 'club',
      canAddAward: 'club',
      scope: 'club'
    },
    athlete: {
      canCreate: false,
      canEdit: false,
      canDelete: false,
      canAddParticipant: false,
      canRecordMatch: false,
      canAddAward: false,
      scope: 'self' // Can only view own data
    }
  }
  
  const rolePerms = permissions[role]
  if (!rolePerms) return { allowed: false, reason: 'Invalid role' }
  
  switch (action) {
    case 'create':
      return { allowed: rolePerms.canCreate, reason: rolePerms.canCreate ? null : 'ไม่มีสิทธิ์สร้างทัวนาเมนต์' }
    
    case 'edit':
      if (rolePerms.canEdit === true) return { allowed: true }
      if (rolePerms.canEdit === 'own' && context.createdBy === context.userId) return { allowed: true }
      return { allowed: false, reason: 'ไม่มีสิทธิ์แก้ไขทัวนาเมนต์นี้' }
    
    case 'delete':
      if (rolePerms.canDelete === true) return { allowed: true }
      if (rolePerms.canDelete === 'own' && context.createdBy === context.userId) return { allowed: true }
      return { allowed: false, reason: 'ไม่มีสิทธิ์ลบทัวนาเมนต์นี้' }
    
    case 'addParticipant':
      if (rolePerms.canAddParticipant === true) return { allowed: true }
      if (rolePerms.canAddParticipant === 'club' && context.athleteClubId === context.coachClubId) return { allowed: true }
      return { allowed: false, reason: 'ไม่มีสิทธิ์เพิ่มนักกีฬานี้' }
    
    case 'recordMatch':
    case 'addAward':
      if (rolePerms.canRecordMatch === true) return { allowed: true }
      if (rolePerms.canRecordMatch === 'club' && context.participantClubId === context.coachClubId) return { allowed: true }
      return { allowed: false, reason: 'ไม่มีสิทธิ์จัดการข้อมูลนักกีฬานี้' }
    
    default:
      return { allowed: false, reason: 'Unknown action' }
  }
}

export default {
  logTournamentActivity,
  getTournamentLogs,
  clearTournamentLogs,
  validatePermission,
  LOG_LEVELS,
  ACTIONS
}
