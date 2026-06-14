#:package Aspire.Hosting.PostgreSQL@13.4.0
#:package CommunityToolkit.Aspire.Hosting.Bun@13.3.0
#:sdk Aspire.AppHost.Sdk@13.4.0

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithImage("postgres:18")
    .WithDataVolume()
    .AddDatabase("koh-tao-dev");

var localstack = builder.AddContainer("localstack", "localstack/localstack")
    .WithEnvironment("SERVICES", "s3")
    .WithEndpoint(port: 4566, targetPort: 4566, name: "edge", scheme: "http");

var app = builder.AddBunApp("koh-tao", ".", "scripts/aspire-dev.ts")
    .WithBunPackageInstallation()
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithReference(postgres)
    .WaitFor(postgres)
    .WaitFor(localstack)
    .WithEnvironment("NUXT_S3_ENDPOINT", localstack.GetEndpoint("edge"))
    .WithEnvironment("NUXT_AWS_REGION", "eu-west-1")
    .WithEnvironment("NUXT_AWS_ACCESS_KEY_ID", "test")
    .WithEnvironment("NUXT_AWS_SECRET_ACCESS_KEY", "test")
    .WithEnvironment("NUXT_S3_BUCKET", "koh-tao-raw")
    .WithEnvironment("NUXT_S3_PREFIX", "uploads");

builder.Build().Run();
