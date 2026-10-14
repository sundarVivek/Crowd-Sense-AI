using Amazon.BedrockAgentRuntime;
using Amazon.BedrockAgentRuntime.Model;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using Amazon.SocialMessaging;
using Amazon.SocialMessaging.Model;
using DisneyCrowdAssistant.Api.Models;
using System.Text;
using System.Text.Json;

namespace DisneyCrowdAssistant.Api.Services;

public class AwsDisneyService
{
    private readonly IAmazonDynamoDB? _dynamoDb;
    private readonly IAmazonRekognition? _rekognition;
    private readonly IAmazonBedrockAgentRuntime? _bedrockRuntime;
    private readonly IAmazonSocialMessaging? _socialMessaging;
    private readonly IConfiguration _config;
    private readonly ILogger<AwsDisneyService> _logger;

    private const string RidesTableName = "Rides";
    private const string AlertsTableName = "UserAlerts";

    // In-memory fallback cache when running in demo/offline mode
    private static readonly List<Ride> InMemRides = new()
    {
        new Ride { RideId = "space_mountain", RideName = "Space Mountain", Land = "Tomorrowland", PersonCount = 52, CrowdLevel = "HIGH", EstimatedWaitMinutes = 75 },
        new Ride { RideId = "star_tours", RideName = "Star Tours", Land = "Tomorrowland", PersonCount = 14, CrowdLevel = "LOW", EstimatedWaitMinutes = 15 },
        new Ride { RideId = "pirates_caribbean", RideName = "Pirates of the Caribbean", Land = "New Orleans Square", PersonCount = 22, CrowdLevel = "MEDIUM", EstimatedWaitMinutes = 25 },
        new Ride { RideId = "big_thunder", RideName = "Big Thunder Mountain", Land = "Frontierland", PersonCount = 38, CrowdLevel = "MEDIUM", EstimatedWaitMinutes = 40 },
        new Ride { RideId = "peter_pan", RideName = "Peter Pan's Flight", Land = "Fantasyland", PersonCount = 45, CrowdLevel = "HIGH", EstimatedWaitMinutes = 65 },
        new Ride { RideId = "haunted_mansion", RideName = "Haunted Mansion", Land = "New Orleans Square", PersonCount = 18, CrowdLevel = "LOW", EstimatedWaitMinutes = 20 }
    };

    private static readonly List<AlertSubscription> InMemAlerts = new();

    public AwsDisneyService(
        IConfiguration config,
        ILogger<AwsDisneyService> logger,
        IAmazonDynamoDB? dynamoDb = null,
        IAmazonRekognition? rekognition = null,
        IAmazonBedrockAgentRuntime? bedrockRuntime = null,
        IAmazonSocialMessaging? socialMessaging = null)
    {
        _config = config;
        _logger = logger;
        _dynamoDb = dynamoDb;
        _rekognition = rekognition;
        _bedrockRuntime = bedrockRuntime;
        _socialMessaging = socialMessaging;
    }

    private bool IsAwsConfigured =>
        !string.IsNullOrEmpty(_config["AWS:Region"]) &&
        !string.IsNullOrEmpty(_config["AWS:Bedrock:AgentId"]) &&
        _config["AWS:Bedrock:AgentId"] != "YOUR_BEDROCK_AGENT_ID";

    // --- DynamoDB Operations ---

    public async Task<List<Ride>> GetAllRidesAsync()
    {
        if (_dynamoDb != null && IsAwsConfigured)
        {
            try
            {
                var scanRequest = new ScanRequest { TableName = RidesTableName };
                var response = await _dynamoDb.ScanAsync(scanRequest);
                var list = new List<Ride>();
                foreach (var item in response.Items)
                {
                    list.Add(new Ride
                    {
                        RideId = item.GetValueOrDefault("ride_id")?.S ?? "",
                        RideName = item.GetValueOrDefault("ride_name")?.S ?? "",
                        Land = item.GetValueOrDefault("land")?.S ?? "",
                        PersonCount = int.TryParse(item.GetValueOrDefault("person_count")?.N, out var pc) ? pc : 0,
                        CrowdLevel = item.GetValueOrDefault("crowd_level")?.S ?? "LOW",
                        EstimatedWaitMinutes = int.TryParse(item.GetValueOrDefault("estimated_wait_minutes")?.N, out var wm) ? wm : 0,
                        LastUpdated = item.GetValueOrDefault("last_updated")?.S ?? ""
                    });
                }
                if (list.Count > 0) return list;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DynamoDB scan failed. Falling back to local in-memory store.");
            }
        }

        lock (InMemRides)
        {
            return InMemRides.ToList();
        }
    }

