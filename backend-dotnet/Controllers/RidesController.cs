using Microsoft.AspNetCore.Mvc;
using DisneyCrowdAssistant.Api.Models;
using DisneyCrowdAssistant.Api.Services;

namespace DisneyCrowdAssistant.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RidesController : ControllerBase
{
    private readonly AwsDisneyService _service;

    public RidesController(AwsDisneyService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetRides()
    {
        var rides = await _service.GetAllRidesAsync();
        return Ok(rides);
    }

    [HttpPost]
    public async Task<IActionResult> UpdateRide([FromBody] Ride ride)
    {
        if (string.IsNullOrEmpty(ride.RideId))
        {
            return BadRequest("RideId is required.");
        }
        await _service.UpsertRideAsync(ride);
        return Ok(ride);
    }

    [HttpPost("analyze-feed/{rideId}")]
    public async Task<IActionResult> AnalyzeFeed(string rideId, IFormFile? file)
    {
        byte[] bytes;
        if (file != null && file.Length > 0)
        {
            using var ms = new MemoryStream();
            await file.CopyToAsync(ms);
            bytes = ms.ToArray();
        }
        else
        {
            // Default sample byte seed if no file attached
            bytes = Guid.NewGuid().ToByteArray();
        }

        int count = await _service.DetectPeopleFromImageAsync(bytes);
        int waitMinutes = count < 15 ? 10 : (count < 40 ? 25 : (int)(count * 1.5));
        string level = count < 15 ? "LOW" : (count < 40 ? "MEDIUM" : "HIGH");

        var allRides = await _service.GetAllRidesAsync();
        var existing = allRides.FirstOrDefault(r => r.RideId.Equals(rideId, StringComparison.OrdinalIgnoreCase));

        var updated = new Ride
        {
            RideId = rideId,
            RideName = existing?.RideName ?? rideId.Replace("_", " ").ToUpper(),
            Land = existing?.Land ?? "Adventureland",
            PersonCount = count,
            CrowdLevel = level,
            EstimatedWaitMinutes = waitMinutes,
            LastUpdated = DateTime.UtcNow.ToString("o")
        };

        await _service.UpsertRideAsync(updated);
        return Ok(updated);
    }
}
