using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Net.Http.Headers;
using System.Text;

namespace Ruim.Relay.Tests;

public sealed class SyncEndpointsTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"ruim-relay-endpoint-tests-{Guid.NewGuid():N}.db");
    private readonly HttpClient _client;

    public SyncEndpointsTests(WebApplicationFactory<Program> factory)
    {
        var configuredFactory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("Relay:DbPath", _dbPath);
        });

        _client = configuredFactory.CreateClient();
    }

    [Fact]
    public async Task Put_without_bearer_token_is_unauthorized()
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, "/sync/family-1/config")
        {
            Content = new ByteArrayContent(Encoding.UTF8.GetBytes("blob")),
        };

        var response = await _client.SendAsync(request);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task First_put_creates_partition_with_version_1()
    {
        var response = await Put("family-1", "config", token: "token-a", expectedVersion: 0, body: "v1");

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("1", response.Headers.GetValues("X-Sync-Version").Single());
    }

    [Fact]
    public async Task Get_returns_the_stored_blob_and_version()
    {
        await Put("family-1", "config", "token-a", 0, "hello-family");

        var response = await Get("family-1", "config", "token-a");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("1", response.Headers.GetValues("X-Sync-Version").Single());
        Assert.Equal("hello-family", await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Get_with_wrong_token_is_unauthorized()
    {
        await Put("family-1", "config", "token-a", 0, "secret");

        var response = await Get("family-1", "config", "wrong-token");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Get_of_unknown_partition_is_not_found()
    {
        var response = await Get("family-1", "does-not-exist", "any-token");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Put_with_stale_expected_version_is_a_conflict()
    {
        await Put("family-1", "config", "token-a", 0, "v1");
        await Put("family-1", "config", "token-a", 1, "v2");

        var response = await Put("family-1", "config", "token-a", 1, "stale");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("2", response.Headers.GetValues("X-Sync-Version").Single());
    }

    [Fact]
    public async Task Put_by_a_second_device_with_the_same_token_succeeds_like_normal_sync()
    {
        await Put("family-1", "config", "token-a", 0, "from-device-1");

        var response = await Put("family-1", "config", "token-a", 1, "from-device-2");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("2", response.Headers.GetValues("X-Sync-Version").Single());
    }

    private async Task<HttpResponseMessage> Put(string syncId, string partition, string token, long expectedVersion, string body)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, $"/sync/{syncId}/{partition}")
        {
            Content = new ByteArrayContent(Encoding.UTF8.GetBytes(body)),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        request.Headers.Add("X-Sync-Expected-Version", expectedVersion.ToString());

        return await _client.SendAsync(request);
    }

    private async Task<HttpResponseMessage> Get(string syncId, string partition, string token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, $"/sync/{syncId}/{partition}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return await _client.SendAsync(request);
    }

    public void Dispose()
    {
        _client.Dispose();
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        if (File.Exists(_dbPath))
        {
            File.Delete(_dbPath);
        }
    }
}
