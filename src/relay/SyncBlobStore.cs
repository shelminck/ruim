using Dapper;
using Microsoft.Data.Sqlite;
using System.Security.Cryptography;

namespace Ruim.Relay;

public enum SyncWriteOutcome
{
    Created,
    Updated,
    VersionConflict,
    Unauthorized,
}

public readonly record struct SyncWriteResult(SyncWriteOutcome Outcome, long CurrentVersion);

public enum SyncReadOutcome
{
    Found,
    NotFound,
    Unauthorized,
}

public readonly record struct SyncReadResult(SyncReadOutcome Outcome, long Version, byte[]? Blob);

/// <summary>
/// Blind opslag voor versleutelde sync-blobs, gepartitioneerd per (sync-id, partitie).
/// Zie docs/architecture/decisions/0004-sync-relay-protocol.md voor het protocolontwerp.
/// De relay ziet nooit het syncwachtwoord of de encryptiesleutel — alleen een
/// hash van het write-token en de opaque, al versleutelde blob.
/// </summary>
public sealed class SyncBlobStore
{
    private readonly string _connectionString;

    public SyncBlobStore(string dbPath)
    {
        _connectionString = $"Data Source={dbPath}";

        using var connection = OpenConnection();
        connection.Execute("""
            CREATE TABLE IF NOT EXISTS sync_blobs (
                sync_id TEXT NOT NULL,
                partition_key TEXT NOT NULL,
                version INTEGER NOT NULL,
                token_hash BLOB NOT NULL,
                blob BLOB NOT NULL,
                updated_at TEXT NOT NULL,
                PRIMARY KEY (sync_id, partition_key)
            );
            """);
    }

    public SyncWriteResult Write(string syncId, string partitionKey, long expectedVersion, byte[] tokenHash, byte[] blob)
    {
        using var connection = OpenConnection();
        using var transaction = connection.BeginTransaction();

        var existing = connection.QueryFirstOrDefault<StoredRow>(
            """
            SELECT version AS Version, token_hash AS TokenHash
            FROM sync_blobs WHERE sync_id = @syncId AND partition_key = @partitionKey
            """,
            new { syncId, partitionKey },
            transaction);

        var now = DateTimeOffset.UtcNow.ToString("O");

        if (existing is null)
        {
            if (expectedVersion != 0)
            {
                return new SyncWriteResult(SyncWriteOutcome.VersionConflict, 0);
            }

            connection.Execute(
                """
                INSERT INTO sync_blobs (sync_id, partition_key, version, token_hash, blob, updated_at)
                VALUES (@syncId, @partitionKey, 1, @tokenHash, @blob, @now)
                """,
                new { syncId, partitionKey, tokenHash, blob, now },
                transaction);

            transaction.Commit();
            return new SyncWriteResult(SyncWriteOutcome.Created, 1);
        }

        if (!CryptographicOperations.FixedTimeEquals(existing.TokenHash, tokenHash))
        {
            return new SyncWriteResult(SyncWriteOutcome.Unauthorized, existing.Version);
        }

        if (existing.Version != expectedVersion)
        {
            return new SyncWriteResult(SyncWriteOutcome.VersionConflict, existing.Version);
        }

        var newVersion = existing.Version + 1;

        connection.Execute(
            """
            UPDATE sync_blobs SET version = @newVersion, blob = @blob, updated_at = @now
            WHERE sync_id = @syncId AND partition_key = @partitionKey
            """,
            new { newVersion, blob, now, syncId, partitionKey },
            transaction);

        transaction.Commit();
        return new SyncWriteResult(SyncWriteOutcome.Updated, newVersion);
    }

    public SyncReadResult Read(string syncId, string partitionKey, byte[] tokenHash)
    {
        using var connection = OpenConnection();

        var existing = connection.QueryFirstOrDefault<StoredBlobRow>(
            """
            SELECT version AS Version, token_hash AS TokenHash, blob AS Blob
            FROM sync_blobs WHERE sync_id = @syncId AND partition_key = @partitionKey
            """,
            new { syncId, partitionKey });

        if (existing is null)
        {
            return new SyncReadResult(SyncReadOutcome.NotFound, 0, null);
        }

        if (!CryptographicOperations.FixedTimeEquals(existing.TokenHash, tokenHash))
        {
            return new SyncReadResult(SyncReadOutcome.Unauthorized, existing.Version, null);
        }

        return new SyncReadResult(SyncReadOutcome.Found, existing.Version, existing.Blob);
    }

    private SqliteConnection OpenConnection()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        return connection;
    }

    private sealed record StoredRow(long Version, byte[] TokenHash);

    private sealed record StoredBlobRow(long Version, byte[] TokenHash, byte[] Blob);
}