    public async Task UpsertRideAsync(Ride ride)
    {
        ride.LastUpdated = DateTime.UtcNow.ToString("o");

        if (_dynamoDb != null && IsAwsConfigured)
        {
            try
            {
                var request = new PutItemRequest
                {
                    TableName = RidesTableName,
                    Item = new Dictionary<string, AttributeValue>
                    {
                        { "ride_id", new AttributeValue { S = ride.RideId } },
                        { "ride_name", new AttributeValue { S = ride.RideName } },
                        { "land", new AttributeValue { S = ride.Land } },
                        { "person_count", new AttributeValue { N = ride.PersonCount.ToString() } },
                        { "crowd_level", new AttributeValue { S = ride.CrowdLevel } },
                        { "estimated_wait_minutes", new AttributeValue { N = ride.EstimatedWaitMinutes.ToString() } },
                        { "last_updated", new AttributeValue { S = ride.LastUpdated } }
                    }
                };
                await _dynamoDb.PutItemAsync(request);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "DynamoDB PutItem failed. Updating in-memory store.");
            }
        }

        lock (InMemRides)
        {
            var idx = InMemRides.FindIndex(r => r.RideId.Equals(ride.RideId, StringComparison.OrdinalIgnoreCase));
            if (idx >= 0) InMemRides[idx] = ride;
            else InMemRides.Add(ride);
        }

