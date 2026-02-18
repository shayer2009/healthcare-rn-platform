# Enhanced Telemedicine Features

All 5 recommendations have been implemented:

## 1. ✅ Real Video Integration (Daily.co)

- **API**: `/api/video/create-room` - Creates Daily.co room with WebRTC support
- **API**: `/api/video/get-token` - Gets join token for patient/doctor
- **API**: `/api/video/end-session` - Ends video session
- **Setup**: Add `DAILY_API_KEY` to `.env` (get from https://dashboard.daily.co/)
- **Features**: Screen sharing, chat, cloud recording, private rooms

## 2. ✅ File Uploads

- **API**: `POST /api/files/upload` - Upload files (prescriptions, lab reports, images)
- **API**: `GET /api/files/:entity_type/:entity_id` - Get files for entity
- **API**: `GET /uploads/:filename` - Serve uploaded files
- **Supported**: Images (JPEG, PNG), PDFs, max 10MB
- **Storage**: Files saved in `backend/uploads/` directory

## 3. ✅ Automated Reminders

- **Cron Job**: Runs every hour, checks appointments in next 24 hours
- **Email**: Sends via SMTP (configure `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`)
- **SMS**: Sends via Twilio (configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`)
- **Logs**: All reminders logged in `reminder_logs` table
- **Timing**: Sends reminder 24 hours before appointment

## 4. ✅ Real-Time Messaging (WebSocket)

- **API**: `POST /api/messages` - Send message
- **API**: `GET /api/messages` - Get conversation
- **API**: `PUT /api/messages/:id/read` - Mark as read
- **API**: `GET /api/messages/unread-count` - Get unread count
- **WebSocket**: Connect to server, join room `user:{role}:{id}`
- **Real-time**: Messages delivered instantly via Socket.io

## 5. ✅ Prescription Fulfillment Workflow

- **API**: `POST /api/prescriptions/:id/send-to-pharmacy` - Send prescription to pharmacy
- **API**: `POST /api/prescriptions/:id/request-refill` - Patient requests refill
- **API**: `PUT /api/prescription-refills/:id` - Doctor approves/rejects refill
- **API**: `GET /api/prescriptions/:id/fulfillment` - Get fulfillment status
- **API**: `GET /api/prescription-refills` - Get pending refill requests (doctor)
- **Workflow**: Prescription → Send to Pharmacy → Fulfillment → Refill Requests

## Environment Variables

Add to `backend/.env`:

```env
# Daily.co Video
DAILY_API_KEY=your_daily_api_key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@healthapp.local

# Twilio SMS
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

## Installation

```bash
cd backend
npm install
```

New dependencies installed:
- `socket.io` - WebSocket server
- `multer` - File uploads
- `node-cron` - Scheduled reminders
- `nodemailer` - Email sending
- `twilio` - SMS sending
- `@daily-co/daily-js` - Daily.co video
- `uuid` - Unique IDs

## Usage

1. **Video Calls**: Create appointment → Create room → Get token → Join Daily.co room
2. **File Uploads**: Upload prescription PDFs, lab reports, images via `/api/files/upload`
3. **Messaging**: Connect WebSocket, send/receive messages in real-time
4. **Reminders**: Automatically sent 24h before appointments (if email/SMS configured)
5. **Prescriptions**: Send to pharmacy, track fulfillment, handle refill requests

## Notes

- **Daily.co**: Free tier available, get API key from dashboard.daily.co
- **Email**: Gmail requires App Password (not regular password)
- **SMS**: Twilio free trial available, requires phone number verification
- **File Storage**: Files stored locally in `uploads/` - consider S3/Cloudinary for production
- **WebSocket**: Client connects to same server URL (e.g., `ws://localhost:4000`)
