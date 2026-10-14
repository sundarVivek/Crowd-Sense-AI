# 🏰 Disney Crowd Sense AI (AWS Hackathon Project)

> Real-time queue headcount estimation with **Amazon Rekognition**, park metrics in **Amazon DynamoDB**, intelligent routing with **Amazon Bedrock AgentCore**, and two-way WhatsApp concierge via **AWS End User Messaging Social**.

---

## 🚀 Quick Start (Instant Live Demo)

The project includes an immediately runnable backend and interactive dual-panel dashboard.

### 1. Run the Backend & Dashboard:
```bash
cd "c:\Users\SundareshwaranViveka\Desktop\Crowd sense AI\backend-node"
npm start
```

### 2. Open in your Browser:
Navigate to:
👉 **[http://localhost:5000](http://localhost:5000)**

You will see:
- **Left Panel (Admin)**: Real-time Disneyland attractions across lands, crowd badges, queue camera analyzer, and quick surge/clear controls.
- **Right Panel (Guest WhatsApp Simulator)**: Interactive mobile chat with verified Disney Assistant, natural language wait queries, smart crowd diversion recommendations, and live alert toasts!

---

## 📂 Repository Structure

```
Crowd sense AI/
├── backend-dotnet/          # ASP.NET Core Web API (C# / .NET 8) with AWS SDKs
│   ├── Controllers/         # RidesController, ChatController, AlertsController
│   ├── Models/              # Ride, ChatRequest, ChatResponse, AlertSubscription
│   ├── Services/            # AwsDisneyService (DynamoDB, Rekognition, Bedrock, SocialMessaging)
│   ├── Program.cs
│   └── appsettings.json
│
├── backend-node/            # Runnable Node.js Express server + AWS SDK v3
│   ├── server.js            # REST API + Server-Sent Events (SSE) for live alerts
│   ├── services/            # AWS SDK wrapper & high-fidelity simulation store
│   └── package.json
│
├── frontend/                # Interactive Web Dashboard
│   ├── public/index.html    # Standalone dual-panel dashboard (Tailwind CSS)
│   └── src/app/             # Angular Standalone Component implementation
│
├── aws-cloud/               # AWS Cloud Deployment & Hackathon Artifacts
│   ├── openapi.json         # Bedrock Agent Action Group OpenAPI 3.0 specification
│   ├── template.yaml        # CloudFormation / SAM infrastructure template
│   ├── lambdas/             # Python Lambda functions (frame processor, resolver, webhook)
│   └── scripts/             # DynamoDB seeding utility
│
├── HACKATHON_GUIDE.md       # Complete AWS Setup Guide, Architecture, and Checklist
└── README.md
```

---

## ⚙️ Connecting Live AWS Credentials

When you are ready to connect to your live AWS account:
1. Copy `backend-node/.env.example` to `backend-node/.env` (or configure `backend-dotnet/appsettings.json`).
2. Add your AWS credentials and resource IDs:
   ```env
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your_access_key
   AWS_SECRET_ACCESS_KEY=your_secret_key
   BEDROCK_AGENT_ID=your_agent_id
   BEDROCK_AGENT_ALIAS_ID=your_alias_id
   ORIGINATION_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
   ```
3. Restart the server. The application will automatically detect the credentials and switch from simulation mode to live AWS execution!
