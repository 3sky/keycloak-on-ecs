import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface ECSStackProps extends cdk.StackProps {
  dbCluster: rds.DatabaseCluster;
  sg: ec2.SecurityGroup;
  listener: elbv2.ApplicationListener;
  ecsCluster: ecs.Cluster;
  secret: secretsmanager.Secret;
}

export class ECSStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ECSStackProps) {
    super(scope, id, props);

    const theAurora = props.dbCluster;
    const theSG = props.sg;
    const theListner = props.listener;
    const theCluster = props.ecsCluster;
    const theSecret = props.secret;

    cdk.Tags.of(this).add('description', 'Keycloak Demo');
    cdk.Tags.of(this).add('organization', '3sky.dev');
    cdk.Tags.of(this).add('owner', '3sky');

    let CUSTOM_IMAGE: string = 'quay.io/3sky/keycloak-aurora:25.0.1';

    const ecsTaskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDefinition', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      runtimePlatform: {
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
      },
    });

    ecsTaskDefinition.addContainer('keycloak', {
      image: ecs.ContainerImage.fromRegistry(CUSTOM_IMAGE),
      environment: {
        KEYCLOAK_ADMIN: 'admin',
        KEYCLOAK_ADMIN_PASSWORD: 'admin',
        KC_DB: 'postgres',
        KC_DB_URL: 'jdbc:postgresql://' + theAurora.clusterEndpoint.hostname + ':5432/keycloak',
        KC_DB_USERNAME: 'keycloak',
        KC_DB_PASSWORD: theSecret.secretValueFromJson('password').toString(),
        KC_DB_DRIVER: 'software.amazon.jdbc.Driver',
        KC_HEALTH_ENABLED: 'true',
      },
      portMappings: [
        {
          containerPort: 8443,
          protocol: ecs.Protocol.TCP,
        },
        {
          containerPort: 9000,
          protocol: ecs.Protocol.TCP,
        },
      ],
      logging: new ecs.AwsLogDriver({ streamPrefix: 'keycloak' }),
      command: ['start', '--optimized'],
    });

    const ecsService = new ecs.FargateService(this, 'EcsService', {
      cluster: theCluster,
      taskDefinition: ecsTaskDefinition,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      securityGroups: [
        theSG,
      ],
    });

    theListner.addTargets('ECS', {
      port: 8443,
      targets: [ecsService],
      healthCheck: {
        port: '9000',
        path: '/health',
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyHttpCodes: '200',
      },
    });
  }
}
