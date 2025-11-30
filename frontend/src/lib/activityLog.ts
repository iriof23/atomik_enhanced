/**
 * Activity Log System
 * Stores and retrieves activity events for the Mission Pulse dashboard
 */

export interface ActivityEvent {
  id: string
  type: 'client' | 'project' | 'finding' | 'report' | 'system'
  action: 'created' | 'updated' | 'deleted' | 'completed' | 'started' | 'generated'
  title: string
  description: string
  entityId?: string
  entityName?: string
  timestamp: string
  metadata?: Record<string, any>
}

const STORAGE_KEY = 'atomik_activity_log'
const MAX_EVENTS = 100 // Keep last 100 events

/**
 * Get all activity events from storage
 */
export function getActivityLog(): ActivityEvent[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load activity log:', e)
  }
  return []
}

/**
 * Add a new activity event
 */
export function logActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>): ActivityEvent {
  const newEvent: ActivityEvent = {
    ...event,
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  }

  try {
    const events = getActivityLog()
    // Add new event at the beginning
    events.unshift(newEvent)
    // Keep only the last MAX_EVENTS
    const trimmedEvents = events.slice(0, MAX_EVENTS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedEvents))
  } catch (e) {
    console.error('Failed to save activity:', e)
  }

  return newEvent
}

/**
 * Clear all activity events
 */
export function clearActivityLog(): void {
  localStorage.removeItem(STORAGE_KEY)
}

// Convenience functions for common activities

export function logClientCreated(name: string, id?: string) {
  return logActivity({
    type: 'client',
    action: 'created',
    title: 'Client Added',
    description: `${name} added to portfolio`,
    entityId: id,
    entityName: name,
  })
}

export function logClientUpdated(name: string, id?: string) {
  return logActivity({
    type: 'client',
    action: 'updated',
    title: 'Client Updated',
    description: `${name} details updated`,
    entityId: id,
    entityName: name,
  })
}

export function logClientDeleted(name: string, id?: string) {
  return logActivity({
    type: 'client',
    action: 'deleted',
    title: 'Client Removed',
    description: `${name} removed from portfolio`,
    entityId: id,
    entityName: name,
  })
}

export function logProjectCreated(name: string, clientName: string, id?: string) {
  return logActivity({
    type: 'project',
    action: 'created',
    title: 'Project Created',
    description: `${name} • ${clientName}`,
    entityId: id,
    entityName: name,
  })
}

export function logProjectUpdated(name: string, id?: string) {
  return logActivity({
    type: 'project',
    action: 'updated',
    title: 'Project Updated',
    description: `${name} details updated`,
    entityId: id,
    entityName: name,
  })
}

export function logProjectDeleted(name: string, id?: string) {
  return logActivity({
    type: 'project',
    action: 'deleted',
    title: 'Project Deleted',
    description: `${name} removed`,
    entityId: id,
    entityName: name,
  })
}

export function logProjectCompleted(name: string, id?: string) {
  return logActivity({
    type: 'project',
    action: 'completed',
    title: 'Project Completed',
    description: `${name} marked as completed`,
    entityId: id,
    entityName: name,
  })
}

export function logFindingAdded(title: string, severity: string, projectName: string, id?: string) {
  const actionTitle = severity === 'Critical' ? 'Critical Finding Detected' :
                      severity === 'High' ? 'High Severity Finding' :
                      'Finding Added'
  return logActivity({
    type: 'finding',
    action: 'created',
    title: actionTitle,
    description: `${title} • ${projectName}`,
    entityId: id,
    entityName: title,
    metadata: { severity },
  })
}

export function logFindingUpdated(title: string, projectName: string, id?: string) {
  return logActivity({
    type: 'finding',
    action: 'updated',
    title: 'Finding Updated',
    description: `${title} • ${projectName}`,
    entityId: id,
    entityName: title,
  })
}

export function logFindingDeleted(title: string, projectName: string, id?: string) {
  return logActivity({
    type: 'finding',
    action: 'deleted',
    title: 'Finding Removed',
    description: `${title} removed from ${projectName}`,
    entityId: id,
    entityName: title,
  })
}

export function logReportCreated(title: string, projectName: string, id?: string) {
  return logActivity({
    type: 'report',
    action: 'created',
    title: 'Report Created',
    description: `${title} • ${projectName}`,
    entityId: id,
    entityName: title,
  })
}

export function logReportGenerated(title: string, id?: string) {
  return logActivity({
    type: 'report',
    action: 'generated',
    title: 'Report Generated',
    description: `${title} PDF generated`,
    entityId: id,
    entityName: title,
  })
}

export function logReportDeleted(title: string, id?: string) {
  return logActivity({
    type: 'report',
    action: 'deleted',
    title: 'Report Deleted',
    description: `${title} removed`,
    entityId: id,
    entityName: title,
  })
}

