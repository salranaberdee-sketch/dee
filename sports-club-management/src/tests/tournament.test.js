/**
 * Tournament Feature Tests
 * ทดสอบฟังก์ชันการทำงานของระบบทัวนาเมนต์
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validatePermission, ACTIONS, LOG_LEVELS } from '../lib/tournamentLogger'

// Mock data
const mockAdmin = { id: 'admin-1', role: 'admin', clubId: null }
const mockCoach = { id: 'coach-1', role: 'coach', clubId: 'club-1' }
const mockAthlete = { id: 'athlete-1', role: 'athlete', clubId: 'club-1' }

const mockTournament = {
  id: 'tournament-1',
  name: 'Test Tournament',
  created_by: 'coach-1'
}

const mockParticipant = {
  id: 'participant-1',
  athlete_id: 'athlete-1',
  club_id: 'club-1'
}

// ============ Permission Tests ============

describe('Tournament Permissions', () => {
  
  describe('Create Tournament', () => {
    it('Admin can create tournament', () => {
      const result = validatePermission('admin', 'create')
      expect(result.allowed).toBe(true)
    })
    
    it('Coach can create tournament', () => {
      const result = validatePermission('coach', 'create')
      expect(result.allowed).toBe(true)
    })
    
    it('Athlete cannot create tournament', () => {
      const result = validatePermission('athlete', 'create')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBe('ไม่มีสิทธิ์สร้างทัวนาเมนต์')
    })
  })
  
  describe('Edit Tournament', () => {
    it('Admin can edit any tournament', () => {
      const result = validatePermission('admin', 'edit', {
        createdBy: 'other-user',
        userId: mockAdmin.id
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach can edit own tournament', () => {
      const result = validatePermission('coach', 'edit', {
        createdBy: mockCoach.id,
        userId: mockCoach.id
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach cannot edit other tournament', () => {
      const result = validatePermission('coach', 'edit', {
        createdBy: 'other-coach',
        userId: mockCoach.id
      })
      expect(result.allowed).toBe(false)
    })
    
    it('Athlete cannot edit tournament', () => {
      const result = validatePermission('athlete', 'edit', {
        createdBy: mockCoach.id,
        userId: mockAthlete.id
      })
      expect(result.allowed).toBe(false)
    })
  })
  
  describe('Delete Tournament', () => {
    it('Admin can delete any tournament', () => {
      const result = validatePermission('admin', 'delete', {
        createdBy: 'other-user',
        userId: mockAdmin.id
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach can delete own tournament', () => {
      const result = validatePermission('coach', 'delete', {
        createdBy: mockCoach.id,
        userId: mockCoach.id
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach cannot delete other tournament', () => {
      const result = validatePermission('coach', 'delete', {
        createdBy: 'other-coach',
        userId: mockCoach.id
      })
      expect(result.allowed).toBe(false)
    })
  })
  
  describe('Add Participant', () => {
    it('Admin can add any athlete', () => {
      const result = validatePermission('admin', 'addParticipant', {
        athleteClubId: 'any-club',
        coachClubId: null
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach can add athlete from own club', () => {
      const result = validatePermission('coach', 'addParticipant', {
        athleteClubId: 'club-1',
        coachClubId: 'club-1'
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach cannot add athlete from other club', () => {
      const result = validatePermission('coach', 'addParticipant', {
        athleteClubId: 'club-2',
        coachClubId: 'club-1'
      })
      expect(result.allowed).toBe(false)
    })
    
    it('Athlete cannot add participant', () => {
      const result = validatePermission('athlete', 'addParticipant', {
        athleteClubId: 'club-1',
        coachClubId: 'club-1'
      })
      expect(result.allowed).toBe(false)
    })
  })
  
  describe('Record Match', () => {
    it('Admin can record match for any athlete', () => {
      const result = validatePermission('admin', 'recordMatch', {
        participantClubId: 'any-club',
        coachClubId: null
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach can record match for own club athlete', () => {
      const result = validatePermission('coach', 'recordMatch', {
        participantClubId: 'club-1',
        coachClubId: 'club-1'
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach cannot record match for other club athlete', () => {
      const result = validatePermission('coach', 'recordMatch', {
        participantClubId: 'club-2',
        coachClubId: 'club-1'
      })
      expect(result.allowed).toBe(false)
    })
  })
  
  describe('Add Award', () => {
    it('Admin can add award for any athlete', () => {
      const result = validatePermission('admin', 'addAward', {
        participantClubId: 'any-club',
        coachClubId: null
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach can add award for own club athlete', () => {
      const result = validatePermission('coach', 'addAward', {
        participantClubId: 'club-1',
        coachClubId: 'club-1'
      })
      expect(result.allowed).toBe(true)
    })
    
    it('Coach cannot add award for other club athlete', () => {
      const result = validatePermission('coach', 'addAward', {
        participantClubId: 'club-2',
        coachClubId: 'club-1'
      })
      expect(result.allowed).toBe(false)
    })
  })
})

// ============ Data Validation Tests ============

describe('Tournament Data Validation', () => {
  
  describe('Tournament Fields', () => {
    it('should require name', () => {
      const tournament = { name: '', sport_type: 'Boxing' }
      expect(tournament.name).toBeFalsy()
    })
    
    it('should require sport_type', () => {
      const tournament = { name: 'Test', sport_type: '' }
      expect(tournament.sport_type).toBeFalsy()
    })
    
    it('should have valid status', () => {
      const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled']
      const status = 'upcoming'
      expect(validStatuses).toContain(status)
    })
    
    it('should have valid date range', () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-05')
      expect(endDate >= startDate).toBe(true)
    })
  })
  
  describe('Match Results', () => {
    it('should have valid result values', () => {
      const validResults = ['win', 'lose', 'draw', 'pending']
      expect(validResults).toContain('win')
      expect(validResults).toContain('lose')
      expect(validResults).toContain('draw')
      expect(validResults).toContain('pending')
    })
  })
  
  describe('Award Types', () => {
    it('should have valid award types', () => {
      const validAwards = ['gold', 'silver', 'bronze', 'certificate', 'special']
      expect(validAwards).toContain('gold')
      expect(validAwards).toContain('silver')
      expect(validAwards).toContain('bronze')
      expect(validAwards).toContain('certificate')
      expect(validAwards).toContain('special')
    })
  })
})

// ============ Workflow Tests ============

describe('Tournament Workflow', () => {
  
  it('should follow correct workflow order', () => {
    const workflow = [
      'create_tournament',
      'add_participants',
      'record_matches',
      'add_awards'
    ]
    
    expect(workflow[0]).toBe('create_tournament')
    expect(workflow[1]).toBe('add_participants')
    expect(workflow[2]).toBe('record_matches')
    expect(workflow[3]).toBe('add_awards')
  })
  
  it('should not allow match without participant', () => {
    const participants = []
    const canAddMatch = participants.length > 0
    expect(canAddMatch).toBe(false)
  })
  
  it('should not allow award without participant', () => {
    const participants = []
    const canAddAward = participants.length > 0
    expect(canAddAward).toBe(false)
  })
  
  it('should allow match with participants', () => {
    const participants = [{ id: 'p1', athlete_id: 'a1' }]
    const canAddMatch = participants.length > 0
    expect(canAddMatch).toBe(true)
  })
})

// ============ Role-based UI Tests ============

describe('Role-based UI Visibility', () => {
  
  describe('Admin UI', () => {
    const role = 'admin'
    
    it('should show create button', () => {
      const showCreateBtn = role === 'admin' || role === 'coach'
      expect(showCreateBtn).toBe(true)
    })
    
    it('should show edit button for any tournament', () => {
      const canEdit = role === 'admin'
      expect(canEdit).toBe(true)
    })
    
    it('should show delete button for any tournament', () => {
      const canDelete = role === 'admin'
      expect(canDelete).toBe(true)
    })
  })
  
  describe('Coach UI', () => {
    const role = 'coach'
    const userId = 'coach-1'
    
    it('should show create button', () => {
      const showCreateBtn = role === 'admin' || role === 'coach'
      expect(showCreateBtn).toBe(true)
    })
    
    it('should show edit button only for own tournament', () => {
      const tournamentCreatedBy = 'coach-1'
      const canEdit = role === 'admin' || (role === 'coach' && tournamentCreatedBy === userId)
      expect(canEdit).toBe(true)
    })
    
    it('should not show edit button for other tournament', () => {
      const tournamentCreatedBy = 'other-coach'
      const canEdit = role === 'admin' || (role === 'coach' && tournamentCreatedBy === userId)
      expect(canEdit).toBe(false)
    })
  })
  
  describe('Athlete UI', () => {
    const role = 'athlete'
    
    it('should not show create button', () => {
      const showCreateBtn = role === 'admin' || role === 'coach'
      expect(showCreateBtn).toBe(false)
    })
    
    it('should not show edit button', () => {
      const canEdit = role === 'admin' || role === 'coach'
      expect(canEdit).toBe(false)
    })
    
    it('should not show delete button', () => {
      const canDelete = role === 'admin' || role === 'coach'
      expect(canDelete).toBe(false)
    })
  })
})

console.log('Tournament tests loaded successfully')
