using Microsoft.AspNetCore.Mvc;
using DisneyCrowdAssistant.Api.Models;
using DisneyCrowdAssistant.Api.Services;

namespace DisneyCrowdAssistant.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly AwsDisneyService _service;

    public ChatController(AwsDisneyService service)
    {
        _service = service;
    }

    [HttpPost]
    public async Task<IActionResult> PostMessage([FromBody] ChatRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.UserMessage))
        {
            return BadRequest("UserMessage cannot be empty.");
        }

        var reply = await _service.AskBedrockAgentAsync(req.SessionId, req.UserMessage, req.PhoneNumber);
        return Ok(new ChatResponse
        {
            AssistantReply = reply,
            SessionId = req.SessionId
        });
    }
}
