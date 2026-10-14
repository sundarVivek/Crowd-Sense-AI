using Amazon.BedrockAgentRuntime;
using Amazon.DynamoDBv2;
using Amazon.Rekognition;
using Amazon.SocialMessaging;
using DisneyCrowdAssistant.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Disney Crowd Assistant API", Version = "v1" });
});

// Configure CORS for frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// AWS Options & Clients
var awsOptions = builder.Configuration.GetAWSOptions();
builder.Services.AddDefaultAWSOptions(awsOptions);

// Try registering AWS clients gracefully
try
{
    builder.Services.AddAWSService<IAmazonDynamoDB>();
    builder.Services.AddAWSService<IAmazonRekognition>();
    builder.Services.AddAWSService<IAmazonBedrockAgentRuntime>();
    builder.Services.AddAWSService<IAmazonSocialMessaging>();
}
catch
{
    // Ignore if running locally without AWS config
}

builder.Services.AddSingleton<AwsDisneyService>();

var app = builder.Build();

app.UseCors("AllowAll");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();
