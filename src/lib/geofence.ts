/**
 * Geofence utilities for location-based attendance validation
 * Uses Haversine formula to calculate distance between coordinates
 */

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}

/**
 * Check if a point is within a geofence radius
 */
export function isWithinGeofence(
  userLat: number, userLng: number,
  centerLat: number, centerLng: number,
  radiusMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLng, centerLat, centerLng)
  return distance <= radiusMeters
}

/**
 * Validate student location against assigned class locations
 * Returns the matching location or null if outside all geofences
 */
export async function validateStudentLocation(
  studentLat: number,
  studentLng: number,
  classId: string
): Promise<{ valid: boolean; locationName?: string; distance?: number; error?: string }> {
  const { db } = await import('@/lib/db')

  // Get locations assigned to this student's class
  const locationClasses = await db.locationClass.findMany({
    where: { classId },
    include: { location: true },
  })

  if (locationClasses.length === 0) {
    // No location restriction for this class
    return { valid: true }
  }

  // Find the nearest matching location
  let nearestDistance = Infinity
  let nearestLocation = locationClasses[0].location

  for (const lc of locationClasses) {
    const loc = lc.location
    const distance = calculateDistance(
      studentLat, studentLng,
      loc.latitude, loc.longitude
    )

    if (distance <= loc.radius) {
      return {
        valid: true,
        locationName: loc.name,
        distance: Math.round(distance),
      }
    }

    // Track nearest for error message
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestLocation = loc
    }
  }

  // Student is outside all geofences
  return {
    valid: false,
    distance: Math.round(nearestDistance),
    error: `Anda berada di luar area absensi. Jarak terdekat: ${Math.round(nearestDistance)}m dari ${nearestLocation.name}`,
  }
}
