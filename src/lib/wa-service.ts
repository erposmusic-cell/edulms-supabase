/**
 * WhatsApp Service - waha.devlike.pro (WAHA) Integration
 * 
 * WAHA (WhatsApp HTTP API) - https://waha.devlike.pro
 * 
 * This service handles all WhatsApp messaging through the WAHA API.
 * WAHA API Endpoints:
 * - POST /api/sendText       - Send text message
 * - POST /api/sendImage      - Send image with caption
 * - POST /api/sendFile       - Send file/document
 * - POST /api/sendButtons    - Send interactive buttons
 * - GET  /api/sessions       - List sessions
 * - GET  /api/sessions/{session}/status - Get session status
 * - POST /api/sessions       - Create session
 * - POST /api/sessions/{session}/start  - Start session
 * - POST /api/sessions/{session}/stop   - Stop session
 * - GET  /api/sessions/{session}/qr     - Get QR code for pairing
 */

interface WASendParams {
  phone: string       // Recipient phone number (format: 62xxx or 0xxx)
  message: string     // Message text
  mediaUrl?: string   // Optional media URL (image, document)
  mediaType?: string  // 'image' | 'document' | 'audio' | 'video'
  fileName?: string   // File name for documents
  caption?: string    // Caption for media
}

interface WABlastParams {
  phones: string[]    // Array of phone numbers
  message: string     // Message text
  delayMs?: number    // Delay between messages in ms (default: 1500)
}

interface WAResponse {
  success: boolean
  message?: string
  data?: Record<string, unknown>
  error?: string
}

interface WASessionStatus {
  connected: boolean
  status?: string     // 'CONNECTED' | 'DISCONNECTED' | 'STARTING' etc.
  phoneNumber?: string
  pushName?: string
  batteryLevel?: number
  sessionName?: string
}

export class WAService {
  private apiUrl: string
  private apiKey: string | null
  private session: string

