#:package Aspire.Hosting.PostgreSQL@13.3.3
#:package CommunityToolkit.Aspire.Hosting.Bun@13.3.0
#:sdk Aspire.AppHost.Sdk@13.3.3

var builder = DistributedApplication.CreateBuilder(args);

builder.Build().Run();
