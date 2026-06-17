#:package Aspire.Hosting.PostgreSQL@13.4.0
#:package CommunityToolkit.Aspire.Hosting.Bun@13.3.0
#:sdk Aspire.AppHost.Sdk@13.4.0

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithImage("postgres:18")
    .WithDataVolume()
    .AddDatabase("koh-tao-dev");

var minio = builder.AddContainer("minio", "minio/minio")
    .WithContainerName("koh-tao-minio")
    .WithEnvironment("MINIO_ROOT_USER", "minioadmin")
    .WithEnvironment("MINIO_ROOT_PASSWORD", "minioadmin")
    .WithArgs("server", "--console-address", ":9001", "/data")
    .WithEndpoint(port: 9000, targetPort: 9000, name: "api", scheme: "http")
    .WithEndpoint(port: 9001, targetPort: 9001, name: "console", scheme: "http");

var app = builder.AddBunApp("koh-tao", ".", "scripts/aspire-dev.ts")
    .WithBunPackageInstallation()
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WaitFor(minio)
    .WithEnvironment("NUXT_S3_ENDPOINT", minio.GetEndpoint("api"))
    .WithEnvironment("NUXT_AWS_REGION", "us-east-1")
    .WithEnvironment("NUXT_AWS_ACCESS_KEY_ID", "minioadmin")
    .WithEnvironment("NUXT_AWS_SECRET_ACCESS_KEY", "minioadmin")
    .WithEnvironment("NUXT_S3_BUCKET", "koh-tao-raw")
    .WithEnvironment("NUXT_S3_PREFIX", "uploads");

builder.Build().Run();