  constructor(apiUrl: string, apiKey: string | null, session: string) {
    this.apiUrl = apiUrl.replace(/\/$/, '') // Remove trailing slash
    this.apiKey = apiKey
    this.session = session || 'default'
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    // WAHA uses API key via header or query param
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }
    return headers
  }

  /**
   * Normalize phone number to international format
   * Converts 08xx to 628xx, ensures no + prefix
   * WAHA requires format: 62xxx@c.us for chat IDs
   */
  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/[\s\-\+\(\)]/g, '')
    if (normalized.startsWith('08')) {
      normalized = '62' + normalized.substring(1)
    }
    if (normalized.startsWith('+62')) {
      normalized = normalized.substring(1)
    }
    return normalized
  }

  /**
   * Build chat ID for WAHA (format: 62xxx@c.us for private chats)
   */
  private buildChatId(phone: string): string {
    const normalized = this.normalizePhone(phone)
    return `${normalized}@c.us`
  }

  /**
   * Check if WA service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.apiUrl)
  }

  /**
   * Get session status from waha.devlike.pro
   * WAHA: GET /api/sessions/{session}/status
   */
  async getSessionStatus(): Promise<WASessionStatus> {
    if (!this.isConfigured()) {
      return { connected: false, status: 'NOT_CONFIGURED' }
    }

    try {
      const response = await fetch(
        `${this.apiUrl}/api/sessions/${this.session}/status`,
        { headers: this.getHeaders(), method: 'GET' }
      )

      if (!response.ok) {
        // Session might not exist, try to get sessions list
        const sessionsRes = await fetch(
          `${this.apiUrl}/api/sessions`,
          { headers: this.getHeaders(), method: 'GET' }
        )
        
        if (sessionsRes.ok) {
          const sessions = await sessionsRes.json()
          // If sessions array is returned, check if our session exists
          if (Array.isArray(sessions)) {
            const mySession = sessions.find((s: Record<string, unknown>) => s.name === this.session)
            if (mySession) {
              return {
                connected: (mySession as Record<string, unknown>).status === 'CONNECTED',
                status: String((mySession as Record<string, unknown>).status || 'UNKNOWN'),
                sessionName: this.session,
              }
            }
          }
        }
        return { connected: false, status: 'SESSION_NOT_FOUND', sessionName: this.session }
      }

      const data = await response.json()
      
      return {
        connected: data?.status === 'CONNECTED' || data?.connected === true,
        status: data?.status || 'UNKNOWN',
        phoneNumber: data?.phone || data?.phoneNumber,
        pushName: data?.pushName || data?.name,
        batteryLevel: data?.batteryLevel,
        sessionName: this.session,
      }
    } catch {
      return { connected: false, status: 'CONNECTION_ERROR', sessionName: this.session }
    }
  }

  /**
   * Send a text message via waha.devlike.pro
   * WAHA: POST /api/sendText
   * Body: { session, chatId, text }
   */
  async sendMessage(params: WASendParams): Promise<WAResponse> {
    if (!this.isConfigured()) {
      return { success: false, error: 'WhatsApp belum dikonfigurasi. Silakan atur API URL dan Session di Pengaturan Sistem.' }
    }

    const chatId = this.buildChatId(params.phone)

    try {
      // If media URL is provided, use sendImage or sendFile endpoint
      if (params.mediaUrl) {
        return await this.sendMedia(params)
      }

      // Send text message
      const body = {
        session: this.session,
        chatId: chatId,
        text: params.message,
      }

      const response = await fetch(`${this.apiUrl}/api/sendText`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, message: 'Pesan berhasil dikirim', data }
      }

      return { 
        success: false, 
        error: data?.message || data?.error || data?.reason || `Gagal mengirim pesan (HTTP ${response.status})`,
        data 
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Koneksi ke waha.devlike.pro gagal: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Send media (image/file) via waha.devlike.pro
   * WAHA: POST /api/sendImage or POST /api/sendFile
   */
  private async sendMedia(params: WASendParams): Promise<WAResponse> {
    const chatId = this.buildChatId(params.phone)
    const mediaType = params.mediaType || 'image'

    try {
      let endpoint: string
      let body: Record<string, unknown>

      if (mediaType === 'image') {
        endpoint = `${this.apiUrl}/api/sendImage`
        body = {
          session: this.session,
          chatId: chatId,
          file: {
            url: params.mediaUrl,
          },
          caption: params.caption || params.message || '',
        }
      } else {
        endpoint = `${this.apiUrl}/api/sendFile`
        body = {
          session: this.session,
          chatId: chatId,
          file: {
            url: params.mediaUrl,
            fileName: params.fileName || 'document',
          },
          caption: params.caption || params.message || '',
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, message: 'Media berhasil dikirim', data }
      }

      return { 
        success: false, 
        error: data?.message || data?.error || data?.reason || `Gagal mengirim media (HTTP ${response.status})`,
        data 
      }
    } catch (error) {
      return { 
        success: false, 
        error: `Koneksi ke waha.devlike.pro gagal: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Send blast messages to multiple recipients
   */
  async sendBlast(params: WABlastParams): Promise<{ totalSent: number; totalFailed: number; results: Array<{ phone: string; success: boolean; error?: string }> }> {
    const results: Array<{ phone: string; success: boolean; error?: string }> = []
    let totalSent = 0
    let totalFailed = 0
    const delayMs = params.delayMs || 1500

    for (const phone of params.phones) {
      const result = await this.sendMessage({ phone, message: params.message })
      results.push({ phone, success: result.success, error: result.error })
      
      if (result.success) {
        totalSent++
      } else {
        totalFailed++
      }

      // Delay between messages to avoid rate limiting / banning
      if (delayMs > 0 && params.phones.indexOf(phone) < params.phones.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }

    return { totalSent, totalFailed, results }
  }

  /**
   * Check if a phone number is registered on WhatsApp
   * WAHA: POST /api/checkWhatsAppStatus
   */
  async checkPhoneNumber(phone: string): Promise<{ registered: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { registered: false, error: 'WhatsApp belum dikonfigurasi' }
    }

    const chatId = this.buildChatId(phone)

    try {
      const response = await fetch(`${this.apiUrl}/api/checkWhatsAppStatus`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          session: this.session,
          phone: chatId,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        return { registered: data?.status === 'valid' || data?.exists === true }
      }

      return { registered: false, error: data?.message || 'Gagal mengecek nomor' }
    } catch (error) {
      return { registered: false, error: `Gagal mengecek nomor: ${error instanceof Error ? error.message : 'Unknown error'}` }
    }
  }

  /**
   * Generate attendance notification message
   */
  generateAttendanceMessage(template: string, data: {
    parentName: string; studentName: string; date: string;
    timeIn: string; status: string; className: string;
  }): string {
    return template
      .replace(/\{parent\}/g, data.parentName)
      .replace(/\{student\}/g, data.studentName)
      .replace(/\{date\}/g, data.date)
      .replace(/\{time\}/g, data.timeIn)
      .replace(/\{status\}/g, data.status)
      .replace(/\{class\}/g, data.className)
  }

  /**
   * Generate grade notification message
   */
  generateGradeMessage(template: string, data: {
    parentName: string; studentName: string; subject: string;
    score: string; grade: string; className: string;
  }): string {
    return template
      .replace(/\{parent\}/g, data.parentName)
      .replace(/\{student\}/g, data.studentName)
      .replace(/\{subject\}/g, data.subject)
      .replace(/\{score\}/g, data.score)
      .replace(/\{grade\}/g, data.grade)
      .replace(/\{class\}/g, data.className)
  }

  /**
   * Generate announcement message
   */
  generateAnnouncementMessage(template: string, data: {
    title: string; content: string; schoolName: string; date: string;
  }): string {
    return template
      .replace(/\{title\}/g, data.title)
      .replace(/\{content\}/g, data.content)
      .replace(/\{school\}/g, data.schoolName)
      .replace(/\{date\}/g, data.date)
  }

  /**
   * Default attendance template
   */
  static getDefaultAttendanceTemplate(): string {
    return `📋 *Notifikasi Kehadiran - {school}*

Halo {parent},

Informasi kehadiran {student} (Kelas {class}) pada {date}:
🕐 Jam Masuk: {time}
📊 Status: *{status}*

Pesan ini dikirim otomatis oleh sistem EduLMS.`
  }

  /**
   * Default grade template
   */
  static getDefaultGradeTemplate(): string {
    return `📊 *Notifikasi Nilai - {school}*

Halo {parent},

Nilai {student} (Kelas {class}) untuk mata pelajaran {subject}:
📝 Nilai: *{score}*
📊 Grade: *{grade}*

Pesan ini dikirim otomatis oleh sistem EduLMS.`
  }

  /**
   * Default announcement template
   */
  static getDefaultAnnouncementTemplate(): string {
    return `📢 *Pengumuman - {school}*

{title}

{content}

Tanggal: {date}
Pesan ini dikirim otomatis oleh sistem EduLMS.`
  }

  /**
   * Default leave request template
   */
  static getDefaultLeaveRequestTemplate(): string {
    return `📋 *Pengajuan Izin/Sakit - {school}*

Halo {parent},

{student} (Kelas {class}) mengajukan {type}:
📝 Alasan: {reason}
📅 Tanggal: {startDate} s/d {endDate}
📊 Status: *{status}*

Pesan ini dikirim otomatis oleh sistem EduLMS.`
  }
}

/**
 * Get WAService instance configured from database settings
 */
export async function getWAService(): Promise<WAService> {
  const { db } = await import('@/lib/db')
  const settings = await db.settings.findUnique({ where: { id: 'settings' } })
  
  return new WAService(
    settings?.waApiUrl || 'https://waha.devlike.pro',
    settings?.waApiKey || null,
    settings?.waSession || 'default'
  )
}
