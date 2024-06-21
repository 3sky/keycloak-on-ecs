# Run Keycloak on ECS

Small repo with AWS CDK code, for setting up
[keycloak](https://github.com/keycloak/keycloak) on ECS with usage on AWS Aurora PostgreSQL.

Containers are based on custom and publicly available on [quay](https://quay.io/repository/3sky/keycloak-aurora).

Setup is tested with keylock base images:
- 24.0
- 25.0.1

As always code is backed via blog post, which can be found [here](https://blog.3sky.dev/article/202407-keycloak-install/).

