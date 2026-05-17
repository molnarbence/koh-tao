#:package Aspire.Hosting.PostgreSQL@13.3.3
#:package CommunityToolkit.Aspire.Hosting.Bun@13.3.0
#:sdk Aspire.AppHost.Sdk@13.3.3

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithImage("postgres:18")
    .WithDataVolume()
    .AddDatabase("koh-tao-dev");

var app = builder.AddBunApp("koh-tao", ".", "scripts/aspire-dev.ts")
    .WithBunPackageInstallation()
    .WithHttpEndpoint(port: 3000, env: "PORT")
    .WithReference(postgres);

builder.Build().Run();
