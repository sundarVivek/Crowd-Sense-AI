using Microsoft.AspNetCore.Mvc;
using DisneyCrowdAssistant.Api.Models;
using DisneyCrowdAssistant.Api.Services;

namespace DisneyCrowdAssistant.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AlertsController : ControllerBase
{
    private readonly AwsDisneyService _service;

    public AlertsController(AwsDisneyService service)
    {
        _service = service;
    }

    [HttpGet]
    public IActionResult GetAlerts()
    {
        var alerts = _service.GetActiveAlerts();
        return Ok(alerts);
    }

    [HttpPost]
    public async Task<IActionResult> CreateAlert([FromBody] AlertSubscription sub)
    {
        if (string.IsNullOrEmpty(sub.PhoneNumber) || string.IsNullOrEmpty(sub.RideId))
        {
            return BadRequest("PhoneNumber and RideId are required.");
        }

        await _service.SubscribeAlertAsync(sub);
        return Ok(new { status = "success", message = "Alert created", alert = sub });
    }
}
