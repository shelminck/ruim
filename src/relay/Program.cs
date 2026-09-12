using System.Security.Cryptography;
using System.Text;
using Ruim.Relay;

var builder = WebApplication.CreateBuilder(args);

var dbPath = builder.Configuration["Relay:DbPath"] ?? Path.Combine(AppContext.BaseDirectory, "sync.db");
builder.Services.AddSingleton(new SyncBlobStore(dbPath));

var app = builder.Build();

app.MapGet("/", () => Results.Ok(new { service = "ruim-relay", status = "ok" }));

app.MapPut("/sync/{syncId}/{partition}", async (string syncId, string partition, HttpContext context, SyncBlobStore store) =>
{
    if (!TryGetBearerToken(context.Request, out var token))
    {
        return Results.Unauthorized();
    }

    var expectedVersion = 0L;
    if (context.Request.Headers.TryGetValue("X-Sync-Expected-Version", out var versionHeader)
        && !long.TryParse(versionHeader, out expectedVersion))
    {
        return Results.BadRequest("X-Sync-Expected-Version must be a non-negative integer.");
    }

    using var bodyStream = new MemoryStream();
    await context.Request.Body.CopyToAsync(bodyStream);
    var blob = bodyStream.ToArray();
    if (blob.Length == 0)
    {
        return Results.BadRequest("Request body must contain the encrypted blob.");
    }

    var result = store.Write(syncId, partition, expectedVersion, HashToken(token), blob);
    context.Response.Headers["X-Sync-Version"] = result.CurrentVersion.ToString();

    return result.Outcome switch
    {
        SyncWriteOutcome.Created => Results.StatusCode(StatusCodes.Status201Created),
        SyncWriteOutcome.Updated => Results.Ok(),
        SyncWriteOutcome.VersionConflict => Results.Conflict(),
        SyncWriteOutcome.Unauthorized => Results.Unauthorized(),
        _ => Results.StatusCode(StatusCodes.Status500InternalServerError),
    };
});

app.MapGet("/sync/{syncId}/{partition}", (string syncId, string partition, HttpContext context, SyncBlobStore store) =>
{
    if (!TryGetBearerToken(context.Request, out var token))
    {
        return Results.Unauthorized();
    }

    var result = store.Read(syncId, partition, HashToken(token));

    if (result.Outcome == SyncReadOutcome.Found)
    {
        context.Response.Headers["X-Sync-Version"] = result.Version.ToString();
        return Results.Bytes(result.Blob!, "application/octet-stream");
    }

    return result.Outcome == SyncReadOutcome.Unauthorized
        ? Results.Unauthorized()
        : Results.NotFound();
});

app.Run();

static bool TryGetBearerToken(HttpRequest request, out string token)
{
    token = string.Empty;
    var header = request.Headers.Authorization.ToString();
    const string prefix = "Bearer ";
    if (!header.StartsWith(prefix, StringComparison.Ordinal))
    {
        return false;
    }

    token = header[prefix.Length..].Trim();
    return token.Length > 0;
}

static byte[] HashToken(string token) => SHA256.HashData(Encoding.UTF8.GetBytes(token));

public partial class Program;
