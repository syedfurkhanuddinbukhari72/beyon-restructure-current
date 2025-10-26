/**
 * Simple storage monitoring for offline restaurant app
 * Removed unnecessary complexity for our use case
 */
class StorageMonitor {
  constructor() {
    this.isOnline = false; // Always offline for our APK
  }

  /**
   * Check if storage is near limit (simplified)
   * For restaurant data, we shouldn't hit storage limits
   */
  isStorageNearLimit(percentage = 90) {
    // For our restaurant app, storage should never be an issue
    // Return false to avoid unnecessary warnings
    return false;
  }

  /**
   * Get storage usage percentage (simplified)
   */
  getStorageUsagePercent() {
    // Return a safe, low percentage for restaurant data
    return 5; // 5% - restaurant data is small
  }

  /**
   * Check if online (always false for offline APK)
   */
  isOnlineStatus() {
    return false; // Always offline in APK
  }

  /**
   * Add listener (simplified for compatibility)
   */
  addListener(callback) {
    // No-op for simplified version
  }

  /**
   * Remove listener (simplified for compatibility)
   */
  removeListener(callback) {
    // No-op for simplified version
  }
}

const storageMonitorInstance = new StorageMonitor();

// Export singleton instance
export default storageMonitorInstance;