        await CheckAndTriggerAlertsAsync(ride.RideId, ride.EstimatedWaitMinutes, ride.RideName);
    }

    // --- Rekognition Vision Pipeline ---

    public async Task<int> DetectPeopleFromImageAsync(byte[] imageBytes)
    {
        if (_rekognition != null && IsAwsConfigured)
        {
            try
            {
                using var stream = new MemoryStream(imageBytes);
                var request = new DetectLabelsRequest
                {
                    Image = new Image { Bytes = stream },
                    MaxLabels = 25,
                    MinConfidence = 70.0f
                };
                var response = await _rekognition.DetectLabelsAsync(request);
                var personLabel = response.Labels.FirstOrDefault(l => l.Name.Equals("Person", StringComparison.OrdinalIgnoreCase));
                return personLabel?.Instances?.Count ?? 0;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Rekognition call failed. Simulating person count from payload size.");
            }
        }

        // Realistic heuristic fallback for testing/demo when offline
        var hash = Math.Abs(BitConverter.ToInt32(imageBytes, 0) % 60);
        return hash < 5 ? 12 : hash;
    }

    // --- Amazon Bedrock AgentCore Runtime ---

    public async Task<string> AskBedrockAgentAsync(string sessionId, string message, string phoneNumber)
    {
        var agentId = _config["AWS:Bedrock:AgentId"];
        var agentAliasId = _config["AWS:Bedrock:AgentAliasId"];

        if (_bedrockRuntime != null && IsAwsConfigured && !string.IsNullOrEmpty(agentId) && !string.IsNullOrEmpty(agentAliasId))
        {
            try
            {
                var cleanSession = sessionId.Replace("-", "");
                cleanSession = cleanSession.Substring(0, Math.Min(32, cleanSession.Length));

                var request = new InvokeAgentRequest
                {
                    AgentId = agentId,
                    AgentAliasId = agentAliasId,
                    SessionId = cleanSession,
                    InputText = $"[Guest Phone: {phoneNumber}] {message}"
                };

                var response = await _bedrockRuntime.InvokeAgentAsync(request);
                var sb = new StringBuilder();
                foreach (var ev in response.ResponseStream)
                {
                    if (ev is PayloadPart part && part.Bytes != null)
                    {
                        sb.Append(Encoding.UTF8.GetString(part.Bytes.ToArray()));
                    }
                }

                if (sb.Length > 0) return sb.ToString();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Bedrock Agent invoke failed. Using simulated reasoning response.");
            }
        }

        return GenerateSimulatedAgentResponse(message, phoneNumber);
    }

    // --- AWS End User Messaging Social (WhatsApp Delivery) ---

    public async Task SendWhatsAppMessageAsync(string recipientPhone, string messageText)
    {
        var phoneId = _config["AWS:EndUserMessaging:OriginationPhoneNumberId"];

        if (_socialMessaging != null && IsAwsConfigured && !string.IsNullOrEmpty(phoneId) && phoneId != "phone-number-id-xxxx")
        {
            try
            {
                var payload = new
                {
                    messaging_product = "whatsapp",
                    to = recipientPhone,
                    type = "text",
                    text = new { body = messageText }
                };
                var json = JsonSerializer.Serialize(payload);
                using var stream = new MemoryStream(Encoding.UTF8.GetBytes(json));
                var req = new SendWhatsAppMessageRequest
                {
                    OriginationPhoneNumberId = phoneId,
                    MetaApiVersion = "v20.0",
                    Message = stream
                };
                await _socialMessaging.SendWhatsAppMessageAsync(req);
                _logger.LogInformation("Dispatched WhatsApp message to {Recipient} via AWS End User Messaging", recipientPhone);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AWS End User Messaging dispatch failed. Recorded in alert log.");
            }
        }

        _logger.LogInformation("[Simulated WhatsApp Message sent to {Phone}]: {Msg}", recipientPhone, messageText);
    }

    // --- Proactive Alert Evaluator ---

    public async Task SubscribeAlertAsync(AlertSubscription sub)
    {
        if (_dynamoDb != null && IsAwsConfigured)
        {
            try
            {
                await _dynamoDb.PutItemAsync(new PutItemRequest
                {
                    TableName = AlertsTableName,
                    Item = new Dictionary<string, AttributeValue>
                    {
                        { "phone_number", new AttributeValue { S = sub.PhoneNumber } },
                        { "ride_id", new AttributeValue { S = sub.RideId } },
                        { "target_wait_minutes", new AttributeValue { N = sub.TargetWaitMinutes.ToString() } },
                        { "created_at", new AttributeValue { S = DateTime.UtcNow.ToString("o") } }
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to save alert to DynamoDB. Saving locally.");
            }
        }

        lock (InMemAlerts)
        {
            InMemAlerts.RemoveAll(a => a.PhoneNumber == sub.PhoneNumber && a.RideId == sub.RideId);
            InMemAlerts.Add(sub);
        }
    }

    public List<AlertSubscription> GetActiveAlerts()
    {
        lock (InMemAlerts)
        {
            return InMemAlerts.ToList();
        }
    }

    private async Task CheckAndTriggerAlertsAsync(string rideId, int currentWait, string rideName)
    {
        List<AlertSubscription> matchingAlerts = new();

        lock (InMemAlerts)
        {
            matchingAlerts = InMemAlerts.Where(a => a.RideId.Equals(rideId, StringComparison.OrdinalIgnoreCase) && currentWait <= a.TargetWaitMinutes).ToList();
        }

        foreach (var alert in matchingAlerts)
        {
            var alertText = $"🔔 *Wait Time Alert!*\n*{rideName}* wait time has dropped to *{currentWait} mins* (under your target of {alert.TargetWaitMinutes}m)!\n\n🚶‍♂️ Walk over now while the queue is clear!";
            await SendWhatsAppMessageAsync(alert.PhoneNumber, alertText);

            lock (InMemAlerts)
            {
                InMemAlerts.Remove(alert);
            }
        }
    }

    private string GenerateSimulatedAgentResponse(string query, string phoneNumber)
    {
        var lower = query.ToLowerInvariant();

        if (lower.Contains("space mountain"))
        {
            var ride = InMemRides.FirstOrDefault(r => r.RideId == "space_mountain");
            var wait = ride?.EstimatedWaitMinutes ?? 75;
            if (wait > 40)
            {
                return $"🚀 *Space Mountain* currently has a *{wait}-minute wait* ({ride?.CrowdLevel} crowd).\n\n💡 *Smart Recommendation*: *Star Tours* is right next door in Tomorrowland with only a *15-minute wait*!\n\nWould you like me to set a WhatsApp alert when Space Mountain drops below 30 minutes?";
            }
            return $"🚀 *Space Mountain* is currently clear! Wait time is only *{wait} minutes* ({ride?.CrowdLevel} crowd). Great time to jump in line!";
        }

        if (lower.Contains("star tours"))
        {
            var ride = InMemRides.FirstOrDefault(r => r.RideId == "star_tours");
            return $"✨ *Star Tours* is currently at a *{ride?.EstimatedWaitMinutes ?? 15}-minute wait* ({ride?.CrowdLevel} crowd). Virtually no wait!";
        }

        if (lower.Contains("pirates"))
        {
            var ride = InMemRides.FirstOrDefault(r => r.RideId == "pirates_caribbean");
            return $"🏴‍☠️ *Pirates of the Caribbean* has an estimated wait time of *{ride?.EstimatedWaitMinutes ?? 25} minutes* ({ride?.CrowdLevel} crowd) in New Orleans Square.";
        }

        if (lower.Contains("shortest") || lower.Contains("least") || lower.Contains("lowest") || lower.Contains("recommend"))
        {
            var best = InMemRides.OrderBy(r => r.EstimatedWaitMinutes).Take(3).ToList();
            var sb = new StringBuilder("🏰 *Current Lowest Wait Times:*\n\n");
            foreach (var r in best)
            {
                sb.AppendLine($"• *{r.RideName}* ({r.Land}): *{r.EstimatedWaitMinutes} mins* ({r.CrowdLevel})");
            }
            sb.Append("\nAsk me about any ride or ask to set an alert!");
            return sb.ToString();
        }

        if (lower.Contains("alert") || lower.Contains("notify"))
        {
            // Subscribe alert for space_mountain by default if requested
            SubscribeAlertAsync(new AlertSubscription
            {
                PhoneNumber = phoneNumber,
                RideId = "space_mountain",
                TargetWaitMinutes = 30
            }).Wait();

            return "🔔 *Alert Confirmed!* I will message you on WhatsApp the moment *Space Mountain* drops to 30 minutes or less. Enjoy the rest of Tomorrowland!";
        }

        return "🏰 *Disney Crowd Assistant*\n\nI can help you navigate the park with real-time wait times and crowd insights:\n\n• Ask: *\"Wait time for Space Mountain\"*\n• Ask: *\"Which rides have the shortest wait?\"*\n• Ask: *\"Alert me when Space Mountain drops under 30 mins\"*";
    }
}
