namespace DisneyCrowdAssistant.Api.Models;

public class Ride
{
    public string RideId { get; set; } = string.Empty;
    public string RideName { get; set; } = string.Empty;
    public string Land { get; set; } = string.Empty; // e.g. Tomorrowland, Adventureland
    public int PersonCount { get; set; }
    public string CrowdLevel { get; set; } = "LOW"; // LOW, MEDIUM, HIGH
    public int EstimatedWaitMinutes { get; set; }
    public string LastUpdated { get; set; } = DateTime.UtcNow.ToString("o");
}

public class ChatRequest
{
    public string SessionId { get; set; } = Guid.NewGuid().ToString();
    public string UserMessage { get; set; } = string.Empty;
    public string PhoneNumber { get; set; } = "+1234567890";
}

public class ChatResponse
{
    public string AssistantReply { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class AlertSubscription
{
    public string PhoneNumber { get; set; } = string.Empty;
    public string RideId { get; set; } = string.Empty;
    public int TargetWaitMinutes { get; set; }
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("o");
}
