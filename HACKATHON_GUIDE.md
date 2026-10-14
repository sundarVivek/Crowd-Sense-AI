# 🏰 Crowd Sense AI — AWS Disney Crowd Detection Hackathon Guide

## 1. Executive Summary & Pitch
Theme park visitors spend up to **60% of their day waiting in lines**, causing frustration and missed experiences. Traditional park mobile apps require bulky downloads, constant battery drain, and manual screen refreshes.

**Crowd Sense AI (Disney Crowd Assistant)** solves this by integrating:
1. **Amazon Rekognition**: Automated computer vision on attraction camera feeds to count queue headcounts and compute real-time wait times without manual sensor maintenance.
2. **Amazon DynamoDB**: Real-time serverless database storing live attraction metrics (`Rides`) and guest alert subscriptions (`UserAlerts`).
3. **Amazon Bedrock AgentCore**: Generative AI assistant acting as the Disney Guest Concierge on WhatsApp, proactively routing guests away from congested rides to nearby low-wait attractions.
4. **AWS End User Messaging Social (WhatsApp)**: Meeting guests where they already communicate—via WhatsApp—with instant answers and proactive push alerts when long lines clear up.

---

## 2. AWS Hackathon Compliance Mapping (CDS Requirement)

| AWS Service | Solution Role | Mandatory Compliance / Hackathon Scoring Criteria |
| :--- | :--- | :--- |
| **AWS End User Messaging Social** (`socialmessaging`) | WhatsApp two-way messaging & proactive queue drop alerts | **Mandatory CDS Requirement Met**: Two-way conversational messaging directly via Meta WhatsApp Cloud API integration on AWS. |
| **Amazon Bedrock AgentCore** | Conversational reasoning & tool calling (Action Groups) | **GenAI Requirement Met**: Multi-turn dialogue, intelligent routing recommendation when wait >40m, OpenAPI tool calling. |
| **Amazon Rekognition** | Frame person detection (`DetectLabels`) | **Computer Vision / AI**: Automatically estimates queue density from camera snapshots. |
| **Amazon DynamoDB** | Single-digit millisecond state store | High-throughput serverless persistence for attraction queues and guest alerts. |
| **AWS Lambda** | Event-driven compute | Frame processor, Bedrock action resolver, and webhook integration. |

---

## 3. Step-by-Step AWS Console Setup

### Step 3.1: DynamoDB Tables
1. Open the [Amazon DynamoDB Console](https://console.aws.amazon.com/dynamodb).
2. **Table 1: `Rides`**
   - Partition Key (PK): `ride_id` (`String`)
   - Billing Mode: **On-demand** (Pay per request)
3. **Table 2: `UserAlerts`**
   - Partition Key (PK): `phone_number` (`String`)
   - Sort Key (SK): `ride_id` (`String`)
   - Billing Mode: **On-demand**

---

### Step 3.2: Amazon Bedrock AgentCore Setup
1. Open the [Amazon Bedrock Console](https://console.aws.amazon.com/bedrock) $\rightarrow$ **Agents** $\rightarrow$ **Create Agent**.
2. **Agent Name**: `DisneyCrowdAssistant`
3. **Foundation Model**: Select **Anthropic Claude 3.5 Sonnet** or **Claude 3 Haiku**.
4. **Agent Instructions**:
   ```
   You are the Disney Crowd Assistant on WhatsApp. Help visitors check ride wait times and set alerts when rides are busy.
   When answering visitors, provide ride wait times concisely with emojis and bold text (*).
   If a requested ride wait is >40 mins, proactively recommend an alternative ride nearby that has a lower wait time using the get_all_rides tool.
   Ask if the user wants an alert when the requested ride drops below a specific threshold.
   ```
5. **Action Group**:
   - Name: `RideDataActions`
   - Select **Define with API schemas** $\rightarrow$ Upload [`aws-cloud/openapi.json`](./aws-cloud/openapi.json).
   - Lambda Function: Point to the deployed `action_group_resolver` Lambda.
6. Click **Prepare** and create an **Alias** (`LiveDemo`). Note down your `AgentId` and `AgentAliasId`.

---

### Step 3.3: AWS End User Messaging Social (WhatsApp Setup)
1. Open the [AWS End User Messaging Console](https://console.aws.amazon.com/messaging) $\rightarrow$ Navigate to **Social (WhatsApp)**.
2. Select **Phone numbers** $\rightarrow$ **Link WhatsApp Business Account (WABA)**.
3. Once linked, copy the **`OriginationPhoneNumberId`** (format: `phone-number-id-xxxx`).
4. Set inbound webhook destination to forward incoming user texts to the `whatsapp_webhook` Lambda.

---

## 4. Hackathon Presentation & 3-Minute Video Script

### Slide / Video Outline:
- **0:00 - 0:30 | The Problem**: Visitors spend hours waiting in lines; theme park apps are cumbersome and lack proactive intelligence.
- **0:30 - 1:15 | The Architecture**: 
  - Simulated camera frame drops into S3.
  - Amazon Rekognition counts people in the queue $\rightarrow$ writes wait times to DynamoDB.
  - Amazon Bedrock AgentCore powers a zero-friction WhatsApp guest assistant.
  - AWS End User Messaging Social delivers real-time notifications.
- **1:15 - 2:30 | Live Demo**:
  - Show Admin Portal: Space Mountain at 75m wait (red badge).
  - Show WhatsApp Simulator: Guest asks *"What is the wait for Space Mountain?"*.
  - Bedrock responds: *"Space Mountain is 75 mins! Star Tours nearby is only 15 mins. Would you like an alert when Space Mountain drops?"*.
  - Guest confirms: *"Alert me under 30 mins"*.
  - In Admin Portal: Click **Clear (15m)** on Space Mountain.
  - **Boom**: WhatsApp simulator instantly triggers a push alert: *"🔔 Wait Time Alert! Space Mountain wait dropped to 15 mins! Walk over now!"*.
- **2:30 - 3:00 | Impact & Value**: Lower crowd crowding, higher guest satisfaction, zero app download barrier.

---

## 5. Hackathon Checklist

| Status | Phase | Task Item | Verification |
| :---: | :--- | :--- | :--- |
| ✅ **DONE** | Concept & Scope | Manager Approval & Hackathon Use-Case Definition | Crowd detection + WhatsApp conversational notifications approved. |
| ✅ **DONE** | Architecture | AWS CDS Compliance Mapping | Mandatory usage of AWS End User Messaging Social + Bedrock AgentCore. |
| ✅ **DONE** | API Contracts | DynamoDB Schema & OpenAPI Specs | Defined `Rides` & `UserAlerts` schemas + Bedrock Agent tool contracts. |
| ✅ **DONE** | Backend Core | Dual Backend (.NET Web API + Node.js Express API) | Full C# models/controllers + runnable Node.js with AWS SDK v3. |
| ✅ **DONE** | Frontend Prototype | Interactive Dual-Panel Dashboard | Live admin park controls + mobile WhatsApp conversational simulator. |
| 🔲 **NEXT** | AWS Cloud Deploy | Run SAM Template / Deploy Tables | Deploy `aws-cloud/template.yaml` to your AWS account. |
| 🔲 **NEXT** | Bedrock Agent | Link OpenAPI & Deploy Alias | Create Agent alias and paste IDs into `.env` / `appsettings.json`. |
| 🔲 **NEXT** | Demo Recording | Record 3-minute Hackathon Pitch Video | Demonstrate camera snapshot $\rightarrow$ wait time update $\rightarrow$ WhatsApp alert. |
