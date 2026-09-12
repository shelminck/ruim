using Ruim.Relay;
using System.Text;

namespace Ruim.Relay.Tests;

public sealed class SyncBlobStoreTests : IDisposable
{
    private readonly string _dbPath = Path.Combine(Path.GetTempPath(), $"ruim-relay-tests-{Guid.NewGuid():N}.db");
    private readonly SyncBlobStore _store;

    private static readonly byte[] TokenHashA = Hash("write-token-a");
    private static readonly byte[] TokenHashB = Hash("write-token-b");

    public SyncBlobStoreTests()
    {
        _store = new SyncBlobStore(_dbPath);
    }

    [Fact]
    public void First_write_for_unknown_partition_creates_version_1()
    {
        var result = _store.Write("family-1", "config", expectedVersion: 0, TokenHashA, Bytes("blob-v1"));

        Assert.Equal(SyncWriteOutcome.Created, result.Outcome);
        Assert.Equal(1, result.CurrentVersion);
    }

    [Fact]
    public void First_write_with_nonzero_expected_version_is_a_conflict()
    {
        var result = _store.Write("family-1", "config", expectedVersion: 5, TokenHashA, Bytes("blob"));

        Assert.Equal(SyncWriteOutcome.VersionConflict, result.Outcome);
        Assert.Equal(0, result.CurrentVersion);
    }

    [Fact]
    public void Write_with_correct_expected_version_updates_and_increments()
    {
        _store.Write("family-1", "config", 0, TokenHashA, Bytes("v1"));

        var result = _store.Write("family-1", "config", 1, TokenHashA, Bytes("v2"));

        Assert.Equal(SyncWriteOutcome.Updated, result.Outcome);
        Assert.Equal(2, result.CurrentVersion);
    }

    [Fact]
    public void Write_with_stale_expected_version_is_a_conflict_and_does_not_change_stored_blob()
    {
        _store.Write("family-1", "config", 0, TokenHashA, Bytes("v1"));
        _store.Write("family-1", "config", 1, TokenHashA, Bytes("v2"));

        var result = _store.Write("family-1", "config", 1, TokenHashA, Bytes("stale-write"));

        Assert.Equal(SyncWriteOutcome.VersionConflict, result.Outcome);
        Assert.Equal(2, result.CurrentVersion);

        var read = _store.Read("family-1", "config", TokenHashA);
        Assert.Equal(Bytes("v2"), read.Blob);
    }

    [Fact]
    public void Write_with_wrong_token_is_unauthorized_and_does_not_change_stored_blob()
    {
        _store.Write("family-1", "config", 0, TokenHashA, Bytes("v1"));

        var result = _store.Write("family-1", "config", 1, TokenHashB, Bytes("attacker-write"));

        Assert.Equal(SyncWriteOutcome.Unauthorized, result.Outcome);

        var read = _store.Read("family-1", "config", TokenHashA);
        Assert.Equal(Bytes("v1"), read.Blob);
    }

    [Fact]
    public void Read_with_wrong_token_is_unauthorized_but_does_not_reveal_blob()
    {
        _store.Write("family-1", "config", 0, TokenHashA, Bytes("secret"));

        var result = _store.Read("family-1", "config", TokenHashB);

        Assert.Equal(SyncReadOutcome.Unauthorized, result.Outcome);
        Assert.Null(result.Blob);
    }

    [Fact]
    public void Read_of_unknown_partition_is_not_found()
    {
        var result = _store.Read("family-1", "does-not-exist", TokenHashA);

        Assert.Equal(SyncReadOutcome.NotFound, result.Outcome);
    }

    [Fact]
    public void Partitions_are_independent_per_family_and_key()
    {
        _store.Write("family-1", "config", 0, TokenHashA, Bytes("config-v1"));
        _store.Write("family-1", "transactions:2026", 0, TokenHashA, Bytes("tx-2026-v1"));

        var config = _store.Read("family-1", "config", TokenHashA);
        var transactions = _store.Read("family-1", "transactions:2026", TokenHashA);

        Assert.Equal(Bytes("config-v1"), config.Blob);
        Assert.Equal(Bytes("tx-2026-v1"), transactions.Blob);
    }

    public void Dispose()
    {
        Microsoft.Data.Sqlite.SqliteConnection.ClearAllPools();
        if (File.Exists(_dbPath))
        {
            File.Delete(_dbPath);
        }
    }

    private static byte[] Bytes(string value) => Encoding.UTF8.GetBytes(value);

    private static byte[] Hash(string token) => System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(token));
}
